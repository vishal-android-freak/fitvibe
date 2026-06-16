package healthapi

import (
	"encoding/json"
	"testing"
	"time"
)

func TestCategory(t *testing.T) {
	cases := []struct {
		dataType string
		want     string
	}{
		{"steps", "interval"},
		{"heart-rate", "sample"},
		{"sleep", "session"},
		{"daily-resting-heart-rate", "daily"},
		{"food", "food"},
		{"unknown-type", "unknown"},
	}
	for _, c := range cases {
		got := Category(c.dataType)
		if got != c.want {
			t.Errorf("Category(%q) = %q, want %q", c.dataType, got, c.want)
		}
	}
}

func TestDataPointUnmarshal(t *testing.T) {
	raw := `{
		"name": "users/123/dataTypes/heart-rate/dataPoints/abc",
		"dataSource": {"recordingMethod": "PASSIVELY_MEASURED", "platform": "FITBIT"},
		"heartRate": {
			"sampleTime": {"observationTime": "2026-06-15T10:00:00Z"},
			"beatsPerMinute": "72"
		}
	}`

	var dp DataPoint
	if err := json.Unmarshal([]byte(raw), &dp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if dp.Name != "users/123/dataTypes/heart-rate/dataPoints/abc" {
		t.Errorf("name = %q, want %q", dp.Name, "users/123/dataTypes/heart-rate/dataPoints/abc")
	}
	if dp.DataSource.Platform != "FITBIT" {
		t.Errorf("platform = %q, want FITBIT", dp.DataSource.Platform)
	}
	data := dp.DataTypeData()
	if data == nil {
		t.Fatal("expected union data")
	}
	if data["beatsPerMinute"] != "72" {
		t.Errorf("beatsPerMinute = %v, want 72", data["beatsPerMinute"])
	}
}

func TestDataPointTimeRange(t *testing.T) {
	raw := `{
		"steps": {
			"interval": {
				"startTime": "2026-06-15T10:00:00Z",
				"endTime": "2026-06-15T10:01:00Z"
			},
			"count": "100"
		}
	}`

	var dp DataPoint
	if err := json.Unmarshal([]byte(raw), &dp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	start, end, err := dp.DataPointTimeRange("interval")
	if err != nil {
		t.Fatalf("time range: %v", err)
	}
	if start.IsZero() || end.IsZero() {
		t.Fatal("expected non-zero times")
	}
	if !start.Equal(time.Date(2026, 6, 15, 10, 0, 0, 0, time.UTC)) {
		t.Errorf("start = %v", start)
	}
}

func TestDataPointTimeRangeSample(t *testing.T) {
	raw := `{
		"weight": {
			"sampleTime": {"observationTime": "2026-06-15T10:00:00Z"},
			"weightGrams": 70000
		}
	}`

	var dp DataPoint
	if err := json.Unmarshal([]byte(raw), &dp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	start, _, err := dp.DataPointTimeRange("sample")
	if err != nil {
		t.Fatalf("time range: %v", err)
	}
	if !start.Equal(time.Date(2026, 6, 15, 10, 0, 0, 0, time.UTC)) {
		t.Errorf("sample time = %v", start)
	}
}
