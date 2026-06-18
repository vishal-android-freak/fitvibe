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

// RemapPayload re-parses a stored payload_json blob back into a DB record using
// the current parsing/extraction logic. Used by the backfill command to
// recompute extracted fields and child rows from already-persisted raw data
// without re-fetching from Google. The produced record carries the same time
// coordinates, so re-inserting it upserts in place (no duplicates).
func RemapPayload(userID int64, dataType, fetchedVia string, payloadJSON string, webhookID sql.NullInt64) (*repositories.DataPointRecord, error) {
	var dp healthapi.DataPoint
	if err := json.Unmarshal([]byte(payloadJSON), &dp); err != nil {
		return nil, fmt.Errorf("unmarshal payload: %w", err)
	}
	return MapDataPoint(userID, dataType, fetchedVia, &dp, webhookID)
}

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
	if name := dp.DataSource.DeviceName(); name != "" {
		rec.DeviceName = sql.NullString{String: name, Valid: true}
	}
	if ff := dp.DataSource.DeviceFormFactor(); ff != "" {
		rec.DeviceFormFactor = sql.NullString{String: ff, Valid: true}
	}
	if pkg := dp.DataSource.ApplicationPackageName(); pkg != "" {
		rec.ApplicationPackageName = sql.NullString{String: pkg, Valid: true}
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
	extractChildren(rec, dataType, dp.ValueMap())
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
		// Real payload: {"amountConsumed":{"milliliters":1300,"userProvidedUnit":"LITER"}}
		if amt, ok := value["amountConsumed"].(map[string]interface{}); ok {
			if n, ok := amt["milliliters"]; ok {
				rec.ValueSum = sql.NullFloat64{Float64: number(n), Valid: true}
			}
		} else if vol, ok := value["volume"].(map[string]interface{}); ok {
			if n, ok := vol["value"]; ok {
				rec.ValueSum = sql.NullFloat64{Float64: number(n), Valid: true}
			}
		} else if n, ok := value["volumeMilliliters"]; ok {
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
		// The duration is expressed as a Duration string ("600s") under
		// "timeInZone"; older payloads used "timeInHeartRateZoneMinutes".
		if secs := durationSeconds(value["timeInZone"]); secs > 0 {
			rec.ValueSum = sql.NullFloat64{Float64: secs, Valid: true}
		} else if n, ok := value["timeInHeartRateZoneMinutes"]; ok {
			rec.ValueSum = sql.NullFloat64{Float64: number(n) * 60, Valid: true}
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
		// metadata.nap marks naps (absent for the main/overnight sleep). Promote
		// it so the read API can tell a nap from a proper night.
		if meta, ok := value["metadata"].(map[string]interface{}); ok {
			if nap, ok := meta["nap"].(bool); ok {
				rec.IsNap = sql.NullBool{Bool: nap, Valid: true}
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
		// Real field: rootMeanSquareOfSuccessiveDifferencesMilliseconds (RMSSD).
		if n, ok := value["rootMeanSquareOfSuccessiveDifferencesMilliseconds"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
		} else if n, ok := value["milliseconds"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
		}
		if n, ok := value["standardDeviationMilliseconds"]; ok {
			rec.ValueMin = sql.NullFloat64{Float64: number(n), Valid: true}
		}
	case "daily-resting-heart-rate":
		if n, ok := value["beatsPerMinute"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
		}
	case "daily-heart-rate-variability":
		if n, ok := value["averageHeartRateVariabilityMilliseconds"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
		} else if n, ok := value["milliseconds"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
		}
	case "daily-heart-rate-zones":
		if zones, ok := value["heartRateZones"].([]interface{}); ok {
			rec.ValueCount = sql.NullInt32{Int32: int32(len(zones)), Valid: true}
		} else if zones, ok := value["zones"].([]interface{}); ok {
			rec.ValueCount = sql.NullInt32{Int32: int32(len(zones)), Valid: true}
		}
	case "run-vo2-max", "vo2-max", "daily-vo2-max":
		// v4 exposes the value as vo2Max (ml/kg/min); older/run variants use
		// millilitersPerKilogramPerMinute. Accept either so all three populate.
		if n, ok := value["vo2Max"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
		} else if n, ok := value["millilitersPerKilogramPerMinute"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
		}
	case "respiratory-rate-sleep-summary":
		// Real payload nests stats under fullSleepStats/deepSleepStats/etc.
		// Prefer the full-sleep breaths-per-minute summary.
		if stats, ok := value["fullSleepStats"].(map[string]interface{}); ok {
			if n, ok := stats["breathsPerMinute"]; ok {
				rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
			}
		} else if n, ok := value["breathsPerMinute"]; ok {
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
		if n, ok := value["averagePercentage"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
		} else if n, ok := value["percentage"]; ok {
			rec.ValueAvg = sql.NullFloat64{Float64: number(n), Valid: true}
		}
		if n, ok := value["lowerBoundPercentage"]; ok {
			rec.ValueMin = sql.NullFloat64{Float64: number(n), Valid: true}
		}
		if n, ok := value["upperBoundPercentage"]; ok {
			rec.ValueMax = sql.NullFloat64{Float64: number(n), Valid: true}
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
		// Real payload carries no explicit duration; derive seconds from the
		// interval bounds already extracted onto the record.
		if n, ok := value["sedentaryDurationMinutes"]; ok {
			rec.ValueSum = sql.NullFloat64{Float64: number(n) * 60, Valid: true}
		} else if rec.StartTime.Valid && rec.EndTime.Valid {
			secs := rec.EndTime.Time.Sub(rec.StartTime.Time).Seconds()
			if secs > 0 {
				rec.ValueSum = sql.NullFloat64{Float64: secs, Valid: true}
			}
		}
	case "nutrition-log":
		if energy, ok := value["energy"].(map[string]interface{}); ok {
			if n, ok := energy["kcal"]; ok {
				rec.ValueSum = sql.NullFloat64{Float64: number(n), Valid: true}
			}
		}
		if n, ok := value["mealType"].(string); ok {
			rec.EnumValueSecondary = sql.NullString{String: n, Valid: true}
			rec.MealType = sql.NullString{String: n, Valid: true}
		}
		if name, ok := value["foodDisplayName"].(string); ok && name != "" {
			rec.FoodDisplayName = sql.NullString{String: name, Valid: true}
		}
		// Promote total carbs / fat (nested under {grams}) to typed columns.
		if c, ok := value["totalCarbohydrate"].(map[string]interface{}); ok {
			if g, ok := c["grams"]; ok {
				rec.NutritionCarbsGrams = sql.NullFloat64{Float64: number(g), Valid: true}
			}
		}
		if f, ok := value["totalFat"].(map[string]interface{}); ok {
			if g, ok := f["grams"]; ok {
				rec.NutritionFatGrams = sql.NullFloat64{Float64: number(g), Valid: true}
			}
		}
	}
}

// number and durationSeconds delegate to the shared healthapi coercion helpers
// so all extraction layers parse numbers and Duration strings identically.
func number(v interface{}) float64          { return healthapi.Number(v) }
func durationSeconds(v interface{}) float64 { return healthapi.DurationSeconds(v) }

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
