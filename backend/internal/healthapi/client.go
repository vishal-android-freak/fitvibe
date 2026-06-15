package healthapi

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const (
	defaultBaseURL = "https://health.googleapis.com/v4"
	defaultTimeout = 30 * time.Second
)

// Client is a typed HTTP client for the Google Health API.
type Client struct {
	httpClient *http.Client
	baseURL    string
	tokenFn    func(context.Context) (string, error)
}

// NewClient creates a new Google Health API client.
// tokenFn should return a valid OAuth access token for the request.
func NewClient(tokenFn func(context.Context) (string, error)) *Client {
	return &Client{
		httpClient: &http.Client{Timeout: defaultTimeout},
		baseURL:    defaultBaseURL,
		tokenFn:    tokenFn,
	}
}

// NewClientWithHTTP allows injecting a custom HTTP client (useful in tests).
func NewClientWithHTTP(httpClient *http.Client, baseURL string, tokenFn func(context.Context) (string, error)) *Client {
	if baseURL == "" {
		baseURL = defaultBaseURL
	}
	return &Client{
		httpClient: httpClient,
		baseURL:    baseURL,
		tokenFn:    tokenFn,
	}
}

func (c *Client) get(ctx context.Context, path string, query url.Values, dest interface{}) error {
	return c.doRequest(ctx, http.MethodGet, path, query, nil, dest)
}

func (c *Client) post(ctx context.Context, path string, query url.Values, body, dest interface{}) error {
	return c.doRequest(ctx, http.MethodPost, path, query, body, dest)
}

func (c *Client) doRequest(ctx context.Context, method, path string, query url.Values, body, dest interface{}) error {
	u, err := url.Parse(c.baseURL + path)
	if err != nil {
		return fmt.Errorf("parse url: %w", err)
	}
	if query != nil {
		u.RawQuery = query.Encode()
	}

	var bodyReader io.Reader
	var bodyBytes []byte
	if body != nil {
		bodyBytes, err = json.Marshal(body)
		if err != nil {
			return fmt.Errorf("marshal body: %w", err)
		}
		bodyReader = bytes.NewReader(bodyBytes)
	}

	const maxRetries = 5
	var lastErr error
	for attempt := 0; attempt < maxRetries; attempt++ {
		if attempt > 0 && bodyBytes != nil {
			bodyReader = bytes.NewReader(bodyBytes)
		}

		req, err := http.NewRequestWithContext(ctx, method, u.String(), bodyReader)
		if err != nil {
			return fmt.Errorf("create request: %w", err)
		}
		req.Header.Set("Accept", "application/json")
		if body != nil {
			req.Header.Set("Content-Type", "application/json")
		}

		token, err := c.tokenFn(ctx)
		if err != nil {
			return fmt.Errorf("get access token: %w", err)
		}
		req.Header.Set("Authorization", "Bearer "+token)

		var resp *http.Response
		resp, err = c.httpClient.Do(req)
		if err != nil {
			lastErr = fmt.Errorf("do request: %w", err)
		} else if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			if dest != nil {
				if err := json.NewDecoder(resp.Body).Decode(dest); err != nil {
					resp.Body.Close()
					return fmt.Errorf("decode response: %w", err)
				}
			}
			resp.Body.Close()
			return nil
		} else {
			b, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			lastErr = fmt.Errorf("health api returned %d: %s", resp.StatusCode, string(b))

			// Non-retryable client error.
			if resp.StatusCode != http.StatusTooManyRequests && resp.StatusCode < 500 {
				return lastErr
			}
		}

		// Delay before next attempt (if any).
		if attempt < maxRetries-1 {
			delay := c.retryDelay(attempt, resp)
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(delay):
			}
		}
	}

	return fmt.Errorf("max retries exceeded: %w", lastErr)
}

func (c *Client) retryDelay(attempt int, resp *http.Response) time.Duration {
	if resp != nil {
		if s := resp.Header.Get("Retry-After"); s != "" {
			if sec, err := strconv.Atoi(s); err == nil {
				return time.Duration(sec) * time.Second
			}
		}
	}
	// Exponential backoff: 1s, 2s, 4s, 8s, max 30s.
	delay := time.Duration(math.Pow(2, float64(attempt))) * time.Second
	if delay > 30*time.Second {
		delay = 30 * time.Second
	}
	return delay
}

func (c *Client) usersPath(format string, args ...interface{}) string {
	return "/users/me" + fmt.Sprintf(format, args...)
}

func setTimeQuery(q url.Values, key string, t time.Time) {
	if !t.IsZero() {
		q.Set(key, t.UTC().Format(time.RFC3339Nano))
	}
}

func setIntQuery(q url.Values, key string, n int) {
	if n > 0 {
		q.Set(key, strconv.Itoa(n))
	}
}

func setStringQuery(q url.Values, key, value string) {
	if value != "" {
		q.Set(key, value)
	}
}

func setFilterQuery(q url.Values, dataType, category string, start, end time.Time) {
	if start.IsZero() || end.IsZero() {
		return
	}
	snake := kebabToSnake(dataType)
	var field string
	var useCivilDate bool

	// Sleep filters on interval.end_time; ECG on interval.start_time (physical).
	if dataType == "sleep" {
		field = snake + ".interval.end_time"
	} else if dataType == "electrocardiogram" {
		field = snake + ".interval.start_time"
	} else {
		switch category {
		case "interval":
			field = snake + ".interval.start_time"
		case "sample":
			field = snake + ".sample_time.physical_time"
		case "session":
			field = snake + ".interval.civil_start_time"
			useCivilDate = true
		case "daily":
			field = snake + ".date"
			useCivilDate = true
		default:
			field = snake + ".interval.start_time"
		}
	}

	startStr := start.UTC().Format(time.RFC3339)
	endStr := end.UTC().Format(time.RFC3339)
	if useCivilDate {
		startStr = start.UTC().Format("2006-01-02")
		endStr = end.UTC().Format("2006-01-02")
	}

	filter := fmt.Sprintf(`%s >= "%s" AND %s < "%s"`, field, startStr, field, endStr)
	q.Set("filter", filter)
}

func kebabToSnake(s string) string {
	return strings.ReplaceAll(s, "-", "_")
}
