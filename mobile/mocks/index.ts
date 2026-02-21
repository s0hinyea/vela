import type {
  Profile,
  Medication,
  DoseSlot,
  ScannedMedication,
  InteractionWarning,
} from "../types";

// ─── Demo flag ───────────────────────────────────────────────────────────────
// When true, api.ts returns mock data instead of hitting the backend.
// Flip to false at integration hour.
export const DEMO_MODE = true;

// Helper — fake network delay
export function mockDelay<T>(data: T, ms = 1200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

// ─── Mock Profile ─────────────────────────────────────────────────────────────
export const MOCK_PROFILE: Profile = {
  id: "profile-demo-001",
  seniorName: "Martha",
  caregiverName: "Sarah",
  createdAt: "2026-02-21T08:00:00Z",
};

// ─── Mock Medications ─────────────────────────────────────────────────────────
export const MOCK_MEDICATIONS: Medication[] = [
  {
    id: "med-001",
    profileId: "profile-demo-001",
    name: "Metformin",
    brandName: "Glucophage",
    dosage: "500mg",
    form: "tablet",
    frequency: "twice",
    scheduledTimes: ["08:00", "18:00"],
    instructions: "Take with food",
    color: "white oval",
    interactions: [],
    createdAt: "2026-02-21T08:00:00Z",
  },
  {
    id: "med-002",
    profileId: "profile-demo-001",
    name: "Lisinopril",
    brandName: null,
    dosage: "10mg",
    form: "tablet",
    frequency: "once",
    scheduledTimes: ["08:00"],
    instructions: "Take in the morning",
    color: "pink round",
    interactions: [],
    createdAt: "2026-02-21T08:00:00Z",
  },
  {
    id: "med-003",
    profileId: "profile-demo-001",
    name: "Atorvastatin",
    brandName: "Lipitor",
    dosage: "20mg",
    form: "tablet",
    frequency: "once",
    scheduledTimes: ["22:00"],
    instructions: "Take at bedtime",
    color: "white round",
    interactions: [],
    createdAt: "2026-02-21T08:00:00Z",
  },
];

// ─── Mock Today's Slots ───────────────────────────────────────────────────────
export const MOCK_TODAY_SLOTS: DoseSlot[] = [
  {
    id: "slot-001",
    medicationId: "med-001",
    medicationName: "Metformin",
    dosage: "500mg",
    instructions: "Take with food",
    scheduledTime: "08:00",
    scheduledTimeLabel: "8:00 AM",
    status: "taken",
    takenAt: "2026-02-21T08:07:00Z",
    audioUrl: null,
  },
  {
    id: "slot-002",
    medicationId: "med-002",
    medicationName: "Lisinopril",
    dosage: "10mg",
    instructions: "Take in the morning",
    scheduledTime: "08:00",
    scheduledTimeLabel: "8:00 AM",
    status: "taken",
    takenAt: "2026-02-21T08:07:00Z",
    audioUrl: null,
  },
  {
    id: "slot-003",
    medicationId: "med-001",
    medicationName: "Metformin",
    dosage: "500mg",
    instructions: "Take with food",
    scheduledTime: "18:00",
    scheduledTimeLabel: "6:00 PM",
    status: "due",
    takenAt: null,
    audioUrl: null,
  },
  {
    id: "slot-004",
    medicationId: "med-003",
    medicationName: "Atorvastatin",
    dosage: "20mg",
    instructions: "Take at bedtime",
    scheduledTime: "22:00",
    scheduledTimeLabel: "10:00 PM",
    status: "upcoming",
    takenAt: null,
    audioUrl: null,
  },
];

// All-done variant — triggers End of Day screen
export const MOCK_ALL_DONE_SLOTS: DoseSlot[] = MOCK_TODAY_SLOTS.map((s) => ({
  ...s,
  status: "taken" as const,
  takenAt: "2026-02-21T22:05:00Z",
}));

// ─── Mock Scan Result ─────────────────────────────────────────────────────────
export const MOCK_SCAN_RESULT: ScannedMedication = {
  name: "Potassium Chloride",
  brandName: "Klor-Con",
  dosage: "10mEq",
  form: "tablet",
  frequency: "twice",
  suggestedTimes: ["08:00", "18:00"],
  instructions: "Take with a full glass of water",
  color: "yellow oblong",
  confidence: 0.94,
  rawLabelText:
    "Potassium Chloride Extended-Release Tablets, USP 10 mEq...",
};

// ─── Mock Interactions ────────────────────────────────────────────────────────
export const MOCK_INTERACTIONS: InteractionWarning[] = [
  {
    drugs: ["Potassium Chloride", "Lisinopril"],
    severity: "MAJOR",
    explanation:
      "Taking potassium supplements with Lisinopril can raise potassium levels in the blood to dangerous levels, causing irregular heartbeat.",
    recommendation: "Ask Martha's doctor before adding this supplement.",
  },
];

// ─── Mock Voice Clips ─────────────────────────────────────────────────────────
export const MOCK_VOICE_CLIPS = {
  greeting: {
    text: "Good evening, Martha. Let's see what's next for you today.",
    audioUrl: null as string | null,
    durationMs: 3800,
  },
  nowCard: {
    text: "Martha, it's time for your evening Metformin — that's the white oval pill. Take it with dinner.",
    audioUrl: null as string | null,
    durationMs: 5200,
  },
  interactionWarning: {
    text: "Heads up. The new supplement can interact with Martha's Lisinopril. Worth checking with her doctor first.",
    audioUrl: null as string | null,
    durationMs: 6000,
  },
  goodnight: {
    text: "All done for today, Martha. Every single one. You did great. Get some rest.",
    audioUrl: null as string | null,
    durationMs: 5800,
  },
};
