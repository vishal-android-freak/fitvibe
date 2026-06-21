// Package sleep serves derived sleep views (the Today "last night" hypnogram).
package sleep

import (
	"context"
	"database/sql"
	"encoding/json"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/vishal-android-freak/fitvibe/internal/authmw"
	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
)

// Handler exposes read-only sleep endpoints for the app.
type Handler struct {
	sleep *repositories.SleepRepo
	users *repositories.UserRepo
}

func NewHandler(sleepRepo *repositories.SleepRepo, users *repositories.UserRepo) *Handler {
	return &Handler{sleep: sleepRepo, users: users}
}

// Register mounts the sleep routes.
func (h *Handler) Register(r chi.Router) {
	r.Get("/me/sleep/last-night", h.lastNight)
	r.Get("/me/sleep/nights", h.nights)
	r.Get("/me/sleep/schedule", h.getSchedule)
	r.Put("/me/sleep/schedule", h.putSchedule)
}

// scheduleBody is the user's target bed/wake (minutes since local midnight),
// each null when unset. Google doesn't expose this; we store it ourselves.
type scheduleBody struct {
	TargetBedMinutes  *int `json:"targetBedMinutes"`
	TargetWakeMinutes *int `json:"targetWakeMinutes"`
}

func (h *Handler) getSchedule(w http.ResponseWriter, r *http.Request) {
	userID, ok := authmw.UserID(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	bed, wake, err := h.users.GetSleepSchedule(r.Context(), userID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to load schedule")
		return
	}
	writeJSON(w, http.StatusOK, scheduleBody{TargetBedMinutes: bed, TargetWakeMinutes: wake})
}

func (h *Handler) putSchedule(w http.ResponseWriter, r *http.Request) {
	userID, ok := authmw.UserID(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	var body scheduleBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	// Validate minutes-since-midnight range when provided.
	for _, v := range []*int{body.TargetBedMinutes, body.TargetWakeMinutes} {
		if v != nil && (*v < 0 || *v >= 1440) {
			writeErr(w, http.StatusBadRequest, "target minutes must be 0–1439")
			return
		}
	}
	if err := h.users.SetSleepSchedule(r.Context(), userID, body.TargetBedMinutes, body.TargetWakeMinutes); err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to save schedule")
		return
	}
	writeJSON(w, http.StatusOK, body)
}

// stageSegment is one [stage, minutes] block for the hypnogram.
type stageSegment struct {
	Stage   string `json:"stage"` // Deep | REM | Light | Awake
	Minutes int    `json:"minutes"`
}

// stageTotal is the per-stage roll-up: minutes asleep, % of night, times entered.
type stageTotal struct {
	Stage   string `json:"stage"`
	Minutes int    `json:"minutes"`
	Percent int    `json:"percent"`
	Count   int    `json:"count"`
}

// LastNightResponse is the full payload the SleepCard/Hypnogram render. Exported
// so the Today aggregate endpoint can embed it.
type LastNightResponse struct {
	// Chronological stage blocks for the cityscape chart.
	Segments []stageSegment `json:"segments"`
	// Local wall-clock minutes-since-midnight for the hour axis and header.
	OnsetClock int `json:"onsetClock"`
	WakeClock  int `json:"wakeClock"`
	// Durations.
	TotalMinutes  int `json:"totalMinutes"`  // total time in bed
	AsleepMinutes int `json:"asleepMinutes"` // total minus Awake
	// Sleep efficiency = asleep / total, as a percent.
	Efficiency int `json:"efficiency"`
	// Number of awakenings (distinct Awake periods). Raw device count — kept for
	// backward compat; prefer FullAwakenings for the honest mid-sleep count.
	Awakenings int `json:"awakenings"`
	// FitVibe sleep score (0-100) + its band. Calibrated to Google's; see score.go.
	Score     int       `json:"score"`
	ScoreBand scoreBand `json:"scoreBand"`
	// Derived "Sleep quality" metrics (validated against Google Health). See
	// quality.go for formulas and caveats.
	Quality sleepQuality `json:"quality"`
	// "Typical for your age" in-range bands for the quality gauges (bands.go).
	Bands SleepBands `json:"bands"`
	// Per-stage breakdown with the typical-for-age target each bar marks against.
	Stages  []stageTotal  `json:"stages"`
	Typical TypicalStages `json:"typical"`
}

// sleepQuality holds the derived "Sleep quality" metrics. Exact: interruptions.
// Approximate: timeToSoundSleep. Proxy-only: soundSleep (Deep+REM). Disruptions
// is a stage-based tick timeline (NOT Google's movement-based restlessness).
type sleepQuality struct {
	// TimeToSoundSleepMinutes is onset→first deep/REM latency; null if never
	// reached (no deep/REM that night).
	TimeToSoundSleepMinutes *int `json:"timeToSoundSleepMinutes"`
	// InterruptionsMinutes / FullAwakenings: mid-sleep awake stretches ≥5 min.
	InterruptionsMinutes int `json:"interruptionsMinutes"`
	FullAwakenings       int `json:"fullAwakenings"`
	// SoundSleepMinutes is Deep+REM only — a proxy, NOT Google's sound sleep.
	SoundSleepMinutes int `json:"soundSleepMinutes"`
	// Disruptions is the mid-sleep disturbance tick timeline (may be empty).
	Disruptions []disruption `json:"disruptions"`
}

// LastNight returns the user's most recent sleep night as the rendered payload,
// or nil if there is none. Shared by the HTTP handler and the Today aggregate.
func (h *Handler) LastNight(ctx context.Context, userID int64) (*LastNightResponse, error) {
	night, err := h.sleep.LatestNight(ctx, userID)
	if err != nil {
		return nil, err
	}
	if night == nil {
		return nil, nil
	}
	resp := buildLastNight(night, h.userAge(ctx, userID))
	return &resp, nil
}

func (h *Handler) lastNight(w http.ResponseWriter, r *http.Request) {
	userID, ok := authmw.UserID(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthenticated")
		return
	}

	resp, err := h.LastNight(r.Context(), userID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to load sleep")
		return
	}
	if resp == nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

// nightVitals are the per-night vitals; each field is null when the night lacks
// that metric.
type nightVitals struct {
	RHR             *float64 `json:"rhr"`
	HRV             *float64 `json:"hrv"`
	SpO2            *float64 `json:"spo2"`
	RespiratoryRate *float64 `json:"respiratoryRate"`
	SkinTempDelta   *float64 `json:"skinTempDelta"`
}

// nightSummary is one past night in the /me/sleep/nights list. Deliberately no
// "score" field — there is no Google sleep score and we haven't defined one.
type nightSummary struct {
	Date            string       `json:"date"` // local civil date, "2006-01-02"
	OnsetClock      int          `json:"onsetClock"`
	WakeClock       int          `json:"wakeClock"`
	DurationMinutes int          `json:"durationMinutes"` // asleep minutes
	Efficiency      int          `json:"efficiency"`      // asleep/total %
	Awakenings      int          `json:"awakenings"`      // raw AWAKE count (back-compat)
	Score           int          `json:"score"`           // FitVibe sleep score 0-100
	ScoreBand       scoreBand    `json:"scoreBand"`       // score band + label
	Quality         sleepQuality `json:"quality"`         // derived sleep-quality metrics
	Bands           SleepBands   `json:"bands"`           // typical-for-age in-range bands
	Stages          []stageTotal `json:"stages"`
	Vitals          nightVitals  `json:"vitals"`
	// Naps on the same civil date — shown as extra hypnograms on this night, no
	// score/quality of their own. Empty for most nights.
	Naps []napView `json:"naps"`
}

// napView is a same-day nap: its hypnogram segments + duration and clock times.
type napView struct {
	OnsetClock      int            `json:"onsetClock"`
	WakeClock       int            `json:"wakeClock"`
	DurationMinutes int            `json:"durationMinutes"`
	Segments        []stageSegment `json:"segments"`
}

type nightsResponse struct {
	Nights []nightSummary `json:"nights"`
}

func (h *Handler) nights(w http.ResponseWriter, r *http.Request) {
	userID, ok := authmw.UserID(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthenticated")
		return
	}

	limit := 14
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			limit = n
		}
	}
	if limit > 60 {
		limit = 60
	}

	nights, err := h.sleep.RecentNights(r.Context(), userID, limit)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to load sleep nights")
		return
	}

	age := h.userAge(r.Context(), userID)
	resp := nightsResponse{Nights: make([]nightSummary, 0, len(nights))}
	for i := range nights {
		resp.Nights = append(resp.Nights, buildNight(&nights[i], age))
	}
	writeJSON(w, http.StatusOK, resp)
}

