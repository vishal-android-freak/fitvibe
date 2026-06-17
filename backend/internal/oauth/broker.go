package oauth

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"sync"
	"time"
)

// Broker holds the short-lived server-side state for the backend-brokered
// OAuth flow: the pending authorization states (started but not yet returned
// from Google) and the one-time session handles handed to the app via the
// deep-link redirect. Everything is in-memory with a TTL; entries are
// single-use and expire, so nothing sensitive persists.
type Broker struct {
	mu      sync.Mutex
	pending map[string]pendingAuth      // state -> pending auth
	handles map[string]brokeredSession  // one-time token -> resolved session
	ttl     time.Duration
	now     func() time.Time
}

// pendingAuth records where to send the app back once Google returns.
type pendingAuth struct {
	appRedirect string // the fitvibe:// deep link the app is waiting on
	createdAt   time.Time
}

// brokeredSession is the exchange result parked behind a one-time handle.
type brokeredSession struct {
	resp      *ExchangeResponse
	createdAt time.Time
}

// NewBroker creates a broker with the given handle/state TTL.
func NewBroker(ttl time.Duration) *Broker {
	if ttl <= 0 {
		ttl = 10 * time.Minute
	}
	return &Broker{
		pending: make(map[string]pendingAuth),
		handles: make(map[string]brokeredSession),
		ttl:     ttl,
		now:     time.Now,
	}
}

func randToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// StartAuth records a pending auth for the given app redirect and returns a
// freshly generated state to pass to Google.
func (b *Broker) StartAuth(appRedirect string) (string, error) {
	state, err := randToken()
	if err != nil {
		return "", err
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	b.evictLocked()
	b.pending[state] = pendingAuth{appRedirect: appRedirect, createdAt: b.now()}
	return state, nil
}

// ResolveState consumes a pending auth state, returning the app redirect it was
// started with. Returns false if the state is unknown or expired.
func (b *Broker) ResolveState(state string) (string, bool) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.evictLocked()
	p, ok := b.pending[state]
	if !ok {
		return "", false
	}
	delete(b.pending, state)
	return p.appRedirect, true
}

// StashSession parks an exchange result behind a new one-time handle.
func (b *Broker) StashSession(resp *ExchangeResponse) (string, error) {
	token, err := randToken()
	if err != nil {
		return "", err
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	b.evictLocked()
	b.handles[token] = brokeredSession{resp: resp, createdAt: b.now()}
	return token, nil
}

// RedeemSession consumes a one-time handle, returning the parked exchange
// result. Returns false if the token is unknown, already used, or expired.
func (b *Broker) RedeemSession(token string) (*ExchangeResponse, bool) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.evictLocked()
	s, ok := b.handles[token]
	if !ok {
		return nil, false
	}
	delete(b.handles, token)
	return s.resp, true
}

// evictLocked drops expired pending states and handles. Caller holds b.mu.
func (b *Broker) evictLocked() {
	cutoff := b.now().Add(-b.ttl)
	for k, v := range b.pending {
		if v.createdAt.Before(cutoff) {
			delete(b.pending, k)
		}
	}
	for k, v := range b.handles {
		if v.createdAt.Before(cutoff) {
			delete(b.handles, k)
		}
	}
}
