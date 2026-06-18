// Package firebaseauth wraps the Firebase Admin SDK for the two things FitVibe
// needs: minting a custom token after the Google OAuth flow completes (so the
// app can sign in with no extra step), and verifying the app's ID tokens in
// request middleware (replacing the old ?user_id trust). The Firebase uid is
// the user's Google user id.
package firebaseauth

import (
	"context"
	"fmt"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"

	"github.com/vishal-android-freak/fitvibe/internal/config"
)

// Client mints and verifies Firebase tokens.
type Client struct {
	auth *auth.Client
}

// New initializes the Firebase Admin SDK from config. When FirebaseCredentialsFile
// is set it uses that service-account JSON; otherwise it falls back to Application
// Default Credentials (GOOGLE_APPLICATION_CREDENTIALS / metadata server).
func New(ctx context.Context, cfg *config.Config) (*Client, error) {
	var opts []option.ClientOption
	if cfg.FirebaseCredentialsFile != "" {
		opts = append(opts, option.WithCredentialsFile(cfg.FirebaseCredentialsFile))
	}
	app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: cfg.FirebaseProjectID}, opts...)
	if err != nil {
		return nil, fmt.Errorf("init firebase app: %w", err)
	}
	authClient, err := app.Auth(ctx)
	if err != nil {
		return nil, fmt.Errorf("init firebase auth: %w", err)
	}
	return &Client{auth: authClient}, nil
}

// CustomToken mints a Firebase custom token for the given uid (the user's Google
// user id). The app exchanges it via signInWithCustomToken to obtain an ID token.
func (c *Client) CustomToken(ctx context.Context, uid string) (string, error) {
	if uid == "" {
		return "", fmt.Errorf("custom token: empty uid")
	}
	tok, err := c.auth.CustomToken(ctx, uid)
	if err != nil {
		return "", fmt.Errorf("mint custom token: %w", err)
	}
	return tok, nil
}

// VerifyIDToken verifies an app-supplied Firebase ID token and returns its uid
// (the user's Google user id). It checks signature, expiry, and audience.
func (c *Client) VerifyIDToken(ctx context.Context, idToken string) (string, error) {
	tok, err := c.auth.VerifyIDToken(ctx, idToken)
	if err != nil {
		return "", fmt.Errorf("verify id token: %w", err)
	}
	return tok.UID, nil
}
