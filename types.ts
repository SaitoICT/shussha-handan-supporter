
export type SymptomSeverity = 'none' | 'mild' | 'moderate' | 'severe';
export type Gender = 'male' | 'female' | 'other' | 'unspecified';

export interface Symptoms {
  gender: Gender;
  fever: number;
  cough: SymptomSeverity;
  fatigue: SymptomSeverity;
  headache: SymptomSeverity;
  soreThroat: SymptomSeverity;
  mentalStress: SymptomSeverity;
  moodDepression: SymptomSeverity;
  sleepQuality: SymptomSeverity;
  otherSymptoms: string;
}

export interface WorkContext {
  canRemote: boolean;
  hasUrgentMeeting: boolean;
  isPeakPeriod: boolean;
}

export enum DecisionResult {
  OFFICE = 'OFFICE',
  REMOTE = 'REMOTE',
  REST = 'REST',
  HOSPITAL = 'HOSPITAL'
}

export interface Assessment {
  decision: DecisionResult;
  reason: string;
  aiAdvice: string;
  reportDraft: string;
  score: number;
}

export interface HistoryEntry {
  id: string;
  date: string;
  assessment: Assessment;
  symptoms: Symptoms;
}
