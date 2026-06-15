package ingestion

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
	"github.com/vishal-android-freak/fitvibe/internal/healthapi"
)

// MapDataPoint converts a healthapi.DataPoint into a DB record.
func MapDataPoint(userID int64, dataType, fetchedVia string, dp *healthapi.DataPoint, webhookID sql.NullInt64) (*repositories.DataPointRecord, error) {
	category := healthapi.Category(dataType)

	payload, err := json.Marshal(dp)
	if err != nil {
		return nil, fmt.Errorf("marshal payload: %w", err)
	}

	rec := &repositories.DataPointRecord{
		UserID:                userID,
		DataType:              dataType,
		DataPointCategory:     category,
		PayloadJSON:           string(payload),
		FetchedVia:            fetchedVia,
		WebhookNotificationID: webhookID,
	}

	if dp.Name != "" {
		rec.GoogleDataPointName = sql.NullString{String: dp.Name, Valid: true}
	}
	if dp.DataSource.DataSourceFamily != "" {
		rec.DataSourceFamily = sql.NullString{String: dp.DataSource.DataSourceFamily, Valid: true}
	}
	if dp.DataSource.RecordingMethod != "" {
		rec.RecordingMethod = sql.NullString{String: dp.DataSource.RecordingMethod, Valid: true}
	}
	if dp.DataSource.Platform != "" {
		rec.Platform = sql.NullString{String: dp.DataSource.Platform, Valid: true}
	}
	if dp.DataSource.DeviceName != "" {
		rec.DeviceName = sql.NullString{String: dp.DataSource.DeviceName, Valid: true}
	}
	if dp.DataSource.DeviceFormFactor != "" {
		rec.DeviceFormFactor = sql.NullString{String: dp.DataSource.DeviceFormFactor, Valid: true}
	}
	if dp.DataSource.ApplicationPackageName != "" {
		rec.ApplicationPackageName = sql.NullString{String: dp.DataSource.ApplicationPackageName, Valid: true}
	}

	dsJSON, _ := json.Marshal(dp.DataSource)
	rec.DataSourceJSON = sql.NullString{String: string(dsJSON), Valid: len(dsJSON) > 2}

	start, end, err := dp.DataPointTimeRange(category)
	if err != nil {
		return nil, fmt.Errorf("extract time range: %w", err)
	}

	setTime := func(t time.Time) sql.NullTime {
		if t.IsZero() {
			return sql.NullTime{}
		}
		return sql.NullTime{Time: t, Valid: true}
	}

	if category == "sample" {
		rec.SampleTime = setTime(start)
	} else {
		rec.StartTime = setTime(start)
		rec.EndTime = setTime(end)
	}

	rec.CivilStartDate = civilDate(start)
	rec.CivilEndDate = civilDate(end)

	if !start.IsZero() {
		rec.CivilStartTime = sql.NullString{String: start.Format(time.RFC3339), Valid: true}
	}
	if !end.IsZero() {
		rec.CivilEndTime = sql.NullString{String: end.Format(time.RFC3339), Valid: true}
	}

	startOff, endOff := dp.UTCOffsets(category)
	if startOff != nil {
		rec.StartUTCOffsetSeconds = sql.NullInt32{Int32: *startOff, Valid: true}
	}
	if endOff != nil {
		rec.EndUTCOffsetSeconds = sql.NullInt32{Int32: *endOff, Valid: true}
	}

	extractScalars(rec, dataType, dp.ValueMap())
	return rec, nil
}

func civilDate(t time.Time) sql.NullTime {
	if t.IsZero() {
		return sql.NullTime{}
	}
	return sql.NullTime{Time: time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC), Valid: true}
}

