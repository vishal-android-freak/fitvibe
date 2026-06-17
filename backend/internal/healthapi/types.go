package healthapi

import (
	"encoding/json"
	"strconv"
	"strings"
	"time"
)

// Category returns the record category for a data type based on the plan mapping.
func Category(dataType string) string {
	switch dataType {
	case "active-energy-burned", "active-minutes", "active-zone-minutes", "activity-level", "altitude", "calories-in-heart-rate-zone",
		"distance", "floors", "sedentary-period", "steps", "swim-lengths-data", "time-in-heart-rate-zone", "total-calories":
		// activity-level has an interval field (per the v4 ref), not a date —
		// it's an interval data type, not a daily summary.
		return "interval"
	case "blood-glucose", "body-fat", "heart-rate", "heart-rate-variability", "height", "weight",
		"blood-pressure", "body-temperature", "core-body-temperature", "oxygen-saturation", "respiratory-rate-sleep-summary",
		"vo2-max", "run-vo2-max":
		return "sample"
	case "exercise", "hydration-log", "irregular-rhythm-notification", "nutrition-log", "sleep", "electrocardiogram":
		return "session"
	case "daily-heart-rate-variability", "daily-heart-rate-zones", "daily-oxygen-saturation",
		"daily-respiratory-rate", "daily-resting-heart-rate", "daily-sleep-temperature-derivations", "daily-vo2-max":
		return "daily"
	case "food", "food-measurement-unit":
		return "food"
	default:
		return "unknown"
	}
}

// IdentityResponse is the response from /v4/users/me/identity.
type IdentityResponse struct {
	Name         string `json:"name"`
	LegacyUserID string `json:"legacyUserId"`
	HealthUserID string `json:"healthUserId"`
}

// ProfileResponse is the response from /v4/users/me/profile.
type ProfileResponse struct {
	Name                                string                 `json:"name"`
	Age                                 int                    `json:"age"`
	MembershipStartDate                 map[string]interface{} `json:"membershipStartDate"`
	UserConfiguredWalkingStrideLengthMm int                    `json:"userConfiguredWalkingStrideLengthMm"`
	UserConfiguredRunningStrideLengthMm int                    `json:"userConfiguredRunningStrideLengthMm"`
	AutoWalkingStrideLengthMm           int                    `json:"autoWalkingStrideLengthMm"`
	AutoRunningStrideLengthMm           int                    `json:"autoRunningStrideLengthMm"`
}

// SettingsResponse is the response from /v4/users/me/settings.
type SettingsResponse struct {
	Name                     string `json:"name"`
	AutoStrideEnabled        bool   `json:"autoStrideEnabled"`
	DistanceUnit             string `json:"distanceUnit"`
	GlucoseUnit              string `json:"glucoseUnit"`
	HeightUnit               string `json:"heightUnit"`
	LanguageLocale           string `json:"languageLocale"`
	UTCOffset                string `json:"utcOffset"`
	StrideLengthWalkingType  string `json:"strideLengthWalkingType"`
	StrideLengthRunningType  string `json:"strideLengthRunningType"`
	SwimUnit                 string `json:"swimUnit"`
	TemperatureUnit          string `json:"temperatureUnit"`
	TimeZone                 string `json:"timeZone"`
	WeightUnit               string `json:"weightUnit"`
	WaterUnit                string `json:"waterUnit"`
	FoodLanguageCode         string `json:"foodLanguageCode"`
}

// DataSource represents the source of a data point.
//
// The live API nests device metadata under a "device" object and application
// metadata under an "application" object, e.g.:
//
//	"dataSource": {
//	  "recordingMethod": "PASSIVELY_MEASURED",
//	  "device": {"name": "...", "formFactor": "FITNESS_BAND", "manufacturer": "...", "model": "..."},
//	  "application": {"packageName": "..."},
//	  "platform": "FITBIT"
//	}
//
// dataSourceFamily is only present on reconcile responses, not on list.
type DataSource struct {
	DataSourceFamily string             `json:"dataSourceFamily"`
	RecordingMethod  string             `json:"recordingMethod"`
	Platform         string             `json:"platform"`
	Device           DataSourceDevice   `json:"device"`
	Application      DataSourceApp      `json:"application"`
}

// DataSourceDevice is the nested device object.
type DataSourceDevice struct {
	Name         string `json:"name"`
	Manufacturer string `json:"manufacturer"`
	Model        string `json:"model"`
	UID          string `json:"uid"`
	FormFactor   string `json:"formFactor"`
}

// DataSourceApp is the nested application object.
type DataSourceApp struct {
	PackageName string `json:"packageName"`
	Name        string `json:"name"`
	Version     string `json:"version"`
}

