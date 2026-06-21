package repositories

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// User represents a row in the users table.
type User struct {
	ID                    int64
	GoogleUserID          sql.NullString
	HealthUserID          sql.NullString
	LegacyUserID          sql.NullString
	Email                 sql.NullString
	GoogleDisplayName     sql.NullString
	GooglePicture         sql.NullString
	GoogleGender          sql.NullString
	HeightMeters          sql.NullFloat64
	WeightKg              sql.NullFloat64
	AccessToken           string
	RefreshToken          string
	TokenExpiry           time.Time
	Scopes                string
	Age                   sql.NullInt32
	MembershipStartDate   sql.NullTime
	DistanceUnit          sql.NullString
	WeightUnit            sql.NullString
	HeightUnit            sql.NullString
	TemperatureUnit       sql.NullString
	TimeZone              sql.NullString
	LanguageLocale        sql.NullString
	UTCOffset             sql.NullString
	StrideLengthWalkingMm sql.NullInt32
	StrideLengthRunningMm sql.NullInt32
	ProfileJSON           sql.NullString
	ProfileUpdatedAt      sql.NullTime
	SettingsJSON          sql.NullString
	SettingsUpdatedAt     sql.NullTime
	CreatedAt             time.Time
	UpdatedAt             time.Time
}

// UserRepo handles persistence for users.
type UserRepo struct {
	db *sql.DB
}

// NewUserRepo creates a new UserRepo.
func NewUserRepo(db *sql.DB) *UserRepo {
	return &UserRepo{db: db}
}

// StoreTokens creates or updates a user with OAuth tokens and profile info.
func (r *UserRepo) StoreTokens(ctx context.Context, googleUserID, healthUserID, email, displayName, picture, gender string, heightMeters, weightKg float64, accessToken, refreshToken string, expiry time.Time, scopes string) (*User, error) {
	query := `
		INSERT INTO users (
			google_user_id, health_user_id, legacy_user_id, email,
			google_display_name, google_picture, google_gender,
			height_meters, weight_kg,
			access_token, refresh_token, token_expiry, scopes,
			updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		ON CONFLICT(google_user_id) DO UPDATE SET
			health_user_id = excluded.health_user_id,
			legacy_user_id = excluded.legacy_user_id,
			email = excluded.email,
			google_display_name = excluded.google_display_name,
			google_picture = excluded.google_picture,
			google_gender = excluded.google_gender,
			height_meters = excluded.height_meters,
			weight_kg = excluded.weight_kg,
			access_token = excluded.access_token,
			refresh_token = excluded.refresh_token,
			token_expiry = excluded.token_expiry,
			scopes = excluded.scopes,
			updated_at = excluded.updated_at
		RETURNING id, google_user_id, health_user_id, legacy_user_id, email,
			google_display_name, google_picture, google_gender,
			height_meters, weight_kg,
			access_token, refresh_token, token_expiry, scopes, created_at, updated_at
	`

	now := time.Now().UTC()
	row := r.db.QueryRowContext(ctx, query,
		googleUserID, healthUserID, "", email,
		nullStr(displayName), nullStr(picture), nullStr(gender),
		nullPosFloat(heightMeters), nullPosFloat(weightKg),
		accessToken, refreshToken, expiry, scopes, now,
	)

	u := &User{}
	if err := row.Scan(
		&u.ID, &u.GoogleUserID, &u.HealthUserID, &u.LegacyUserID, &u.Email,
		&u.GoogleDisplayName, &u.GooglePicture, &u.GoogleGender,
		&u.HeightMeters, &u.WeightKg,
		&u.AccessToken, &u.RefreshToken, &u.TokenExpiry, &u.Scopes, &u.CreatedAt, &u.UpdatedAt,
	); err != nil {
		return nil, fmt.Errorf("upsert user: %w", err)
	}
	return u, nil
}

func userColumns() string {
	return `
		id, google_user_id, health_user_id, legacy_user_id, email,
		google_display_name, google_picture, google_gender,
		height_meters, weight_kg,
		access_token, refresh_token, token_expiry, scopes,
		age, membership_start_date,
		distance_unit, weight_unit, height_unit, temperature_unit,
		time_zone, language_locale, utc_offset,
		stride_length_walking_mm, stride_length_running_mm,
		profile_json, profile_updated_at, settings_json, settings_updated_at,
		created_at, updated_at
	`
}

