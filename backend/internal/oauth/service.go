package oauth

import (
	"context"
	"fmt"
	"time"

	"github.com/vishal-android-freak/fitvibe/internal/config"
	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
	"github.com/vishal-android-freak/fitvibe/internal/healthapi"
	"golang.org/x/oauth2"
)

// TokenMinter mints a Firebase custom token for a uid (the user's Google user
// id). Injected so the OAuth flow can hand the app a sign-in token with no
// extra step. Optional — when nil, no firebase token is minted.
type TokenMinter interface {
	CustomToken(ctx context.Context, uid string) (string, error)
}

// Service handles Google OAuth operations and token storage.
type Service struct {
	cfg           *config.Config
	tokens        TokenSource
	users         *repositories.UserRepo
	getIdentityFn func(ctx context.Context, accessToken string) (*healthapi.IdentityResponse, error)
	minter        TokenMinter
}

// SetTokenMinter wires the Firebase custom-token minter (called from main once
// the Firebase client is initialized).
func (s *Service) SetTokenMinter(m TokenMinter) { s.minter = m }

// NewService creates a new OAuth service using the production Google token source.
func NewService(cfg *config.Config, users *repositories.UserRepo) *Service {
	s := &Service{
		cfg:    cfg,
		tokens: newGoogleTokenSource(cfg),
		users:  users,
	}
	s.getIdentityFn = func(ctx context.Context, accessToken string) (*healthapi.IdentityResponse, error) {
		client := healthapi.NewClient(func(context.Context) (string, error) {
			return accessToken, nil
		})
		return client.GetIdentity(ctx)
	}
	return s
}

// AuthURL returns the Google OAuth consent URL.
func (s *Service) AuthURL(state string) string {
	return AuthURL(s.cfg, state)
}

// ExchangeRequest is the payload from the Expo app.
type ExchangeRequest struct {
	Code        string `json:"code"`
	RedirectURI string `json:"redirect_uri"`
}

// ExchangeResponse is returned after a successful token exchange. It carries
// the connected user's identity plus the Google profile fields the app shows
// (name/email/picture), so the client doesn't need a separate profile fetch.
type ExchangeResponse struct {
	UserID       int64  `json:"user_id"`
	HealthUserID string `json:"health_user_id"`
	GoogleUserID string `json:"google_user_id"`
	LegacyUserID string `json:"legacy_user_id"`
	DisplayName  string `json:"display_name"`
	Email        string `json:"email"`
	Picture      string `json:"picture"`
	// FirebaseToken is a custom token (uid = google_user_id) the app exchanges
	// via signInWithCustomToken to get an ID token for authenticated requests.
	// Empty if Firebase minting isn't configured.
	FirebaseToken string `json:"firebase_token,omitempty"`
}

