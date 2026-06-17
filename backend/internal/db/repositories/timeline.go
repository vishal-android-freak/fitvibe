package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"time"
)

// TimelineEvent is one entry in the Today activity feed. Kind is "tracked"
// (device-detected: workout, wake) or "logged" (manual: meal, water).
type TimelineEvent struct {
	Kind          string    // tracked | logged
	Category      string    // workout | wake | meal | water
	At            time.Time // event instant (UTC)
	OffsetSeconds int       // local UTC offset for wall-clock rendering
	Title         string    // e.g. "Outdoor run", "Breakfast", "Woke up"
	Detail        string    // e.g. "5.2 km · 27 min · 384 kcal"
	// Items lists the contents of a grouped event (meal foods); nil otherwise.
	Items []string
}

// Timeline returns today's loggable/trackable events for the user's local civil
// day, newest first. Meals are grouped (one event per meal with its foods as
// items). AI analysis cards are NOT included (no analysis pipeline yet).
func (r *TodayRepo) Timeline(ctx context.Context, userID int64, localDate string) ([]TimelineEvent, error) {
	var events []TimelineEvent

	workouts, err := r.timelineWorkouts(ctx, userID, localDate)
	if err != nil {
		return nil, err
	}
	events = append(events, workouts...)

	meals, err := r.timelineMeals(ctx, userID, localDate)
	if err != nil {
		return nil, err
	}
	events = append(events, meals...)

	water, err := r.timelineWater(ctx, userID, localDate)
	if err != nil {
		return nil, err
	}
	events = append(events, water...)

	wake, err := r.timelineWake(ctx, userID, localDate)
	if err != nil {
		return nil, err
	}
	events = append(events, wake...)

	// Newest first.
	sort.SliceStable(events, func(i, j int) bool { return events[i].At.After(events[j].At) })
	return events, nil
}

