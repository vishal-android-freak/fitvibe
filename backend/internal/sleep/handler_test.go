package sleep

import (
	"testing"
	"time"

	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
)

// TestBuildLastNight mirrors the real stored shape inspected from the database:
// a night with clean AWAKE/DEEP/LIGHT/REM stages, a per-stage summary (minutes +
// count), and a +05:30 (19800s) offset. It asserts the derived payload the app
// renders: chronological segments, totals/percent, efficiency, awakenings, and
// local wall-clock onset/wake.
func TestBuildLastNight(t *testing.T) {
	off := 19800 // +05:30
	loc := time.FixedZone("ist", off)

	// Sleep onset 23:10 IST, wake 06:40 IST (= 7h30m in bed).
	start := time.Date(2026, 6, 16, 23, 10, 0, 0, loc).UTC()
	end := time.Date(2026, 6, 17, 6, 40, 0, 0, loc).UTC()

	seg := func(stage string, fromMin, toMin int) repositories.SleepStageSegment {
		return repositories.SleepStageSegment{
			StageType:     stage,
			Start:         start.Add(time.Duration(fromMin) * time.Minute),
			End:           start.Add(time.Duration(toMin) * time.Minute),
			OffsetSeconds: off,
		}
	}

	night := &repositories.SleepNight{
		DataPointID:   925553,
		Start:         start,
		End:           end,
		OffsetSeconds: off,
		Segments: []repositories.SleepStageSegment{
			seg("LIGHT", 0, 60),
			seg("DEEP", 60, 130),
			seg("AWAKE", 130, 140),
			seg("LIGHT", 140, 230),
			seg("REM", 230, 290),
			seg("AWAKE", 290, 295),
			seg("LIGHT", 295, 450),
		},
		// Authoritative device summary (preferred over segment sums).
		Summary: []repositories.SleepStageSummary{
			{StageType: "DEEP", Minutes: 70, Count: 1},
			{StageType: "REM", Minutes: 60, Count: 1},
			{StageType: "LIGHT", Minutes: 305, Count: 3},
			{StageType: "AWAKE", Minutes: 15, Count: 2},
		},
	}

	got := buildLastNight(night, 30) // young-adult band

	if got.TotalMinutes != 450 {
		t.Errorf("TotalMinutes = %d, want 450", got.TotalMinutes)
	}
	if got.AsleepMinutes != 435 {
		t.Errorf("AsleepMinutes = %d, want 435 (450-15 awake)", got.AsleepMinutes)
	}
	if got.Awakenings != 2 {
		t.Errorf("Awakenings = %d, want 2", got.Awakenings)
	}
	// 435/450 = 96.67% -> 97
	if got.Efficiency != 97 {
		t.Errorf("Efficiency = %d, want 97", got.Efficiency)
	}
	// onset 23:10 = 23*60+10 = 1390
	if got.OnsetClock != 1390 {
		t.Errorf("OnsetClock = %d, want 1390 (23:10)", got.OnsetClock)
	}
	// wake 06:40 = 400
	if got.WakeClock != 400 {
		t.Errorf("WakeClock = %d, want 400 (06:40)", got.WakeClock)
	}
	if len(got.Segments) != 7 {
		t.Errorf("Segments len = %d, want 7", len(got.Segments))
	}
	if got.Segments[0].Stage != "Light" || got.Segments[0].Minutes != 60 {
		t.Errorf("Segments[0] = %+v, want {Light 60}", got.Segments[0])
	}

	byStage := map[string]stageTotal{}
	for _, s := range got.Stages {
		byStage[s.Stage] = s
	}
	if d := byStage["Deep"]; d.Minutes != 70 || d.Count != 1 {
		t.Errorf("Deep total = %+v, want minutes 70 count 1", d)
	}
	if l := byStage["Light"]; l.Minutes != 305 || l.Count != 3 {
		t.Errorf("Light total = %+v, want minutes 305 count 3", l)
	}
	// Deep % = 70/450 = 15.5% -> 16
	if d := byStage["Deep"]; d.Percent != 16 {
		t.Errorf("Deep percent = %d, want 16", d.Percent)
	}

	if got.Typical.Deep != 0.18 {
		t.Errorf("Typical.Deep = %v, want 0.18 (young adult)", got.Typical.Deep)
	}
}

func TestCanonStage(t *testing.T) {
	cases := map[string]string{
		"DEEP": "Deep", "REM": "REM", "LIGHT": "Light", "SLEEPING": "Light",
		"AWAKE": "Awake", "AWAKE_IN_BED": "Awake", "OUT_OF_BED": "Awake",
		"UNKNOWN": "", "": "",
	}
	for in, want := range cases {
		if got := canonStage(in); got != want {
			t.Errorf("canonStage(%q) = %q, want %q", in, got, want)
		}
	}
}
