package sleep

import "math"

// FitVibe's 0-100 sleep score, modeled on Fitbit/Google's published 50/25/25
// split (Duration / Composition[Deep+REM] / Restoration) and CALIBRATED against
// 9 of this user's real Google Health scores (RMSE 1.56, max error 3 pts).
//
// Honest caveats baked into the comments here so future readers know the limits:
//   - It is FitVibe's own score with Google-standard BANDS, NOT a reproduction
//     of Google's number for an arbitrary night. The affine calibration encodes
//     one user's personalized ceiling; it will drift for other users/ages.
//   - We CANNOT compute Fitbit's true "Restoration" 25% (sleeping-HR dip +
//     accelerometer restlessness — not in the v4 API). We stand in our
//     interruptions metric (which IS exact vs Google) as an honest proxy.
//   - Bands mirror Fitbit/Google exactly: Excellent 90+, Good 80-89, Fair
//     60-79, Poor <60 (the dominant industry convention; Garmin matches it).

// sleepScoreInput is the already-computed per-night data the score consumes.
type sleepScoreInput struct {
	AsleepMinutes      int // device asleep minutes (the duration term)
	DeepPlusRemMinutes int // Deep + REM (composition term)
	InterruptionsMin   int // mid-sleep WASO ≥5min (restoration proxy)
	FullAwakenings     int // count of ≥5min mid-sleep awakenings
}

// scoreBand classifies a 0-100 score into the Fitbit/Google band + label.
type scoreBand struct {
	Label string `json:"label"` // Excellent | Good | Fair | Poor
	Min   int    `json:"min"`
	Max   int    `json:"max"`
}

func bandFor(score int) scoreBand {
	switch {
	case score >= 90:
		return scoreBand{Label: "Excellent", Min: 90, Max: 100}
	case score >= 80:
		return scoreBand{Label: "Good", Min: 80, Max: 89}
	case score >= 60:
		return scoreBand{Label: "Fair", Min: 60, Max: 79}
	default:
		return scoreBand{Label: "Poor", Min: 0, Max: 59}
	}
}

func clamp01to100(v float64) float64 { return math.Max(0, math.Min(100, v)) }

// durationSub: linear ramp, full at 8h asleep (480 min). Dominant term (50%).
func durationSub(asleepMin int) float64 {
	return clamp01to100(float64(asleepMin) / 480 * 100)
}

// restorativeSub: Deep+REM vs a 180-min target (90 deep + 90 REM). 25%.
func restorativeSub(deepPlusRem int) float64 {
	return clamp01to100(float64(deepPlusRem) / 180 * 100)
}

// interruptionsSub: stands in for Fitbit's HR-based restoration (25%). WASO part
// is full up to 20 min then decays; awakenings part steps down with the count.
func interruptionsSub(wasoMin, fullAwk int) float64 {
	var wasoPart float64
	if wasoMin <= 20 {
		wasoPart = 80
	} else {
		wasoPart = clamp01to100(80 - float64(wasoMin-20)/70*80)
		if wasoPart > 80 {
			wasoPart = 80
		}
	}
	awkFrac := map[int]float64{0: 1.0, 1: 1.0, 2: 0.75, 3: 0.5}
	frac, ok := awkFrac[fullAwk]
	if !ok {
		frac = 0.0 // 4+ awakenings
	}
	return wasoPart + 20*frac
}

// scoreFromQuality builds the score input from the already-computed quality
// block + asleep minutes. SoundSleepMinutes is Deep+REM (the composition term).
func scoreFromQuality(asleepMin int, q sleepQuality) (int, scoreBand) {
	return computeSleepScore(sleepScoreInput{
		AsleepMinutes:      asleepMin,
		DeepPlusRemMinutes: q.SoundSleepMinutes,
		InterruptionsMin:   q.InterruptionsMinutes,
		FullAwakenings:     q.FullAwakenings,
	})
}

// computeSleepScore returns the 0-100 score and its band. See package notes for
// the model and its honest limits.
func computeSleepScore(in sleepScoreInput) (int, scoreBand) {
	composite := 0.50*durationSub(in.AsleepMinutes) +
		0.25*restorativeSub(in.DeepPlusRemMinutes) +
		0.25*interruptionsSub(in.InterruptionsMin, in.FullAwakenings)
	// Affine calibration to this user's real Google scores (compresses the top
	// end the way Google's age/gender targets do).
	score := int(math.Round(clamp01to100(0.8110*composite + 4.10)))
	return score, bandFor(score)
}