func scanUser(s scanner) (*User, error) {
	u := &User{}
	if err := s.Scan(
		&u.ID, &u.GoogleUserID, &u.HealthUserID, &u.LegacyUserID, &u.Email,
		&u.GoogleDisplayName, &u.GooglePicture, &u.GoogleGender,
		&u.HeightMeters, &u.WeightKg,
		&u.AccessToken, &u.RefreshToken, &u.TokenExpiry, &u.Scopes,
		&u.Age, &u.MembershipStartDate,
		&u.DistanceUnit, &u.WeightUnit, &u.HeightUnit, &u.TemperatureUnit,
		&u.TimeZone, &u.LanguageLocale, &u.UTCOffset,
		&u.StrideLengthWalkingMm, &u.StrideLengthRunningMm,
		&u.ProfileJSON, &u.ProfileUpdatedAt, &u.SettingsJSON, &u.SettingsUpdatedAt,
		&u.CreatedAt, &u.UpdatedAt,
	); err != nil {
		return nil, err
	}
	return u, nil
}

type scanner interface {
	Scan(dest ...interface{}) error
}

// GetByID looks up a user by id.
func (r *UserRepo) GetByID(ctx context.Context, id int64) (*User, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+userColumns()+" FROM users WHERE id = $1", id)
	u, err := scanUser(row)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	return u, nil
}

// GetByHealthUserID looks up a user by health_user_id.
func (r *UserRepo) GetByHealthUserID(ctx context.Context, healthUserID string) (*User, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+userColumns()+" FROM users WHERE health_user_id = $1", healthUserID)
	u, err := scanUser(row)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get user: %w", err)
	}
	return u, nil
}

// GetByGoogleUserID looks up a user by google_user_id — the Firebase uid the
// auth middleware resolves from a verified ID token.
func (r *UserRepo) GetByGoogleUserID(ctx context.Context, googleUserID string) (*User, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+userColumns()+" FROM users WHERE google_user_id = $1", googleUserID)
	u, err := scanUser(row)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get user by google_user_id: %w", err)
	}
	return u, nil
}

// List returns all onboarded users.
func (r *UserRepo) List(ctx context.Context) ([]*User, error) {
	rows, err := r.db.QueryContext(ctx, "SELECT "+userColumns()+" FROM users ORDER BY id")
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	var out []*User
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		out = append(out, u)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate users: %w", err)
	}
	return out, nil
}

// UpdateProfileSettings caches the user's profile and settings.
func (r *UserRepo) UpdateProfileSettings(ctx context.Context, id int64, age int, membershipStartDate time.Time, walkingStrideMm, runningStrideMm int, distanceUnit, weightUnit, heightUnit, temperatureUnit, timeZone, languageLocale, utcOffset string, profileJSON, settingsJSON string) error {
	now := time.Now().UTC()
	_, err := r.db.ExecContext(ctx, `
		UPDATE users
		SET age = $1, membership_start_date = $2,
		    stride_length_walking_mm = $3, stride_length_running_mm = $4,
		    distance_unit = $5, weight_unit = $6, height_unit = $7, temperature_unit = $8,
		    time_zone = $9, language_locale = $10, utc_offset = $11,
		    profile_json = $12, profile_updated_at = $13,
		    settings_json = $14, settings_updated_at = $15, updated_at = $16
		WHERE id = $17
	`,
		nullPosInt32(age),
		sql.NullTime{Time: membershipStartDate, Valid: !membershipStartDate.IsZero()},
		nullPosInt32(walkingStrideMm), nullPosInt32(runningStrideMm),
		nullStr(distanceUnit), nullStr(weightUnit), nullStr(heightUnit), nullStr(temperatureUnit),
		nullStr(timeZone), nullStr(languageLocale), nullStr(utcOffset),
		nullStr(profileJSON),
		sql.NullTime{Time: now, Valid: profileJSON != ""},
		nullStr(settingsJSON),
		sql.NullTime{Time: now, Valid: settingsJSON != ""},
		now, id)
	if err != nil {
		return fmt.Errorf("update profile/settings: %w", err)
	}
	return nil
}

