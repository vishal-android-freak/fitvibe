package cron

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/robfig/cron/v3"
	"github.com/vishal-android-freak/fitvibe/internal/config"
)

// Scheduler wraps the cron scheduler and registers all Fitvibe jobs.
type Scheduler struct {
	cfg    *config.Config
	cron   *cron.Cron
	logger *slog.Logger
	jobs   map[string]Job
}

// Job is a single cron job.
type Job interface {
	Name() string
	Run(ctx context.Context) error
}

// NewScheduler creates a scheduler.
func NewScheduler(cfg *config.Config, logger *slog.Logger) *Scheduler {
	return &Scheduler{
		cfg:    cfg,
		cron:   cron.New(),
		logger: logger,
		jobs:   make(map[string]Job),
	}
}

// Register adds a job under a cron expression.
func (s *Scheduler) Register(spec string, j Job) error {
	id, err := s.cron.AddFunc(spec, func() {
		ctx := context.Background()
		if err := j.Run(ctx); err != nil {
			s.logger.Error("cron job failed", "job", j.Name(), "error", err)
		}
	})
	if err != nil {
		return fmt.Errorf("register job %s: %w", j.Name(), err)
	}
	s.jobs[j.Name()] = j
	s.logger.Info("registered cron job", "job", j.Name(), "spec", spec, "id", id)
	return nil
}

// Start begins the scheduler.
func (s *Scheduler) Start() {
	s.cron.Start()
}

// Stop stops the scheduler gracefully.
func (s *Scheduler) Stop() {
	s.cron.Stop()
}
