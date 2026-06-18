// Package authmw provides request authentication for the app-facing /me/*
// endpoints. It verifies a Firebase ID token from the Authorization header,
// resolves the user by google_user_id (the Firebase uid), and puts the
// authenticated internal user id in the request context — so handlers derive
// identity from the verified token, never from a client-supplied user_id.
package authmw

import (
	"context"
	"log/slog"
	"net/http"
	"strings"

	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
)

type ctxKey int

const userIDKey ctxKey = 0

// Verifier is the subset of firebaseauth.Client the middleware needs (an
// interface so tests can stub it).
type Verifier interface {
	VerifyIDToken(ctx context.Context, idToken string) (string, error)
}

// Middleware authenticates requests against Firebase + the user table.
type Middleware struct {
	verifier Verifier
	users    *repositories.UserRepo
	logger   *slog.Logger
}

func New(v Verifier, users *repositories.UserRepo, logger *slog.Logger) *Middleware {
	return &Middleware{verifier: v, users: users, logger: logger}
}

// Require wraps a handler, rejecting requests without a valid Firebase ID token
// that maps to a known user. On success the authenticated user id is in context.
func (m *Middleware) Require(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		idToken, ok := bearerToken(r)
		if !ok {
			unauthorized(w, "missing bearer token")
			return
		}
		uid, err := m.verifier.VerifyIDToken(r.Context(), idToken)
		if err != nil {
			// Don't log the token; just that verification failed.
			m.logger.Warn("id token verification failed", "error", err.Error())
			unauthorized(w, "invalid token")
			return
		}
		user, err := m.users.GetByGoogleUserID(r.Context(), uid)
		if err != nil {
			http.Error(w, `{"error":"auth lookup failed"}`, http.StatusInternalServerError)
			return
		}
		if user == nil {
			unauthorized(w, "unknown user")
			return
		}
		ctx := context.WithValue(r.Context(), userIDKey, user.ID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// UserID returns the authenticated user id from a request context, or (0,false)
// if the request was not authenticated (which shouldn't happen behind Require).
func UserID(ctx context.Context) (int64, bool) {
	id, ok := ctx.Value(userIDKey).(int64)
	return id, ok
}

func bearerToken(r *http.Request) (string, bool) {
	h := r.Header.Get("Authorization")
	const prefix = "Bearer "
	if len(h) <= len(prefix) || !strings.EqualFold(h[:len(prefix)], prefix) {
		return "", false
	}
	tok := strings.TrimSpace(h[len(prefix):])
	return tok, tok != ""
}

func unauthorized(w http.ResponseWriter, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_, _ = w.Write([]byte(`{"error":"` + msg + `"}`))
}
