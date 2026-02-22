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
  newMedication: string,
  dosage?: string,
  frequency?: string
): Promise<{ warnings: InteractionWarning[]; scheduleNotes: string | null; safe: boolean; dosageWarning?: string }> {
  if (DEMO_MODE) {
    const hasMajor = newMedication === "Potassium Chloride";
    return mockDelay({
      warnings: hasMajor ? MOCK_INTERACTIONS : [],
      scheduleNotes: hasMajor ? "Avoid taking within 2 hours of Lisinopril." : null,
      safe: !hasMajor,
      dosageWarning: hasMajor ? "10mEq twice daily may exceed the recommended maximum for patients on ACE inhibitors." : undefined,
    }, 1000);
  }
  const res = await fetch(`${BASE_URL}/api/interact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ existingMedications, newMedication, dosage, frequency }),
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
  if (!json.success) throw new Error(json.error);
  return json.data;
}

export async function updateMedication(
  id: string,
  payload: { name: string; dosage: string; instructions?: string }
): Promise<Medication> {
  if (DEMO_MODE) return mockDelay({ ...MOCK_MEDICATIONS[0], ...payload }, 1000);
  const res = await fetch(`${BASE_URL}/api/medications/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

export async function deleteMedication(id: string): Promise<void> {
  // Always hit the demo mock if in demo mode
  if (DEMO_MODE) return mockDelay(undefined as unknown as void, 800);
  const res = await fetch(`${BASE_URL}/api/medications/${id}`, {
    method: "DELETE",
  });
  
  // Wait to see if the response was completely successful before parsing JSON.
  // DELETE route returns data: null, so text might be empty depending on Vercel handling
  if (!res.ok) {
     const text = await res.text();
     try {
       const json = JSON.parse(text);
       throw new Error(json.error || "Failed to delete");
     } catch (e) {
       throw new Error(`Failed to delete (${res.status}): ${text}`);
     }
  }
}

// ─── Log Dose ─────────────────────────────────────────────────────────────────
export async function logDose(payload: {
  doseSlotId: string;
  profileId: string;
  medicationId: string;
  scheduledTime?: string;
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

// ─── Notification Schedule ────────────────────────────────────────────────────
export async function fetchNotificationSchedule(profileId: string): Promise<{
  profileId: string;
  seniorName: string;
  date: string;
  totalNotifications: number;
  notifications: Array<{
    id: string;
    scheduledTime: string;
    scheduledTimeLabel: string;
    stage: string;
    triggerTime: string;
    title: string;
    body: string;
    audioText: string;
    medications: { id: string; name: string; dosage: string }[];
    allTaken: boolean;
    date: string;
  }>;
}> {
  if (DEMO_MODE) {
    return mockDelay({
      profileId: MOCK_PROFILE.id,
      seniorName: MOCK_PROFILE.seniorName,
      date: new Date().toISOString().slice(0, 10),
      totalNotifications: 3,
      notifications: [
        {
          id: "notif-08:00-heads_up",
          scheduledTime: "08:00",
          scheduledTimeLabel: "8:00 AM",
          stage: "heads_up",
          triggerTime: "07:30",
          title: "Coming up: 2 medications at 8:00 AM",
          body: `${MOCK_PROFILE.seniorName}, your Metformin 500mg and Lisinopril 10mg are coming up soon.`,
          audioText: `${MOCK_PROFILE.seniorName}, your Metformin 500mg and Lisinopril 10mg are coming up soon.`,
          medications: MOCK_MEDICATIONS.slice(0, 2).map((m) => ({ id: m.id, name: m.name, dosage: m.dosage })),
          allTaken: false,
          date: new Date().toISOString().slice(0, 10),
        },
        {
          id: "notif-08:00-action",
          scheduledTime: "08:00",
          scheduledTimeLabel: "8:00 AM",
          stage: "action",
          triggerTime: "08:00",
          title: "Time for 2 medications",
          body: `${MOCK_PROFILE.seniorName}, it's time for your Metformin 500mg and Lisinopril 10mg. Take with food.`,
          audioText: `${MOCK_PROFILE.seniorName}, it's time for your Metformin 500mg and Lisinopril 10mg. Take with food.`,
          medications: MOCK_MEDICATIONS.slice(0, 2).map((m) => ({ id: m.id, name: m.name, dosage: m.dosage })),
          allTaken: false,
          date: new Date().toISOString().slice(0, 10),
        },
        {
          id: "notif-08:00-follow_up",
          scheduledTime: "08:00",
          scheduledTimeLabel: "8:00 AM",
          stage: "follow_up",
          triggerTime: "08:15",
          title: "Did you take your 8:00 AM medications?",
          body: "Just checking in — did you take your Metformin 500mg and Lisinopril 10mg?",
          audioText: `Just checking in, ${MOCK_PROFILE.seniorName}. Did you take your Metformin 500mg and Lisinopril 10mg?`,
          medications: MOCK_MEDICATIONS.slice(0, 2).map((m) => ({ id: m.id, name: m.name, dosage: m.dosage })),
          allTaken: false,
          date: new Date().toISOString().slice(0, 10),
        },
      ],
    });
  }

  const res = await fetch(
    `${BASE_URL}/api/notifications/schedule?profileId=${profileId}`
  );
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

// ─── Update Language & Retranslate ────────────────────────────────────────────
export async function updateLanguage(
  profileId: string,
  language: string
): Promise<{
  profileId: string;
  language: string;
  medicationsUpdated: number;
  medications: { id: string; instructionsTranslated: string | null }[];
}> {
  if (DEMO_MODE) {
    return mockDelay({
      profileId,
      language,
      medicationsUpdated: 0,
      medications: [],
    }, 1500);
  }
  const res = await fetch(`${BASE_URL}/api/profile/language`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileId, language }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}
// ─── Chat ───────────────────────────────────────────────────────────────────
export async function askVelaChat(
  profileId: string,
  medicationId: string,
  question: string
): Promise<{ answer: string; remaining: number }> {
  if (DEMO_MODE) {
    return mockDelay({
      answer: "I've checked your records for " + question.substring(0, 10) + "... and it seems safe to take with food. Please speak to your doctor if you feel any nausea!",
      remaining: 2,
    }, 1200);
  }
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileId, medicationId, question }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}