// buildNight renders a single SleepNightDetail into the API shape, reusing the
// stage-total / efficiency / clock helpers shared with buildLastNight.
func buildNight(n *repositories.SleepNightDetail, age int) nightSummary {
	loc := time.FixedZone("local", n.OffsetSeconds)

	// No chronological segments here, so totals come straight from the summary.
	stages, total, asleep := stageTotals(n.Summary, nil)
	awakenings := 0
	for _, s := range stages {
		if s.Stage == "Awake" {
			awakenings = s.Count
		}
	}
	// Prefer the device's own summary minutes (matches Google Health) for
	// duration + efficiency; fall back to the summed stage minutes.
	if n.MinutesAsleep.Valid {
		asleep = int(n.MinutesAsleep.Int64)
	}
	if n.MinutesInSleepPeriod.Valid {
		total = int(n.MinutesInSleepPeriod.Int64)
	}

	// nullable maps a column to *float64, treating invalid OR non-finite
	// (NaN/Inf) as "no value" — a NaN skin-temp baseline (before the 30-day
	// baseline is established) would otherwise round into garbage. round1 does
	// the same but rounds to one decimal (math.Round handles negatives).
	nullable := func(v sql.NullFloat64) *float64 {
		if !v.Valid || math.IsNaN(v.Float64) || math.IsInf(v.Float64, 0) {
			return nil
		}
		return &v.Float64
	}
	round1 := func(v sql.NullFloat64) *float64 {
		f := nullable(v)
		if f == nil {
			return nil
		}
		r := math.Round(*f*10) / 10
		return &r
	}

	q := buildQuality(loc, n.Segments, n.Summary)
	score, band := scoreFromQuality(asleep, q)

	return nightSummary{
		Date:            n.CivilDate,
		OnsetClock:      clockOf(loc, n.Start),
		WakeClock:       clockOf(loc, n.End),
		DurationMinutes: asleep,
		Efficiency:      efficiency(asleep, total),
		Awakenings:      awakenings,
		Score:           score,
		ScoreBand:       band,
		Quality:         q,
		Bands:           bandsByAge(age),
		Stages:          stages,
		Naps:            buildNaps(loc, n.Naps),
		Vitals: nightVitals{
			RHR:             nullable(n.RestingHeartRate),
			HRV:             nullable(n.HRV),
			SpO2:            nullable(n.SpO2),
			RespiratoryRate: nullable(n.RespiratoryRate),
			SkinTempDelta:   round1(n.SkinTempDelta), // delta can be negative
		},
	}
}

