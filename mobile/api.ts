/**
 * api.ts — The single integration seam between frontend and backend.
 *
 * During development: DEMO_MODE=true → returns mock data.
 * At hour 10: flip DEMO_MODE to false, set EXPO_PUBLIC_API_URL in .env → done.
 */
import {
  DEMO_MODE,
  mockDelay,
  MOCK_PROFILE,
  MOCK_MEDICATIONS,
  MOCK_TODAY_SLOTS,
  MOCK_ALL_DONE_SLOTS,
  MOCK_SCAN_RESULT,
  MOCK_INTERACTIONS,
} from "./mocks";
import type {
  Profile,
  Medication,
  DoseSlot,
  ScannedMedication,
  InteractionWarning,
} from "./types";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

// ─── Profile ──────────────────────────────────────────────────────────────────
export async function fetchProfile(profileId: string): Promise<Profile> {
  if (DEMO_MODE) return mockDelay(MOCK_PROFILE);
  const res = await fetch(`${BASE_URL}/api/profile?profileId=${profileId}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

export async function createProfile(
  seniorName: string,
  caregiverName: string
): Promise<Profile> {
  if (DEMO_MODE) return mockDelay({ ...MOCK_PROFILE, seniorName, caregiverName });
  const res = await fetch(`${BASE_URL}/api/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seniorName, caregiverName }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

// ─── Medications ──────────────────────────────────────────────────────────────
export async function fetchMedications(profileId: string): Promise<Medication[]> {
  if (DEMO_MODE) return mockDelay(MOCK_MEDICATIONS);
  const res = await fetch(`${BASE_URL}/api/medications?profileId=${profileId}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

// ─── Schedule ─────────────────────────────────────────────────────────────────
export async function fetchTodaySchedule(
  profileId: string,
  allDone = false
): Promise<{ date: string; slots: DoseSlot[]; allTaken: boolean; nextSlot: DoseSlot | null }> {
  if (DEMO_MODE) {
    const slots = allDone ? MOCK_ALL_DONE_SLOTS : MOCK_TODAY_SLOTS;
    const allTaken = slots.every((s) => s.status === "taken" || s.status === "missed");
    return mockDelay({
      date: new Date().toISOString().slice(0, 10),
      slots,
      allTaken,
      nextSlot: slots.find((s) => s.status === "due") ?? null,
    });
  }
  const res = await fetch(`${BASE_URL}/api/schedule/today?profileId=${profileId}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

// ─── Scan ─────────────────────────────────────────────────────────────────────
export async function scanLabel(imageBase64: string): Promise<ScannedMedication> {
  if (DEMO_MODE) return mockDelay(MOCK_SCAN_RESULT, 1500);
  const res = await fetch(`${BASE_URL}/api/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64 }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

// ─── Interactions ─────────────────────────────────────────────────────────────
export async function checkInteractions(
  existingMedications: string[],
  newMedication: string
): Promise<{ warnings: InteractionWarning[]; scheduleNotes: string | null; safe: boolean }> {
  if (DEMO_MODE) {
    const hasMajor = newMedication === "Potassium Chloride";
    return mockDelay({
      warnings: hasMajor ? MOCK_INTERACTIONS : [],
      scheduleNotes: null,
      safe: !hasMajor,
    }, 1000);
  }
  const res = await fetch(`${BASE_URL}/api/interact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ existingMedications, newMedication }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

// ─── Voice ────────────────────────────────────────────────────────────────────
export async function generateVoice(
  text: string,
  seniorName: string
): Promise<{ id: string; text: string; audioUrl: string; durationMs: number; createdAt: string }> {
  if (DEMO_MODE) {
    return mockDelay({
      id: "voice-mock-001",
      text,
      audioUrl: "",
      durationMs: 4000,
      createdAt: new Date().toISOString(),
    }, 500);
  }
  const res = await fetch(`${BASE_URL}/api/voice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, seniorName }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

// ─── Save Medication ──────────────────────────────────────────────────────────
export async function saveMedication(payload: {
  profileId: string;
  scanned: ScannedMedication;
  interactions: InteractionWarning[];
  finalTimes: string[];
}): Promise<Medication> {
  if (DEMO_MODE) return mockDelay(MOCK_MEDICATIONS[0], 1000);
  const res = await fetch(`${BASE_URL}/api/medications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

// ─── Log Dose ─────────────────────────────────────────────────────────────────
export async function logDose(payload: {
  doseSlotId: string;
  profileId: string;
  medicationId: string;
  takenAt: string;
}): Promise<void> {
  if (DEMO_MODE) return mockDelay(undefined as unknown as void, 300);
  const res = await fetch(`${BASE_URL}/api/doses/log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
}
