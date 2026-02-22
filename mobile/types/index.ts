// ─── Shared Types for Vela ────────────────────────────────────────────────────
// Mirrors CONTRACTS.md exactly. Both mock and real data use these shapes.

export type MedicationForm =
  | "tablet"
  | "capsule"
  | "liquid"
  | "patch"
  | "inhaler"
  | "other";

export type Frequency =
  | "once"
  | "twice"
  | "three_times"
  | "four_times"
  | "as_needed";

export type DoseStatus = "upcoming" | "due" | "taken" | "missed";

// ─── Profile ──────────────────────────────────────────────────────────────────
export interface Profile {
  id: string;
  seniorName: string;
  caregiverName: string;
  preferredLanguage?: string;
  seniorPhotoUrl?: string | null;
  createdAt: string;
}

// ─── InteractionWarning ───────────────────────────────────────────────────────
export interface InteractionWarning {
  drugs: [string, string];
  severity: "MAJOR" | "MODERATE" | "MINOR";
  explanation: string;
  recommendation: string;
  dosageWarning?: string; // "Dosage may exceed safe limits"
}

// ─── Medication ───────────────────────────────────────────────────────────────
export interface Medication {
  id: string;
  profileId: string;
  name: string;
  brandName: string | null;
  dosage: string;
  form: MedicationForm;
  frequency: Frequency;
  scheduledTimes: string[];
  instructions: string;
  instructionsTranslated?: string | null;
  color: string | null;
  interactions: InteractionWarning[];
  startDate?: string;   // YYYY-MM-DD
  endDate?: string;     // YYYY-MM-DD
  createdAt: string;
}

// ─── DoseSlot ─────────────────────────────────────────────────────────────────
export interface DoseSlot {
  id: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  instructions: string;
  instructionsTranslated?: string | null;
  scheduledTime: string;
  scheduledTimeLabel: string;
  status: DoseStatus;
  takenAt: string | null;
  audioUrl: string | null;
}

// ─── ScannedMedication ────────────────────────────────────────────────────────
export interface ScannedMedication {
  name: string;
  brandName: string | null;
  dosage: string;
  form: MedicationForm;
  frequency: Frequency;
  suggestedTimes: string[];
  instructions: string;
  color: string | null;
  confidence: number;
  rawLabelText: string;
  startDate?: string;   // YYYY-MM-DD
  endDate?: string;     // YYYY-MM-DD
}

// ─── API response wrapper ─────────────────────────────────────────────────────
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };
