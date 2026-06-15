package oauth

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/vishal-android-freak/fitvibe/internal/config"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

var healthScopes = []string{
	"openid",
	"https://www.googleapis.com/auth/userinfo.profile",
	"https://www.googleapis.com/auth/userinfo.email",
	"https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
	"https://www.googleapis.com/auth/googlehealth.activity_and_fitness.writeonly",
	"https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
	"https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.writeonly",
	"https://www.googleapis.com/auth/googlehealth.nutrition.readonly",
	"https://www.googleapis.com/auth/googlehealth.nutrition.writeonly",
	"https://www.googleapis.com/auth/googlehealth.sleep.readonly",
	"https://www.googleapis.com/auth/googlehealth.sleep.writeonly",
	"https://www.googleapis.com/auth/googlehealth.ecg.readonly",
	"https://www.googleapis.com/auth/googlehealth.irn.readonly",
	"https://www.googleapis.com/auth/googlehealth.location.readonly",
	"https://www.googleapis.com/auth/googlehealth.profile.readonly",
	"https://www.googleapis.com/auth/googlehealth.profile.writeonly",
	"https://www.googleapis.com/auth/googlehealth.settings.readonly",
	"https://www.googleapis.com/auth/googlehealth.settings.writeonly",
}

// TokenSource abstracts Google OAuth token exchange and refresh.
// The default implementation uses golang.org/x/oauth2.
type TokenSource interface {
	Exchange(ctx context.Context, code, redirectURI string) (*oauth2.Token, error)
	Refresh(ctx context.Context, refreshToken string) (*oauth2.Token, error)
}

// googleTokenSource is the production TokenSource backed by oauth2.Config.
type googleTokenSource struct {
	cfg *oauth2.Config
}

func newGoogleTokenSource(cfg *config.Config) TokenSource {
	return &googleTokenSource{cfg: oauthConfig(cfg)}
}

func (g *googleTokenSource) Exchange(ctx context.Context, code, redirectURI string) (*oauth2.Token, error) {
	c := *g.cfg
	if redirectURI != "" {
		c.RedirectURL = redirectURI
	}
	token, err := c.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("exchange code: %w", err)
	}
	return token, nil
}

func (g *googleTokenSource) Refresh(ctx context.Context, refreshToken string) (*oauth2.Token, error) {
	token := &oauth2.Token{
		RefreshToken: refreshToken,
		Expiry:       time.Now().Add(-time.Hour), // force refresh
	}
	ts := g.cfg.TokenSource(ctx, token)
	newToken, err := ts.Token()
	if err != nil {
		return nil, fmt.Errorf("refresh token: %w", err)
	}
	return newToken, nil
}

func oauthConfig(cfg *config.Config) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     cfg.GoogleClientID,
		ClientSecret: cfg.GoogleClientSecret,
		RedirectURL:  cfg.GoogleRedirectURI,
		Scopes:       healthScopes,
		Endpoint:     google.Endpoint,
	}
}

// AuthURL returns the URL to redirect the user to for Google OAuth consent.
func AuthURL(cfg *config.Config, state string) string {
	return oauthConfig(cfg).AuthCodeURL(state,
		oauth2.AccessTypeOffline,
		oauth2.ApprovalForce,
	)
}

// IDTokenClaims holds the fields we care about from a Google ID token.
type IDTokenClaims struct {
	Sub     string `json:"sub"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
	Gender  string `json:"gender"`
}

// ParseIDToken extracts Google user info from a raw ID token without verification.
// The token comes from Google's token endpoint, so verification is optional here.
func ParseIDToken(rawIDToken string) (*IDTokenClaims, error) {
	parts := strings.Split(rawIDToken, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid id token")
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("decode id token payload: %w", err)
	}

	var claims IDTokenClaims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return nil, fmt.Errorf("unmarshal id token claims: %w", err)
	}
	return &claims, nil
}

// UserInfoResponse is the response from https://www.googleapis.com/oauth2/v2/userinfo.
type UserInfoResponse struct {
	ID      string `json:"id"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
	Gender  string `json:"gender"`
}

// FetchUserInfo calls Google's userinfo endpoint to get Google account info.
func FetchUserInfo(ctx context.Context, accessToken string) (*UserInfoResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("userinfo returned %d", resp.StatusCode)
	}

	var info UserInfoResponse
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, err
	}
	return &info, nil
}
