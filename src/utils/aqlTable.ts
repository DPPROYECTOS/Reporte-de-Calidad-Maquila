import { AQLTarget, InspectionLevel } from '../types/qualityReport';

interface CodeLetterEntry {
  min: number;
  max: number;
  generalI: string;
  generalII: string;
  generalIII: string;
  specialS3: string;
}

const LOT_CODE_TABLE: CodeLetterEntry[] = [
  { min: 2, max: 8, generalI: 'A', generalII: 'A', generalIII: 'B', specialS3: 'A' },
  { min: 9, max: 15, generalI: 'A', generalII: 'B', generalIII: 'C', specialS3: 'A' },
  { min: 16, max: 25, generalI: 'B', generalII: 'C', generalIII: 'D', specialS3: 'B' },
  { min: 26, max: 50, generalI: 'C', generalII: 'D', generalIII: 'E', specialS3: 'B' },
  { min: 51, max: 90, generalI: 'C', generalII: 'E', generalIII: 'F', specialS3: 'C' },
  { min: 91, max: 150, generalI: 'D', generalII: 'F', generalIII: 'G', specialS3: 'C' },
  { min: 151, max: 280, generalI: 'E', generalII: 'G', generalIII: 'H', specialS3: 'D' },
  { min: 281, max: 500, generalI: 'F', generalII: 'H', generalIII: 'J', specialS3: 'D' },
  { min: 501, max: 1200, generalI: 'G', generalII: 'J', generalIII: 'K', specialS3: 'E' },
  { min: 1201, max: 3200, generalI: 'H', generalII: 'K', generalIII: 'L', specialS3: 'E' },
  { min: 3201, max: 10000, generalI: 'J', generalII: 'L', generalIII: 'M', specialS3: 'F' },
  { min: 10001, max: 35000, generalI: 'K', generalII: 'M', generalIII: 'N', specialS3: 'F' },
  { min: 35001, max: 150000, generalI: 'L', generalII: 'N', generalIII: 'P', specialS3: 'G' },
  { min: 150001, max: 500000, generalI: 'M', generalII: 'P', generalIII: 'Q', specialS3: 'G' },
  { min: 500001, max: 9999999, generalI: 'N', generalII: 'Q', generalIII: 'R', specialS3: 'H' },
];

interface SamplePlanEntry {
  letter: string;
  sampleSize: number;
  aql065: { ac: number; re: number };
  aql10: { ac: number; re: number };
  aql15: { ac: number; re: number };
  aql25: { ac: number; re: number };
  aql40: { ac: number; re: number };
}

