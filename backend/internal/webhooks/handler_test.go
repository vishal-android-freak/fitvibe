package webhooks

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/vishal-android-freak/fitvibe/internal/config"
)

// newVerificationHandler builds a handler with just enough wiring to exercise
// the verification handshake (no repo/verifier needed — that path returns early).
func newVerificationHandler(secret string) *Handler {
	return &Handler{
		cfg:    &config.Config{WebhookSecret: secret},
		logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
}

func postVerification(h *Handler, auth string) int {
	req := httptest.NewRequest(http.MethodPost, "/webhooks", strings.NewReader(`{"type":"verification"}`))
	if auth != "" {
		req.Header.Set("Authorization", auth)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec.Code
}

// Google sends two verification POSTs and BOTH must pass: the authorized one
// must return 201, the unauthorized one must return 401.
func TestVerificationHandshake(t *testing.T) {
	h := newVerificationHandler("super-secret")

	// Step 1: authorized request with the configured secret → 201 Created.
	if got := postVerification(h, "Bearer super-secret"); got != http.StatusCreated {
		t.Errorf("authorized verification: got %d, want %d", got, http.StatusCreated)
	}

	// Step 2: unauthorized challenge (no Authorization header) → 401.
	if got := postVerification(h, ""); got != http.StatusUnauthorized {
		t.Errorf("unauthorized challenge: got %d, want %d", got, http.StatusUnauthorized)
	}

	// A wrong secret must also be rejected.
	if got := postVerification(h, "Bearer wrong"); got != http.StatusUnauthorized {
		t.Errorf("wrong secret: got %d, want %d", got, http.StatusUnauthorized)
	}
}

// The configured secret may or may not already carry the "Bearer " prefix.
func TestVerificationHandshakeBareSecret(t *testing.T) {
	// Secret stored without the "Bearer " prefix; handler adds it.
	h := newVerificationHandler("abc123")
	if got := postVerification(h, "Bearer abc123"); got != http.StatusCreated {
		t.Errorf("authorized (bare secret): got %d, want %d", got, http.StatusCreated)
	}
	if got := postVerification(h, ""); got != http.StatusUnauthorized {
		t.Errorf("unauthorized (bare secret): got %d, want %d", got, http.StatusUnauthorized)
	}
}