// DeviceName returns the best available device identifier.
func (ds DataSource) DeviceName() string {
	if ds.Device.Name != "" {
		return ds.Device.Name
	}
	if ds.Device.Model != "" {
		return ds.Device.Model
	}
	return ds.Device.Manufacturer
}

// DeviceFormFactor returns the device form factor.
func (ds DataSource) DeviceFormFactor() string {
	return ds.Device.FormFactor
}

// ApplicationPackageName returns the application package name.
func (ds DataSource) ApplicationPackageName() string {
	return ds.Application.PackageName
}

// DataPoint represents a single Google Health data point.
// The API returns a union field named after the data type (e.g. "heartRate",
// "steps") that contains type-specific time and value fields. This wrapper
// keeps the raw response and exposes helpers to extract common fields.
type DataPoint struct {
	Name       string     `json:"name"`
	DataSource DataSource `json:"dataSource"`

	// RawJSON holds the full raw data point as returned by the API.
	RawJSON []byte `json:"-"`

	// data holds the parsed union object (e.g. the heartRate map).
	data map[string]interface{}
}

// UnmarshalJSON implements json.Unmarshaler and captures both typed fields
// and the raw union data.
func (dp *DataPoint) UnmarshalJSON(b []byte) error {
	dp.RawJSON = append([]byte(nil), b...)

	var raw map[string]interface{}
	if err := json.Unmarshal(b, &raw); err != nil {
		return err
	}

	if name, ok := raw["name"].(string); ok {
		dp.Name = name
	}
	// :reconcile responses key the identifier as "dataPointName" instead of "name".
	if dp.Name == "" {
		if name, ok := raw["dataPointName"].(string); ok {
			dp.Name = name
		}
	}
	if ds, ok := raw["dataSource"].(map[string]interface{}); ok {
		dsBytes, _ := json.Marshal(ds)
		_ = json.Unmarshal(dsBytes, &dp.DataSource)
	}

	// The union field is the first top-level key (other than name/dataSource)
	// whose value is an object. We also accept a top-level "value" object for
	// forward compatibility.
	for _, key := range []string{"value", "heartRate", "steps", "distance", "sleep", "exercise",
		"weight", "bodyFat", "bloodGlucose", "activeZoneMinutes", "heartRateVariability",
		"dailyRestingHeartRate", "dailyHeartRateVariability", "dailyHeartRateZones",
		"dailyOxygenSaturation", "dailyRespiratoryRate", "dailySleepTemperatureDerivations",
		"dailyVo2Max", "activityLevel", "sedentaryPeriod", "runVo2Max", "oxygenSaturation",
		"nutritionLog", "hydrationLog", "timeInHeartRateZone", "activeMinutes",
		"respiratoryRateSleepSummary", "altitude", "height", "coreBodyTemperature",
		"activeEnergyBurned", "electrocardiogram", "irregularRhythmNotification",
		"swimLengthsData", "food", "foodMeasurementUnit"} {
		if v, ok := raw[key].(map[string]interface{}); ok {
			dp.data = v
			break
		}
	}
	if dp.data == nil {
		// Fallback: pick the first object-valued field.
		for k, v := range raw {
			if k == "name" || k == "dataSource" {
				continue
			}
			if vm, ok := v.(map[string]interface{}); ok {
				dp.data = vm
				break
			}
		}
	}
	return nil
}

// MarshalJSON returns the raw JSON response.
func (dp DataPoint) MarshalJSON() ([]byte, error) {
	if len(dp.RawJSON) > 0 {
		return dp.RawJSON, nil
	}
	return json.Marshal(struct {
		Name       string     `json:"name"`
		DataSource DataSource `json:"dataSource"`
	}{
		Name:       dp.Name,
		DataSource: dp.DataSource,
	})
}

// DataTypeData returns the parsed type-specific union object (e.g. the
// heartRate object). Returns nil if no union data was found.
func (dp *DataPoint) DataTypeData() map[string]interface{} {
	return dp.data
}

// DataPointTimeRange extracts the best available physical or civil start/end
// times for the data point. The returned category drives which fields are
// consulted.
func (dp *DataPoint) DataPointTimeRange(category string) (start, end time.Time, err error) {
	if dp.data == nil {
		return time.Time{}, time.Time{}, nil
	}

	switch category {
	case "interval", "session":
		interval, _ := dp.data["interval"].(map[string]interface{})
		if interval != nil {
			start = parseTimeString(interval["startTime"])
			end = parseTimeString(interval["endTime"])
		}
		if start.IsZero() {
			start = parseCivilDateTime(dp.data["civilStartTime"])
		}
		if end.IsZero() {
			end = parseCivilDateTime(dp.data["civilEndTime"])
		}
	case "sample":
		if st, ok := dp.data["sampleTime"].(map[string]interface{}); ok {
			start = parseTimeString(st["observationTime"])
			if start.IsZero() {
				start = parseCivilDateTime(st["civilTime"])
			}
		}
	case "daily":
		if d, ok := dp.data["date"].(map[string]interface{}); ok {
			start = parseDate(d)
			end = start
		}
		if start.IsZero() {
			start = parseCivilDateTime(dp.data["civilStartTime"])
			end = parseCivilDateTime(dp.data["civilEndTime"])
		}
		if start.IsZero() {
			start = parseTimeString(dp.data["startTime"])
			end = parseTimeString(dp.data["endTime"])
		}
	}

	return start, end, nil
}

