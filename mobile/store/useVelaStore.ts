import { create } from "zustand";
import type { Profile, Medication, DoseSlot } from "../types";

type VelaStore = {
  // ── State ───────────────────────────────────────────────────────────────────
  profile: Profile | null;
  medications: Medication[];
  todaySlots: DoseSlot[];
  currentSlot: DoseSlot | null; // the single "due" slot shown on Now Card
  allTaken: boolean;

  // ── Actions ─────────────────────────────────────────────────────────────────
  setProfile: (p: Profile) => void;
  setMedications: (meds: Medication[]) => void;
  setSchedule: (slots: DoseSlot[], allTaken: boolean) => void;
  markTaken: (slotId: string) => void;
  /** Debug: force the first upcoming slot to "due" */
  forceDue: () => void;
  reset: () => void;
};

export const useVelaStore = create<VelaStore>((set) => ({
  // ── Initial state ────────────────────────────────────────────────────────────
  profile: null,
  medications: [],
  todaySlots: [],
  currentSlot: null,
  allTaken: false,

  // ── Setters ──────────────────────────────────────────────────────────────────
  setProfile: (p) => set({ profile: p }),

  setMedications: (meds) => set({ medications: meds }),

  setSchedule: (slots, allTaken) =>
    set({
      todaySlots: slots,
      currentSlot: slots.find((s) => s.status === "due") ?? null,
      allTaken,
    }),

  markTaken: (slotId) =>
    set((state) => {
      const updated = state.todaySlots.map((s) =>
        s.id === slotId
          ? { ...s, status: "taken" as const, takenAt: new Date().toISOString() }
          : s
      );
      const nextDue = updated.find((s) => s.status === "due") ?? null;
      const allTaken = updated.every(
        (s) => s.status === "taken" || s.status === "missed"
      );
      return { todaySlots: updated, currentSlot: nextDue, allTaken };
    }),

  forceDue: () =>
    set((state) => {
      const next = state.todaySlots.find((s) => s.status === "upcoming");
      if (!next) return state;
      const updated = state.todaySlots.map((s) =>
        s.id === next.id ? { ...s, status: "due" as const } : s
      );
      return {
        todaySlots: updated,
        currentSlot: updated.find((s) => s.status === "due") ?? null,
      };
    }),

  reset: () =>
    set({
      profile: null,
      medications: [],
      todaySlots: [],
      currentSlot: null,
      allTaken: false,
    }),
}));
