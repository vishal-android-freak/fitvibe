package sleep

// Typical sleep-stage distribution as a fraction of total time in bed, banded by
// age. Used to draw the "typical for your age" marker on each stage bar.
//
// Grounded in sleep-medicine references (Sleep Foundation; standard polysomnography
// norms): a healthy adult spends roughly Light (N1+N2) ~50-55%, Deep (N3) ~13-23%,
// REM ~20-25%, with brief wakefulness (WASO) ~5%. Deep sleep declines markedly with
// age (~18-20% in young adults down to ~5-7% by 65+), REM declines modestly, and
// time awake/fragmented increases; Light expands to fill the difference. Each band's
// values are a single representative target per stage and sum to ~1.0.
//
// Sources:
//   - https://www.sleepfoundation.org/stages-of-sleep
//   - https://www.sleepfoundation.org/stages-of-sleep/deep-sleep
type TypicalStages struct {
	Deep  float64 `json:"deep"`
	REM   float64 `json:"rem"`
	Light float64 `json:"light"`
	Awake float64 `json:"awake"`
}

// typicalByAge picks the age-banded targets. Age <= 0 (unknown) falls back to the
// general young/middle adult profile.
func typicalByAge(age int) TypicalStages {
	switch {
	case age > 0 && age < 18:
		// Teens: more deep + REM than adults.
		return TypicalStages{Deep: 0.22, REM: 0.23, Light: 0.50, Awake: 0.05}
	case age >= 65:
		// Older adults: deep sleep ~5-8%, REM slightly lower, more wake.
		return TypicalStages{Deep: 0.08, REM: 0.18, Light: 0.66, Awake: 0.08}
	case age >= 45:
		// Middle age: deep sleep tapering.
		return TypicalStages{Deep: 0.13, REM: 0.21, Light: 0.59, Awake: 0.07}
	default:
		// Young/general adults (18-44, and the unknown-age fallback).
		return TypicalStages{Deep: 0.18, REM: 0.23, Light: 0.54, Awake: 0.05}
	}
}