// UTCOffsets extracts start/end UTC offsets in seconds if present.
func (dp *DataPoint) UTCOffsets(category string) (startOff, endOff *int32) {
	if dp.data == nil {
		return nil, nil
	}
	var interval map[string]interface{}
	switch category {
	case "interval", "session":
		interval, _ = dp.data["interval"].(map[string]interface{})
	}
	if interval == nil {
		return nil, nil
	}
	if s := parseDurationSeconds(interval["startUtcOffset"]); s != nil {
		startOff = s
	}
	if s := parseDurationSeconds(interval["endUtcOffset"]); s != nil {
		endOff = s
	}
	return startOff, endOff
}

// ValueMap returns the type-specific value object. Callers can type-assert
// known keys like "beatsPerMinute", "count", "distanceMeters".
func (dp *DataPoint) ValueMap() map[string]interface{} {
	if dp.data == nil {
		return nil
	}
	return dp.data
}

// ParseTimeString parses an RFC3339(Nano) timestamp from a JSON value,
// returning the zero time if absent or unparseable. Shared by the ingestion
// layer for parsing nested timestamps in stored payloads.
func ParseTimeString(v interface{}) time.Time {
	s, _ := v.(string)
	if s == "" {
		return time.Time{}
	}
	for _, layout := range []string{time.RFC3339Nano, time.RFC3339} {
		if t, err := time.Parse(layout, s); err == nil {
			return t
		}
	}
	return time.Time{}
}

func parseTimeString(v interface{}) time.Time { return ParseTimeString(v) }

func parseCivilDateTime(v interface{}) time.Time {
	m, _ := v.(map[string]interface{})
	if m == nil {
		return time.Time{}
	}
	d, _ := m["date"].(map[string]interface{})
	tod, _ := m["time"].(map[string]interface{})
	if d == nil {
		return time.Time{}
	}
	year := int(number(d["year"]))
	month := int(number(d["month"]))
	day := int(number(d["day"]))
	hour := int(number(tod["hours"]))
	minute := int(number(tod["minutes"]))
	second := int(number(tod["seconds"]))
	nsec := int(number(tod["nanos"]))
	return time.Date(year, time.Month(month), day, hour, minute, second, nsec, time.UTC)
}

func parseDate(v interface{}) time.Time {
	d, _ := v.(map[string]interface{})
	if d == nil {
		return time.Time{}
	}
	year := int(number(d["year"]))
	month := int(number(d["month"]))
	day := int(number(d["day"]))
	return time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)
}

// DurationSeconds parses a protobuf Duration string (e.g. "600s", "1.5s",
// "19800s") into seconds, returning 0 if absent or unparseable. Shared across
// the ingestion and cron layers for duration and UTC-offset fields.
func DurationSeconds(v interface{}) float64 {
	s, ok := v.(string)
	if !ok || s == "" {
		return 0
	}
	f, err := strconv.ParseFloat(strings.TrimSuffix(s, "s"), 64)
	if err != nil {
		return 0
	}
	return f
}

func parseDurationSeconds(v interface{}) *int32 {
	if _, ok := v.(string); !ok {
		return nil
	}
	i := int32(DurationSeconds(v))
	return &i
}

// Number coerces a JSON value to float64, accepting native numbers and the
// string-encoded int64s the Health API returns (e.g. "46"). Shared coercion
// helper for all extraction layers.
func Number(v interface{}) float64 {
	switch n := v.(type) {
	case float64:
		return n
	case int:
		return float64(n)
	case int64:
		return float64(n)
	case string:
		f, _ := strconv.ParseFloat(n, 64)
		return f
	}
	return 0
}

func number(v interface{}) float64 { return Number(v) }

// ListDataPointsRequest is the request for dataPoints:list.
type ListDataPointsRequest struct {
	DataType         string
	StartTime        time.Time
	EndTime          time.Time
	PageToken        string
	PageSize         int
	DataSourceFamily string
}

