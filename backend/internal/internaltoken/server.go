// Package internaltoken serves fresh Google access tokens to the local Vaidya
// MCP server, over a channel that is unreachable from the app or the network:
// a Unix domain socket (preferred), or a loopback-only TCP port (dev fallback,
// e.g. on Windows where UDS support is uneven).
//
// This is deliberately NOT a route on the public Chi router. The Go server
// remains the sole Google-token authority: the MCP server asks here for a token
// right before a Google Health API write, and never reads or refreshes the
// stored refresh token itself (which would race this server's rotation).
package internaltoken

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"strings"
	"time"
)

// Resolver turns the request's user identifier into the internal user id and a
// token function for that user. Implemented over the OAuth service + user repo.
type Resolver interface {
	// TokenForUserID returns a token function for an internal user id (matches
	// oauth.Service.TokenProvider(userID), which refreshes as needed).
	TokenForUserID(userID int64) func(ctx context.Context) (string, error)
	// UserIDByGoogleUserID resolves a Firebase/Google uid to the internal id.
	UserIDByGoogleUserID(ctx context.Context, googleUserID string) (int64, bool, error)
}

// Server is the internal token listener.
type Server struct {
	resolver Resolver
	secret   string
	log      *slog.Logger
	srv      *http.Server
	ln       net.Listener
	socket   string // unix socket path, when used
}

// New builds the server. secret is a defense-in-depth bearer check (the real
// boundary is the socket/loopback binding).
func New(resolver Resolver, secret string, log *slog.Logger) *Server {
	s := &Server{resolver: resolver, secret: secret, log: log}
	mux := http.NewServeMux()
	mux.HandleFunc("/google-token", s.handleToken)
	s.srv = &http.Server{
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}
	return s
}

// Start opens the listener and serves in a goroutine. If socketPath is non-empty
// it binds a Unix domain socket (0600); otherwise it binds loopbackAddr (which
// must be a 127.0.0.1 address). Returns an error if neither is usable.
func (s *Server) Start(socketPath, loopbackAddr string) error {
	var (
		ln  net.Listener
		err error
	)
	if socketPath != "" {
		// Remove a stale socket from a prior run, then bind 0600.
		_ = os.Remove(socketPath)
		ln, err = net.Listen("unix", socketPath)
		if err != nil {
			return fmt.Errorf("listen unix %s: %w", socketPath, err)
		}
		if err := os.Chmod(socketPath, 0o600); err != nil {
			_ = ln.Close()
			return fmt.Errorf("chmod socket: %w", err)
		}
		s.socket = socketPath
		s.log.Info("internal token server listening", "socket", socketPath)
	} else {
		if !isLoopback(loopbackAddr) {
			return fmt.Errorf("internal token addr %q is not loopback; refusing to expose tokens off-host", loopbackAddr)
		}
		ln, err = net.Listen("tcp", loopbackAddr)
		if err != nil {
			return fmt.Errorf("listen tcp %s: %w", loopbackAddr, err)
		}
		s.log.Info("internal token server listening", "addr", loopbackAddr)
	}
	s.ln = ln
	go func() {
		if err := s.srv.Serve(ln); err != nil && err != http.ErrServerClosed {
			s.log.Error("internal token server error", "error", err)
		}
	}()
	return nil
}

// Shutdown gracefully stops the server and removes the socket file.
func (s *Server) Shutdown(ctx context.Context) error {
	err := s.srv.Shutdown(ctx)
	if s.socket != "" {
		_ = os.Remove(s.socket)
	}
	return err
}

// handleToken serves GET /google-token?user_id=<id> or ?google_user_id=<uid>.
func (s *Server) handleToken(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if s.secret != "" {
		auth := r.Header.Get("Authorization")
		if !strings.HasPrefix(auth, "Bearer ") || strings.TrimPrefix(auth, "Bearer ") != s.secret {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
	}

	ctx := r.Context()
	var userID int64
	if v := r.URL.Query().Get("user_id"); v != "" {
		if _, err := fmt.Sscan(v, &userID); err != nil || userID <= 0 {
			http.Error(w, "bad user_id", http.StatusBadRequest)
			return
		}
	} else if guid := r.URL.Query().Get("google_user_id"); guid != "" {
		id, ok, err := s.resolver.UserIDByGoogleUserID(ctx, guid)
		if err != nil {
			http.Error(w, "lookup error", http.StatusInternalServerError)
			return
		}
		if !ok {
			http.Error(w, "user not found", http.StatusNotFound)
			return
		}
		userID = id
	} else {
		http.Error(w, "user_id or google_user_id required", http.StatusBadRequest)
		return
	}

	token, err := s.resolver.TokenForUserID(userID)(ctx)
	if err != nil {
		s.log.Error("internal token fetch failed", "user_id", userID, "error", err)
		http.Error(w, "token unavailable", http.StatusBadGateway)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"access_token": token})
}

func isLoopback(addr string) bool {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return false
	}
	if host == "localhost" {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}
