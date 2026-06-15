package main

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/vishal-android-freak/fitvibe/internal/config"
	"github.com/vishal-android-freak/fitvibe/internal/oauth"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	cfg, err := config.Load()
	if err != nil {
		logger.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	url := oauth.AuthURL(cfg, "fitvibe-setup")
	fmt.Println(url)
}
