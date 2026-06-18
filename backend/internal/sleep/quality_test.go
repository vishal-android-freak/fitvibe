package sleep

import (
	"testing"
	"time"

	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
)

// seg is a test helper: a stage segment from minute offsets within a night.
func seg(stage string, startMin, endMin int) repositories.SleepStageSegment {
	base := time.Date(2026, 6, 15, 22, 0, 0, 0, time.UTC)
	return repositories.SleepStageSegment{
		StageType: stage,
		Start:     base.Add(time.Duration(startMin) * time.Minute),
		End:       base.Add(time.Duration(endMin) * time.Minute),
	}
}

func TestComputeTimeToSoundSleep(t *testing.T) {
	// Onset at the first LIGHT (min 5); first DEEP at min 21 → 16 min latency.
	segs := []repositories.SleepStageSegment{
		seg("AWAKE", 0, 5),
		seg("LIGHT", 5, 21),
		seg("DEEP", 21, 60),
		seg("REM", 60, 90),
	}
	got, ok := computeTimeToSoundSleep(segs)
	if !ok || got != 16 {
		t.Fatalf("time to sound sleep = %d, ok=%v; want 16, true", got, ok)
	}

	// REM can be the first sound stage too.
	remFirst := []repositories.SleepStageSegment{
		seg("LIGHT", 0, 10),
		seg("REM", 10, 40),
	}
	if got, ok := computeTimeToSoundSleep(remFirst); !ok || got != 10 {
		t.Fatalf("REM-first = %d, ok=%v; want 10, true", got, ok)
	}

	// No deep/REM at all → not computable.
	if _, ok := computeTimeToSoundSleep([]repositories.SleepStageSegment{seg("LIGHT", 0, 60)}); ok {
		t.Fatal("expected ok=false when no deep/REM")
	}

	// No asleep segments → not computable.
	if _, ok := computeTimeToSoundSleep([]repositories.SleepStageSegment{seg("AWAKE", 0, 30)}); ok {
		t.Fatal("expected ok=false when no asleep segments")
	}
}

func TestComputeInterruptions(t *testing.T) {
	// A 23-minute mid-sleep awakening (validated: Jun-16 app showed 22 min · 1).
	withMidAwake := []repositories.SleepStageSegment{
		seg("LIGHT", 0, 60),
		seg("AWAKE", 60, 83), // 23 min, strictly mid-sleep
		seg("DEEP", 83, 200),
	}
	if min, cnt := computeInterruptions(withMidAwake); min != 23 || cnt != 1 {
		t.Fatalf("mid-awake = %dm/%d; want 23m/1", min, cnt)
	}

	// The leading and trailing awake bookends must NOT count.
	bookends := []repositories.SleepStageSegment{
		seg("AWAKE", 0, 10),    // falling asleep — excluded
		seg("LIGHT", 10, 200),
		seg("AWAKE", 200, 230), // final wake — excluded (ends at final wake)
	}
	if min, cnt := computeInterruptions(bookends); min != 0 || cnt != 0 {
		t.Fatalf("bookends = %dm/%d; want 0m/0", min, cnt)
	}

	// A sub-5-minute mid-sleep stir is below the threshold and ignored.
	briefStir := []repositories.SleepStageSegment{
		seg("LIGHT", 0, 60),
		seg("AWAKE", 60, 63), // 3 min — too short
		seg("DEEP", 63, 200),
	}
	if min, cnt := computeInterruptions(briefStir); min != 0 || cnt != 0 {
		t.Fatalf("brief stir = %dm/%d; want 0m/0", min, cnt)
	}

	// Two qualifying interruptions sum.
	two := []repositories.SleepStageSegment{
		seg("LIGHT", 0, 60),
		seg("AWAKE", 60, 67), // 7 min
		seg("DEEP", 67, 120),
		seg("AWAKE", 120, 126), // 6 min
		seg("REM", 126, 200),
	}
	if min, cnt := computeInterruptions(two); min != 13 || cnt != 2 {
		t.Fatalf("two interruptions = %dm/%d; want 13m/2", min, cnt)
	}
}

func TestComputeDisruptions(t *testing.T) {
	loc := time.UTC
	// Night starts 22:00 UTC; AWAKE 60–83 → starts at 23:00 = 1380 min-of-day.
	segs := []repositories.SleepStageSegment{
		seg("LIGHT", 0, 60),
		seg("AWAKE", 60, 83),
		seg("DEEP", 83, 200),
	}
	got := computeDisruptions(loc, segs)
	if len(got) != 1 {
		t.Fatalf("got %d disruptions; want 1", len(got))
	}
	if got[0].At != 23*60 || got[0].Minutes != 23 {
		t.Fatalf("disruption = at %d / %dm; want at 1380 / 23m", got[0].At, got[0].Minutes)
	}

	// No mid-sleep awakes → nil (renders as empty array in buildQuality).
	none := []repositories.SleepStageSegment{seg("LIGHT", 0, 200)}
	if d := computeDisruptions(loc, none); d != nil {
		t.Fatalf("expected nil disruptions, got %v", d)
	}
}

