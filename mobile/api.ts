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
const CHAT_REQUEST_TIMEOUT_MS = 15000;

function getDeviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

function createChatRequestId() {
  return `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getNormalizedApiBase() {
  const rawBase = (BASE_URL || "").trim().replace(/\/+$/, "");
  return rawBase.replace(/\/api$/, "");
}

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

export async function verifyCaregiverPin(
  profileId: string,
  pin: string
): Promise<{ valid: boolean }> {
  if (DEMO_MODE) return mockDelay({ valid: pin === "1234" }, 300);
  const base = getNormalizedApiBase();
  const res = await fetch(`${base}/api/profile/verify-pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileId, pin }),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok || !json?.success) {
    throw new Error(json?.error || `PIN verification failed (${res.status}).`);
  }
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
    const allTaken = slots.length > 0 && slots.every((s) => s.status === "taken");
    return mockDelay({
      date: new Date().toISOString().slice(0, 10),
      slots,
      allTaken,
      nextSlot: slots.find((s) => s.status === "due") ?? slots.find((s) => s.status === "upcoming") ?? null,
    });
  }
  const params = new URLSearchParams({ profileId });
  const timeZone = getDeviceTimeZone();
  if (timeZone) params.set("timeZone", timeZone);
  const res = await fetch(`${BASE_URL}/api/schedule/today?${params.toString()}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

export async function fetchScheduleHistory(
  profileId: string
): Promise<{ history: { date: string; slots: DoseSlot[] }[] }> {
  if (DEMO_MODE) {
    return mockDelay({
      history: [
        { date: new Date().toISOString().slice(0, 10), slots: MOCK_TODAY_SLOTS },
      ],
    });
  }
  const params = new URLSearchParams({ profileId });
  const timeZone = getDeviceTimeZone();
  if (timeZone) params.set("timeZone", timeZone);
  const res = await fetch(`${BASE_URL}/api/schedule/history?${params.toString()}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

export async function generateDemoHistory(
  profileId: string
): Promise<{ message: string }> {
  const timeZone = getDeviceTimeZone();
  const res = await fetch(`${BASE_URL}/api/schedule/demo-history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileId, timeZone }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json;
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
  const timeZone = getDeviceTimeZone();
  const res = await fetch(`${BASE_URL}/api/doses/log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, timeZone }),
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

  const params = new URLSearchParams({ profileId });
  const timeZone = getDeviceTimeZone();
  if (timeZone) params.set("timeZone", timeZone);
  const res = await fetch(
    `${BASE_URL}/api/notifications/schedule?${params.toString()}`
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
): Promise<{
  answer: string;
  remaining: number;
  risk?: "low" | "medium" | "high" | "unknown";
  limitReached?: boolean;
}> {
  if (DEMO_MODE) {
    return mockDelay({
      answer: "I've checked your records for " + question.substring(0, 10) + "... and it seems safe to take with food. Please speak to your doctor if you feel any nausea!",
      remaining: 2,
      risk: "low" as const,
    }, 1200);
  }

  const rawBase = (BASE_URL || "").trim().replace(/\/+$/, "");
  const baseNoApiChat = rawBase.replace(/\/api\/chat$/, "");
  const baseNoApi = getNormalizedApiBase();
  const seedCandidates = [
    rawBase.endsWith("/api/chat") ? rawBase : `${baseNoApi}/api/chat`,
    `${baseNoApiChat}/api/chat`,
    `${baseNoApi}/chat`,
  ].map((u) => u.replace(/\/+$/, ""));
  const candidateUrls = Array.from(new Set(seedCandidates.flatMap((u) => [u, `${u}/`])));
  const requestId = createChatRequestId();
  const startedAt = Date.now();
  const questionPreview = question.trim().slice(0, 80);
  console.log(
    `[ChatAPI:${requestId}] start profile=${profileId} med=${medicationId} qLen=${question.length} qPreview="${questionPreview}" base=${BASE_URL} candidates=${candidateUrls.join(", ")}`
  );

  try {
    const payload = JSON.stringify({ profileId, medicationId, question });

    const postChat = async (targetUrl: string, attempt: number) => {
      const controller = new AbortController();
      const attemptStartedAt = Date.now();
      const timeout = setTimeout(() => controller.abort(), CHAT_REQUEST_TIMEOUT_MS);
      try {
        const res = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Chat-Request-Id": requestId,
            "X-Chat-Attempt": String(attempt),
          },
          body: payload,
          signal: controller.signal,
        });
        const text = await res.text();
        const elapsedMs = Date.now() - attemptStartedAt;
        return { res, text, elapsedMs };
      } catch (err: any) {
        const elapsedMs = Date.now() - attemptStartedAt;
        if (err?.name === "AbortError") {
          throw new Error(
            `[${requestId}] Chat request timed out after ${CHAT_REQUEST_TIMEOUT_MS}ms (${targetUrl}, attempt ${attempt}, elapsed ${elapsedMs}ms).`
          );
        }
        throw new Error(
          `[${requestId}] Network error on ${targetUrl} (attempt ${attempt}, elapsed ${elapsedMs}ms): ${err?.message ?? String(err)}`
        );
      } finally {
        clearTimeout(timeout);
      }
    };

    const queue = [...candidateUrls];
    const attempted = new Set<string>();
    let res: Response | null = null;
    let text = "";
    let attemptCount = 0;
    let last405 = false;
    let lastAttemptError: Error | null = null;

    while (queue.length > 0) {
      const target = queue.shift()!;
      if (attempted.has(target)) continue;
      attempted.add(target);
      attemptCount += 1;
      try {
        const attemptResult = await postChat(target, attemptCount);
        res = attemptResult.res;
        text = attemptResult.text;
        console.log(
          `[ChatAPI:${requestId}] attempt=${attemptCount} url=${target} status=${res.status} bodyLen=${text.length} redirected=${res.redirected} finalUrl=${res.url} elapsedMs=${attemptResult.elapsedMs}`
        );
      } catch (err: any) {
        lastAttemptError = err instanceof Error ? err : new Error(String(err));
        console.error(`[ChatAPI:${requestId}] attempt=${attemptCount} failed:`, lastAttemptError);
        continue;
      }

      if (res.ok) break;

      if (res.status === 405) {
        last405 = true;
        const redirectUrl = (res.url || "").replace(/\/+$/, "");
        if (redirectUrl && !attempted.has(redirectUrl)) {
          queue.unshift(redirectUrl, `${redirectUrl}/`);
        }
        continue;
      }

      if (res.status === 404) {
        continue;
      }

      // Non-405 error: stop retrying URL variants and return the actual failure.
      break;
    }

    if (!res) {
      if (lastAttemptError) throw lastAttemptError;
      throw new Error("Failed to reach chat endpoint.");
    }

    if (!res.ok && last405 && res.status === 405) {
      throw new Error(
        `Server error (405): method not allowed on tried chat URLs: ${Array.from(attempted).join(", ")}`
      );
    }

    if (!res.ok) {
      let errJson: any = null;
      try {
        errJson = text ? JSON.parse(text) : null;
      } catch {
        errJson = null;
      }

      // Daily limit should be a normal in-chat response, not an exception.
      if (res.status === 429) {
        return {
          answer:
            errJson?.error ||
            "Daily limit reached. You can ask 3 questions per day to keep Vela healthy!",
          remaining: 0,
          risk: "unknown",
          limitReached: true,
        };
      }

      if (errJson?.error) {
        throw new Error(errJson.error);
      } else {
        throw new Error(`Server error (${res.status}): ${text.slice(0, 100)}`);
      }
    }

    const json = JSON.parse(text);
    console.log(
      `[ChatAPI:${requestId}] success totalElapsedMs=${Date.now() - startedAt} remaining=${json?.data?.remaining}`
    );
    if (!json.success) throw new Error(json.error || "Chat failed");
    return json.data;
  } catch (err: any) {
    console.error(
      `[ChatAPI:${requestId}] failed totalElapsedMs=${Date.now() - startedAt}:`,
      err
    );
    throw err;
  }
}

export async function resetVelaChatLimit(
  profileId: string
): Promise<{ remaining: number; deleted: number }> {
  if (DEMO_MODE) {
    return mockDelay({ remaining: 3, deleted: 3 }, 350);
  }

  const base = getNormalizedApiBase();
  const res = await fetch(`${base}/api/chat/reset-limit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileId }),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok || !json?.success) {
    throw new Error(json?.error || `Failed to reset limit (${res.status}).`);
  }

  return json.data as { remaining: number; deleted: number };
}
