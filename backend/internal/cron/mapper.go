package cron

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
	"github.com/vishal-android-freak/fitvibe/internal/healthapi"
)

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

func extractRollupScalars(rec *repositories.RollupDataPointRecord, dataType string, value map[string]interface{}) {
	if value == nil {
		return
	}

	switch dataType {
	case "steps", "floors", "active-zone-minutes":
		if n, ok := value["countSum"].(float64); ok {
			rec.CountSum = sql.NullInt32{Int32: int32(n), Valid: true}
		}
		if n, ok := value["countAvg"].(float64); ok {
			rec.CountAvg = sql.NullFloat64{Float64: n, Valid: true}
		}
	case "distance", "altitude":
		if n, ok := value["distanceMetersSum"].(float64); ok {
			rec.DistanceMetersSum = sql.NullFloat64{Float64: n, Valid: true}
		}
	case "active-energy-burned", "total-calories":
		if n, ok := value["energyKcalSum"].(float64); ok {
			rec.EnergyKcalSum = sql.NullFloat64{Float64: n, Valid: true}
		}
	}
}

func setRollupTime(t *time.Time) sql.NullTime {
	if t == nil || t.IsZero() {
		return sql.NullTime{}
	}
	return sql.NullTime{Time: *t, Valid: true}
}
