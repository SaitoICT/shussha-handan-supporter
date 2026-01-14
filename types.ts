
export type SymptomSeverity = 'none' | 'mild' | 'moderate' | 'severe';

export interface Symptoms {
  fever: number;
  cough: SymptomSeverity;
  fatigue: SymptomSeverity;
  headache: SymptomSeverity;
  soreThroat: SymptomSeverity;
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