// ListDataPointsResponse is the response for dataPoints:list.
type ListDataPointsResponse struct {
	DataPoints    []DataPoint `json:"dataPoints"`
	NextPageToken string      `json:"nextPageToken"`
}

// ReconcileDataPointsRequest is the request for dataPoints:reconcile.
type ReconcileDataPointsRequest struct {
	DataType         string
	StartTime        time.Time
	EndTime          time.Time
	PageToken        string
	PageSize         int
	DataSourceFamily string
}

// ReconcileDataPointsResponse is the response for dataPoints:reconcile.
// The live API returns the same dataPoints array shape as list, not a separate
// dataPointStream field.
type ReconcileDataPointsResponse struct {
	DataPoints    []DataPoint `json:"dataPoints"`
	NextPageToken string      `json:"nextPageToken"`
}

// RollupRequest is the request for dataPoints:rollUp or :dailyRollUp.
type RollupRequest struct {
	DataType         string
	StartTime        time.Time
	EndTime          time.Time
	WindowSize       int // seconds for rollUp, days for dailyRollUp
	DataSourceFamily string
}

// RollupDataPoint represents a single rollup result.
// The API returns a union field named after the data type (e.g. "steps",
// "heartRate") that contains aggregated values. This wrapper keeps the raw
// response and exposes helpers to extract common fields.
type RollupDataPoint struct {
	StartTime      *time.Time      `json:"startTime,omitempty"`
	EndTime        *time.Time      `json:"endTime,omitempty"`
	CivilStartDate *time.Time      `json:"civilStartDate,omitempty"`
	CivilEndDate   *time.Time      `json:"civilEndDate,omitempty"`
	RawJSON        []byte          `json:"-"`
	value          map[string]interface{}
}

// UnmarshalJSON captures the raw response and the type-specific union value.
func (dp *RollupDataPoint) UnmarshalJSON(b []byte) error {
	dp.RawJSON = append([]byte(nil), b...)

	var raw map[string]interface{}
	if err := json.Unmarshal(b, &raw); err != nil {
		return err
	}

	dp.StartTime = parsePtrTime(raw["startTime"])
	dp.EndTime = parsePtrTime(raw["endTime"])
	dp.CivilStartDate = parsePtrCivilDate(raw["civilStartDate"])
	dp.CivilEndDate = parsePtrCivilDate(raw["civilEndDate"])

	for _, key := range []string{"steps", "floors", "heartRate", "weight", "altitude",
		"distance", "bodyFat", "totalCalories", "activeZoneMinutes", "sedentaryPeriod",
		"runVo2Max", "caloriesInHeartRateZone", "activityLevel", "nutritionLog",
		"hydrationLog", "timeInHeartRateZone", "activeMinutes", "swimLengthsData",
		"coreBodyTemperature", "activeEnergyBurned", "bloodGlucose",
		"restingHeartRatePersonalRange", "heartRateVariabilityPersonalRange"} {
		if v, ok := raw[key].(map[string]interface{}); ok {
			dp.value = v
			break
		}
	}
	return nil
}

// MarshalJSON returns the raw response.
func (dp RollupDataPoint) MarshalJSON() ([]byte, error) {
	if len(dp.RawJSON) > 0 {
		return dp.RawJSON, nil
	}
	return json.Marshal(struct {
		StartTime      *time.Time `json:"startTime,omitempty"`
		EndTime        *time.Time `json:"endTime,omitempty"`
		CivilStartDate *time.Time `json:"civilStartDate,omitempty"`
		CivilEndDate   *time.Time `json:"civilEndDate,omitempty"`
	}{
		StartTime:      dp.StartTime,
		EndTime:        dp.EndTime,
		CivilStartDate: dp.CivilStartDate,
		CivilEndDate:   dp.CivilEndDate,
	})
}

// ValueMap returns the type-specific rollup value object.
func (dp *RollupDataPoint) ValueMap() map[string]interface{} {
	return dp.value
}

func parsePtrTime(v interface{}) *time.Time {
	s, _ := v.(string)
	if s == "" {
		return nil
	}
	for _, layout := range []string{time.RFC3339Nano, time.RFC3339} {
		if t, err := time.Parse(layout, s); err == nil {
			return &t
		}
	}
	return nil
}

func parsePtrCivilDate(v interface{}) *time.Time {
	m, _ := v.(map[string]interface{})
	if m == nil {
		return nil
	}
	d, _ := m["date"].(map[string]interface{})
	if d == nil {
		return nil
	}
	year := int(number(d["year"]))
	month := int(number(d["month"]))
	day := int(number(d["day"]))
	t := time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)
	return &t
}

// RollupResponse is the response for rollup endpoints.
type RollupResponse struct {
	RollupDataPoints []RollupDataPoint `json:"rollupDataPoints"`
}


