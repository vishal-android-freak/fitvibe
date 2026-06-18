import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Badge, EcgTrace, Icon } from '@/components';
import { border, font, fontSize, hue, radius, status, surface, text } from '@/theme';
import type { VitalsBlock, BodyComposition } from '@/data/body';
import { Eyebrow } from './parts';
import { VitalCard } from './VitalCard';

const BMI_HUE: Record<string, string> = {
  normal: status.positive,
  underweight: status.warning,
  overweight: status.warning,
  obese: status.danger,
};

/** Vitals: heart & circulation, oxygen/respiration, body composition, ECG. */
export function BodyVitals({ vitals, body }: { vitals: VitalsBlock; body: BodyComposition }) {
  return (
    <>
      <Eyebrow>Heart &amp; circulation</Eyebrow>
      <View style={styles.row}>
        <VitalCard label="Resting HR" card={vitals.restingHeartRate} hue={hue.heart} icon="heart" />
        <VitalCard label="HRV" card={vitals.hrv} hue={hue.mind} icon="activity" />
      </View>
      <View style={[styles.row, styles.rowGap]}>
        <VitalCard label="VO₂ max" card={vitals.vo2Max} hue={hue.move} icon="gauge" digits={1} />
        <View style={styles.cell} />
      </View>

      <Eyebrow>Oxygen &amp; respiration</Eyebrow>
      <View style={styles.row}>
        <VitalCard label="Blood oxygen" card={vitals.spo2} hue={hue.oxygen} icon="wind" />
        <VitalCard label="Respiratory rate" card={vitals.respiratoryRate} hue={hue.sky} icon="wind" digits={1} />
      </View>

      <Eyebrow>Body composition</Eyebrow>
      <View style={styles.row}>
        <VitalCard label="Weight" card={body.weight} hue={hue.sky} icon="scale" digits={1} />
        <VitalCard label="Body fat" card={body.bodyFat} hue={hue.nutrition} icon="user" digits={1} />
      </View>
      <View style={[styles.row, styles.rowGap]}>
        <VitalCard label="Skin temp" card={vitals.skinTempDelta} hue={hue.energy} icon="thermometer" digits={1} signed />
        {body.bmi ? (
          <View style={styles.bmiCard}>
            <View style={styles.head}>
              <Text style={styles.bmiLabel}>BMI</Text>
            </View>
            <Text style={styles.bmiValue}>{body.bmi.value}</Text>
            <Badge tone="neutral" hue={BMI_HUE[body.bmi.category] ?? text.muted}>
              {body.bmi.category}
            </Badge>
          </View>
        ) : (
          <View style={styles.cell} />
        )}
      </View>

      <Eyebrow>Heart rhythm</Eyebrow>
      <View style={styles.ecg}>
        {vitals.ecg ? (
          <>
            <View style={styles.ecgHead}>
              <Icon name="heart-pulse" size={18} color={hue.heart} />
              <Text style={styles.ecgTitle}>ECG</Text>
              <Badge tone={vitals.ecg.result === 'SINUS_RHYTHM' ? 'positive' : 'warning'}>
                {ecgLabel(vitals.ecg.result)}
              </Badge>
            </View>
            <EcgTrace color={hue.heart} />
            <Text style={styles.ecgSub}>{vitals.ecg.bpm} bpm average</Text>
          </>
        ) : (
          <View style={styles.ecgEmpty}>
            <Icon name="heart-pulse" size={18} color={text.tertiary} />
            <Text style={styles.ecgEmptyText}>No ECG recordings yet. Take one from your watch to see results here.</Text>
          </View>
        )}
      </View>

      <View style={styles.disclaimer}>
        <Icon name="info" size={14} color={text.tertiary} />
        <Text style={styles.disclaimerText}>
          Vitals and ECG readings are for wellness tracking only and are not medical advice.
        </Text>
      </View>
    </>
  );
}

function ecgLabel(result: string): string {
  switch (result) {
    case 'SINUS_RHYTHM':
      return 'Normal sinus';
    case 'ATRIAL_FIBRILLATION':
      return 'AFib detected';
    case 'INCONCLUSIVE':
      return 'Inconclusive';
    default:
      return result || 'Unknown';
  }
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  rowGap: { marginTop: 12 },
  cell: { flex: 1, minWidth: 0 },
  bmiCard: { flex: 1, minWidth: 0, gap: 8, padding: 16, borderRadius: radius.lg, backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle },
  head: { flexDirection: 'row', alignItems: 'center' },
  bmiLabel: { fontFamily: font.sansSemibold, fontSize: fontSize.sm, color: text.muted },
  bmiValue: { fontFamily: font.display, fontSize: fontSize['2xl'], color: text.primary, lineHeight: Math.round(fontSize['2xl'] * 1.15) },
  ecg: { marginTop: 4, paddingHorizontal: 16, paddingVertical: 14, borderRadius: radius.xl, backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle },
  ecgHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  ecgTitle: { flex: 1, fontFamily: font.sansBold, fontSize: fontSize.sm, color: text.primary },
  ecgSub: { fontFamily: font.sansRegular, fontSize: fontSize.xs, color: text.muted, marginTop: 8 },
  ecgEmpty: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  ecgEmptyText: { flex: 1, fontFamily: font.sansRegular, fontSize: fontSize.sm, color: text.muted },
  disclaimer: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 14 },
  disclaimerText: { flex: 1, fontFamily: font.sansRegular, fontSize: fontSize.xs, lineHeight: fontSize.xs * 1.5, color: text.tertiary },
});
