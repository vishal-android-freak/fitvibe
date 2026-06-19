// Package today serves the Today screen as a single aggregate endpoint
// (GET /me/today): activity snapshot (steps + current heart rate), nutrition /
// energy / hydration totals, the activity timeline, and last night's sleep —
// everything the screen renders, in one response (a backend-for-frontend).
package today

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/vishal-android-freak/fitvibe/internal/authmw"
	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
	"github.com/vishal-android-freak/fitvibe/internal/readiness"
	"github.com/vishal-android-freak/fitvibe/internal/sleep"
)

// Handler serves the unified Today endpoint for the app.
type Handler struct {
	repo  *repositories.TodayRepo
	sleep *sleep.Handler
	db    *sql.DB
}

func NewHandler(repo *repositories.TodayRepo, sleepHandler *sleep.Handler, db *sql.DB) *Handler {
	return &Handler{repo: repo, sleep: sleepHandler, db: db}
}

// Register mounts the today routes.
func (h *Handler) Register(r chi.Router) {
	r.Get("/me/today", h.today)
}

// latestSample is a timestamped reading. Value is omitted for timestamp-only
// uses (e.g. nutrition "last updated"), present for metric samples (heart rate).
type latestSample struct {
	Value         float64 `json:"value,omitempty"`
	At            string  `json:"at"`            // RFC3339 sample instant (UTC)
	OffsetSeconds int     `json:"offsetSeconds"` // local UTC offset for rendering wall-clock
}

// summaryBlock — steps + current heart rate.
type summaryBlock struct {
	Steps           int           `json:"steps"`
	LatestHeartRate *latestSample `json:"latestHeartRate"` // null if no sample
}

// nutritionBlock — today's intake / energy / hydration.
type nutritionBlock struct {
	CaloriesEaten int           `json:"caloriesEaten"`
	CaloriesBurnt int           `json:"caloriesBurnt"`
	CarbsGrams    float64       `json:"carbsGrams"`
	FatGrams      float64       `json:"fatGrams"`
	ProteinGrams  float64       `json:"proteinGrams"`
	HydrationML   float64       `json:"hydrationMl"`
	LastUpdated   *latestSample `json:"lastUpdated"` // null if nothing logged today
}

type timelineEvent struct {
	Kind          string   `json:"kind"`     // tracked | logged
	Category      string   `json:"category"` // workout | wake | meal | water
	At            string   `json:"at"`       // RFC3339 (UTC)
	OffsetSeconds int      `json:"offsetSeconds"`
	Title         string   `json:"title"`
	Detail        string   `json:"detail"`
	Items         []string `json:"items,omitempty"` // meal contents, when grouped
}

// todayResponse is the whole Today screen in one payload.
type todayResponse struct {
	Date      string                   `json:"date"` // local civil day
	Summary   summaryBlock             `json:"summary"`
	Nutrition nutritionBlock           `json:"nutrition"`
	Timeline  []timelineEvent          `json:"timeline"`
	Sleep     *sleep.LastNightResponse `json:"sleep"`     // null if no sleep recorded
	Readiness readiness.Score          `json:"readiness"` // center-ring score; Value null until warmed up
}

