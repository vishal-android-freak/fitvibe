// Package sleep serves derived sleep views (the Today "last night" hypnogram).
package sleep

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"

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

// lastNightResponse is the full payload the SleepCard/Hypnogram render.
type lastNightResponse struct {
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
	// Number of awakenings (distinct Awake periods).
	Awakenings int `json:"awakenings"`
	// Per-stage breakdown with the typical-for-age target each bar marks against.
	Stages  []stageTotal  `json:"stages"`
	Typical TypicalStages `json:"typical"`
}

func (h *Handler) lastNight(w http.ResponseWriter, r *http.Request) {
	userID, err := strconv.ParseInt(r.URL.Query().Get("user_id"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "valid user_id query parameter is required")
		return
	}

	night, err := h.sleep.LatestNight(r.Context(), userID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to load sleep")
		return
	}
	if night == nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	age := h.userAge(r.Context(), userID)
	resp := buildLastNight(night, age)
	writeJSON(w, http.StatusOK, resp)
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

func buildLastNight(n *repositories.SleepNight, age int) lastNightResponse {
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

	// Per-stage totals: prefer the device summary (authoritative minutes + count),
	// fall back to summing segments when no summary is present.
	type agg struct {
		minutes int
		count   int
	}
	totals := map[string]*agg{"Deep": {}, "REM": {}, "Light": {}, "Awake": {}}
	if len(n.Summary) > 0 {
		for _, s := range n.Summary {
			stage := canonStage(s.StageType)
			if a, ok := totals[stage]; ok {
				a.minutes += s.Minutes
				a.count += s.Count
			}
		}
	} else {
		for _, seg := range segments {
			a := totals[seg.Stage]
			a.minutes += seg.Minutes
			a.count++
		}
	}

	total := 0
	for _, a := range totals {
		total += a.minutes
	}
	asleep := total - totals["Awake"].minutes

	stages := make([]stageTotal, 0, 4)
	for _, stage := range []string{"Deep", "REM", "Light", "Awake"} {
		a := totals[stage]
		pct := 0
		if total > 0 {
			pct = int(float64(a.minutes)/float64(total)*100 + 0.5)
		}
		stages = append(stages, stageTotal{Stage: stage, Minutes: a.minutes, Percent: pct, Count: a.count})
	}

	eff := 0
	if total > 0 {
		eff = int(float64(asleep)/float64(total)*100 + 0.5)
	}

	clockOf := func(t time.Time) int {
		lt := t.In(loc)
		return lt.Hour()*60 + lt.Minute()
	}

	return lastNightResponse{
		Segments:      segments,
		OnsetClock:    clockOf(n.Start),
		WakeClock:     clockOf(n.End),
		TotalMinutes:  total,
		AsleepMinutes: asleep,
		Efficiency:    eff,
		Awakenings:    totals["Awake"].count,
		Stages:        stages,
		Typical:       typicalByAge(age),
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
