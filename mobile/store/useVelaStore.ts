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

  setSchedule: (slots, allTaken) => {
    // Pick the first slot that hasn't been taken yet as the "current" one
    const nextUntaken = slots.find(
      (s) => s.status === "due" || s.status === "upcoming"
    ) ?? null;
    set({
      todaySlots: slots,
      currentSlot: nextUntaken,
      allTaken,
    });
  },

  markTaken: (slotId) =>
    set((state) => {
      const updated = state.todaySlots.map((s) =>
        s.id === slotId
          ? { ...s, status: "taken" as const, takenAt: new Date().toISOString() }
          : s
      );
      // Pick the next untaken slot
      const nextUntaken = updated.find(
        (s) => s.status === "due" || s.status === "upcoming"
      ) ?? null;
      const allTaken = updated.length > 0 && updated.every((s) => s.status === "taken");
      return { todaySlots: updated, currentSlot: nextUntaken, allTaken };
    }),

  forceDue: () =>
    set((state) => {
      const next = state.todaySlots.find((s) => s.status === "upcoming");
      if (!next) return state;
      return {
        currentSlot: next,
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
