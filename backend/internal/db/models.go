package db

import (
	"database/sql"
	"time"
)

// User represents a row in the users table.
type User struct {
	ID                int64
	GoogleUserID      sql.NullString
	HealthUserID      sql.NullString
	LegacyUserID      sql.NullString
	Email             sql.NullString
	AccessToken       string
	RefreshToken      string
	TokenExpiry       time.Time
	Scopes            string
	DisplayName       sql.NullString
	DateOfBirth       sql.NullTime
	Gender            sql.NullString
	HeightMeters      sql.NullFloat64
	WeightKg          sql.NullFloat64
	ProfileJSON       sql.NullString
	ProfileUpdatedAt  sql.NullTime
	SettingsJSON      sql.NullString
	SettingsUpdatedAt sql.NullTime
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

// WebhookNotification represents a row in the webhook_notifications table.
type WebhookNotification struct {
	ID                             int64
	HealthUserID                   string
	DataType                       string
	Operation                      string
	ClientProvidedSubscriptionName sql.NullString
	NotificationJSON               string
	SignatureHeader                sql.NullString
	ReceivedAt                     time.Time
	ProcessedAt                    sql.NullTime
	ProcessingStatus               string
	ProcessingError                sql.NullString
	RetryCount                     int
	NextRetryAt                    sql.NullTime
}

// SyncState represents a row in the sync_state table.
type SyncState struct {
	ID             int64
	UserID         int64
	DataType       string
	Source         string
	LastStartTime  sql.NullTime
	LastEndTime    sql.NullTime
	LastCivilDate  sql.NullTime
	Cursor         sql.NullString
	UpdatedAt      time.Time
}

// DataPoint represents a row in the data_points table.
type DataPoint struct {
	ID                      int64
	UserID                  int64
	DataType                string
	DataPointCategory       string
	DataSourceFamily        sql.NullString
	RecordingMethod         sql.NullString
	Platform                sql.NullString
	DeviceName              sql.NullString
	DeviceFormFactor        sql.NullString
	ApplicationPackageName  sql.NullString
	DataSourceJSON          sql.NullString
	GoogleDataPointName     sql.NullString
	ResourceID              sql.NullString
	SampleTime              sql.NullTime
	StartTime               sql.NullTime
	EndTime                 sql.NullTime
	CivilStartTime          sql.NullString
	CivilEndTime            sql.NullString
	CivilStartDate          sql.NullTime
	CivilEndDate            sql.NullTime
	StartUTCOffsetSeconds   sql.NullInt32
	EndUTCOffsetSeconds     sql.NullInt32
	ValueCount              sql.NullInt32
	ValueSum                sql.NullFloat64
	ValueAvg                sql.NullFloat64
	ValueMin                sql.NullFloat64
	ValueMax                sql.NullFloat64
	EnumValue               sql.NullString
	EnumValueSecondary      sql.NullString
	PayloadJSON             string
	FetchedVia              string
	FetchedAt               time.Time
	WebhookNotificationID   sql.NullInt64
}

// SleepStage represents a row in the sleep_stages table.
type SleepStage struct {
	ID                    int64
	DataPointID           int64
	StartTime             time.Time
	EndTime               time.Time
	StartUTCOffsetSeconds sql.NullInt32
	EndUTCOffsetSeconds   sql.NullInt32
	StageType             string
	CreateTime            sql.NullTime
	UpdateTime            sql.NullTime
}

// SleepOutOfBedSegment represents a row in the sleep_out_of_bed_segments table.
type SleepOutOfBedSegment struct {
	ID                    int64
	DataPointID           int64
	StartTime             time.Time
	EndTime               time.Time
	StartUTCOffsetSeconds sql.NullInt32
	EndUTCOffsetSeconds   sql.NullInt32
}

// SleepSummaryStage represents a row in the sleep_summary_stages table.
type SleepSummaryStage struct {
	ID          int64
	DataPointID int64
	StageType   string
	Minutes     sql.NullInt32
	Count       sql.NullInt32
}

// ExerciseSplit represents a row in the exercise_splits table.
type ExerciseSplit struct {
	ID                  int64
	DataPointID         int64
	StartTime           sql.NullTime
	EndTime             sql.NullTime
	ActiveDurationSeconds sql.NullFloat64
	SplitType           sql.NullString
	MetricsSummaryJSON  sql.NullString
}

// ExerciseEvent represents a row in the exercise_events table.
type ExerciseEvent struct {
	ID                   int64
	DataPointID          int64
	EventTime            sql.NullTime
	EventUTCOffsetSeconds sql.NullInt32
	EventType            sql.NullString
}

// NutritionLogNutrient represents a row in the nutrition_log_nutrients table.
type NutritionLogNutrient struct {
	ID          int64
	DataPointID int64
	Nutrient    string
	Grams       sql.NullFloat64
}

// DailyHeartRateZone represents a row in the daily_heart_rate_zones table.
type DailyHeartRateZone struct {
	ID          int64
	DataPointID int64
	ZoneType    string
	MinBPM      sql.NullInt32
	MaxBPM      sql.NullInt32
}

// ActiveMinutesByLevel represents a row in the active_minutes_by_level table.
type ActiveMinutesByLevel struct {
	ID             int64
	DataPointID    int64
	ActivityLevel  string
	Minutes        sql.NullInt32
}

// IrregularRhythmAlertWindow represents a row in the irregular_rhythm_alert_windows table.
type IrregularRhythmAlertWindow struct {
	ID            int64
	DataPointID   int64
	StartTime     sql.NullTime
	EndTime       sql.NullTime
	Positive      sql.NullBool
	HeartBeatsJSON sql.NullString
}

// ElectrocardiogramWaveform represents a row in the electrocardiogram_waveforms table.
type ElectrocardiogramWaveform struct {
	ID                      int64
	DataPointID             int64
	ResultClassification    sql.NullString
	BeatsPerMinuteAvg       sql.NullInt32
	SamplingFrequencyHertz  sql.NullInt32
	MillivoltsScalingFactor sql.NullInt32
	LeadNumber              sql.NullInt32
	WaveformSamplesJSON     sql.NullString
}

// FoodItem represents a row in the food_items table.
type FoodItem struct {
	ID               int64
	FoodID           string
	DisplayName      sql.NullString
	Brand            sql.NullString
	AccessLevel      sql.NullString
	Description      sql.NullString
	LanguageCode     sql.NullString
	MealType         sql.NullString
	NutrientsJSON    sql.NullString
	DefaultServingJSON sql.NullString
	ServingsJSON     sql.NullString
	FetchedAt        time.Time
}

// FoodMeasurementUnit represents a row in the food_measurement_units table.
type FoodMeasurementUnit struct {
	ID                 int64
	UnitID             string
	DisplayName        sql.NullString
	PluralDisplayName  sql.NullString
	FetchedAt          time.Time
}

// RollupDataPoint represents a row in the rollup_data_points table.
type RollupDataPoint struct {
	ID                 int64
	UserID             int64
	DataType           string
	RollupKind         string
	WindowSize         sql.NullString
	DataSourceFamily   sql.NullString
	StartTime          sql.NullTime
	EndTime            sql.NullTime
	CivilStartDate     sql.NullTime
	CivilEndDate       sql.NullTime
	CountSum           sql.NullInt32
	CountAvg           sql.NullFloat64
	CountMin           sql.NullInt32
	CountMax           sql.NullInt32
	DistanceMetersSum  sql.NullFloat64
	EnergyKcalSum      sql.NullFloat64
	DurationSecondsSum sql.NullInt32
	HeartRateZoneType  sql.NullString
	ActivityLevel      sql.NullString
	ExerciseType       sql.NullString
	SwimStrokeType     sql.NullString
	Nutrient           sql.NullString
	PayloadJSON        string
	FetchedAt          time.Time
}

// HealthDataRecord represents a row in the health_data_records table.
type HealthDataRecord struct {
	ID                 int64
	UserID             int64
	DataPointID        sql.NullInt64
	RecordDate         time.Time
	MetricName         string
	MetricValue        float64
	MetricUnit         sql.NullString
	MetricMetadataJSON sql.NullString
	Source             string
	DataType           string
	UpdatedAt          time.Time
}
