"""Row dicts -> natural-language summaries. "Node/Python computes the stats with
SQL, the LLM narrates them" — tools return these strings, never raw arrays."""

from __future__ import annotations

from typing import Any


def fmt_today(date: str, act: dict[str, Any]) -> str:
    steps = int(act.get("steps", 0) or 0)
    dist_km = float(act.get("distance_m", 0) or 0) / 1000
    floors = int(act.get("floors", 0) or 0)
    kcal = int(act.get("active_kcal", 0) or 0)
    azm = int(act.get("zone_minutes", 0) or 0)
    return (
        f"Today ({date}): {steps:,} steps, {dist_km:.1f} km, {floors} floors, "
        f"{kcal} active kcal, {azm} active-zone minutes."
    )


def fmt_nutrition(date: str, n: dict[str, Any]) -> str:
    cal = int(n.get("calories", 0) or 0)
    carbs = round(float(n.get("carbs_g", 0) or 0))
    fat = round(float(n.get("fat_g", 0) or 0))
    protein = round(float(n.get("protein_g", 0) or 0))
    water = round(float(n.get("hydration_ml", 0) or 0))
    burnt = int(n.get("burnt_kcal", 0) or 0)
    if cal == 0 and carbs == 0 and fat == 0 and protein == 0 and water == 0:
        return f"Nutrition ({date}): nothing logged yet."
    return (
        f"Nutrition ({date}): {cal} kcal eaten ({carbs}g carbs, {fat}g fat, "
        f"{protein}g protein), {water} ml water, {burnt} active kcal burned."
    )


def _hm(minutes: int | None) -> str:
    if not minutes:
        return "0m"
    h, m = divmod(int(minutes), 60)
    return f"{h}h {m:02d}m" if h else f"{m}m"


def fmt_sleep(night: dict[str, Any] | None) -> str:
    if not night:
        return "No sleep recorded yet."
    asleep = night.get("asleep_min")
    stages = night.get("stages", {})
    deep = stages.get("DEEP", 0)
    rem = stages.get("REM", 0)
    light = stages.get("LIGHT", 0)
    awake = stages.get("AWAKE", 0)
    parts = [f"Last sleep: {_hm(asleep)} asleep"]
    if deep or rem or light:
        parts.append(f"{_hm(deep)} deep, {_hm(rem)} REM, {_hm(light)} light")
    if awake:
        parts.append(f"{_hm(awake)} awake")
    return ", ".join(parts) + "."
