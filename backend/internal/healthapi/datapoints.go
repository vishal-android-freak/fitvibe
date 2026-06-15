package healthapi

import (
	"context"
	"fmt"
	"net/url"
)

// ListDataPoints fetches data points for a given data type and time range.
func (c *Client) ListDataPoints(ctx context.Context, req *ListDataPointsRequest) (*ListDataPointsResponse, error) {
	category := Category(req.DataType)
	q := url.Values{}
	setFilterQuery(q, req.DataType, category, req.StartTime, req.EndTime)
	setStringQuery(q, "pageToken", req.PageToken)
	setIntQuery(q, "pageSize", req.PageSize)
	setStringQuery(q, "dataSourceFamily", req.DataSourceFamily)

	path := c.usersPath("/dataTypes/%s/dataPoints", req.DataType)
	resp := &ListDataPointsResponse{}
	if err := c.get(ctx, path, q, resp); err != nil {
		return nil, fmt.Errorf("list data points %s: %w", req.DataType, err)
	}
	return resp, nil
}

// ReconcileDataPoints fetches a reconciled stream for a data type.
func (c *Client) ReconcileDataPoints(ctx context.Context, req *ReconcileDataPointsRequest) (*ReconcileDataPointsResponse, error) {
	category := Category(req.DataType)
	q := url.Values{}
	setFilterQuery(q, req.DataType, category, req.StartTime, req.EndTime)
	setStringQuery(q, "pageToken", req.PageToken)
	setIntQuery(q, "pageSize", req.PageSize)
	setStringQuery(q, "dataSourceFamily", req.DataSourceFamily)

	path := c.usersPath("/dataTypes/%s/dataPoints:reconcile", req.DataType)
	resp := &ReconcileDataPointsResponse{}
	if err := c.get(ctx, path, q, resp); err != nil {
		return nil, fmt.Errorf("reconcile data points %s: %w", req.DataType, err)
	}
	return resp, nil
}

// GetDataPoint fetches a single data point by its full resource name.
func (c *Client) GetDataPoint(ctx context.Context, dataType, name string) (*DataPoint, error) {
	path := c.usersPath("/dataTypes/%s/dataPoints/%s", dataType, name)
	resp := &DataPoint{}
	if err := c.get(ctx, path, nil, resp); err != nil {
		return nil, fmt.Errorf("get data point %s: %w", name, err)
	}
	return resp, nil
}
