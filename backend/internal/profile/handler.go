// Package profile serves the authenticated user's own profile (GET /me/profile)
// for the app to render after login — name, email, picture, and a few profile
// fields. Identity comes from the auth middleware's verified token, never the
// request. Tokens/scopes are deliberately NEVER returned.
package profile

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/vishal-android-freak/fitvibe/internal/authmw"
	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
)

type Handler struct {
	users *repositories.UserRepo
}

func NewHandler(users *repositories.UserRepo) *Handler {
	return &Handler{users: users}
}

func (h *Handler) Register(r chi.Router) {
	r.Get("/me/profile", h.profile)
}

// profileResponse is the display-safe profile (no tokens, no scopes).
type profileResponse struct {
	UserID       int64  `json:"userId"`
	GoogleUserID string `json:"googleUserId"`
	DisplayName  string `json:"displayName"`
	Email        string `json:"email"`
	Picture      string `json:"picture"`
	Age          *int   `json:"age,omitempty"`
}

func (h *Handler) profile(w http.ResponseWriter, r *http.Request) {
	userID, ok := authmw.UserID(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	u, err := h.users.GetByID(r.Context(), userID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to load profile")
		return
	}
	if u == nil {
		writeErr(w, http.StatusNotFound, "user not found")
		return
	}
	resp := profileResponse{
		UserID:       u.ID,
		GoogleUserID: u.GoogleUserID.String,
		DisplayName:  u.GoogleDisplayName.String,
		Email:        u.Email.String,
		Picture:      u.GooglePicture.String,
	}
	if u.Age.Valid {
		age := int(u.Age.Int32)
		resp.Age = &age
	}
	writeJSON(w, http.StatusOK, resp)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
