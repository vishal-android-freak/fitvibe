package webhooks

import (
	"database/sql"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/vishal-android-freak/fitvibe/internal/config"
	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
)

// Handler receives Google Health webhook notifications.
type Handler struct {
	cfg       *config.Config
	verifier  *Verifier
	repo      *repositories.WebhookNotificationRepo
	logger    *slog.Logger
}

// NewHandler creates a new webhook handler.
func NewHandler(cfg *config.Config, verifier *Verifier, repo *repositories.WebhookNotificationRepo, logger *slog.Logger) *Handler {
	return &Handler{
		cfg:      cfg,
		verifier: verifier,
		repo:     repo,
		logger:   logger,
	}
}

// ServeHTTP implements http.Handler.
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		h.logger.Error("failed to read webhook body", "error", err)
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	h.logger.Info("webhook request",
		"method", r.Method,
		"path", r.URL.Path,
		"headers", r.Header,
		"body", string(body))

	// Verification handshake.
	if isVerification(body) {
		h.handleVerification(w, r)
		return
	}

	// Real notification: verify signature.
	// The live API sends this header as X-Healthapi-Signature (confirmed).
	sigHeader := r.Header.Get("X-Healthapi-Signature")
	if sigHeader == "" {
		h.logger.Warn("missing signature header", "headers", r.Header)
		http.Error(w, "missing signature", http.StatusUnauthorized)
		return
	}

	if err := h.verifier.Verify(r.Context(), sigHeader, body); err != nil {
		h.logger.Warn("signature verification failed", "error", err)
		http.Error(w, "invalid signature", http.StatusUnauthorized)
		return
	}

	// Queue the notification(s).
	payloads, err := parseNotificationPayloads(body)
	if err != nil {
		h.logger.Error("failed to unmarshal notification", "error", err, "body", string(body))
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	for _, payload := range payloads {
		data := payload.Data
		if data.HealthUserID == "" || data.DataType == "" {
			h.logger.Warn("notification missing health user id or data type", "body", string(body))
			continue
		}

		rec := &repositories.WebhookNotificationRecord{
			HealthUserID:                   data.HealthUserID,
			DataType:                       data.DataType,
			Operation:                      data.Operation,
			ClientProvidedSubscriptionName: sql.NullString{String: data.ClientProvidedSubscriptionName, Valid: data.ClientProvidedSubscriptionName != ""},
			NotificationJSON:               string(body),
			SignatureHeader:                sql.NullString{String: sigHeader, Valid: sigHeader != ""},
			ProcessingStatus:               "pending",
		}
		if _, err := h.repo.Insert(r.Context(), rec); err != nil {
			h.logger.Error("failed to queue webhook notification", "error", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) handleVerification(w http.ResponseWriter, r *http.Request) {
	auth := r.Header.Get("Authorization")
	expected := h.cfg.WebhookSecret

	// Be tolerant of "Bearer " prefix in the configured secret.
	if !strings.HasPrefix(expected, "Bearer ") {
		expected = "Bearer " + expected
	}

	if auth != expected {
		h.logger.Warn("webhook verification unauthorized", "authorization", auth)
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func isVerification(body []byte) bool {
	var v struct {
		Type string `json:"type"`
	}
	if err := json.Unmarshal(body, &v); err != nil {
		return false
	}
	return v.Type == "verification"
}

func parseNotificationPayloads(body []byte) ([]notificationPayload, error) {
	// Google may send a single notification object or a batch array.
	var single notificationPayload
	if err := json.Unmarshal(body, &single); err == nil && single.Data.HealthUserID != "" {
		return []notificationPayload{single}, nil
	}

	var batch []notificationPayload
	if err := json.Unmarshal(body, &batch); err != nil {
		return nil, err
	}
	return batch, nil
}

type notificationPayload struct {
	Data notificationData `json:"data"`
}

type notificationData struct {
	Version                        string                `json:"version"`
	ClientProvidedSubscriptionName string                `json:"clientProvidedSubscriptionName"`
	HealthUserID                   string                `json:"healthUserId"`
	Operation                      string                `json:"operation"`
	DataType                       string                `json:"dataType"`
	Intervals                      []notificationInterval `json:"intervals"`
}

type notificationInterval struct {
	PhysicalTimeInterval     interval `json:"physicalTimeInterval"`
	CivilDateTimeInterval    interval `json:"civilDateTimeInterval"`
	CivilIso8601TimeInterval interval `json:"civilIso8601TimeInterval"`
}

type interval struct {
	StartTime time.Time `json:"startTime"`
	EndTime   time.Time `json:"endTime"`
}

