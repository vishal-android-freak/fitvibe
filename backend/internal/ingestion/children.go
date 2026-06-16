package ingestion

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
	"github.com/vishal-android-freak/fitvibe/internal/healthapi"
)

// extractChildren populates the normalized child-table rows and the
// health_data_records rows derived from a single data point. The full payload
// is always retained in data_points.payload_json; these are the queryable
// projections.
func extractChildren(rec *repositories.DataPointRecord, dataType string, value map[string]interface{}) {
	if value == nil {
		return
	}

	switch dataType {
	case "sleep":
		extractSleepChildren(rec, value)
	case "exercise":
		extractExerciseChildren(rec, value)
	case "nutrition-log":
		extractNutritionChildren(rec, value)
	case "daily-heart-rate-zones":
		extractDailyHRZoneChildren(rec, value)
	case "active-minutes":
		extractActiveMinutesChildren(rec, value)
	}

	extractHealthRecord(rec, dataType)
}

func extractSleepChildren(rec *repositories.DataPointRecord, value map[string]interface{}) {
	if stages, ok := value["stages"].([]interface{}); ok {
		for _, s := range stages {
			sm, ok := s.(map[string]interface{})
			if !ok {
				continue
			}
			start := parseRFC(sm["startTime"])
			end := parseRFC(sm["endTime"])
			if start.IsZero() || end.IsZero() {
				continue
			}
			stage := repositories.SleepStageRow{
				StartTime:             start,
				EndTime:               end,
				StartUTCOffsetSeconds: offsetSeconds(sm["startUtcOffset"]),
				EndUTCOffsetSeconds:   offsetSeconds(sm["endUtcOffset"]),
				StageType:             str(sm["type"]),
			}
			if ct := parseRFC(sm["createTime"]); !ct.IsZero() {
				stage.CreateTime = sql.NullTime{Time: ct, Valid: true}
			}
			if ut := parseRFC(sm["updateTime"]); !ut.IsZero() {
				stage.UpdateTime = sql.NullTime{Time: ut, Valid: true}
			}
			rec.Children.SleepStages = append(rec.Children.SleepStages, stage)
		}
	}

	if oob, ok := value["outOfBedSegments"].([]interface{}); ok {
		for _, o := range oob {
			om, ok := o.(map[string]interface{})
			if !ok {
				continue
			}
			start := parseRFC(om["startTime"])
			end := parseRFC(om["endTime"])
			if start.IsZero() || end.IsZero() {
				continue
			}
			rec.Children.SleepOutOfBed = append(rec.Children.SleepOutOfBed, repositories.SleepOutOfBedRow{
				StartTime:             start,
				EndTime:               end,
				StartUTCOffsetSeconds: offsetSeconds(om["startUtcOffset"]),
				EndUTCOffsetSeconds:   offsetSeconds(om["endUtcOffset"]),
			})
		}
	}

	if summary, ok := value["summary"].(map[string]interface{}); ok {
		if ss, ok := summary["stagesSummary"].([]interface{}); ok {
			for _, s := range ss {
				sm, ok := s.(map[string]interface{})
				if !ok {
					continue
				}
				row := repositories.SleepSummaryStageRow{StageType: str(sm["type"])}
				if v, ok := sm["minutes"]; ok {
					row.Minutes = sql.NullInt32{Int32: int32(number(v)), Valid: true}
				}
				if v, ok := sm["count"]; ok {
					row.Count = sql.NullInt32{Int32: int32(number(v)), Valid: true}
				}
				rec.Children.SleepSummary = append(rec.Children.SleepSummary, row)
			}
		}
	}
}

