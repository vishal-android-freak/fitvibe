package healthapi

import (
	"context"
	"fmt"
)

// GetIdentity returns the user's Google Health identity.
func (c *Client) GetIdentity(ctx context.Context) (*IdentityResponse, error) {
	resp := &IdentityResponse{}
	if err := c.get(ctx, c.usersPath("/identity"), nil, resp); err != nil {
		return nil, fmt.Errorf("get identity: %w", err)
	}
	return resp, nil
}

// GetProfile returns the user's Google Health profile.
func (c *Client) GetProfile(ctx context.Context) (*ProfileResponse, error) {
	resp := &ProfileResponse{}
	if err := c.get(ctx, c.usersPath("/profile"), nil, resp); err != nil {
		return nil, fmt.Errorf("get profile: %w", err)
	}
	return resp, nil
}

// GetSettings returns the user's Google Health settings.
func (c *Client) GetSettings(ctx context.Context) (*SettingsResponse, error) {
	resp := &SettingsResponse{}
	if err := c.get(ctx, c.usersPath("/settings"), nil, resp); err != nil {
		return nil, fmt.Errorf("get settings: %w", err)
	}
	return resp, nil
}