// today assembles the whole screen. The four sections are independent reads, so
// fetch them concurrently and fail the request only if a section errors.
func (h *Handler) today(w http.ResponseWriter, r *http.Request) {
	userID, ok := parseUserID(w, r)
	if !ok {
		return
	}
	ctx := r.Context()
	localDate := h.localDate(ctx, userID)

	var (
		resp     = todayResponse{Date: localDate, Timeline: []timelineEvent{}}
		sumErr   error
		nutErr   error
		tlErr    error
		sleepErr error
		rdyErr   error
	)

	var wg sync.WaitGroup
	wg.Add(5)
	go func() { defer wg.Done(); resp.Summary, sumErr = h.buildSummary(ctx, userID, localDate) }()
	go func() { defer wg.Done(); resp.Nutrition, nutErr = h.buildNutrition(ctx, userID, localDate) }()
	go func() { defer wg.Done(); resp.Timeline, tlErr = h.buildTimeline(ctx, userID, localDate) }()
	go func() { defer wg.Done(); resp.Sleep, sleepErr = h.sleep.LastNight(ctx, userID) }()
	go func() { defer wg.Done(); resp.Readiness, rdyErr = readiness.Compute(ctx, h.db, userID, localDate) }()
	wg.Wait()

	if err := firstErr(sumErr, nutErr, tlErr, sleepErr, rdyErr); err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to load today")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) buildSummary(ctx context.Context, userID int64, localDate string) (summaryBlock, error) {
	s, err := h.repo.DaySummary(ctx, userID, localDate)
	if err != nil {
		return summaryBlock{}, err
	}
	b := summaryBlock{Steps: s.Steps}
	if s.LatestHeartRate != nil {
		b.LatestHeartRate = &latestSample{
			Value:         s.LatestHeartRate.Value,
			At:            s.LatestHeartRate.At.Format(time.RFC3339),
			OffsetSeconds: s.LatestHeartRate.OffsetSeconds,
		}
	}
	return b, nil
}

func (h *Handler) buildNutrition(ctx context.Context, userID int64, localDate string) (nutritionBlock, error) {
	n, err := h.repo.NutritionToday(ctx, userID, localDate)
	if err != nil {
		return nutritionBlock{}, err
	}
	b := nutritionBlock{
		CaloriesEaten: n.CaloriesEaten,
		CaloriesBurnt: n.CaloriesBurnt,
		CarbsGrams:    n.CarbsGrams,
		FatGrams:      n.FatGrams,
		ProteinGrams:  n.ProteinGrams,
		HydrationML:   n.HydrationML,
	}
	if n.LastUpdated != nil {
		b.LastUpdated = &latestSample{
			At:            n.LastUpdated.At.Format(time.RFC3339),
			OffsetSeconds: n.LastUpdated.OffsetSeconds,
		}
	}
	return b, nil
}

func (h *Handler) buildTimeline(ctx context.Context, userID int64, localDate string) ([]timelineEvent, error) {
	events, err := h.repo.Timeline(ctx, userID, localDate)
	if err != nil {
		return nil, err
	}
	out := make([]timelineEvent, 0, len(events))
	for _, e := range events {
		out = append(out, timelineEvent{
			Kind:          e.Kind,
			Category:      e.Category,
			At:            e.At.Format(time.RFC3339),
			OffsetSeconds: e.OffsetSeconds,
			Title:         e.Title,
			Detail:        e.Detail,
			Items:         e.Items,
		})
	}
	return out, nil
}

func firstErr(errs ...error) error {
	for _, e := range errs {
		if e != nil {
			return e
		}
	}
	return nil
}

// localDate computes the user's current local civil date. The server is UTC, so
// "today" depends on the user's UTC offset; we take the most recent known offset
// from their stored data (e.g. 19800s = +05:30) and apply it to now. Falls back
// to UTC if no offset is known.
func (h *Handler) localDate(ctx context.Context, userID int64) string {
	var offset sql.NullInt64
	_ = h.db.QueryRowContext(ctx, `
		SELECT start_utc_offset_seconds
		FROM data_points
		WHERE user_id = $1 AND start_utc_offset_seconds IS NOT NULL
		ORDER BY COALESCE(start_time, sample_time) DESC
		LIMIT 1`, userID).Scan(&offset)
	loc := time.FixedZone("local", int(offset.Int64))
	return time.Now().In(loc).Format("2006-01-02")
}

// parseUserID returns the authenticated user id from the request context (set
// by the auth middleware after verifying the Firebase ID token). Identity is
// never taken from the request itself.
func parseUserID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	userID, ok := authmw.UserID(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthenticated")
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
