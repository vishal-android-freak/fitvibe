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
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
		sql.NullString{String: displayName, Valid: displayName != ""},
		sql.NullString{String: picture, Valid: picture != ""},
		sql.NullString{String: gender, Valid: gender != ""},
		sql.NullFloat64{Float64: heightMeters, Valid: heightMeters > 0},
		sql.NullFloat64{Float64: weightKg, Valid: weightKg > 0},
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
	row := r.db.QueryRowContext(ctx, "SELECT "+userColumns()+" FROM users WHERE id = ?", id)
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
	row := r.db.QueryRowContext(ctx, "SELECT "+userColumns()+" FROM users WHERE health_user_id = ?", healthUserID)
	u, err := scanUser(row)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get user: %w", err)
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
		SET age = ?, membership_start_date = ?,
		    stride_length_walking_mm = ?, stride_length_running_mm = ?,
		    distance_unit = ?, weight_unit = ?, height_unit = ?, temperature_unit = ?,
		    time_zone = ?, language_locale = ?, utc_offset = ?,
		    profile_json = ?, profile_updated_at = ?,
		    settings_json = ?, settings_updated_at = ?, updated_at = ?
		WHERE id = ?
	`,
		sql.NullInt32{Int32: int32(age), Valid: age > 0},
		sql.NullTime{Time: membershipStartDate, Valid: !membershipStartDate.IsZero()},
		sql.NullInt32{Int32: int32(walkingStrideMm), Valid: walkingStrideMm > 0},
		sql.NullInt32{Int32: int32(runningStrideMm), Valid: runningStrideMm > 0},
		sql.NullString{String: distanceUnit, Valid: distanceUnit != ""},
		sql.NullString{String: weightUnit, Valid: weightUnit != ""},
		sql.NullString{String: heightUnit, Valid: heightUnit != ""},
		sql.NullString{String: temperatureUnit, Valid: temperatureUnit != ""},
		sql.NullString{String: timeZone, Valid: timeZone != ""},
		sql.NullString{String: languageLocale, Valid: languageLocale != ""},
		sql.NullString{String: utcOffset, Valid: utcOffset != ""},
		sql.NullString{String: profileJSON, Valid: profileJSON != ""},
		sql.NullTime{Time: now, Valid: profileJSON != ""},
		sql.NullString{String: settingsJSON, Valid: settingsJSON != ""},
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
		SET height_meters = ?, weight_kg = ?, updated_at = ?
		WHERE id = ?
	`,
		sql.NullFloat64{Float64: heightMeters, Valid: heightMeters > 0},
		sql.NullFloat64{Float64: weightKg, Valid: weightKg > 0},
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
		SET google_user_id = ?, health_user_id = ?, legacy_user_id = ?, updated_at = ?
		WHERE id = ?
	`, sql.NullString{String: googleUserID, Valid: googleUserID != ""},
		sql.NullString{String: healthUserID, Valid: healthUserID != ""},
		sql.NullString{String: legacyUserID, Valid: legacyUserID != ""},
		time.Now().UTC(), id)
	if err != nil {
		return fmt.Errorf("update identity: %w", err)
	}
	return nil
}

// UpdateTokensByID updates tokens for a specific user by ID.
func (r *UserRepo) UpdateTokensByID(ctx context.Context, id int64, accessToken, refreshToken string, expiry time.Time, scopes string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE users
		SET access_token = ?, refresh_token = ?, token_expiry = ?, scopes = ?, updated_at = ?
		WHERE id = ?
	`, accessToken, refreshToken, expiry, scopes, time.Now().UTC(), id)
	if err != nil {
		return fmt.Errorf("update tokens: %w", err)
	}
	return nil
}
