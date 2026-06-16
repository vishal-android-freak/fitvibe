package cron

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
	"github.com/vishal-android-freak/fitvibe/internal/healthapi"
)

// RemapRollupPayload re-parses a stored rollup payload_json blob into a DB
// record using current extraction logic. The window-size string ("3600s"/"1d")
// and rollup kind are preserved so re-insertion upserts in place via the unique
// index (no duplicates).
func RemapRollupPayload(userID int64, dataType, rollupKind, windowSizeStr, payloadJSON string) (*repositories.RollupDataPointRecord, error) {
	var dp healthapi.RollupDataPoint
	if err := json.Unmarshal([]byte(payloadJSON), &dp); err != nil {
		return nil, fmt.Errorf("unmarshal rollup payload: %w", err)
	}

	suffix := "s"
	if rollupKind == "dailyRollUp" {
		suffix = "d"
	}
	ws, _ := strconv.Atoi(strings.TrimSuffix(windowSizeStr, suffix))

	return mapRollupDataPoint(userID, dataType, rollupKind, ws, &dp)
}

func mapRollupDataPoint(userID int64, dataType, rollupKind string, windowSize int, dp *healthapi.RollupDataPoint) (*repositories.RollupDataPointRecord, error) {
	payload, err := json.Marshal(dp)
	if err != nil {
		return nil, fmt.Errorf("marshal rollup: %w", err)
	}

	rec := &repositories.RollupDataPointRecord{
		UserID:     userID,
		DataType:   dataType,
		RollupKind: rollupKind,
		PayloadJSON: string(payload),
	}

	if rollupKind == "dailyRollUp" {
		rec.WindowSize = sql.NullString{String: strconv.Itoa(windowSize) + "d", Valid: true}
	} else {
		rec.WindowSize = sql.NullString{String: strconv.Itoa(windowSize) + "s", Valid: true}
	}

	if dp.StartTime != nil && !dp.StartTime.IsZero() {
		rec.StartTime = sql.NullTime{Time: *dp.StartTime, Valid: true}
	}
	if dp.EndTime != nil && !dp.EndTime.IsZero() {
		rec.EndTime = sql.NullTime{Time: *dp.EndTime, Valid: true}
	}
	if dp.CivilStartDate != nil && !dp.CivilStartDate.IsZero() {
		rec.CivilStartDate = sql.NullTime{Time: *dp.CivilStartDate, Valid: true}
	}
	if dp.CivilEndDate != nil && !dp.CivilEndDate.IsZero() {
		rec.CivilEndDate = sql.NullTime{Time: *dp.CivilEndDate, Valid: true}
	}

	extractRollupScalars(rec, dataType, dp.ValueMap())
	return rec, nil
}

