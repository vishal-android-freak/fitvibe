import { apiGet } from '@/data/api';
import { useResource, type Resource } from '@/data/useResource';

/** One dated point on a metric's trend line. */
export interface TrendPoint {
  date: string; // "2006-01-02"
  value: number;
}

/** Rolling personal range (mean ± SD); calibrated false until enough history. */
export interface Baseline {
  mean: number;
  sd: number;
  window: number;
  calibrated: boolean;
}

/** Population healthy-range reference lines. */
export interface Reference {
  low?: number;
  high?: number;
}

/** A vital/body metric: latest + trend + an optional interpretation band. */
export interface MetricCard {
  latest: number | null; // null = no data (empty card)
  unit: string;
  at: string;
  trend: TrendPoint[];
  baseline?: Baseline;
  reference?: Reference;
}

export interface EcgBlock {
  result: string;
  bpm: number;
  at: string;
}

export interface VitalsBlock {
  restingHeartRate: MetricCard;
  hrv: MetricCard;
  spo2: MetricCard;
  respiratoryRate: MetricCard;
  skinTempDelta: MetricCard;
  vo2Max: MetricCard;
  ecg: EcgBlock | null;
}

export interface GoalMetric {
  value: number;
  goal?: number;
}

export interface ZoneTime {
  zone: string;
  seconds: number;
}

export interface SessionView {
  type: string;
  at: string;
  offsetSeconds: number;
  durationSec: number;
  kcal: number;
  steps: number;
  hrZones: ZoneTime[];
}

export interface ActivityBlock {
  steps: GoalMetric;
  distanceKm: number;
  floors: GoalMetric;
  activeEnergy: GoalMetric;
  zoneMinutes: GoalMetric;
  activeEnergyWeek: TrendPoint[];
  zoneMinutesWeek: TrendPoint[];
  sessions: SessionView[];
}

export interface BmiBlock {
  value: number;
  category: string; // underweight | normal | overweight | obese
}

export interface BodyComposition {
  weight: MetricCard;
  bodyFat: MetricCard;
  bmi: BmiBlock | null;
}

/** One nutrient's logged total for the day (grams). */
export interface NutrientTotal {
  nutrient: string; // PROTEIN | DIETARY_FIBER | SODIUM | ...
  grams: number;
}

/** One logged food for the day. */
export interface MealView {
  name: string;
  mealType: string; // BREAKFAST | LUNCH | DINNER | SNACK | ""
  kcal: number;
  at: string;
  offsetSeconds: number;
}

export interface NutritionBlock {
  caloriesEaten: number;
  caloriesBurnt: number;
  nutrients: NutrientTotal[];
  meals: MealView[];
}

/** The whole Body screen in one payload (mirrors GET /me/body). */
export interface Body {
  date: string;
  vitals: VitalsBlock;
  activity: ActivityBlock;
  body: BodyComposition;
  nutrition: NutritionBlock;
}

export async function fetchBody(userId: number): Promise<Body> {
  return apiGet<Body>(`/me/body?user_id=${userId}`);
}

/** Loads the Body tab for the signed-in user. Keeps stale data on refresh. */
export function useBody(): Resource<Body> {
  return useResource(fetchBody);
}