const SAMPLE_PLAN_TABLE: Record<string, SamplePlanEntry> = {
  A: { letter: 'A', sampleSize: 2, aql065: { ac: 0, re: 1 }, aql10: { ac: 0, re: 1 }, aql15: { ac: 0, re: 1 }, aql25: { ac: 0, re: 1 }, aql40: { ac: 0, re: 1 } },
  B: { letter: 'B', sampleSize: 3, aql065: { ac: 0, re: 1 }, aql10: { ac: 0, re: 1 }, aql15: { ac: 0, re: 1 }, aql25: { ac: 0, re: 1 }, aql40: { ac: 0, re: 1 } },
  C: { letter: 'C', sampleSize: 5, aql065: { ac: 0, re: 1 }, aql10: { ac: 0, re: 1 }, aql15: { ac: 0, re: 1 }, aql25: { ac: 0, re: 1 }, aql40: { ac: 0, re: 1 } },
  D: { letter: 'D', sampleSize: 8, aql065: { ac: 0, re: 1 }, aql10: { ac: 0, re: 1 }, aql15: { ac: 0, re: 1 }, aql25: { ac: 0, re: 1 }, aql40: { ac: 1, re: 2 } },
  E: { letter: 'E', sampleSize: 13, aql065: { ac: 0, re: 1 }, aql10: { ac: 0, re: 1 }, aql15: { ac: 0, re: 1 }, aql25: { ac: 1, re: 2 }, aql40: { ac: 1, re: 2 } },
  F: { letter: 'F', sampleSize: 20, aql065: { ac: 0, re: 1 }, aql10: { ac: 0, re: 1 }, aql15: { ac: 0, re: 1 }, aql25: { ac: 1, re: 2 }, aql40: { ac: 2, re: 3 } },
  G: { letter: 'G', sampleSize: 32, aql065: { ac: 0, re: 1 }, aql10: { ac: 0, re: 1 }, aql15: { ac: 1, re: 2 }, aql25: { ac: 2, re: 3 }, aql40: { ac: 3, re: 4 } },
  H: { letter: 'H', sampleSize: 50, aql065: { ac: 0, re: 1 }, aql10: { ac: 1, re: 2 }, aql15: { ac: 2, re: 3 }, aql25: { ac: 3, re: 4 }, aql40: { ac: 5, re: 6 } },
  J: { letter: 'J', sampleSize: 80, aql065: { ac: 1, re: 2 }, aql10: { ac: 2, re: 3 }, aql15: { ac: 3, re: 4 }, aql25: { ac: 5, re: 6 }, aql40: { ac: 7, re: 8 } },
  K: { letter: 'K', sampleSize: 125, aql065: { ac: 2, re: 3 }, aql10: { ac: 3, re: 4 }, aql15: { ac: 5, re: 6 }, aql25: { ac: 7, re: 8 }, aql40: { ac: 10, re: 11 } },
  L: { letter: 'L', sampleSize: 200, aql065: { ac: 3, re: 4 }, aql10: { ac: 5, re: 6 }, aql15: { ac: 7, re: 8 }, aql25: { ac: 10, re: 11 }, aql40: { ac: 14, re: 15 } },
  M: { letter: 'M', sampleSize: 315, aql065: { ac: 5, re: 6 }, aql10: { ac: 7, re: 8 }, aql15: { ac: 10, re: 11 }, aql25: { ac: 14, re: 15 }, aql40: { ac: 21, re: 22 } },
  N: { letter: 'N', sampleSize: 500, aql065: { ac: 7, re: 8 }, aql10: { ac: 10, re: 11 }, aql15: { ac: 14, re: 15 }, aql25: { ac: 21, re: 22 }, aql40: { ac: 21, re: 22 } },
  P: { letter: 'P', sampleSize: 800, aql065: { ac: 10, re: 11 }, aql10: { ac: 14, re: 15 }, aql15: { ac: 21, re: 22 }, aql25: { ac: 21, re: 22 }, aql40: { ac: 21, re: 22 } },
  Q: { letter: 'Q', sampleSize: 1250, aql065: { ac: 14, re: 15 }, aql10: { ac: 21, re: 22 }, aql15: { ac: 21, re: 22 }, aql25: { ac: 21, re: 22 }, aql40: { ac: 21, re: 22 } },
};

export interface SamplingResult {
  codeLetter: string;
  sampleSize: number;
  ac: number;
  re: number;
}

export function calculateAQLPlan(
  lotSize: number,
  level: InspectionLevel = 'General II',
  aql: AQLTarget = 1.5
): SamplingResult {
  const safeLot = Math.max(2, lotSize || 0);
  const entry = LOT_CODE_TABLE.find(e => safeLot >= e.min && safeLot <= e.max) || LOT_CODE_TABLE[0];

  let letter = entry.generalII;
  if (level === 'General I') letter = entry.generalI;
  if (level === 'General III') letter = entry.generalIII;
  if (level === 'Especial S-3') letter = entry.specialS3;

  const plan = SAMPLE_PLAN_TABLE[letter] || SAMPLE_PLAN_TABLE['A'];
  let limits = plan.aql15;

  if (aql === 0.65) limits = plan.aql065;
  if (aql === 1.0) limits = plan.aql10;
  if (aql === 2.5) limits = plan.aql25;
  if (aql === 4.0) limits = plan.aql40;

  // Ensure sample size never exceeds lot size
  const actualSampleSize = Math.min(plan.sampleSize, safeLot);

  return {
    codeLetter: letter,
    sampleSize: actualSampleSize,
    ac: limits.ac,
    re: limits.re,
  };
}
