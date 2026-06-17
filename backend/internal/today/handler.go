// Package today serves the Today screen's live day rollups: activity snapshot
// (steps + current heart rate) and nutrition/energy/hydration totals.
package today

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
)

// Handler exposes read-only "today" endpoints for the app.
type Handler struct {
	repo *repositories.TodayRepo
	db   *sql.DB
}

func NewHandler(repo *repositories.TodayRepo, db *sql.DB) *Handler {
	return &Handler{repo: repo, db: db}
}

// Register mounts the today routes.
func (h *Handler) Register(r chi.Router) {
	r.Get("/me/today/summary", h.summary)
	r.Get("/me/today/timeline", h.timeline)
	r.Get("/me/nutrition/today", h.nutrition)
}

// latestSample is a timestamped reading. Value is omitted for timestamp-only
// uses (e.g. nutrition "last updated"), present for metric samples (heart rate).
type latestSample struct {
	Value         float64 `json:"value,omitempty"`
	At            string  `json:"at"`            // RFC3339 sample instant (UTC)
	OffsetSeconds int     `json:"offsetSeconds"` // local UTC offset for rendering wall-clock
}

type summaryResponse struct {
	Date            string        `json:"date"` // local civil day used
	Steps           int           `json:"steps"`
	LatestHeartRate *latestSample `json:"latestHeartRate"` // null if no sample
}

type nutritionResponse struct {
	Date          string        `json:"date"`
	CaloriesEaten int           `json:"caloriesEaten"`
	CaloriesBurnt int           `json:"caloriesBurnt"`
	CarbsGrams    float64       `json:"carbsGrams"`
	FatGrams      float64       `json:"fatGrams"`
	ProteinGrams  float64       `json:"proteinGrams"`
	HydrationML   float64       `json:"hydrationMl"`
	LastUpdated   *latestSample `json:"lastUpdated"` // null if nothing logged today
}

func (h *Handler) summary(w http.ResponseWriter, r *http.Request) {
	userID, ok := parseUserID(w, r)
	if !ok {
		return
	}
	localDate := h.localDate(r.Context(), userID)

	s, err := h.repo.DaySummary(r.Context(), userID, localDate)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to load today summary")
		return
	}

	resp := summaryResponse{Date: localDate, Steps: s.Steps}
	if s.LatestHeartRate != nil {
		resp.LatestHeartRate = &latestSample{
			Value:         s.LatestHeartRate.Value,
			At:            s.LatestHeartRate.At.Format(time.RFC3339),
			OffsetSeconds: s.LatestHeartRate.OffsetSeconds,
		}
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) nutrition(w http.ResponseWriter, r *http.Request) {
	userID, ok := parseUserID(w, r)
	if !ok {
		return
	}
	localDate := h.localDate(r.Context(), userID)

	n, err := h.repo.NutritionToday(r.Context(), userID, localDate)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to load nutrition")
		return
	}
	resp := nutritionResponse{
		Date:          localDate,
		CaloriesEaten: n.CaloriesEaten,
		CaloriesBurnt: n.CaloriesBurnt,
		CarbsGrams:    n.CarbsGrams,
		FatGrams:      n.FatGrams,
		ProteinGrams:  n.ProteinGrams,
		HydrationML:   n.HydrationML,
	}
	if n.LastUpdated != nil {
		resp.LastUpdated = &latestSample{
			At:            n.LastUpdated.At.Format(time.RFC3339),
			OffsetSeconds: n.LastUpdated.OffsetSeconds,
		}
	}
	writeJSON(w, http.StatusOK, resp)
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

type timelineResponse struct {
	Date   string          `json:"date"`
	Events []timelineEvent `json:"events"`
}

func (h *Handler) timeline(w http.ResponseWriter, r *http.Request) {
	userID, ok := parseUserID(w, r)
	if !ok {
		return
	}
	localDate := h.localDate(r.Context(), userID)

	events, err := h.repo.Timeline(r.Context(), userID, localDate)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to load timeline")
		return
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
	writeJSON(w, http.StatusOK, timelineResponse{Date: localDate, Events: out})
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
		WHERE user_id = ? AND start_utc_offset_seconds IS NOT NULL
		ORDER BY COALESCE(start_time, sample_time) DESC
		LIMIT 1`, userID).Scan(&offset)
	loc := time.FixedZone("local", int(offset.Int64))
	return time.Now().In(loc).Format("2006-01-02")
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
