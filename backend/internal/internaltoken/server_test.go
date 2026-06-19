package internaltoken

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"testing"
	"time"
)

type fakeResolver struct {
	token  string
	byGUID map[string]int64
}

func (f fakeResolver) TokenForUserID(userID int64) func(context.Context) (string, error) {
	return func(context.Context) (string, error) { return f.token, nil }
}
func (f fakeResolver) UserIDByGoogleUserID(_ context.Context, guid string) (int64, bool, error) {
	id, ok := f.byGUID[guid]
	return id, ok, nil
}

// startTestServer boots the token server on a loopback port and returns its base URL.
func startTestServer(t *testing.T, secret string) (*Server, string) {
	t.Helper()
	res := fakeResolver{token: "fresh-access-token", byGUID: map[string]int64{"guid-1": 7}}
	s := New(res, secret, slog.New(slog.NewTextHandler(io.Discard, nil)))
	// Port 0 → OS picks a free loopback port; read it back off the listener.
	if err := s.Start("", "127.0.0.1:0"); err != nil {
		t.Fatalf("start: %v", err)
	}
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()
		_ = s.Shutdown(ctx)
	})
	return s, "http://" + s.ln.Addr().String()
}

func TestTokenByUserID(t *testing.T) {
	_, base := startTestServer(t, "sekret")
	req, _ := http.NewRequest(http.MethodGet, base+"/google-token?user_id=7", nil)
	req.Header.Set("Authorization", "Bearer sekret")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	body, _ := io.ReadAll(resp.Body)
	if want := `"access_token":"fresh-access-token"`; !contains(string(body), want) {
		t.Errorf("body %q missing %q", body, want)
	}
}

func TestTokenByGoogleUserID(t *testing.T) {
	_, base := startTestServer(t, "")
	resp, err := http.Get(base + "/google-token?google_user_id=guid-1")
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
}

func TestRejectsBadSecret(t *testing.T) {
	_, base := startTestServer(t, "sekret")
	resp, err := http.Get(base + "/google-token?user_id=7") // no Authorization header
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", resp.StatusCode)
	}
}

func TestRejectsNonLoopbackAddr(t *testing.T) {
	res := fakeResolver{}
	s := New(res, "", slog.New(slog.NewTextHandler(io.Discard, nil)))
	if err := s.Start("", "0.0.0.0:0"); err == nil {
		t.Fatal("expected refusal to bind a non-loopback addr")
		_ = s
	}
}

func contains(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
