package healthapi

import (
	"context"
	"fmt"
	"net/url"
	"time"
)

// RollUp performs a physical-time rollup over a window size in seconds.
func (c *Client) RollUp(ctx context.Context, req *RollupRequest) (*RollupResponse, error) {
	q := url.Values{}
	setStringQuery(q, "dataSourceFamily", req.DataSourceFamily)

	body := map[string]interface{}{
		"range": map[string]string{
			"startTime": req.StartTime.UTC().Format(time.RFC3339),
			"endTime":   req.EndTime.UTC().Format(time.RFC3339),
		},
		"windowSize": fmt.Sprintf("%ds", req.WindowSize),
	}

	path := c.usersPath("/dataTypes/%s/dataPoints:rollUp", req.DataType)
	resp := &RollupResponse{}
	if err := c.post(ctx, path, q, body, resp); err != nil {
		return nil, fmt.Errorf("rollUp %s: %w", req.DataType, err)
	}
	return resp, nil
}

// DailyRollUp performs a civil-time rollup over a window size in days.
func (c *Client) DailyRollUp(ctx context.Context, req *RollupRequest) (*RollupResponse, error) {
	q := url.Values{}
	setStringQuery(q, "dataSourceFamily", req.DataSourceFamily)

	body := map[string]interface{}{
		"range": map[string]interface{}{
			"start": civilDateTime(req.StartTime),
			"end":   civilDateTime(req.EndTime),
		},
		"windowSizeDays": req.WindowSize,
	}

	path := c.usersPath("/dataTypes/%s/dataPoints:dailyRollUp", req.DataType)
	resp := &RollupResponse{}
	if err := c.post(ctx, path, q, body, resp); err != nil {
		return nil, fmt.Errorf("dailyRollUp %s: %w", req.DataType, err)
	}
	return resp, nil
}

func civilDateTime(t time.Time) map[string]interface{} {
	return map[string]interface{}{
		"date": map[string]int{
			"year":  t.Year(),
			"month": int(t.Month()),
			"day":   t.Day(),
		},
		"time": map[string]int{
			"hours":   t.Hour(),
			"minutes": t.Minute(),
			"seconds": t.Second(),
		},
	}
}