func (h *Handler) userAge(ctx context.Context, userID int64) int {
	u, err := h.users.GetByID(ctx, userID)
	if err != nil || u == nil || !u.Age.Valid {
		return 0 // unknown → adult fallback
	}
	return int(u.Age.Int32)
}

// canonStage maps Google's sleep stage enum to one of the four lanes the app
// renders, collapsing the rarer states. Returns "" for stages we don't plot.
func canonStage(t string) string {
	switch t {
	case "DEEP":
		return "Deep"
	case "REM":
		return "REM"
	case "LIGHT", "SLEEPING":
		return "Light"
	case "AWAKE", "AWAKE_IN_BED", "OUT_OF_BED":
		return "Awake"
	default:
		return "" // UNKNOWN / unspecified — skip
	}
}

func buildLastNight(n *repositories.SleepNight, age int) LastNightResponse {
	loc := time.FixedZone("local", n.OffsetSeconds)

	// Chronological segments (rounded to whole minutes).
	segments := make([]stageSegment, 0, len(n.Segments))
	for _, s := range n.Segments {
		stage := canonStage(s.StageType)
		if stage == "" {
			continue
		}
		mins := int(s.End.Sub(s.Start).Round(time.Minute).Minutes())
		if mins <= 0 {
			continue
		}
		segments = append(segments, stageSegment{Stage: stage, Minutes: mins})
	}

	// Per-stage totals: prefer the device summary, fall back to summing segments.
	stages, total, asleep := stageTotals(n.Summary, segments)
	awakenings := 0
	for _, s := range stages {
		if s.Stage == "Awake" {
			awakenings = s.Count
		}
	}
	// Prefer the device's own summary minutes (matches Google Health) for
	// duration + efficiency; fall back to the summed stage minutes.
	if n.MinutesAsleep.Valid {
		asleep = int(n.MinutesAsleep.Int64)
	}
	if n.MinutesInSleepPeriod.Valid {
		total = int(n.MinutesInSleepPeriod.Int64)
	}
	eff := efficiency(asleep, total)
	q := buildQuality(loc, n.Segments, n.Summary)
	score, band := scoreFromQuality(asleep, q)

	return LastNightResponse{
		Segments:      segments,
		OnsetClock:    clockOf(loc, n.Start),
		WakeClock:     clockOf(loc, n.End),
		TotalMinutes:  total,
		AsleepMinutes: asleep,
		Efficiency:    eff,
		Awakenings:    awakenings,
		Score:         score,
		ScoreBand:     band,
		Quality:       q,
		Bands:         bandsByAge(age),
		Stages:        stages,
		Typical:       typicalByAge(age),
	}
}