func extractExerciseChildren(rec *repositories.DataPointRecord, value map[string]interface{}) {
	// Events can appear as exerciseEvents (live) or events.
	events, ok := value["exerciseEvents"].([]interface{})
	if !ok {
		events, _ = value["events"].([]interface{})
	}
	for _, e := range events {
		em, ok := e.(map[string]interface{})
		if !ok {
			continue
		}
		row := repositories.ExerciseEventRow{
			EventType:             nullStr(str(em["eventType"])),
			EventUTCOffsetSeconds: offsetSeconds(em["utcOffset"]),
		}
		if t := parseRFC(em["time"]); !t.IsZero() {
			row.EventTime = sql.NullTime{Time: t, Valid: true}
		}
		rec.Children.ExerciseEvents = append(rec.Children.ExerciseEvents, row)
	}

	// Splits can appear as splitSummaries (live) or splits.
	splits, ok := value["splitSummaries"].([]interface{})
	if !ok {
		splits, _ = value["splits"].([]interface{})
	}
	for _, s := range splits {
		sm, ok := s.(map[string]interface{})
		if !ok {
			continue
		}
		row := repositories.ExerciseSplitRow{
			SplitType: nullStr(str(sm["splitType"])),
		}
		if t := parseRFC(sm["startTime"]); !t.IsZero() {
			row.StartTime = sql.NullTime{Time: t, Valid: true}
		}
		if t := parseRFC(sm["endTime"]); !t.IsZero() {
			row.EndTime = sql.NullTime{Time: t, Valid: true}
		}
		if d := durationSeconds(sm["activeDuration"]); d > 0 {
			row.ActiveDurationSeconds = sql.NullFloat64{Float64: d, Valid: true}
		}
		if ms, ok := sm["metricsSummary"].(map[string]interface{}); ok {
			if b, err := json.Marshal(ms); err == nil {
				row.MetricsSummaryJSON = sql.NullString{String: string(b), Valid: true}
			}
		}
		rec.Children.ExerciseSplits = append(rec.Children.ExerciseSplits, row)
	}
}

func extractNutritionChildren(rec *repositories.DataPointRecord, value map[string]interface{}) {
	nutrients, ok := value["nutrients"].([]interface{})
	if !ok {
		return
	}
	for _, n := range nutrients {
		nm, ok := n.(map[string]interface{})
		if !ok {
			continue
		}
		name := str(nm["nutrient"])
		if name == "" {
			continue
		}
		row := repositories.NutrientRow{Nutrient: name}
		// Real payload: {"quantity":{"grams":20},"nutrient":"PROTEIN"}
		if q, ok := nm["quantity"].(map[string]interface{}); ok {
			if g, ok := q["grams"]; ok {
				row.Grams = sql.NullFloat64{Float64: number(g), Valid: true}
			} else if v, ok := q["value"]; ok {
				row.Grams = sql.NullFloat64{Float64: number(v), Valid: true}
			}
		} else if g, ok := nm["grams"]; ok {
			row.Grams = sql.NullFloat64{Float64: number(g), Valid: true}
		}
		rec.Children.Nutrients = append(rec.Children.Nutrients, row)
	}
}

func extractDailyHRZoneChildren(rec *repositories.DataPointRecord, value map[string]interface{}) {
	zones, ok := value["heartRateZones"].([]interface{})
	if !ok {
		zones, ok = value["zones"].([]interface{})
		if !ok {
			return
		}
	}
	for _, z := range zones {
		zm, ok := z.(map[string]interface{})
		if !ok {
			continue
		}
		zt := str(zm["heartRateZoneType"])
		if zt == "" {
			zt = str(zm["type"])
		}
		if zt == "" {
			continue
		}
		row := repositories.DailyHRZoneRow{ZoneType: zt}
		if v, ok := zm["minBeatsPerMinute"]; ok {
			row.MinBPM = sql.NullInt32{Int32: int32(number(v)), Valid: true}
		}
		if v, ok := zm["maxBeatsPerMinute"]; ok {
			row.MaxBPM = sql.NullInt32{Int32: int32(number(v)), Valid: true}
		}
		rec.Children.DailyHRZones = append(rec.Children.DailyHRZones, row)
	}
}

func extractActiveMinutesChildren(rec *repositories.DataPointRecord, value map[string]interface{}) {
	levels, ok := value["activeMinutesByActivityLevel"].([]interface{})
	if !ok {
		return
	}
	for _, l := range levels {
		lm, ok := l.(map[string]interface{})
		if !ok {
			continue
		}
		lvl := str(lm["activityLevel"])
		if lvl == "" {
			continue
		}
		row := repositories.ActiveMinutesRow{ActivityLevel: lvl}
		if v, ok := lm["minutes"]; ok {
			row.Minutes = sql.NullInt32{Int32: int32(number(v)), Valid: true}
		} else if v, ok := lm["durationMillis"]; ok {
			row.Minutes = sql.NullInt32{Int32: int32(number(v) / 60000), Valid: true}
		} else if d := durationSeconds(lm["duration"]); d > 0 {
			row.Minutes = sql.NullInt32{Int32: int32(d / 60), Valid: true}
		}
		rec.Children.ActiveMinutes = append(rec.Children.ActiveMinutes, row)
	}
}