// timelineRow scans payload_json + offset for a data type on the local day.
func (r *TodayRepo) timelineRows(ctx context.Context, userID int64, dataType, localDate string) ([]rawTimelineRow, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT payload_json, COALESCE(start_utc_offset_seconds, 0)
		FROM data_points
		WHERE user_id = $1 AND data_type = $2 AND civil_start_date = $3`,
		userID, dataType, localDate)
	if err != nil {
		return nil, fmt.Errorf("timeline %s: %w", dataType, err)
	}
	defer rows.Close()

	var out []rawTimelineRow
	for rows.Next() {
		var payload string
		var off int
		if err := rows.Scan(&payload, &off); err != nil {
			return nil, fmt.Errorf("scan %s: %w", dataType, err)
		}
		out = append(out, rawTimelineRow{payload: payload, offset: off})
	}
	return out, rows.Err()
}

type rawTimelineRow struct {
	payload string
	offset  int
}

func (r *TodayRepo) timelineWorkouts(ctx context.Context, userID int64, localDate string) ([]TimelineEvent, error) {
	rows, err := r.timelineRows(ctx, userID, "exercise", localDate)
	if err != nil {
		return nil, err
	}
	var out []TimelineEvent
	for _, row := range rows {
		var p struct {
			Exercise struct {
				Interval struct {
					StartTime string `json:"startTime"`
				} `json:"interval"`
				DisplayName    string `json:"displayName"`
				ExerciseType   string `json:"exerciseType"`
				ActiveDuration string `json:"activeDuration"`
				MetricsSummary struct {
					CaloriesKcal        float64 `json:"caloriesKcal"`
					DistanceMillimeters float64 `json:"distanceMillimeters"`
				} `json:"metricsSummary"`
			} `json:"exercise"`
		}
		if err := json.Unmarshal([]byte(row.payload), &p); err != nil {
			continue
		}
		e := p.Exercise
		at := parseRFC3339Time(e.Interval.StartTime)
		if at.IsZero() {
			continue
		}
		title := e.DisplayName
		if title == "" {
			title = titleCase(e.ExerciseType)
		}
		out = append(out, TimelineEvent{
			Kind:          "tracked",
			Category:      "workout",
			At:            at,
			OffsetSeconds: row.offset,
			Title:         title,
			Detail:        workoutDetail(e.MetricsSummary.DistanceMillimeters, e.ActiveDuration, e.MetricsSummary.CaloriesKcal),
		})
	}
	return out, nil
}

func (r *TodayRepo) timelineMeals(ctx context.Context, userID int64, localDate string) ([]TimelineEvent, error) {
	rows, err := r.timelineRows(ctx, userID, "nutrition-log", localDate)
	if err != nil {
		return nil, err
	}
	// Group foods by (mealType, startTime).
	type mealKey struct {
		meal string
		t    string
	}
	type mealAgg struct {
		at     time.Time
		offset int
		kcal   float64
		items  []string
		meal   string
	}
	groups := map[mealKey]*mealAgg{}
	var order []mealKey
	for _, row := range rows {
		var p struct {
			NutritionLog struct {
				Interval struct {
					StartTime string `json:"startTime"`
				} `json:"interval"`
				MealType        string `json:"mealType"`
				FoodDisplayName string `json:"foodDisplayName"`
				Energy          struct {
					Kcal float64 `json:"kcal"`
				} `json:"energy"`
			} `json:"nutritionLog"`
		}
		if err := json.Unmarshal([]byte(row.payload), &p); err != nil {
			continue
		}
		n := p.NutritionLog
		k := mealKey{meal: n.MealType, t: n.Interval.StartTime}
		g := groups[k]
		if g == nil {
			at := parseRFC3339Time(n.Interval.StartTime)
			if at.IsZero() {
				continue
			}
			g = &mealAgg{at: at, offset: row.offset, meal: n.MealType}
			groups[k] = g
			order = append(order, k)
		}
		g.kcal += n.Energy.Kcal
		if n.FoodDisplayName != "" {
			g.items = append(g.items, n.FoodDisplayName)
		}
	}

	var out []TimelineEvent
	for _, k := range order {
		g := groups[k]
		out = append(out, TimelineEvent{
			Kind:          "logged",
			Category:      "meal",
			At:            g.at,
			OffsetSeconds: g.offset,
			Title:         titleCase(g.meal),
			Detail:        fmt.Sprintf("%d kcal · %d %s", int(g.kcal+0.5), len(g.items), pluralize("item", len(g.items))),
			Items:         g.items,
		})
	}
	return out, nil
}

func (r *TodayRepo) timelineWater(ctx context.Context, userID int64, localDate string) ([]TimelineEvent, error) {
	rows, err := r.timelineRows(ctx, userID, "hydration-log", localDate)
	if err != nil {
		return nil, err
	}
	var out []TimelineEvent
	for _, row := range rows {
		var p struct {
			HydrationLog struct {
				Interval struct {
					StartTime string `json:"startTime"`
				} `json:"interval"`
				AmountConsumed struct {
					Milliliters float64 `json:"milliliters"`
				} `json:"amountConsumed"`
			} `json:"hydrationLog"`
		}
		if err := json.Unmarshal([]byte(row.payload), &p); err != nil {
			continue
		}
		h := p.HydrationLog
		at := parseRFC3339Time(h.Interval.StartTime)
		if at.IsZero() {
			continue
		}
		out = append(out, TimelineEvent{
			Kind:          "logged",
			Category:      "water",
			At:            at,
			OffsetSeconds: row.offset,
			Title:         "Logged water",
			Detail:        fmt.Sprintf("+%d ml", int(h.AmountConsumed.Milliliters+0.5)),
		})
	}
	return out, nil
}

func (r *TodayRepo) timelineWake(ctx context.Context, userID int64, localDate string) ([]TimelineEvent, error) {
	// The wake event is the sleep session ending on the local day.
	rows, err := r.db.QueryContext(ctx, `
		SELECT payload_json, COALESCE(end_utc_offset_seconds, start_utc_offset_seconds, 0)
		FROM data_points
		WHERE user_id = $1 AND data_type = 'sleep' AND civil_end_date = $2
		ORDER BY end_time DESC LIMIT 1`, userID, localDate)
	if err != nil {
		return nil, fmt.Errorf("timeline wake: %w", err)
	}
	defer rows.Close()

	var out []TimelineEvent
	for rows.Next() {
		var payload string
		var off int
		if err := rows.Scan(&payload, &off); err != nil {
			return nil, fmt.Errorf("scan wake: %w", err)
		}
		var p struct {
			Sleep struct {
				Interval struct {
					EndTime string `json:"endTime"`
				} `json:"interval"`
				Summary struct {
					MinutesAsleep json.Number `json:"minutesAsleep"`
				} `json:"summary"`
			} `json:"sleep"`
		}
		if err := json.Unmarshal([]byte(payload), &p); err != nil {
			continue
		}
		at := parseRFC3339Time(p.Sleep.Interval.EndTime)
		if at.IsZero() {
			continue
		}
		mins, _ := p.Sleep.Summary.MinutesAsleep.Int64()
		out = append(out, TimelineEvent{
			Kind:          "tracked",
			Category:      "wake",
			At:            at,
			OffsetSeconds: off,
			Title:         "Woke up",
			Detail:        fmt.Sprintf("%s asleep", fmtDuration(int(mins)*60)),
		})
	}
	return out, rows.Err()
}

// parseRFC3339Time parses a timestamp string taken from a JSON payload field
// (Google's API emits RFC3339), tolerating the space-separated variant too.
// Returns the zero time if unparseable.
func parseRFC3339Time(s string) time.Time {
	for _, layout := range []string{time.RFC3339Nano, time.RFC3339, "2006-01-02 15:04:05Z07:00", "2006-01-02 15:04:05"} {
		if t, err := time.Parse(layout, s); err == nil {
			return t
		}
	}
	return time.Time{}
}

// --- small formatting helpers ---

func workoutDetail(distanceMm float64, activeDuration string, kcal float64) string {
	parts := []string{}
	if distanceMm > 0 {
		km := distanceMm / 1_000_000
		parts = append(parts, fmt.Sprintf("%.1f km", km))
	}
	if secs := parseDurationSecondsStr(activeDuration); secs > 0 {
		parts = append(parts, fmtDuration(secs))
	}
	if kcal > 0 {
		parts = append(parts, fmt.Sprintf("%d kcal", int(kcal+0.5)))
	}
	return joinDots(parts)
}

// parseDurationSecondsStr parses Google's "600s" duration form.
func parseDurationSecondsStr(s string) int {
	if s == "" {
		return 0
	}
	if s[len(s)-1] == 's' {
		s = s[:len(s)-1]
	}
	var f float64
	if _, err := fmt.Sscanf(s, "%f", &f); err != nil {
		return 0
	}
	return int(f)
}

func fmtDuration(secs int) string {
	m := secs / 60
	if m < 60 {
		return fmt.Sprintf("%d min", m)
	}
	h := m / 60
	rem := m % 60
	if rem == 0 {
		return fmt.Sprintf("%dh", h)
	}
	return fmt.Sprintf("%dh %dm", h, rem)
}

func joinDots(parts []string) string {
	out := ""
	for i, p := range parts {
		if i > 0 {
			out += " · "
		}
		out += p
	}
	return out
}

func pluralize(word string, n int) string {
	if n == 1 {
		return word
	}
	return word + "s"
}

// titleCase converts an enum like "BREAKFAST" or "OPEN_WATER_SWIM" to "Breakfast"
// / "Open Water Swim".
func titleCase(s string) string {
	if s == "" {
		return ""
	}
	out := make([]rune, 0, len(s))
	startWord := true
	for _, r := range s {
		if r == '_' || r == ' ' {
			out = append(out, ' ')
			startWord = true
			continue
		}
		if startWord {
			out = append(out, upper(r))
			startWord = false
		} else {
			out = append(out, lower(r))
		}
	}
	return string(out)
}

func upper(r rune) rune {
	if r >= 'a' && r <= 'z' {
		return r - 32
	}
	return r
}

func lower(r rune) rune {
	if r >= 'A' && r <= 'Z' {
		return r + 32
	}
	return r
}
