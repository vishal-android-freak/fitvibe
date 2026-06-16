package ingestion

import (
	"database/sql"
	"encoding/json"
	"testing"

	"github.com/vishal-android-freak/fitvibe/internal/healthapi"
)

func TestMapDataPointHeartRate(t *testing.T) {
	raw := `{
		"dataSource": {"recordingMethod": "PASSIVELY_MEASURED", "platform": "FITBIT"},
		"heartRate": {
			"sampleTime": {"observationTime": "2026-06-15T10:00:00Z"},
			"beatsPerMinute": "72"
		}
	}`

	var dp healthapi.DataPoint
	if err := json.Unmarshal([]byte(raw), &dp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	rec, err := MapDataPoint(1, "heart-rate", "test", &dp, sql.NullInt64{})
	if err != nil {
		t.Fatalf("map: %v", err)
	}

	if rec.DataType != "heart-rate" {
		t.Errorf("data_type = %q", rec.DataType)
	}
	if !rec.SampleTime.Valid {
		t.Error("expected sample_time")
	}
	if !rec.ValueAvg.Valid || rec.ValueAvg.Float64 != 72 {
		t.Errorf("value_avg = %v", rec.ValueAvg)
	}
	if rec.DataPointCategory != "sample" {
		t.Errorf("category = %q", rec.DataPointCategory)
	}
}

func TestMapDataPointSteps(t *testing.T) {
	raw := `{
		"steps": {
			"interval": {
				"startTime": "2026-06-15T10:00:00Z",
				"endTime": "2026-06-15T10:01:00Z"
			},
			"count": "150"
		}
	}`

	var dp healthapi.DataPoint
	if err := json.Unmarshal([]byte(raw), &dp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	rec, err := MapDataPoint(1, "steps", "test", &dp, sql.NullInt64{})
	if err != nil {
		t.Fatalf("map: %v", err)
	}

	if !rec.ValueCount.Valid || rec.ValueCount.Int32 != 150 {
		t.Errorf("value_count = %v", rec.ValueCount)
	}
	if !rec.StartTime.Valid || !rec.EndTime.Valid {
		t.Error("expected interval times")
	}
}

func TestMapDataPointDistanceMillimeters(t *testing.T) {
	raw := `{
		"distance": {
			"interval": {
				"startTime": "2026-06-15T10:00:00Z",
				"endTime": "2026-06-15T10:01:00Z"
			},
			"millimeters": "2500"
		}
	}`

	var dp healthapi.DataPoint
	if err := json.Unmarshal([]byte(raw), &dp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	rec, err := MapDataPoint(1, "distance", "test", &dp, sql.NullInt64{})
	if err != nil {
		t.Fatalf("map: %v", err)
	}

	if !rec.ValueSum.Valid || rec.ValueSum.Float64 != 2.5 {
		t.Errorf("value_sum = %v, want 2.5", rec.ValueSum)
	}
}

func TestMapDataPointWeight(t *testing.T) {
	raw := `{
		"weight": {
			"sampleTime": {"observationTime": "2026-06-15T10:00:00Z"},
			"weightGrams": 86500
		}
	}`

	var dp healthapi.DataPoint
	if err := json.Unmarshal([]byte(raw), &dp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	rec, err := MapDataPoint(1, "weight", "test", &dp, sql.NullInt64{})
	if err != nil {
		t.Fatalf("map: %v", err)
	}

	if !rec.ValueAvg.Valid || rec.ValueAvg.Float64 != 86500 {
		t.Errorf("value_avg = %v", rec.ValueAvg)
	}
}

func TestMapDataPointSleep(t *testing.T) {
	raw := `{
		"sleep": {
			"interval": {
				"startTime": "2026-06-15T10:00:00Z",
				"endTime": "2026-06-15T11:00:00Z"
			},
			"type": "STAGES",
			"summary": {"minutesAsleep": "55"}
		}
	}`

	var dp healthapi.DataPoint
	if err := json.Unmarshal([]byte(raw), &dp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	rec, err := MapDataPoint(1, "sleep", "test", &dp, sql.NullInt64{})
	if err != nil {
		t.Fatalf("map: %v", err)
	}

	if rec.EnumValue.String != "STAGES" {
		t.Errorf("enum_value = %v", rec.EnumValue)
	}
	if !rec.ValueCount.Valid || rec.ValueCount.Int32 != 55 {
		t.Errorf("value_count = %v", rec.ValueCount)
	}
}
