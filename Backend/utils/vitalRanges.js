/**
 * Reference ranges for adult observations, used to flag a reading rather than
 * to diagnose. `low`/`high` bound the normal band; `criticalLow`/`criticalHigh`
 * mark values that should be escalated.
 *
 * Paediatric ranges differ considerably, so anything under 13 is only flagged
 * against the widened bands below - the point is to draw a nurse's eye, not to
 * replace clinical judgement.
 */
const ADULT_RANGES = {
  temperature: { low: 36.1, high: 37.5, criticalLow: 35, criticalHigh: 39.5, unit: '°C', label: 'Temperature' },
  pulse: { low: 60, high: 100, criticalLow: 40, criticalHigh: 130, unit: 'bpm', label: 'Pulse' },
  systolic: { low: 90, high: 130, criticalLow: 80, criticalHigh: 180, unit: 'mmHg', label: 'Systolic BP' },
  diastolic: { low: 60, high: 85, criticalLow: 50, criticalHigh: 120, unit: 'mmHg', label: 'Diastolic BP' },
  respiratoryRate: { low: 12, high: 20, criticalLow: 8, criticalHigh: 30, unit: '/min', label: 'Respiratory rate' },
  oxygenSaturation: { low: 95, high: 100, criticalLow: 90, criticalHigh: 101, unit: '%', label: 'SpO2' },
  bloodSugar: { low: 70, high: 140, criticalLow: 54, criticalHigh: 250, unit: 'mg/dL', label: 'Blood sugar' }
};

const CHILD_ADJUSTMENTS = {
  pulse: { low: 70, high: 130, criticalLow: 50, criticalHigh: 160 },
  respiratoryRate: { low: 16, high: 30, criticalLow: 10, criticalHigh: 40 },
  systolic: { low: 80, high: 120, criticalLow: 70, criticalHigh: 150 },
  diastolic: { low: 50, high: 80, criticalLow: 40, criticalHigh: 100 }
};

const rangesFor = (ageYears) => {
  if (typeof ageYears !== 'number' || ageYears >= 13) return ADULT_RANGES;

  const ranges = { ...ADULT_RANGES };
  for (const [field, adjustment] of Object.entries(CHILD_ADJUSTMENTS)) {
    ranges[field] = { ...ranges[field], ...adjustment };
  }
  return ranges;
};

/**
 * Returns one entry per measured field: `normal`, `low`, `high`, `critical-low`
 * or `critical-high`, plus the range it was judged against so the UI can show
 * the reader what "normal" means here.
 */
const assessVitals = (reading, ageYears) => {
  const ranges = rangesFor(ageYears);
  const flags = {};

  for (const [field, range] of Object.entries(ranges)) {
    const value = reading[field];
    if (value === undefined || value === null || Number.isNaN(Number(value))) continue;

    const number = Number(value);
    let level = 'normal';

    if (number <= range.criticalLow) level = 'critical-low';
    else if (number >= range.criticalHigh) level = 'critical-high';
    else if (number < range.low) level = 'low';
    else if (number > range.high) level = 'high';

    flags[field] = {
      level,
      value: number,
      unit: range.unit,
      label: range.label,
      normalRange: `${range.low}-${range.high}`
    };
  }

  const abnormal = Object.values(flags).filter((flag) => flag.level !== 'normal');

  return {
    flags,
    abnormalCount: abnormal.length,
    hasCritical: abnormal.some((flag) => flag.level.startsWith('critical')),
    summary: abnormal.map((flag) => `${flag.label} ${flag.value}${flag.unit}`)
  };
};

module.exports = { assessVitals, rangesFor, ADULT_RANGES };
