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
	q := url.Values{}
	start := time.Date(2026, 6, 15, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 6, 16, 0, 0, 0, 0, time.UTC)
	setFilterQuery(q, "exercise", "session", start, end)

	got := q.Get("filter")
	// Sessions filter on the physical interval.start_time (RFC3339), matching
	// the live API; civil-date filtering on sessions returned wrong windows.
	want := `exercise.interval.start_time >= "2026-06-15T00:00:00Z" AND exercise.interval.start_time < "2026-06-16T00:00:00Z"`
	if got != want {
		t.Errorf("filter = %q, want %q", got, want)
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
	setFilterQuery(q, "electrocardiogram", "interval", start, end)

	got := q.Get("filter")
	want := `electrocardiogram.interval.start_time >= "2026-06-15T00:00:00Z"`
	if got != want {
		t.Errorf("filter = %q, want %q", got, want)
	}
}

func TestKebabToSnake(t *testing.T) {
	if got := kebabToSnake("heart-rate"); got != "heart_rate" {
		t.Errorf("kebabToSnake = %q", got)
	}
}
