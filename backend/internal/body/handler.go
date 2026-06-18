// Package body serves the Body tab as a single aggregate endpoint
// (GET /me/body): vitals trends (RHR, HRV, SpO2, respiratory rate, skin-temp,
// VO2 max), body composition (weight, body-fat, BMI), today's activity, recent
// exercise sessions, and the dynamic nutrient breakdown — assembled in one
// response (a backend-for-frontend, mirroring /me/today).
package body

import (
	"context"
	"database/sql"
	"encoding/json"
	"math"
	"net/http"
	"slices"
	"strconv"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
)

// trendWindowDays is how far back the vitals/body trend series reach.
const trendWindowDays = 30

// Handler serves the unified Body endpoint.
type Handler struct {
	repo  *repositories.BodyRepo
	users *repositories.UserRepo
	db    *sql.DB
}

func NewHandler(repo *repositories.BodyRepo, users *repositories.UserRepo, db *sql.DB) *Handler {
	return &Handler{repo: repo, users: users, db: db}
}

// Register mounts the body route.
func (h *Handler) Register(r chi.Router) {
	r.Get("/me/body", h.body)
}

func (h *Handler) body(w http.ResponseWriter, r *http.Request) {
	userID, ok := parseUserID(w, r)
	if !ok {
		return
	}
	ctx := r.Context()
	localDate := h.localDate(ctx, userID)
	// age is reserved for the VO2max age/sex band (added when VO2max data exists).
	_, sex := h.demographics(ctx, userID)

	var (
		resp                           = bodyResponse{Date: localDate}
		vitErr, actErr, bodErr, nutErr error
	)
	var wg sync.WaitGroup
	wg.Add(4)
	go func() { defer wg.Done(); resp.Vitals, vitErr = h.buildVitals(ctx, userID) }()
	go func() { defer wg.Done(); resp.Activity, actErr = h.buildActivity(ctx, userID, localDate) }()
	go func() { defer wg.Done(); resp.Body, bodErr = h.buildBody(ctx, userID, sex) }()
	go func() { defer wg.Done(); resp.Nutrition, nutErr = h.buildNutrition(ctx, userID, localDate) }()
	wg.Wait()

	if err := firstErr(vitErr, actErr, bodErr, nutErr); err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to load body")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

// ---- response shape ----

type bodyResponse struct {
	Date      string          `json:"date"`
	Vitals    vitalsBlock     `json:"vitals"`
	Activity  activityBlock   `json:"activity"`
	Body      bodyComposition `json:"body"`
	Nutrition nutritionBlock  `json:"nutrition"`
}

// metricCard is a vital's latest value + trend + interpretation band. Either a
// personal baseline (rolling mean±SD) or a population reference is set, not both.
type metricCard struct {
	Latest    *float64                  `json:"latest"` // null = no data (empty card)
	Unit      string                    `json:"unit"`
	At        string                    `json:"at"`
	Trend     []repositories.TrendPoint `json:"trend"`
	Baseline  *baseline                 `json:"baseline,omitempty"`
	Reference *reference                `json:"reference,omitempty"`
}

// baseline is a rolling personal range (mean ± SD over `window` days). The app
// shades [mean−sd, mean+sd] behind the trend. calibrated=false until enough data.
type baseline struct {
	Mean       float64 `json:"mean"`
	SD         float64 `json:"sd"`
	Window     int     `json:"window"`
	Calibrated bool    `json:"calibrated"`
}

// reference is a population healthy range to draw as fixed lines.
type reference struct {
	Low  *float64 `json:"low,omitempty"`
	High *float64 `json:"high,omitempty"`
}

type vitalsBlock struct {
	RestingHeartRate metricCard `json:"restingHeartRate"`
	HRV              metricCard `json:"hrv"`
	SpO2             metricCard `json:"spo2"`
	RespiratoryRate  metricCard `json:"respiratoryRate"`
	SkinTempDelta    metricCard `json:"skinTempDelta"`
	VO2Max           metricCard `json:"vo2Max"`
	// ECG is event-style (latest result + history); empty when no recordings.
	ECG *ecgBlock `json:"ecg"`
}

type ecgBlock struct {
	Result string `json:"result"` // SINUS_RHYTHM | ATRIAL_FIBRILLATION | INCONCLUSIVE | ""
	BPM    int    `json:"bpm"`
	At     string `json:"at"`
}

type activityBlock struct {
	Steps        goalMetric `json:"steps"`
	DistanceKm   float64    `json:"distanceKm"`
	Floors       goalMetric `json:"floors"`
	ActiveEnergy goalMetric `json:"activeEnergy"`
	ZoneMinutes  goalMetric `json:"zoneMinutes"`
	// 7-day sparklines (oldest→newest).
	ActiveEnergyWeek []repositories.TrendPoint `json:"activeEnergyWeek"`
	ZoneMinutesWeek  []repositories.TrendPoint `json:"zoneMinutesWeek"`
	Sessions         []sessionView             `json:"sessions"`
}

type goalMetric struct {
	Value float64 `json:"value"`
	Goal  float64 `json:"goal,omitempty"`
}

type sessionView struct {
	Type          string                  `json:"type"`
	At            string                  `json:"at"`
	OffsetSeconds int                     `json:"offsetSeconds"`
	DurationSec   int                     `json:"durationSec"`
	Kcal          int                     `json:"kcal"`
	Steps         int                     `json:"steps"`
	HRZones       []repositories.ZoneTime `json:"hrZones"`
}

type bodyComposition struct {
	Weight  metricCard `json:"weight"`
	BodyFat metricCard `json:"bodyFat"`
	BMI     *bmiBlock  `json:"bmi"` // null when height or weight missing
}

type bmiBlock struct {
	Value    float64 `json:"value"`
	Category string  `json:"category"` // underweight | normal | overweight | obese
}

type nutritionBlock struct {
	CaloriesEaten int                          `json:"caloriesEaten"`
	CaloriesBurnt int                          `json:"caloriesBurnt"`
	Nutrients     []repositories.NutrientTotal `json:"nutrients"` // dynamic, from logged foods
	Meals         []mealView                   `json:"meals"`     // today's logged foods
}

type mealView struct {
	Name          string `json:"name"`
	MealType      string `json:"mealType"` // BREAKFAST | LUNCH | DINNER | SNACK | ""
	Kcal          int    `json:"kcal"`
	At            string `json:"at"`
	OffsetSeconds int    `json:"offsetSeconds"`
}

// ---- builders ----

func (h *Handler) buildVitals(ctx context.Context, userID int64) (vitalsBlock, error) {
	var b vitalsBlock
	type job struct {
		card *metricCard
		fn   func() (repositories.MetricSeries, error)
		unit string
		ref  *reference
		base bool
	}
	jobs := []job{
		{&b.RestingHeartRate, func() (repositories.MetricSeries, error) {
			return h.repo.DailyAvgSeries(ctx, userID, "daily-resting-heart-rate", trendWindowDays)
		}, "bpm", nil, true},
		{&b.HRV, func() (repositories.MetricSeries, error) {
			return h.repo.DailyAvgSeries(ctx, userID, "daily-heart-rate-variability", trendWindowDays)
		}, "ms", nil, true},
		{&b.SpO2, func() (repositories.MetricSeries, error) {
			return h.repo.DailyAvgSeries(ctx, userID, "daily-oxygen-saturation", trendWindowDays)
		}, "%", &reference{Low: f64(95)}, false},
		{&b.RespiratoryRate, func() (repositories.MetricSeries, error) {
			return h.repo.DailyAvgSeries(ctx, userID, "daily-respiratory-rate", trendWindowDays)
		}, "br/min", &reference{Low: f64(12), High: f64(20)}, false},
		{&b.SkinTempDelta, func() (repositories.MetricSeries, error) { return h.repo.SkinTempSeries(ctx, userID, trendWindowDays) }, "°C", nil, true},
		{&b.VO2Max, func() (repositories.MetricSeries, error) { return h.repo.VO2MaxSeries(ctx, userID, 90) }, "ml/kg/min", nil, true},
	}
	for _, j := range jobs {
		s, err := j.fn()
		if err != nil {
			return b, err
		}
		*j.card = toCard(s, j.unit)
		if j.ref != nil {
			j.card.Reference = j.ref
		}
		if j.base {
			j.card.Baseline = computeBaseline(s.Trend)
		}
	}
	b.ECG = nil // populated once ECG recordings exist; empty card until then
	return b, nil
}

func (h *Handler) buildActivity(ctx context.Context, userID int64, localDate string) (activityBlock, error) {
	a, err := h.repo.ActivityToday(ctx, userID, localDate)
	if err != nil {
		return activityBlock{}, err
	}
	energyWk, err := h.repo.DailyActiveSeries(ctx, userID, "active-energy-burned", "value_sum", 7)
	if err != nil {
		return activityBlock{}, err
	}
	zoneWk, err := h.repo.DailyActiveSeries(ctx, userID, "active-zone-minutes", "value_count", 7)
	if err != nil {
		return activityBlock{}, err
	}
	sessions, err := h.repo.RecentSessions(ctx, userID, 2, 10)
	if err != nil {
		return activityBlock{}, err
	}
	sv := make([]sessionView, 0, len(sessions))
	for _, s := range sessions {
		zones := s.HRZones
		if zones == nil {
			zones = []repositories.ZoneTime{}
		}
		sv = append(sv, sessionView{
			Type: s.Type, At: s.At.UTC().Format("2006-01-02T15:04:05Z07:00"), OffsetSeconds: s.OffsetSeconds,
			DurationSec: s.DurationSec, Kcal: s.Kcal, Steps: s.Steps, HRZones: zones,
		})
	}
	return activityBlock{
		Steps:            goalMetric{Value: float64(a.Steps), Goal: 10000},
		DistanceKm:       round1(a.DistanceM / 1000),
		Floors:           goalMetric{Value: float64(a.Floors), Goal: 10},
		ActiveEnergy:     goalMetric{Value: float64(a.ActiveKcal), Goal: 750},
		ZoneMinutes:      goalMetric{Value: float64(a.ZoneMinutes), Goal: 150}, // WHO weekly; cumulative on the client
		ActiveEnergyWeek: nonNil(energyWk),
		ZoneMinutesWeek:  nonNil(zoneWk),
		Sessions:         sv,
	}, nil
}

func (h *Handler) buildBody(ctx context.Context, userID int64, sex string) (bodyComposition, error) {
	weight, err := h.repo.SampleAvgSeries(ctx, userID, "weight", 365)
	if err != nil {
		return bodyComposition{}, err
	}
	// weight value_avg is in GRAMS — convert the series to kg.
	scaleSeries(&weight, 1.0/1000.0)

	bodyFat, err := h.repo.SampleAvgSeries(ctx, userID, "body-fat", 365)
	if err != nil {
		return bodyComposition{}, err
	}

	comp := bodyComposition{
		Weight:  toCard(weight, "kg"),
		BodyFat: toCard(bodyFat, "%"),
	}
	comp.BodyFat.Reference = bodyFatBand(sex)

	// BMI = weight(kg) / height(m)^2, only when both are known.
	heightM, hOK, err := h.repo.LatestSampleValue(ctx, userID, "height")
	if err != nil {
		return bodyComposition{}, err
	}
	if hOK && heightM > 0 && weight.Latest != nil {
		bmi := *weight.Latest / (heightM * heightM)
		comp.BMI = &bmiBlock{Value: round1(bmi), Category: bmiCategory(bmi)}
	}
	return comp, nil
}

func (h *Handler) buildNutrition(ctx context.Context, userID int64, localDate string) (nutritionBlock, error) {
	totals, err := h.repo.NutritionToday(ctx, userID, localDate)
	if err != nil {
		return nutritionBlock{}, err
	}
	childNutrients, err := h.repo.NutrientsToday(ctx, userID, localDate)
	if err != nil {
		return nutritionBlock{}, err
	}
	meals, err := h.repo.MealsToday(ctx, userID, localDate)
	if err != nil {
		return nutritionBlock{}, err
	}
	mv := make([]mealView, 0, len(meals))
	for _, m := range meals {
		mv = append(mv, mealView{
			Name: m.Name, MealType: m.MealType, Kcal: m.Kcal,
			At: m.At.UTC().Format("2006-01-02T15:04:05Z07:00"), OffsetSeconds: m.OffsetSeconds,
		})
	}
	return nutritionBlock{
		CaloriesEaten: totals.CaloriesEaten,
		CaloriesBurnt: totals.CaloriesBurnt,
		Nutrients:     mergeNutrients(totals, childNutrients),
		Meals:         mv,
	}, nil
}

// mergeNutrients combines the promoted macro columns (carbs/fat) with the
// child-table nutrients (protein/fiber/…) into one list, macros first. Carbs
// and fat live as top-level payload fields, not in the nutrients[] array, so
// they'd otherwise be missing from the breakdown. Same-named entries are summed
// (a food rarely also lists carbs inside nutrients[]) to avoid double-counting.
func mergeNutrients(totals repositories.NutritionCalories, child []repositories.NutrientTotal) []repositories.NutrientTotal {
	// Macros from promoted columns, in display order.
	order := []string{"CARBOHYDRATES", "TOTAL_FAT", "PROTEIN", "DIETARY_FIBER"}
	sums := map[string]float64{}
	if totals.CarbsGrams > 0 {
		sums["CARBOHYDRATES"] = totals.CarbsGrams
	}
	if totals.FatGrams > 0 {
		sums["TOTAL_FAT"] = totals.FatGrams
	}
	for _, n := range child {
		sums[n.Nutrient] += n.Grams
		// Track any micronutrient not already in the fixed macro order so it
		// still renders (and the list stays dynamic as logging gets richer).
		if !slices.Contains(order, n.Nutrient) {
			order = append(order, n.Nutrient)
		}
	}
	out := make([]repositories.NutrientTotal, 0, len(sums))
	for _, k := range order {
		if g, ok := sums[k]; ok {
			out = append(out, repositories.NutrientTotal{Nutrient: k, Grams: round1(g)})
		}
	}
	return out
}

// ---- band / stat helpers ----

func toCard(s repositories.MetricSeries, unit string) metricCard {
	return metricCard{Latest: s.Latest, Unit: unit, At: s.At, Trend: nonNil(s.Trend)}
}

// computeBaseline returns the rolling personal range (mean ± sample SD). It's
// marked uncalibrated (but still returned) under 14 points, per the research:
// wearables need ~2 weeks to establish a personal baseline.
func computeBaseline(trend []repositories.TrendPoint) *baseline {
	n := len(trend)
	if n == 0 {
		return nil
	}
	var sum float64
	for _, p := range trend {
		sum += p.Value
	}
	mean := sum / float64(n)
	var ss float64
	for _, p := range trend {
		d := p.Value - mean
		ss += d * d
	}
	sd := 0.0
	if n > 1 {
		sd = math.Sqrt(ss / float64(n-1))
	}
	return &baseline{
		Mean:       round1(mean),
		SD:         round1(sd),
		Window:     trendWindowDays,
		Calibrated: n >= 14,
	}
}

// bmiCategory applies the WHO adult bands.
func bmiCategory(bmi float64) string {
	switch {
	case bmi < 18.5:
		return "underweight"
	case bmi < 25:
		return "normal"
	case bmi < 30:
		return "overweight"
	default:
		return "obese"
	}
}

// bodyFatBand returns the "acceptable" reference range (ACE) by biological sex,
// or nil when sex is unknown (degrade to no band rather than mislabel).
func bodyFatBand(sex string) *reference {
	switch normalizeSex(sex) {
	case "male":
		return &reference{Low: f64(14), High: f64(24)}
	case "female":
		return &reference{Low: f64(21), High: f64(31)}
	default:
		return nil
	}
}

func normalizeSex(s string) string {
	switch s {
	case "male", "MALE", "Male", "m", "M":
		return "male"
	case "female", "FEMALE", "Female", "f", "F":
		return "female"
	default:
		return ""
	}
}

// ---- demographics + misc helpers ----

func (h *Handler) demographics(ctx context.Context, userID int64) (age int, sex string) {
	u, err := h.users.GetByID(ctx, userID)
	if err != nil || u == nil {
		return 0, ""
	}
	if u.Age.Valid {
		age = int(u.Age.Int32)
	}
	if u.GoogleGender.Valid {
		sex = u.GoogleGender.String
	}
	return age, sex
}

func (h *Handler) localDate(ctx context.Context, userID int64) string {
	var offset sql.NullInt64
	_ = h.db.QueryRowContext(ctx, `
		SELECT start_utc_offset_seconds FROM data_points
		WHERE user_id = $1 AND start_utc_offset_seconds IS NOT NULL
		ORDER BY COALESCE(start_time, sample_time) DESC LIMIT 1`, userID).Scan(&offset)
	return nowLocal(int(offset.Int64))
}

func scaleSeries(s *repositories.MetricSeries, factor float64) {
	for i := range s.Trend {
		s.Trend[i].Value = round1(s.Trend[i].Value * factor)
	}
	if s.Latest != nil {
		v := round1(*s.Latest * factor)
		s.Latest = &v
	}
}

func nonNil(t []repositories.TrendPoint) []repositories.TrendPoint {
	if t == nil {
		return []repositories.TrendPoint{}
	}
	return t
}

func nowLocal(offsetSeconds int) string {
	loc := time.FixedZone("local", offsetSeconds)
	return time.Now().In(loc).Format("2006-01-02")
}

func f64(v float64) *float64 { return &v }

func round1(v float64) float64 { return math.Round(v*10) / 10 }

func firstErr(errs ...error) error {
	for _, e := range errs {
		if e != nil {
			return e
		}
	}
	return nil
}

func parseUserID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	userID, err := strconv.ParseInt(r.URL.Query().Get("user_id"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "valid user_id query parameter is required")
		return 0, false
	}
	return userID, true
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
