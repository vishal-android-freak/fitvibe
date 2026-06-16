package webhooks

import (
	"context"
	"testing"
	"time"
)

func TestVerifyInvalidSignature(t *testing.T) {
	v := NewVerifier(time.Hour)
	ctx := context.Background()

	err := v.Verify(ctx, "aW52YWxpZA==", []byte("test body"))
	if err == nil {
		t.Error("expected error for invalid signature")
	}
}
