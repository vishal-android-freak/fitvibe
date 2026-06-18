package sleep

// "Typical for your age" in-range bands for the Sleep-quality card. Google ships
// shaded age/gender bands but publishes no numbers; these are reconstructed from
// the public sleep-science literature it cites:
//
//   - Interruptions / WASO + awakenings: National Sleep Foundation 2017
//     consensus (Ohayon et al., Sleep Health) — WASO ≤20 min & ≤1 awakening for
//     adults, relaxed to ≤30 min & ≤2 for 65+. Uses the same ≥5-min awakening
//     definition Google uses. (HIGH confidence — directly applicable.)
//   - Sleep efficiency ≥85% green: NSF 2017 + Oura/Whoop + clinical norm. (HIGH)
//   - Time to sound sleep: Sleep Foundation 10-20 min adult norm; latency rises
//     ~1.1 min/decade (Boulos 2019) and after ~50 (Ohayon 2004), so the ceiling
//     relaxes with age. "Time to sound sleep" ends at the first STABLE deep/REM,
//     so it runs a touch longer than classic onset latency — bands are a few
//     minutes generous by design. (MEDIUM — exact minute cuts are interpolated.)
//   - Restorative (Deep+REM) %-of-asleep: Ohayon 2004 (deep declines ~2%/decade,
//     REM ~preserved); wearable staging reads high (Whoop 40-50%, Oura). This is
//     a Deep+REM PROXY, NOT Google's sound sleep — band is intentionally wide.
//     (MEDIUM.)
//
// Bands use the SAME four age buckets as typicalByAge (<18 / 18-44 / 45-64 /
// 65+), fed by the same userAge(). We do NOT split by gender: the effect is
// small vs age and gender isn't reliably populated — shipping it would over-claim.
//
// NOTE on judgement: these are "typical for your age", not medical thresholds.
// The app should judge on a multi-night trend (not single nights) and never
// require zero interruptions.

// rangeBand is a one-dimensional in-range band: values up to GreenMax are "in
// range", up to AmberMax are "pay attention", above is "out of range". Lower is
// better for latency/WASO; for these metrics GreenMax < AmberMax.
type rangeBand struct {
	GreenMax float64 `json:"greenMax"`
	AmberMax float64 `json:"amberMax"`
}

// fractionBand is a two-sided band expressed as a fraction of asleep minutes
// (for Restorative): in range within [GreenLo, GreenHi]; below AmberLo is out of
// range. The app scales these to the night's asleep total.
type fractionBand struct {
	GreenLo float64 `json:"greenLo"`
	GreenHi float64 `json:"greenHi"`
	AmberLo float64 `json:"amberLo"`
}

// floorBand is a "higher is better" band with a green floor (for efficiency, %).
type floorBand struct {
	GreenMin float64 `json:"greenMin"`
	AmberMin float64 `json:"amberMin"`
}

// SleepBands is the per-metric in-range band set for one user's age, returned
// alongside the quality numbers so the app renders gauges without magic numbers.
type SleepBands struct {
	// AgeBucket is the human label of the bucket used (e.g. "18–44"), for copy.
	AgeBucket string `json:"ageBucket"`
	// TimeToSoundSleepMinutes: green ≤GreenMax, amber ≤AmberMax (minutes).
	TimeToSoundSleep rangeBand `json:"timeToSoundSleep"`
	// Interruptions WASO minutes: green ≤GreenMax, amber ≤AmberMax.
	InterruptionsMinutes rangeBand `json:"interruptionsMinutes"`
	// FullAwakenings count: green ≤GreenMax, amber ≤AmberMax.
	FullAwakenings rangeBand `json:"fullAwakenings"`
	// SoundSleep (Deep+REM) as a fraction of asleep minutes.
	SoundSleepFraction fractionBand `json:"soundSleepFraction"`
	// Efficiency green floor (percent).
	Efficiency floorBand `json:"efficiency"`
}

// bandsByAge returns the in-range bands for the user's age, using the same
// buckets as typicalByAge. Age <= 0 (unknown) falls back to the 18–44 adult set.
func bandsByAge(age int) SleepBands {
	switch {
	case age > 0 && age < 18:
		return SleepBands{
			AgeBucket:            "under 18",
			TimeToSoundSleep:     rangeBand{GreenMax: 18, AmberMax: 28},
			InterruptionsMinutes: rangeBand{GreenMax: 20, AmberMax: 40},
			FullAwakenings:       rangeBand{GreenMax: 1, AmberMax: 2},
			SoundSleepFraction:   fractionBand{GreenLo: 0.42, GreenHi: 0.52, AmberLo: 0.35},
			Efficiency:           floorBand{GreenMin: 85, AmberMin: 75},
		}
	case age >= 65:
		return SleepBands{
			AgeBucket:            "65+",
			TimeToSoundSleep:     rangeBand{GreenMax: 30, AmberMax: 40},
			InterruptionsMinutes: rangeBand{GreenMax: 30, AmberMax: 50},
			FullAwakenings:       rangeBand{GreenMax: 2, AmberMax: 3},
			SoundSleepFraction:   fractionBand{GreenLo: 0.25, GreenHi: 0.38, AmberLo: 0.20},
			Efficiency:           floorBand{GreenMin: 80, AmberMin: 72},
		}
	case age >= 45:
		return SleepBands{
			AgeBucket:            "45–64",
			TimeToSoundSleep:     rangeBand{GreenMax: 25, AmberMax: 35},
			InterruptionsMinutes: rangeBand{GreenMax: 25, AmberMax: 45},
			FullAwakenings:       rangeBand{GreenMax: 1, AmberMax: 2},
			SoundSleepFraction:   fractionBand{GreenLo: 0.30, GreenHi: 0.42, AmberLo: 0.25},
			Efficiency:           floorBand{GreenMin: 83, AmberMin: 73},
		}
	default:
		// Young/general adults (18–44) and the unknown-age fallback.
		return SleepBands{
			AgeBucket:            "18–44",
			TimeToSoundSleep:     rangeBand{GreenMax: 20, AmberMax: 30},
			InterruptionsMinutes: rangeBand{GreenMax: 20, AmberMax: 40},
			FullAwakenings:       rangeBand{GreenMax: 1, AmberMax: 2},
			SoundSleepFraction:   fractionBand{GreenLo: 0.35, GreenHi: 0.50, AmberLo: 0.28},
			Efficiency:           floorBand{GreenMin: 85, AmberMin: 75},
		}
	}
}