func TestBandsByAge(t *testing.T) {
	// Unknown age falls back to the 18–44 adult bucket.
	if b := bandsByAge(0); b.AgeBucket != "18–44" || b.TimeToSoundSleep.GreenMax != 20 {
		t.Fatalf("unknown age = %q ttss %v; want 18–44 / 20", b.AgeBucket, b.TimeToSoundSleep.GreenMax)
	}
	// Interruptions are NOT required to be zero — green WASO is 20 min for adults.
	if b := bandsByAge(30); b.InterruptionsMinutes.GreenMax != 20 || b.FullAwakenings.GreenMax != 1 {
		t.Fatalf("adult interruptions band = %v/%v; want 20/1", b.InterruptionsMinutes.GreenMax, b.FullAwakenings.GreenMax)
	}
	// 65+ relaxes latency, WASO, and awakenings.
	if b := bandsByAge(70); b.AgeBucket != "65+" || b.InterruptionsMinutes.GreenMax != 30 || b.FullAwakenings.GreenMax != 2 {
		t.Fatalf("65+ band = %q waso %v awk %v; want 65+ / 30 / 2", b.AgeBucket, b.InterruptionsMinutes.GreenMax, b.FullAwakenings.GreenMax)
	}
	// Efficiency green floor is 85% for adults.
	if b := bandsByAge(40); b.Efficiency.GreenMin != 85 {
		t.Fatalf("efficiency floor = %v; want 85", b.Efficiency.GreenMin)
	}
	// Teens get a higher restorative band than older adults.
	if bandsByAge(15).SoundSleepFraction.GreenHi <= bandsByAge(70).SoundSleepFraction.GreenHi {
		t.Fatal("teen restorative band should exceed 65+ band")
	}
}

func TestComputeSleepScore(t *testing.T) {
	// The 9 real Google-scored nights this model was calibrated against.
	// (asleep, deep+rem, interruption-min, full-awakenings, expected Google score)
	cases := []struct {
		name              string
		asleep, deepRem   int
		wasoMin, fullAwk  int
		google            int
	}{
		{"Jun18", 365, 186, 0, 0, 76},
		{"Jun17", 384, 156, 0, 0, 76},
		{"Jun16", 418, 98, 23, 1, 72},
		{"Jun15", 412, 134, 6, 1, 73},
		{"Jun14", 454, 190, 0, 0, 84},
		{"Jun13", 534, 240, 0, 0, 85},
		{"Jun12", 496, 225, 0, 0, 86},
		{"Jun11", 232, 64, 0, 0, 50},
		{"Jun10", 549, 197, 6, 1, 82},
	}
	for _, c := range cases {
		got, band := computeSleepScore(sleepScoreInput{
			AsleepMinutes:      c.asleep,
			DeepPlusRemMinutes: c.deepRem,
			InterruptionsMin:   c.wasoMin,
			FullAwakenings:     c.fullAwk,
		})
		diff := got - c.google
		if diff < 0 {
			diff = -diff
		}
		// Calibrated fit: every night must land within 3 points of the real score.
		if diff > 3 {
			t.Errorf("%s: score %d vs Google %d (off by %d, want <=3)", c.name, got, c.google, diff)
		}
		// Band must be self-consistent with the score.
		if got < band.Min || (band.Max < 100 && got > band.Max) {
			t.Errorf("%s: score %d outside its band %+v", c.name, got, band)
		}
	}

	// Band boundaries.
	for _, c := range []struct {
		score int
		label string
	}{{95, "Excellent"}, {85, "Good"}, {70, "Fair"}, {50, "Poor"}, {59, "Poor"}, {60, "Fair"}} {
		if b := bandFor(c.score); b.Label != c.label {
			t.Errorf("bandFor(%d) = %q; want %q", c.score, b.Label, c.label)
		}
	}
}

func TestComputeSoundSleep(t *testing.T) {
	summary := []repositories.SleepStageSummary{
		{StageType: "DEEP", Minutes: 102},
		{StageType: "REM", Minutes: 54},
		{StageType: "LIGHT", Minutes: 227},
		{StageType: "AWAKE", Minutes: 6},
	}
	if got := computeSoundSleep(summary); got != 156 {
		t.Fatalf("sound sleep = %d; want 156 (deep+rem)", got)
	}
}
