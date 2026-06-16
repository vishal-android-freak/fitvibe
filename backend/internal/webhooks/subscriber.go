package webhooks

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/vishal-android-freak/fitvibe/internal/config"
)

// SubscriberConfig represents a Google Health webhook subscriber resource.
type SubscriberConfig struct {
	Name                  string           `json:"name,omitempty"`
	EndpointURI           string           `json:"endpointUri"`
	SubscriberConfigs     []DataTypeConfig `json:"subscriberConfigs"`
	EndpointAuthorization EndpointAuth     `json:"endpointAuthorization"`
}

// DataTypeConfig groups data types under an automatic subscription policy.
type DataTypeConfig struct {
	DataTypes                []string `json:"dataTypes"`
	SubscriptionCreatePolicy string   `json:"subscriptionCreatePolicy"`
}

// EndpointAuth is the verification secret Google sends with webhooks.
type EndpointAuth struct {
	Secret string `json:"secret"`
}

// SubscriberManager manages Google Health webhook subscribers.
type SubscriberManager struct {
	cfg        *config.Config
	tokenFn    func(context.Context) (string, error)
	httpClient *http.Client
}

// NewSubscriberManager creates a subscriber manager.
// tokenFn should provide an access token with sufficient privileges.
func NewSubscriberManager(cfg *config.Config, tokenFn func(context.Context) (string, error)) *SubscriberManager {
	return &SubscriberManager{
		cfg:        cfg,
		tokenFn:    tokenFn,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// Config returns the underlying config (used to rebind token providers).
func (m *SubscriberManager) Config() *config.Config {
	return m.cfg
}

// CreateSubscriber creates a new subscriber for all webhook-supported data types.
// subscriberID must match [a-z]([a-z0-9-]{2,34}[a-z0-9]) and be 4-36 characters.
func (m *SubscriberManager) CreateSubscriber(ctx context.Context, subscriberID string, cfg *SubscriberConfig) (*SubscriberConfig, error) {
	if m.cfg.GoogleProjectNumber == "" {
		return nil, fmt.Errorf("GOOGLE_PROJECT_NUMBER is required")
	}
	if subscriberID == "" {
		return nil, fmt.Errorf("subscriberID is required")
	}

	// Use AUTOMATIC policy if not specified.
	for i := range cfg.SubscriberConfigs {
		if cfg.SubscriberConfigs[i].SubscriptionCreatePolicy == "" {
			cfg.SubscriberConfigs[i].SubscriptionCreatePolicy = "AUTOMATIC"
		}
	}

	url := fmt.Sprintf("https://health.googleapis.com/v4/projects/%s/subscribers?subscriberId=%s", m.cfg.GoogleProjectNumber, subscriberID)
	var op operation
	if err := m.doJSON(ctx, http.MethodPost, url, cfg, &op); err != nil {
		return nil, err
	}

	if op.Error != nil {
		return nil, fmt.Errorf("operation failed: %s", op.Error.Message)
	}

	var created SubscriberConfig
	if err := json.Unmarshal(op.Response, &created); err != nil {
		return nil, fmt.Errorf("decode created subscriber: %w", err)
	}
	return &created, nil
}

// ListSubscribers lists all subscribers for the project.
func (m *SubscriberManager) ListSubscribers(ctx context.Context) (*listSubscribersResponse, error) {
	if m.cfg.GoogleProjectNumber == "" {
		return nil, fmt.Errorf("GOOGLE_PROJECT_NUMBER is required")
	}

	url := fmt.Sprintf("https://health.googleapis.com/v4/projects/%s/subscribers", m.cfg.GoogleProjectNumber)
	var resp listSubscribersResponse
	if err := m.doJSON(ctx, http.MethodGet, url, nil, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// UpdateSubscriber updates an existing subscriber.
func (m *SubscriberManager) UpdateSubscriber(ctx context.Context, name string, cfg *SubscriberConfig) (*SubscriberConfig, error) {
	url := fmt.Sprintf("https://health.googleapis.com/v4/%s", name)
	var updated SubscriberConfig
	if err := m.doJSON(ctx, http.MethodPatch, url, cfg, &updated); err != nil {
		return nil, err
	}
	return &updated, nil
}

// DeleteSubscriber deletes a subscriber.
func (m *SubscriberManager) DeleteSubscriber(ctx context.Context, name string) error {
	url := fmt.Sprintf("https://health.googleapis.com/v4/%s", name)
	return m.doJSON(ctx, http.MethodDelete, url, nil, nil)
}

type listSubscribersResponse struct {
	Subscribers []SubscriberConfig `json:"subscribers"`
}

type operation struct {
	Name     string          `json:"name"`
	Done     bool            `json:"done"`
	Error    *operationError `json:"error,omitempty"`
	Response json.RawMessage `json:"response,omitempty"`
}

type operationError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Status  string `json:"status"`
}

func (m *SubscriberManager) doJSON(ctx context.Context, method, url string, body, dest interface{}) error {
	token, err := m.tokenFn(ctx)
	if err != nil {
		return fmt.Errorf("get token: %w", err)
	}

	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("marshal body: %w", err)
		}
		bodyReader = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := m.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("subscriber api returned %d: %s", resp.StatusCode, string(b))
	}

	if dest != nil && resp.StatusCode != http.StatusNoContent {
		if err := json.NewDecoder(resp.Body).Decode(dest); err != nil {
			return fmt.Errorf("decode response: %w", err)
		}
	}
	return nil
}
