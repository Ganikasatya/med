/**
 * Health-calculator definitions for the landing-page sidebar. Each entry is
 * self-contained: the fields to collect and a pure `compute(values)` that
 * returns { headline, unit, label, tone, note } — or null if inputs are
 * incomplete/invalid. Keyed by the same `label` used in landingData.js.
 */

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const ACTIVITY = [
  { value: '1.2', label: 'Sedentary (little/no exercise)' },
  { value: '1.375', label: 'Light (1–3 days/week)' },
  { value: '1.55', label: 'Moderate (3–5 days/week)' },
  { value: '1.725', label: 'Active (6–7 days/week)' },
  { value: '1.9', label: 'Very active (hard training/job)' },
]

const SEX = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

// Mifflin-St Jeor basal metabolic rate (kcal/day).
function mifflinBMR({ sex, age, height, weight }) {
  const base = 10 * weight + 6.25 * height - 5 * age
  return sex === 'female' ? base - 161 : base + 5
}

function bmiCategory(bmi) {
  if (bmi < 18.5) return { label: 'Underweight', tone: 'amber' }
  if (bmi < 25) return { label: 'Normal weight', tone: 'green' }
  if (bmi < 30) return { label: 'Overweight', tone: 'amber' }
  return { label: 'Obese', tone: 'red' }
}

export const CALCULATORS = {
  'BMI Calculator': {
    blurb: 'Body Mass Index from your height and weight.',
    fields: [
      { name: 'height', label: 'Height', unit: 'cm', type: 'number' },
      { name: 'weight', label: 'Weight', unit: 'kg', type: 'number' },
    ],
    compute: (v) => {
      const h = num(v.height)
      const w = num(v.weight)
      if (!h || !w || h < 50 || w < 10) return null
      const m = h / 100
      const bmi = w / (m * m)
      const cat = bmiCategory(bmi)
      return { headline: bmi.toFixed(1), unit: 'kg/m²', label: cat.label, tone: cat.tone }
    },
  },

  'Calorie Calculator': {
    blurb: 'Daily calories to maintain your current weight (TDEE).',
    fields: [
      { name: 'sex', label: 'Sex', type: 'select', options: SEX },
      { name: 'age', label: 'Age', unit: 'yrs', type: 'number' },
      { name: 'height', label: 'Height', unit: 'cm', type: 'number' },
      { name: 'weight', label: 'Weight', unit: 'kg', type: 'number' },
      { name: 'activity', label: 'Activity level', type: 'select', options: ACTIVITY },
    ],
    compute: (v) => {
      const age = num(v.age)
      const height = num(v.height)
      const weight = num(v.weight)
      const factor = num(v.activity)
      if (!v.sex || !age || !height || !weight || !factor) return null
      const tdee = mifflinBMR({ sex: v.sex, age, height, weight }) * factor
      return {
        headline: Math.round(tdee).toLocaleString('en-IN'),
        unit: 'kcal/day',
        label: 'Maintenance calories',
        tone: 'blue',
        note: `Lose weight: ~${Math.round(tdee - 500).toLocaleString('en-IN')} · Gain: ~${Math.round(tdee + 500).toLocaleString('en-IN')} kcal/day`,
      }
    },
  },

  'Body Fat Calculator': {
    blurb: 'Estimated body-fat % using the U.S. Navy method.',
    fields: [
      { name: 'sex', label: 'Sex', type: 'select', options: SEX },
      { name: 'height', label: 'Height', unit: 'cm', type: 'number' },
      { name: 'neck', label: 'Neck', unit: 'cm', type: 'number' },
      { name: 'waist', label: 'Waist', unit: 'cm', type: 'number' },
      { name: 'hip', label: 'Hip (women only)', unit: 'cm', type: 'number', optional: true },
    ],
    compute: (v) => {
      const height = num(v.height)
      const neck = num(v.neck)
      const waist = num(v.waist)
      const hip = num(v.hip)
      if (!v.sex || !height || !neck || !waist) return null
      const log10 = Math.log10
      let bf
      if (v.sex === 'female') {
        if (!hip) return null
        bf = 495 / (1.29579 - 0.35004 * log10(waist + hip - neck) + 0.221 * log10(height)) - 450
      } else {
        if (waist - neck <= 0) return null
        bf = 495 / (1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(height)) - 450
      }
      if (!Number.isFinite(bf) || bf <= 0) return null
      const healthy = v.sex === 'female' ? bf <= 31 : bf <= 25
      return {
        headline: bf.toFixed(1),
        unit: '%',
        label: healthy ? 'Within healthy range' : 'Above healthy range',
        tone: healthy ? 'green' : 'amber',
      }
    },
  },

  'BMR Calculator': {
    blurb: 'Calories your body burns at complete rest (Mifflin-St Jeor).',
    fields: [
      { name: 'sex', label: 'Sex', type: 'select', options: SEX },
      { name: 'age', label: 'Age', unit: 'yrs', type: 'number' },
      { name: 'height', label: 'Height', unit: 'cm', type: 'number' },
      { name: 'weight', label: 'Weight', unit: 'kg', type: 'number' },
    ],
    compute: (v) => {
      const age = num(v.age)
      const height = num(v.height)
      const weight = num(v.weight)
      if (!v.sex || !age || !height || !weight) return null
      const bmr = mifflinBMR({ sex: v.sex, age, height, weight })
      return { headline: Math.round(bmr).toLocaleString('en-IN'), unit: 'kcal/day', label: 'Basal metabolic rate', tone: 'blue' }
    },
  },

  'Ideal Weight Calculator': {
    blurb: 'A healthy weight range for your height.',
    fields: [
      { name: 'sex', label: 'Sex', type: 'select', options: SEX },
      { name: 'height', label: 'Height', unit: 'cm', type: 'number' },
    ],
    compute: (v) => {
      const height = num(v.height)
      if (!v.sex || !height || height < 120) return null
      const m = height / 100
      const min = 18.5 * m * m
      const max = 24.9 * m * m
      // Devine ideal weight for reference.
      const inchesOver5ft = Math.max(0, height / 2.54 - 60)
      const devine = (v.sex === 'female' ? 45.5 : 50) + 2.3 * inchesOver5ft
      return {
        headline: `${min.toFixed(0)}–${max.toFixed(0)}`,
        unit: 'kg',
        label: 'Healthy weight range',
        tone: 'green',
        note: `Ideal (Devine formula): ~${devine.toFixed(1)} kg`,
      }
    },
  },

  'Pregnancy Calculator': {
    blurb: 'Estimated due date from your last menstrual period (Naegele’s rule).',
    fields: [
      { name: 'lmp', label: 'First day of last period', type: 'date' },
    ],
    compute: (v) => {
      if (!v.lmp) return null
      const lmp = new Date(v.lmp)
      if (Number.isNaN(lmp.getTime())) return null
      const due = new Date(lmp.getTime() + 280 * 86400000)
      const days = Math.floor((Date.now() - lmp.getTime()) / 86400000)
      const weeks = Math.floor(days / 7)
      const dueStr = due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      const valid = days >= 0 && weeks <= 45
      return {
        headline: dueStr,
        unit: '',
        label: 'Estimated due date',
        tone: 'blue',
        note: valid ? `You are about ${weeks} week${weeks === 1 ? '' : 's'} along.` : 'Check the date — it looks out of range.',
      }
    },
  },
}
