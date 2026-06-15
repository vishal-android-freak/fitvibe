package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
	"github.com/vishal-android-freak/fitvibe/internal/oauth"
	"github.com/vishal-android-freak/fitvibe/internal/webhooks"
)

// Router is the minimal interface needed to register admin routes.
type Router interface {
	HandleFunc(pattern string, handler http.HandlerFunc)
}

// AdminHandler exposes manual trigger and subscriber management endpoints.
type AdminHandler struct {
	oauthService      *oauth.Service
	userRepo          *repositories.UserRepo
	subscriberManager *webhooks.SubscriberManager
}

// NewAdminHandler creates a new admin handler.
func NewAdminHandler(oauthService *oauth.Service, userRepo *repositories.UserRepo, subscriberManager *webhooks.SubscriberManager) *AdminHandler {
	return &AdminHandler{
		oauthService:      oauthService,
		userRepo:          userRepo,
		subscriberManager: subscriberManager,
	}
}

// Register routes under /admin.
func (h *AdminHandler) Register(r Router) {
	r.HandleFunc("POST /admin/subscribers", h.createSubscriber)
	r.HandleFunc("GET /admin/subscribers", h.listSubscribers)
	r.HandleFunc("PATCH /admin/subscribers/{id}", h.updateSubscriber)
	r.HandleFunc("DELETE /admin/subscribers/{id}", h.deleteSubscriber)
}

func (h *AdminHandler) tokenFn(ctx context.Context, r *http.Request) (string, error) {
	userIDStr := r.URL.Query().Get("user_id")
	if userIDStr == "" {
		return "", fmt.Errorf("user_id query parameter is required")
	}
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		return "", fmt.Errorf("invalid user_id: %w", err)
	}

	user, err := h.userRepo.GetByID(ctx, userID)
	if err != nil {
		return "", fmt.Errorf("lookup user: %w", err)
	}
	if user == nil {
		return "", fmt.Errorf("user not found")
	}

	provider := h.oauthService.TokenProvider(userID)
	return provider(ctx)
}

func (h *AdminHandler) createSubscriber(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	token, err := h.tokenFn(ctx, r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var cfg webhooks.SubscriberConfig
	if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Bind a token provider to the subscriber manager for this request.
	mgr := webhooks.NewSubscriberManager(h.subscriberManager.Config(), func(context.Context) (string, error) {
		return token, nil
	})

	created, err := mgr.CreateSubscriber(ctx, &cfg)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(created)
}

func (h *AdminHandler) listSubscribers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	token, err := h.tokenFn(ctx, r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	mgr := webhooks.NewSubscriberManager(h.subscriberManager.Config(), func(context.Context) (string, error) {
		return token, nil
	})

	resp, err := mgr.ListSubscribers(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *AdminHandler) updateSubscriber(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	token, err := h.tokenFn(ctx, r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	id := r.PathValue("id")
	var cfg webhooks.SubscriberConfig
	if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	mgr := webhooks.NewSubscriberManager(h.subscriberManager.Config(), func(context.Context) (string, error) {
		return token, nil
	})

	updated, err := mgr.UpdateSubscriber(ctx, id, &cfg)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updated)
}

func (h *AdminHandler) deleteSubscriber(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	token, err := h.tokenFn(ctx, r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	id := r.PathValue("id")
	mgr := webhooks.NewSubscriberManager(h.subscriberManager.Config(), func(context.Context) (string, error) {
		return token, nil
	})

	if err := mgr.DeleteSubscriber(ctx, id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
