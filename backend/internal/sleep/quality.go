package sleep

import (
	"sort"
	"time"

	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
)

// Sleep-quality metrics derived from the per-segment stage timeline, validated
// against Google Health app values over 9 real nights:
//
//   - Interruptions: EXACT match (matched the app to the minute, incl. zeros).
//   - Time to sound sleep: GOOD approximation (~±2–3 min).
//   - Sound sleep: a rough proxy only (Deep+REM); Google folds in "steady light
//     with calm HR" which the v4 API never exposes, so this often diverges.
//   - Restlessness: NOT computable (pure accelerometer movement, absent from the
//     API). We surface a stage-based disruption timeline instead — see
//     computeDisruptions — which is an honest, different signal (NOT restlessness).
//
// interruptionMinThreshold is Google's documented ~5-minute rule: only awake
// stretches this long are "memorable" interruptions; shorter stirs are noise.
const interruptionMinThreshold = 5 * time.Minute

// asleepStage reports whether a Google stage enum is an asleep (non-awake) state.
func asleepStage(t string) bool {
	switch t {
	case "DEEP", "REM", "LIGHT", "SLEEPING":
		return true
	default:
		return false
	}
}

// sortedSegments returns the segments ordered by start time (the repo already
// orders them, but compute helpers must not assume it).
func sortedSegments(segs []repositories.SleepStageSegment) []repositories.SleepStageSegment {
	out := make([]repositories.SleepStageSegment, len(segs))
	copy(out, segs)
	sort.Slice(out, func(i, j int) bool { return out[i].Start.Before(out[j].Start) })
	return out
}

// sleepBounds returns the onset (start of the first asleep segment) and final
// wake (end of the last asleep segment). The second return is false when the
// night has no asleep segments at all.
func sleepBounds(segs []repositories.SleepStageSegment) (onset, finalWake time.Time, ok bool) {
	for _, s := range segs {
		if !asleepStage(s.StageType) {
			continue
		}
		if !ok {
			onset, finalWake, ok = s.Start, s.End, true
			continue
		}
		if s.Start.Before(onset) {
			onset = s.Start
		}
		if s.End.After(finalWake) {
			finalWake = s.End
		}
	}
	return onset, finalWake, ok
}

// computeTimeToSoundSleep is the latency from sleep onset to the first DEEP or
// REM segment, in minutes. Returns (0, false) when the night never reaches
// deep/REM or has no asleep segments. Validated to ~±2–3 min of the app value.
func computeTimeToSoundSleep(segs []repositories.SleepStageSegment) (int, bool) {
	ordered := sortedSegments(segs)
	onset, _, ok := sleepBounds(ordered)
	if !ok {
		return 0, false
	}
	for _, s := range ordered {
		if s.StageType == "DEEP" || s.StageType == "REM" {
			mins := max(int(s.Start.Sub(onset).Round(time.Minute).Minutes()), 0)
			return mins, true
		}
	}
	return 0, false
}

// computeInterruptions counts the awake stretches of at least
// interruptionMinThreshold occurring strictly between sleep onset and the final
// wake (i.e. mid-sleep — excluding the time falling asleep and the morning
// wake). Returns the total minutes and the count of such stretches. This is the
// honest "Interruptions · X min · N moments" and matches Google exactly.
func computeInterruptions(segs []repositories.SleepStageSegment) (minutes, count int) {
	ordered := sortedSegments(segs)
	onset, finalWake, ok := sleepBounds(ordered)
	if !ok {
		return 0, 0
	}
	for _, s := range ordered {
		if canonStage(s.StageType) != "Awake" {
			continue
		}
		// Strictly mid-sleep: starts after onset and ends before the final wake.
		if !s.Start.After(onset) || !s.End.Before(finalWake) {
			continue
		}
		dur := s.End.Sub(s.Start)
		if dur < interruptionMinThreshold {
			continue
		}
		minutes += int(dur.Round(time.Minute).Minutes())
		count++
	}
	return minutes, count
}

// disruption is one mid-sleep disturbance plotted on the night timeline.
type disruption struct {
	// At is local wall-clock minutes-since-midnight of the disturbance start.
	At int `json:"at"`
	// Minutes is how long the disturbance lasted (rounded; min 1).
	Minutes int `json:"minutes"`
}

// computeDisruptions returns a tick timeline of mid-sleep disturbances for the
// "Sleep disruptions" viz. Each tick is an AWAKE stretch occurring between sleep
// onset and the final wake. This is a STAGE-based signal, NOT Google's
// movement-based restlessness — it answers "where was the night choppy", which
// is all we can honestly derive without the accelerometer stream.
func computeDisruptions(loc *time.Location, segs []repositories.SleepStageSegment) []disruption {
	ordered := sortedSegments(segs)
	onset, finalWake, ok := sleepBounds(ordered)
	if !ok {
		return nil
	}
	out := make([]disruption, 0)
	for _, s := range ordered {
		if canonStage(s.StageType) != "Awake" {
			continue
		}
		if !s.Start.After(onset) || !s.End.Before(finalWake) {
			continue
		}
		mins := max(int(s.End.Sub(s.Start).Round(time.Minute).Minutes()), 1)
		lt := s.Start.In(loc)
		out = append(out, disruption{At: lt.Hour()*60 + lt.Minute(), Minutes: mins})
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// computeSoundSleep is a rough proxy for Google's "Sound sleep": the sum of DEEP
// and REM minutes from the per-stage summary. NOTE: Google's real value also
// includes "steady light sleep with calm HR" (needs per-epoch HR steadiness the
// v4 API doesn't expose), so this commonly diverges by ±30 min and is NOT
// Google-equivalent — present it as "Deep + REM", never as "Sound sleep = X".
func computeSoundSleep(summary []repositories.SleepStageSummary) int {
	total := 0
	for _, s := range summary {
		if s.StageType == "DEEP" || s.StageType == "REM" {
			total += s.Minutes
		}
	}
	return total
}