// UpdateBodyMetrics updates height/weight from latest data points.
func (r *UserRepo) UpdateBodyMetrics(ctx context.Context, id int64, heightMeters, weightKg float64) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE users
		SET height_meters = $1, weight_kg = $2, updated_at = $3
		WHERE id = $4
	`,
		nullPosFloat(heightMeters), nullPosFloat(weightKg),
		time.Now().UTC(), id)
	if err != nil {
		return fmt.Errorf("update body metrics: %w", err)
	}
	return nil
}

// UpdateIdentity updates the Google and Health user IDs for a user.
func (r *UserRepo) UpdateIdentity(ctx context.Context, id int64, googleUserID, healthUserID, legacyUserID string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE users
		SET google_user_id = $1, health_user_id = $2, legacy_user_id = $3, updated_at = $4
		WHERE id = $5
	`, sql.NullString{String: googleUserID, Valid: googleUserID != ""},
		sql.NullString{String: healthUserID, Valid: healthUserID != ""},
		sql.NullString{String: legacyUserID, Valid: legacyUserID != ""},
		time.Now().UTC(), id)
	if err != nil {
		return fmt.Errorf("update identity: %w", err)
	}
	return nil
}

// UpdateGoogleProfile refreshes the Google display name / email / picture /
// gender from a fresh login. Each field updates only when this login actually
// returned a value (NULLIF ” → COALESCE keeps the existing one), so a login
// that omits a field never wipes a previously-stored value.
func (r *UserRepo) UpdateGoogleProfile(ctx context.Context, id int64, displayName, email, picture, gender string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE users SET
			google_display_name = COALESCE(NULLIF($1, ''), google_display_name),
			email               = COALESCE(NULLIF($2, ''), email),
			google_picture      = COALESCE(NULLIF($3, ''), google_picture),
			google_gender       = COALESCE(NULLIF($4, ''), google_gender),
			updated_at          = $5
		WHERE id = $6
	`, displayName, email, picture, gender, time.Now().UTC(), id)
	if err != nil {
		return fmt.Errorf("update google profile: %w", err)
	}
	return nil
}

// UpdateTokensByID updates tokens for a specific user by ID.
func (r *UserRepo) UpdateTokensByID(ctx context.Context, id int64, accessToken, refreshToken string, expiry time.Time, scopes string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE users
		SET access_token = $1, refresh_token = $2, token_expiry = $3, scopes = $4, updated_at = $5
		WHERE id = $6
	`, accessToken, refreshToken, expiry, scopes, time.Now().UTC(), id)
	if err != nil {
		return fmt.Errorf("update tokens: %w", err)
	}
	return nil
}

// GetSleepSchedule returns the user's target bedtime/wake (minutes since local
// midnight), each nil when unset. Google doesn't expose this, so we own it.
func (r *UserRepo) GetSleepSchedule(ctx context.Context, id int64) (bed, wake *int, err error) {
	var b, w sql.NullInt32
	err = r.db.QueryRowContext(ctx, `SELECT target_bed_minutes, target_wake_minutes FROM users WHERE id = $1`, id).Scan(&b, &w)
	if err != nil {
		return nil, nil, fmt.Errorf("get sleep schedule: %w", err)
	}
	if b.Valid {
		v := int(b.Int32)
		bed = &v
	}
	if w.Valid {
		v := int(w.Int32)
		wake = &v
	}
	return bed, wake, nil
}

// SetSleepSchedule updates the user's target bedtime/wake (minutes since local
// midnight). A nil value clears that target.
func (r *UserRepo) SetSleepSchedule(ctx context.Context, id int64, bed, wake *int) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE users SET target_bed_minutes = $1, target_wake_minutes = $2, updated_at = $3 WHERE id = $4`,
		nullableInt(bed), nullableInt(wake), time.Now().UTC(), id)
	if err != nil {
		return fmt.Errorf("set sleep schedule: %w", err)
	}
	return nil
}

func nullableInt(v *int) sql.NullInt32 {
	if v == nil {
		return sql.NullInt32{}
	}
	return sql.NullInt32{Int32: int32(*v), Valid: true}
}