// healthMetric maps a data type to its normalized (metric_name, unit) for the
// health_data_records query table.
//
// Only types that yield ONE meaningful value per day/session are projected.
// High-frequency interval/sample types (heart-rate, hrv, steps, distance,
// active-zone-minutes, time-in-heart-rate-zone, sedentary-period) are excluded:
// each emits many points per day, so projecting them per-point would just have
// the last-written value clobber the rest under the (date, metric, source)
// unique key. Those daily totals/averages belong to the rollup pipeline, not
// this per-point projection.
var healthMetric = map[string]struct {
	name string
	unit string
}{
	"weight":                              {"weight_grams", "grams"},
	"body-fat":                            {"body_fat_percentage", "percent"},
	"height":                              {"height_meters", "meters"},
	"blood-glucose":                       {"blood_glucose_mmol_l", "mmol/L"},
	"sleep":                               {"minutes_asleep", "minutes"},
	"daily-resting-heart-rate":            {"resting_heart_rate_bpm", "bpm"},
	"daily-heart-rate-variability":        {"daily_hrv_ms", "milliseconds"},
	"daily-oxygen-saturation":             {"oxygen_saturation_percent", "percent"},
	"daily-respiratory-rate":              {"respiratory_rate_bpm", "breaths/min"},
	"respiratory-rate-sleep-summary":      {"sleep_respiratory_rate_bpm", "breaths/min"},
	"daily-sleep-temperature-derivations": {"sleep_temperature_celsius", "celsius"},
	"daily-vo2-max":                       {"vo2_max", "ml/kg/min"},
	"run-vo2-max":                         {"vo2_max", "ml/kg/min"},
	"vo2-max":                             {"vo2_max", "ml/kg/min"},
	"core-body-temperature":               {"core_body_temperature_celsius", "celsius"},
	"oxygen-saturation":                   {"oxygen_saturation_percent", "percent"},
}

// extractHealthRecord emits a normalized daily row for the data point's
// headline scalar, if one was extracted. Keyed by (user, date, metric, source)
// so re-ingestion overwrites rather than duplicates.
func extractHealthRecord(rec *repositories.DataPointRecord, dataType string) {
	meta, ok := healthMetric[dataType]
	if !ok {
		return
	}

	var val float64
	var have bool
	switch {
	case rec.ValueSum.Valid:
		val, have = rec.ValueSum.Float64, true
	case rec.ValueAvg.Valid:
		val, have = rec.ValueAvg.Float64, true
	case rec.ValueCount.Valid:
		val, have = float64(rec.ValueCount.Int32), true
	}
	if !have {
		return
	}

	recordDate := healthRecordDate(rec)
	if recordDate.IsZero() {
		return
	}

	var metaJSON sql.NullString
	if rec.EnumValue.Valid {
		if b, err := json.Marshal(map[string]string{"enum": rec.EnumValue.String}); err == nil {
			metaJSON = sql.NullString{String: string(b), Valid: true}
		}
	}

	// Source distinguishes how the value arrived so multiple sources for the
	// same day/metric don't clobber each other in the unique key.
	source := rec.FetchedVia
	if source == "" {
		source = "unknown"
	}

	rec.Children.HealthRecords = append(rec.Children.HealthRecords, repositories.HealthDataRow{
		RecordDate:   recordDate,
		MetricName:   meta.name,
		MetricValue:  val,
		MetricUnit:   sql.NullString{String: meta.unit, Valid: true},
		MetadataJSON: metaJSON,
		Source:       source,
		DataType:     dataType,
	})
}

func healthRecordDate(rec *repositories.DataPointRecord) time.Time {
	if rec.CivilStartDate.Valid {
		return rec.CivilStartDate.Time
	}
	if rec.SampleTime.Valid {
		t := rec.SampleTime.Time
		return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
	}
	if rec.StartTime.Valid {
		t := rec.StartTime.Time
		return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
	}
	return time.Time{}
}

func parseRFC(v interface{}) time.Time { return healthapi.ParseTimeString(v) }

func offsetSeconds(v interface{}) sql.NullInt32 {
	if s := durationSeconds(v); s != 0 {
		return sql.NullInt32{Int32: int32(s), Valid: true}
	}
	return sql.NullInt32{}
}

func str(v interface{}) string {
	s, _ := v.(string)
	return s
}

func nullStr(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}