// segmentsOf converts a raw stage timeline into the app's [stage, minutes]
// blocks (canonicalized lanes, sub-minute blocks dropped).
func segmentsOf(raw []repositories.SleepStageSegment) []stageSegment {
	out := make([]stageSegment, 0, len(raw))
	for _, s := range raw {
		stage := canonStage(s.StageType)
		if stage == "" {
			continue
		}
		mins := int(s.End.Sub(s.Start).Round(time.Minute).Minutes())
		if mins <= 0 {
			continue
		}
		out = append(out, stageSegment{Stage: stage, Minutes: mins})
	}
	return out
}

// buildNaps converts same-day naps into hypnogram-only views (segments + clocks
// + duration). No score/quality — those belong to the main sleep.
func buildNaps(loc *time.Location, naps []repositories.Nap) []napView {
	out := make([]napView, 0, len(naps))
	for _, n := range naps {
		out = append(out, napView{
			OnsetClock:      clockOf(loc, n.Start),
			WakeClock:       clockOf(loc, n.End),
			DurationMinutes: n.AsleepMinutes,
			Segments:        segmentsOf(n.Segments),
		})
	}
	return out
}

// buildQuality assembles the derived sleep-quality metrics from the segment
// timeline + per-stage summary. Disruptions are always non-nil (empty slice, not
// null) so the JSON renders a usable array.
func buildQuality(loc *time.Location, segs []repositories.SleepStageSegment, summary []repositories.SleepStageSummary) sleepQuality {
	intMin, intCnt := computeInterruptions(segs)
	disruptions := computeDisruptions(loc, segs)
	if disruptions == nil {
		disruptions = []disruption{}
	}
	q := sleepQuality{
		InterruptionsMinutes: intMin,
		FullAwakenings:       intCnt,
		SoundSleepMinutes:    computeSoundSleep(summary),
		Disruptions:          disruptions,
	}
	if ttss, ok := computeTimeToSoundSleep(segs); ok {
		q.TimeToSoundSleepMinutes = &ttss
	}
	return q
}

// stageTotals computes the per-stage [Deep, REM, Light, Awake] roll-up, the total
// minutes in bed, and the asleep minutes (total minus Awake). It prefers the
// authoritative device summary; when that's empty it falls back to summing the
// chronological segments. Stage order is stable for rendering.
func stageTotals(summary []repositories.SleepStageSummary, segments []stageSegment) (stages []stageTotal, total, asleep int) {
	type agg struct {
		minutes int
		count   int
	}
	totals := map[string]*agg{"Deep": {}, "REM": {}, "Light": {}, "Awake": {}}
	if len(summary) > 0 {
		for _, s := range summary {
			stage := canonStage(s.StageType)
			if a, ok := totals[stage]; ok {
				a.minutes += s.Minutes
				a.count += s.Count
			}
		}
	} else {
		for _, seg := range segments {
			if a, ok := totals[seg.Stage]; ok {
				a.minutes += seg.Minutes
				a.count++
			}
		}
	}

	for _, a := range totals {
		total += a.minutes
	}
	asleep = total - totals["Awake"].minutes

	stages = make([]stageTotal, 0, 4)
	for _, stage := range []string{"Deep", "REM", "Light", "Awake"} {
		a := totals[stage]
		pct := 0
		if total > 0 {
			pct = int(float64(a.minutes)/float64(total)*100 + 0.5)
		}
		stages = append(stages, stageTotal{Stage: stage, Minutes: a.minutes, Percent: pct, Count: a.count})
	}
	return stages, total, asleep
}

// efficiency is asleep/total as a rounded percent (0 when no time in bed).
func efficiency(asleep, total int) int {
	if total <= 0 {
		return 0
	}
	return int(float64(asleep)/float64(total)*100 + 0.5)
}

// clockOf is local wall-clock minutes-since-midnight for an instant.
func clockOf(loc *time.Location, t time.Time) int {
	lt := t.In(loc)
	return lt.Hour()*60 + lt.Minute()
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
