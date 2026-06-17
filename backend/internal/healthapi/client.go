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

	"golang.org/x/time/rate"
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
	limiter    *rate.Limiter
}

// NewClient creates a new Google Health API client.
// tokenFn should return a valid OAuth access token for the request.
// The client is rate-limited to stay under the Google Health API quota of
// 300 requests per minute per user.
func NewClient(tokenFn func(context.Context) (string, error)) *Client {
	return &Client{
		httpClient: &http.Client{Timeout: defaultTimeout},
		baseURL:    defaultBaseURL,
		tokenFn:    tokenFn,
		// 250 requests per minute with a small burst to avoid the 300/min quota.
		limiter: rate.NewLimiter(rate.Every(time.Minute/time.Duration(250)), 5),
	}
}

// NewClientWithLimiter creates a client sharing an existing rate limiter.
// Useful when multiple goroutines need to share a single rate limit.
func NewClientWithLimiter(tokenFn func(context.Context) (string, error), limiter *rate.Limiter) *Client {
	return &Client{
		httpClient: &http.Client{Timeout: defaultTimeout},
		baseURL:    defaultBaseURL,
		tokenFn:    tokenFn,
		limiter:    limiter,
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

			if c.limiter != nil {
			if err := c.limiter.Wait(ctx); err != nil {
				return fmt.Errorf("rate limiter: %w", err)
			}
		}

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

// Time formats accepted by the dataPoints.list filter, per data-type category.
const (
	civilDateFormat     = "2006-01-02"          // daily summaries
	civilDateTimeFormat = "2006-01-02T15:04:05" // ISO 8601 civil (no zone) for sessions
)

// setFilterQuery builds the dataPoints.list `filter` query param. The valid
// filter MEMBER and time FORMAT differ per data-type category — using the wrong
// one returns 400 INVALID_DATA_POINT_FILTER_DATA_TYPE_MEMBER. Per the API ref:
// https://developers.google.com/health/reference/rest/v4/users.dataTypes.dataPoints/list
//
//	interval                         → <type>.interval.start_time        (RFC3339)
//	sample                           → <type>.sample_time.physical_time  (RFC3339)
//	daily                            → <type>.date                       (civil date)
//	session (except sleep & ECG)     → <type>.interval.civil_start_time  (civil datetime)
//	sleep                            → sleep.interval.end_time           (RFC3339)
//	electrocardiogram                → electrocardiogram.interval.start_time (RFC3339, >= only)
func setFilterQuery(q url.Values, dataType, category string, start, end time.Time) {
	if start.IsZero() || end.IsZero() {
		return
	}
	snake := kebabToSnake(dataType)

	var (
		field  string
		format = time.RFC3339
		geOnly bool // only the >= bound is supported (ECG)
	)

	switch {
	case dataType == "sleep":
		field = snake + ".interval.end_time"
	case dataType == "electrocardiogram":
		field = snake + ".interval.start_time"
		geOnly = true
	case category == "session":
		// exercise, nutrition-log, hydration-log, irregular-rhythm-notification:
		// only the civil_start_time member is filterable (RFC3339 interval.* is rejected).
		field = snake + ".interval.civil_start_time"
		format = civilDateTimeFormat
	case category == "sample":
		field = snake + ".sample_time.physical_time"
	case category == "daily":
		field = snake + ".date"
		format = civilDateFormat
	default: // interval
		field = snake + ".interval.start_time"
	}

	startStr := start.UTC().Format(format)
	endStr := end.UTC().Format(format)

	var filter string
	if geOnly {
		filter = fmt.Sprintf(`%s >= "%s"`, field, startStr)
	} else {
		filter = fmt.Sprintf(`%s >= "%s" AND %s < "%s"`, field, startStr, field, endStr)
	}
	q.Set("filter", filter)
}

func kebabToSnake(s string) string {
	return strings.ReplaceAll(s, "-", "_")
}