func extractScalars(rec *repositories.DataPointRecord, dataType string, value map[string]interface{}) {
	if value == nil {
		return
	}

	switch dataType {
	case "steps", "swim-lengths-data":
		if n, ok := value["count"]; ok {
			rec.ValueCount = sql.NullInt32{Int32: int32(number(n)), Valid: true}
		}
		if n, ok := value["strokeCount"]; ok {
			rec.ValueCount = sql.NullInt32{Int32: int32(number(n)), Valid: true}
		}
	case "active-zone-minutes":
		if n, ok := value["activeZoneMinutes"]; ok {
			rec.ValueCount = sql.NullInt32{Int32: int32(number(n)), Valid: true}
		}
		if n, ok := value["heartRateZone"].(string); ok {
			rec.EnumValue = sql.NullString{String: n, Valid: true}
		}
	case "distance":
		if n, ok := value["distanceMeters"]; ok {
			rec.ValueSum = sql.NullFloat64{Float64: number(n), Valid: true}
		} else if n, ok := value["millimeters"]; ok {
			rec.ValueSum = sql.NullFloat64{Float64: number(n) / 1000.0, Valid: true}
		}
	case "altitude":
		if n, ok := value["gainMeters"]; ok {
			rec.ValueSum = sql.NullFloat64{Float64: number(n), Valid: true}
		} else if n, ok := value["gainMillimeters"]; ok {
			rec.ValueSum = sql.NullFloat64{Float64: number(n) / 1000.0, Valid: true}
		}
	case "heart-rate":
		if n, ok := value["beatsPerMinute"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
		}
		if meta, ok := value["metadata"].(map[string]interface{}); ok {
			if n, ok := meta["motionContext"].(string); ok {
				rec.EnumValueSecondary = sql.NullString{String: n, Valid: true}
			}
		}
	case "weight":
		if n, ok := value["weightGrams"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
		} else if n, ok := value["weightMilligrams"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n) / 1000.0, Valid: true}
		}
	case "body-fat":
		if n, ok := value["percentage"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
		}
	case "blood-glucose":
		if n, ok := value["levelMillimolesPerLiter"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
		}
		if n, ok := value["mealType"].(string); ok {
			rec.EnumValueSecondary = sql.NullString{String: n, Valid: true}
		}
	case "hydration-log":
		if n, ok := value["volumeMilliliters"]; ok {
			rec.ValueSum = sql.NullFloat64{Float64: number(n), Valid: true}
		}
	case "activity-level":
		if n, ok := value["activityLevelType"].(string); ok {
			rec.EnumValue = sql.NullString{String: n, Valid: true}
		}
		if n, ok := value["activeMinutes"]; ok {
			rec.ValueCount = sql.NullInt32{Int32: int32(number(n)), Valid: true}
		}
	case "time-in-heart-rate-zone":
		if n, ok := value["heartRateZoneType"].(string); ok {
			rec.EnumValue = sql.NullString{String: n, Valid: true}
		}
		if n, ok := value["timeInHeartRateZoneMinutes"]; ok {
			rec.ValueCount = sql.NullInt32{Int32: int32(number(n)), Valid: true}
		}
	case "sleep":
		if n, ok := value["type"].(string); ok {
			rec.EnumValue = sql.NullString{String: n, Valid: true}
		}
		if stages, ok := value["stages"].([]interface{}); ok && len(stages) > 0 {
			rec.ValueCount = sql.NullInt32{Int32: int32(len(stages)), Valid: true}
		}
		if summary, ok := value["summary"].(map[string]interface{}); ok {
			if n, ok := summary["minutesAsleep"]; ok {
				rec.ValueCount = sql.NullInt32{Int32: int32(number(n)), Valid: true}
			}
		}
	case "exercise":
		if n, ok := value["exerciseType"].(string); ok {
			rec.EnumValue = sql.NullString{String: n, Valid: true}
		}
		if summary, ok := value["metricsSummary"].(map[string]interface{}); ok {
			if n, ok := summary["caloriesKcal"]; ok {
				rec.ValueSum = sql.NullFloat64{Float64: number(n), Valid: true}
			}
			if n, ok := summary["steps"]; ok {
				rec.ValueCount = sql.NullInt32{Int32: int32(number(n)), Valid: true}
			}
		}
	case "heart-rate-variability":
		if n, ok := value["milliseconds"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
		}
	case "daily-resting-heart-rate":
		if n, ok := value["beatsPerMinute"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
		}
	case "daily-heart-rate-variability":
		if n, ok := value["milliseconds"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
		}
	case "daily-heart-rate-zones":
		if zones, ok := value["zones"].([]interface{}); ok {
			rec.ValueCount = sql.NullInt32{Int32: int32(len(zones)), Valid: true}
		}
	case "run-vo2-max":
		if n, ok := value["millilitersPerKilogramPerMinute"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
		}
	case "respiratory-rate-sleep-summary":
		if n, ok := value["breathsPerMinute"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
		}
	case "height":
		if n, ok := value["heightMeters"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
		} else if n, ok := value["heightMillimeters"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n) / 1000.0, Valid: true}
		} else if n, ok := value["meters"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
		} else if n, ok := value["millimeters"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n) / 1000.0, Valid: true}
		}
	case "daily-sleep-temperature-derivations":
		if n, ok := value["nightlyTemperatureCelsius"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
		}
	case "daily-oxygen-saturation":
		if n, ok := value["percentage"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
		}
	case "daily-respiratory-rate":
		if n, ok := value["breathsPerMinute"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
		}
	case "oxygen-saturation":
		if n, ok := value["percentage"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
		}
	case "core-body-temperature":
		if n, ok := value["temperatureCelsius"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
		}
	case "active-energy-burned":
		if n, ok := value["kcal"]; ok {
			rec.ValueSum = sql.NullFloat64{Float64: number(n), Valid: true}
		}
	case "total-calories":
		if n, ok := value["kcal"]; ok {
			rec.ValueSum = sql.NullFloat64{Float64: number(n), Valid: true}
		}
	case "active-minutes":
		if n, ok := value["activeMinutesByActivityLevel"].([]interface{}); ok && len(n) > 0 {
			rec.ValueCount = sql.NullInt32{Int32: int32(len(n)), Valid: true}
		}
	case "sedentary-period":
		if n, ok := value["sedentaryDurationMinutes"]; ok {
			rec.ValueCount = sql.NullInt32{Int32: int32(number(n)), Valid: true}
		}
	case "nutrition-log":
		if energy, ok := value["energy"].(map[string]interface{}); ok {
			if n, ok := energy["kcal"]; ok {
				rec.ValueSum = sql.NullFloat64{Float64: number(n), Valid: true}
			}
		}
		if n, ok := value["mealType"].(string); ok {
			rec.EnumValueSecondary = sql.NullString{String: n, Valid: true}
		}
	}
}

func number(v interface{}) float64 {
	switch n := v.(type) {
	case float64:
		return n
	case int:
		return float64(n)
	case int64:
		return float64(n)
	case string:
		var f float64
		fmt.Sscanf(n, "%f", &f)
		return f
	}
	return 0
}

// ParseInterval parses an RFC3339 interval string.
func ParseInterval(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, nil
	}
	t, err := time.Parse(time.RFC3339Nano, s)
	if err != nil {
		t, err = time.Parse(time.RFC3339, s)
	}
	return t, err
}