// Exchange exchanges an authorization code, fetches Google Health identity, and stores the tokens.
func (s *Service) Exchange(ctx context.Context, req ExchangeRequest) (*ExchangeResponse, error) {
	token, err := s.tokens.Exchange(ctx, req.Code, req.RedirectURI)
	if err != nil {
		return nil, fmt.Errorf("exchange code: %w", err)
	}

	if token.RefreshToken == "" {
		return nil, fmt.Errorf("no refresh token returned; ensure prompt=consent and access_type=offline")
	}

	scopes := extractScopes(token)

	googleUserID, email, displayName, picture, gender := extractUserInfo(ctx, token)

	// Fetch Google Health identity using the fresh access token.
	identity, err := s.getIdentityFn(ctx, token.AccessToken)
	if err != nil {
		return nil, fmt.Errorf("get health identity: %w", err)
	}

	// If a user with this health_user_id already exists (e.g. prior login with placeholder),
	// update that row instead of creating a duplicate.
	existing, err := s.users.GetByHealthUserID(ctx, identity.HealthUserID)
	if err != nil {
		return nil, fmt.Errorf("lookup existing user: %w", err)
	}

	var u *repositories.User
	if existing != nil {
		if err := s.users.UpdateTokensByID(ctx, existing.ID, token.AccessToken, token.RefreshToken, token.Expiry, scopes); err != nil {
			return nil, fmt.Errorf("update existing user tokens: %w", err)
		}
		if err := s.users.UpdateIdentity(ctx, existing.ID, googleUserID, identity.HealthUserID, identity.LegacyUserID); err != nil {
			return nil, fmt.Errorf("update existing user identity: %w", err)
		}
		// Refresh the Google profile fields (name/email/picture/gender) from this
		// login — they're only set on first StoreTokens otherwise, so re-logins
		// would never pick up a newly-available picture.
		if err := s.users.UpdateGoogleProfile(ctx, existing.ID, displayName, email, picture, gender); err != nil {
			return nil, fmt.Errorf("update existing user profile: %w", err)
		}
		u = existing
	} else {
		u, err = s.users.StoreTokens(ctx, googleUserID, identity.HealthUserID, email, displayName, picture, gender, 0, 0, token.AccessToken, token.RefreshToken, token.Expiry, scopes)
		if err != nil {
			return nil, fmt.Errorf("store tokens: %w", err)
		}
	}

	// Prefer the profile fields from this login (freshest); fall back to what
	// was stored if Google didn't return them this time.
	if displayName == "" {
		displayName = u.GoogleDisplayName.String
	}
	if email == "" {
		email = u.Email.String
	}
	if picture == "" {
		picture = u.GooglePicture.String
	}

	resp := &ExchangeResponse{
		UserID:       u.ID,
		HealthUserID: identity.HealthUserID,
		GoogleUserID: googleUserID,
		LegacyUserID: identity.LegacyUserID,
		DisplayName:  displayName,
		Email:        email,
		Picture:      picture,
	}

	// Mint a Firebase custom token keyed to the Google user id, so the app can
	// sign in (signInWithCustomToken) with no extra consent step.
	if s.minter != nil && googleUserID != "" {
		tok, err := s.minter.CustomToken(ctx, googleUserID)
		if err != nil {
			return nil, fmt.Errorf("mint firebase token: %w", err)
		}
		resp.FirebaseToken = tok
	}

	return resp, nil
}

func extractScopes(token *oauth2.Token) string {
	if raw, ok := token.Extra("scope").(string); ok {
		return raw
	}
	return ""
}

// RefreshAccessToken refreshes a user's access token and persists the new one.
func (s *Service) RefreshAccessToken(ctx context.Context, user *repositories.User) (*oauth2.Token, error) {
	newToken, err := s.tokens.Refresh(ctx, user.RefreshToken)
	if err != nil {
		return nil, fmt.Errorf("refresh token: %w", err)
	}

	// Persist the new access token (and refresh token if Google rotated it).
	refresh := user.RefreshToken
	if newToken.RefreshToken != "" {
		refresh = newToken.RefreshToken
	}

	_, err = s.users.StoreTokens(ctx,
		user.GoogleUserID.String,
		user.HealthUserID.String,
		user.Email.String,
		user.GoogleDisplayName.String,
		user.GooglePicture.String,
		user.GoogleGender.String,
		user.HeightMeters.Float64,
		user.WeightKg.Float64,
		newToken.AccessToken,
		refresh,
		newToken.Expiry,
		user.Scopes,
	)
	if err != nil {
		return nil, fmt.Errorf("store refreshed tokens: %w", err)
	}

	return newToken, nil
}

// TokenProvider returns a function that yields a valid access token for the
// given user, refreshing it automatically when expired.
func (s *Service) TokenProvider(userID int64) func(context.Context) (string, error) {
	return func(ctx context.Context) (string, error) {
		user, err := s.users.GetByID(ctx, userID)
		if err != nil {
			return "", fmt.Errorf("lookup user: %w", err)
		}
		if user == nil {
			return "", fmt.Errorf("user %d not found", userID)
		}

		if time.Until(user.TokenExpiry) > 30*time.Second {
			return user.AccessToken, nil
		}

		tok, err := s.RefreshAccessToken(ctx, user)
		if err != nil {
			return "", fmt.Errorf("refresh token: %w", err)
		}
		return tok.AccessToken, nil
	}
}

func extractUserInfo(ctx context.Context, token *oauth2.Token) (string, string, string, string, string) {
	// Prefer ID token (requires openid scope).
	if rawIDToken, ok := token.Extra("id_token").(string); ok && rawIDToken != "" {
		claims, err := ParseIDToken(rawIDToken)
		if err == nil {
			return claims.Sub, claims.Email, claims.Name, claims.Picture, claims.Gender
		}
	}

	// Fallback to userinfo endpoint.
	info, err := FetchUserInfo(ctx, token.AccessToken)
	if err == nil {
		return info.ID, info.Email, info.Name, info.Picture, info.Gender
	}

	return "", "", "", "", ""
}
