package webhooks

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/tink-crypto/tink-go/v2/keyset"
	"github.com/tink-crypto/tink-go/v2/signature"
)

const googlePublicKeysetURL = "https://www.gstatic.com/googlehealthapi/webhooks/webhooks_public_keyset.json"

// Verifier verifies Google Health webhook signatures using Tink ECDSA P-256.
type Verifier struct {
	httpClient *http.Client
	cacheTTL   time.Duration

	mu         sync.RWMutex
	lastFetch  time.Time
	handle     *keyset.Handle
}

// NewVerifier creates a new webhook signature verifier.
func NewVerifier(cacheTTL time.Duration) *Verifier {
	if cacheTTL <= 0 {
		cacheTTL = 24 * time.Hour
	}
	return &Verifier{
		httpClient: &http.Client{Timeout: 10 * time.Second},
		cacheTTL:   cacheTTL,
	}
}

// Verify checks the Tink signature against the raw request body.
func (v *Verifier) Verify(ctx context.Context, signatureB64 string, body []byte) error {
	sig, err := base64.StdEncoding.DecodeString(signatureB64)
	if err != nil {
		return fmt.Errorf("decode signature: %w", err)
	}

	handle, err := v.keyset(ctx)
	if err != nil {
		return fmt.Errorf("load keyset: %w", err)
	}

	verifier, err := signature.NewVerifier(handle)
	if err != nil {
		return fmt.Errorf("create verifier: %w", err)
	}

	if err := verifier.Verify(sig, body); err != nil {
		return fmt.Errorf("verify signature: %w", err)
	}
	return nil
}

func (v *Verifier) keyset(ctx context.Context) (*keyset.Handle, error) {
	v.mu.RLock()
	if v.handle != nil && time.Since(v.lastFetch) < v.cacheTTL {
		h := v.handle
		v.mu.RUnlock()
		return h, nil
	}
	v.mu.RUnlock()

	v.mu.Lock()
	defer v.mu.Unlock()

	// Double-check after acquiring write lock.
	if v.handle != nil && time.Since(v.lastFetch) < v.cacheTTL {
		return v.handle, nil
	}

	b, err := v.fetchKeyset(ctx)
	if err != nil {
		return nil, err
	}

	handle, err := keyset.ReadWithNoSecrets(keyset.NewJSONReader(bytes.NewReader(b)))
	if err != nil {
		return nil, fmt.Errorf("parse keyset: %w", err)
	}

	v.handle = handle
	v.lastFetch = time.Now()
	return v.handle, nil
}

func (v *Verifier) fetchKeyset(ctx context.Context) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, googlePublicKeysetURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	resp, err := v.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch keyset: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("fetch keyset returned %d", resp.StatusCode)
	}

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read keyset: %w", err)
	}
	return b, nil
}
