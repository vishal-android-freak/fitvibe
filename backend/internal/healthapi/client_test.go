package healthapi

import (
	"net/url"
	"testing"
	"time"
)

func TestSetFilterQueryInterval(t *testing.T) {
	q := url.Values{}
	start := time.Date(2026, 6, 15, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 6, 16, 0, 0, 0, 0, time.UTC)
	setFilterQuery(q, "steps", "interval", start, end)

	got := q.Get("filter")
	want := `steps.interval.start_time >= "2026-06-15T00:00:00Z" AND steps.interval.start_time < "2026-06-16T00:00:00Z"`
	if got != want {
		t.Errorf("filter = %q, want %q", got, want)
	}
}

func TestSetFilterQuerySample(t *testing.T) {
	q := url.Values{}
	start := time.Date(2026, 6, 15, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 6, 16, 0, 0, 0, 0, time.UTC)
	setFilterQuery(q, "heart-rate", "sample", start, end)

	got := q.Get("filter")
	want := `heart_rate.sample_time.physical_time >= "2026-06-15T00:00:00Z" AND heart_rate.sample_time.physical_time < "2026-06-16T00:00:00Z"`
	if got != want {
		t.Errorf("filter = %q, want %q", got, want)
	}
}

func TestSetFilterQuerySession(t *testing.T) {
	// Sessions other than sleep/ECG filter on interval.civil_start_time using a
	// civil datetime (no zone) — interval.start_time AND interval.end_time are
	// both rejected (INVALID_DATA_POINT_FILTER_DATA_TYPE_MEMBER).
	start := time.Date(2026, 6, 15, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 6, 16, 0, 0, 0, 0, time.UTC)
	for _, dt := range []string{"exercise", "nutrition-log", "hydration-log"} {
		q := url.Values{}
		setFilterQuery(q, dt, "session", start, end)
		snake := kebabToSnake(dt)
		want := snake + `.interval.civil_start_time >= "2026-06-15T00:00:00" AND ` + snake + `.interval.civil_start_time < "2026-06-16T00:00:00"`
		if got := q.Get("filter"); got != want {
			t.Errorf("%s filter = %q, want %q", dt, got, want)
		}
	}
}

func TestSetFilterQuerySleep(t *testing.T) {
	q := url.Values{}
	start := time.Date(2026, 6, 15, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 6, 16, 0, 0, 0, 0, time.UTC)
	setFilterQuery(q, "sleep", "session", start, end)

	got := q.Get("filter")
	want := `sleep.interval.end_time >= "2026-06-15T00:00:00Z" AND sleep.interval.end_time < "2026-06-16T00:00:00Z"`
	if got != want {
		t.Errorf("filter = %q, want %q", got, want)
	}
}

func TestSetFilterQueryECG(t *testing.T) {
	q := url.Values{}
	start := time.Date(2026, 6, 15, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 6, 16, 0, 0, 0, 0, time.UTC)
	// ECG (session) filters on interval.start_time (RFC3339) with >= only.
	setFilterQuery(q, "electrocardiogram", "session", start, end)

	got := q.Get("filter")
	want := `electrocardiogram.interval.start_time >= "2026-06-15T00:00:00Z"`
	if got != want {
		t.Errorf("filter = %q, want %q", got, want)
	}
}

func TestSetFilterQueryDaily(t *testing.T) {
	q := url.Values{}
	start := time.Date(2026, 6, 15, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 6, 17, 0, 0, 0, 0, time.UTC)
	setFilterQuery(q, "daily-vo2-max", "daily", start, end)

	got := q.Get("filter")
	want := `daily_vo2_max.date >= "2026-06-15" AND daily_vo2_max.date < "2026-06-17"`
	if got != want {
		t.Errorf("filter = %q, want %q", got, want)
	}
}

// TestSetFilterQueryDailySameDay covers the INVALID_TIME_RANGE bug: when a
// daily-category window's start and end land on the same civil date (a frequent
// cron resuming from a recent last_end_time), the upper bound must be pushed to
// the next day so `>= D AND < D` doesn't become an empty range.
func TestSetFilterQueryDailySameDay(t *testing.T) {
	q := url.Values{}
	start := time.Date(2026, 6, 17, 6, 31, 0, 0, time.UTC)
	end := time.Date(2026, 6, 17, 12, 44, 0, 0, time.UTC)
	setFilterQuery(q, "daily-vo2-max", "daily", start, end)

	got := q.Get("filter")
	want := `daily_vo2_max.date >= "2026-06-17" AND daily_vo2_max.date < "2026-06-18"`
	if got != want {
		t.Errorf("filter = %q, want %q", got, want)
	}
}

func TestKebabToSnake(t *testing.T) {
	if got := kebabToSnake("heart-rate"); got != "heart_rate" {
		t.Errorf("kebabToSnake = %q", got)
	}
}
