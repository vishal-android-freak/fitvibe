package cron

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
	"github.com/vishal-android-freak/fitvibe/internal/healthapi"
	"github.com/vishal-android-freak/fitvibe/internal/oauth"
)

// ProfileSettingsSyncer refreshes profile and settings for all users.
type ProfileSettingsSyncer struct {
	oauthService *oauth.Service
	userRepo     *repositories.UserRepo
	logger       *slog.Logger
}

// NewProfileSettingsSyncer creates a new profile/settings syncer.
func NewProfileSettingsSyncer(oauthService *oauth.Service, userRepo *repositories.UserRepo, logger *slog.Logger) *ProfileSettingsSyncer {
	return &ProfileSettingsSyncer{
		oauthService: oauthService,
		userRepo:     userRepo,
		logger:       logger,
	}
}

// Name returns the job name.
func (s *ProfileSettingsSyncer) Name() string {
	return "profile-settings-sync"
}

// Run refreshes profile and settings for all users.
func (s *ProfileSettingsSyncer) Run(ctx context.Context) error {
	users, err := s.userRepo.List(ctx)
	if err != nil {
		return err
	}

	for _, user := range users {
		if err := s.syncUser(ctx, user); err != nil {
			s.logger.Error("profile/settings sync failed",
				"user_id", user.ID,
				"error", err)
		}
	}
	return nil
}

func (s *ProfileSettingsSyncer) syncUser(ctx context.Context, user *repositories.User) error {
	client := healthapi.NewClient(s.oauthService.TokenProvider(user.ID))

	profile, err := client.GetProfile(ctx)
	if err != nil {
		return fmt.Errorf("get profile: %w", err)
	}

	settings, err := client.GetSettings(ctx)
	if err != nil {
		return fmt.Errorf("get settings: %w", err)
	}

	profileJSON, _ := json.Marshal(profile)
	settingsJSON, _ := json.Marshal(settings)

	membershipStartDate := parseAPIDate(profile.MembershipStartDate)

	if err := s.userRepo.UpdateProfileSettings(ctx, user.ID,
		profile.Age, membershipStartDate,
		profile.UserConfiguredWalkingStrideLengthMm, profile.UserConfiguredRunningStrideLengthMm,
		settings.DistanceUnit, settings.WeightUnit, settings.HeightUnit, settings.TemperatureUnit,
		settings.TimeZone, settings.LanguageLocale, settings.UTCOffset,
		string(profileJSON), string(settingsJSON)); err != nil {
		return fmt.Errorf("update profile/settings: %w", err)
	}
	return nil
}

func parseAPIDate(d map[string]interface{}) time.Time {
	if d == nil {
		return time.Time{}
	}
	year := int(healthapiNumber(d["year"]))
	month := int(healthapiNumber(d["month"]))
	day := int(healthapiNumber(d["day"]))
	if year == 0 && month == 0 && day == 0 {
		return time.Time{}
	}
	return time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)
}

func healthapiNumber(v interface{}) float64 {
	switch n := v.(type) {
	case float64:
		return n
	case int:
		return float64(n)
	case int64:
		return float64(n)
	}
	return 0
}