// extractRollupScalars pulls indexed aggregates out of a rollup union value.
// The Google Health API returns int64 aggregates as JSON strings (e.g.
// "countSum":"46") and durations as Duration strings (e.g. "durationSum":"2580s"),
// so all numeric reads go through rollupNumber / rollupDurationSeconds rather
// than direct float64 type assertions.
func extractRollupScalars(rec *repositories.RollupDataPointRecord, dataType string, value map[string]interface{}) {
	if value == nil {
		return
	}

	switch dataType {
	case "steps", "floors":
		if v, ok := value["countSum"]; ok {
			rec.CountSum = sql.NullInt32{Int32: int32(rollupNumber(v)), Valid: true}
		}
	case "active-zone-minutes":
		// Rollup uses activeZoneMinutesSum; fall back to countSum.
		if v, ok := value["activeZoneMinutesSum"]; ok {
			rec.CountSum = sql.NullInt32{Int32: int32(rollupNumber(v)), Valid: true}
		} else if v, ok := value["countSum"]; ok {
			rec.CountSum = sql.NullInt32{Int32: int32(rollupNumber(v)), Valid: true}
		}
	case "distance":
		// Real field: millimetersSum (string). Store as meters for consistency
		// with data_points.distance (value_sum in meters).
		if v, ok := value["millimetersSum"]; ok {
			rec.DistanceMetersSum = sql.NullFloat64{Float64: rollupNumber(v) / 1000.0, Valid: true}
		} else if v, ok := value["distanceMetersSum"]; ok {
			rec.DistanceMetersSum = sql.NullFloat64{Float64: rollupNumber(v), Valid: true}
		}
	case "altitude":
		if v, ok := value["gainMillimetersSum"]; ok {
			rec.DistanceMetersSum = sql.NullFloat64{Float64: rollupNumber(v) / 1000.0, Valid: true}
		} else if v, ok := value["distanceMetersSum"]; ok {
			rec.DistanceMetersSum = sql.NullFloat64{Float64: rollupNumber(v), Valid: true}
		}
	case "active-energy-burned", "total-calories":
		if v, ok := value["kcalSum"]; ok {
			rec.EnergyKcalSum = sql.NullFloat64{Float64: rollupNumber(v), Valid: true}
		} else if v, ok := value["energyKcalSum"]; ok {
			rec.EnergyKcalSum = sql.NullFloat64{Float64: rollupNumber(v), Valid: true}
		}
	case "heart-rate":
		if v, ok := value["beatsPerMinuteAvg"]; ok {
			rec.CountAvg = sql.NullFloat64{Float64: rollupNumber(v), Valid: true}
		}
		if v, ok := value["beatsPerMinuteMin"]; ok {
			rec.CountMin = sql.NullInt32{Int32: int32(rollupNumber(v)), Valid: true}
		}
		if v, ok := value["beatsPerMinuteMax"]; ok {
			rec.CountMax = sql.NullInt32{Int32: int32(rollupNumber(v)), Valid: true}
		}
	case "sedentary-period":
		// durationSum is a Duration string ("2580s").
		if secs := rollupDurationSeconds(value["durationSum"]); secs > 0 {
			rec.DurationSecondsSum = sql.NullInt32{Int32: int32(secs), Valid: true}
		}
	case "time-in-heart-rate-zone":
		// Per-zone durations in timeInHeartRateZones[]: total seconds + dominant zone.
		total, zone := sumAndDominant(value["timeInHeartRateZones"], "duration", "heartRateZone", rollupDurationSeconds)
		if total > 0 {
			rec.DurationSecondsSum = sql.NullInt32{Int32: int32(total), Valid: true}
		}
		if zone != "" {
			rec.HeartRateZoneType = sql.NullString{String: zone, Valid: true}
		}
	case "calories-in-heart-rate-zone":
		// caloriesInHeartRateZones[]: total kcal + dominant zone.
		total, zone := sumAndDominant(value["caloriesInHeartRateZones"], "kcal", "heartRateZone", rollupNumber)
		if total > 0 {
			rec.EnergyKcalSum = sql.NullFloat64{Float64: total, Valid: true}
		}
		if zone != "" {
			rec.HeartRateZoneType = sql.NullString{String: zone, Valid: true}
		}
	case "active-minutes":
		// activeMinutesRollupByActivityLevel[]: total minutes + dominant level.
		total, level := sumAndDominant(value["activeMinutesRollupByActivityLevel"], "activeMinutesSum", "activityLevel", rollupNumber)
		if total > 0 {
			rec.CountSum = sql.NullInt32{Int32: int32(total), Valid: true}
		}
		if level != "" {
			rec.ActivityLevel = sql.NullString{String: level, Valid: true}
		}
	case "weight":
		if v, ok := value["weightGramsAvg"]; ok {
			rec.CountAvg = sql.NullFloat64{Float64: rollupNumber(v), Valid: true}
		}
	case "hydration-log":
		if v, ok := value["millilitersSum"]; ok {
			rec.DistanceMetersSum = sql.NullFloat64{Float64: rollupNumber(v), Valid: true}
		}
	}
}

// sumAndDominant iterates a JSON array of objects, summing read(item[valKey])
// across all elements and returning that total plus the string label
// (item[labelKey]) of the element with the largest value. Used to collapse the
// per-zone / per-level rollup aggregations.
func sumAndDominant(arr interface{}, valKey, labelKey string, read func(interface{}) float64) (total float64, label string) {
	items, ok := arr.([]interface{})
	if !ok {
		return 0, ""
	}
	var maxVal float64
	for _, it := range items {
		m, ok := it.(map[string]interface{})
		if !ok {
			continue
		}
		v := read(m[valKey])
		total += v
		if v > maxVal {
			maxVal = v
			if s, ok := m[labelKey].(string); ok {
				label = s
			}
		}
	}
	return total, label
}

// rollupNumber and rollupDurationSeconds delegate to the shared healthapi
// coercion helpers (kept as local names for call-site readability).
func rollupNumber(v interface{}) float64          { return healthapi.Number(v) }
func rollupDurationSeconds(v interface{}) float64 { return healthapi.DurationSeconds(v) }
