# Vela — Build Reference

> Stack decisions, folder structure, conventions, and Claude prompting guide.
> Read this alongside HACKATHON.md (vision) and CONTRACTS.md (data shapes).

---

## Stack Decisions

| Layer | Choice | Why |
|---|---|---|
| Mobile framework | Expo (React Native) | QR code demo, no App Store approval needed |
| Routing | Expo Router (file-based) | Zero configuration, mirrors Next.js |
| State management | Zustand | One store file, no provider boilerplate |
| Styling | StyleSheet + `theme.ts` tokens | Native performance, no build config |
| Backend framework | Next.js API routes | Vercel deploy in one command |
| Database | Supabase (PostgreSQL) | Auth, storage, and DB in one dashboard |
| AI — vision + reasoning | Gemini 2.0 Flash | Multimodal, fast, sponsor track |
| Voice | ElevenLabs TTS API | Human-sounding, sponsor track |
| Deploy | Vercel (backend) + Expo Go (mobile) | Both instant, no config |

---

## Folder Structure

```
vela/
├── mobile/                        ← Person A owns this
│   ├── app/                       ← Expo Router — each file is a route
│   │   ├── index.tsx              ← Screen 1: Greeting
│   │   ├── now.tsx                ← Screen 2: Now Card
│   │   ├── scan.tsx               ← Screen 3: Scan
│   │   ├── confirm.tsx            ← Screen 4: Confirm
│   │   ├── done.tsx               ← Screen 5: End of Day
│   │   └── _layout.tsx            ← Root layout (fonts, safe area)
│   ├── components/
│   │   ├── NowCard.tsx
│   │   ├── InteractionPanel.tsx
│   │   ├── MedicationCard.tsx
│   │   └── VoiceButton.tsx
│   ├── store/
│   │   └── useVelaStore.ts        ← Single Zustand store
│   ├── mocks/
│   │   └── index.ts               ← All mock data (deleted at integration)
│   ├── hooks/
│   │   └── useSchedule.ts         ← Data fetching hooks
│   ├── theme.ts                   ← Design tokens (colors, fonts, spacing)
│   └── api.ts                     ← All fetch() calls in one file (swap target)
│
├── backend/                       ← Person B owns this
│   ├── app/
│   │   └── api/
│   │       ├── scan/route.ts
│   │       ├── interact/route.ts
│   │       ├── voice/route.ts
│   │       ├── medications/route.ts
│   │       ├── schedule/today/route.ts
│   │       ├── doses/log/route.ts
│   │       └── profile/route.ts
│   ├── lib/
│   │   ├── gemini.ts              ← Gemini client + prompt functions
│   │   ├── elevenlabs.ts          ← ElevenLabs client
│   │   └── supabase.ts            ← Supabase client
│   └── .env.local                 ← API keys (never commit)
│
├── HACKATHON.md                   ← Vision document
├── CONTRACTS.md                   ← API contracts + mock data
└── BUILD.md                       ← This file
```

---

## Design Tokens (`theme.ts`)

Person A creates this first. Every StyleSheet in the app pulls from here.

```ts
export const theme = {
  colors: {
    background:   "#FAF7F2",   // soft cream
    surface:      "#FFFFFF",
    primary:      "#2D5A3D",   // deep forest green
    accent:       "#D4822A",   // warm amber
    textPrimary:  "#1A1A1A",
    textSecondary:"#6B6B6B",
    textOnPrimary:"#FFFFFF",
    success:      "#4CAF50",
    warning:      "#FF9800",
    danger:       "#D32F2F",
    border:       "#E8E2D9",
  },
  fontSizes: {
    xs:   14,
    sm:   16,
    md:   20,
    lg:   26,
    xl:   34,
    xxl:  44,
  },
  radii: {
    sm: 8,
    md: 16,
    lg: 24,
    full: 999,
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 20,
    lg: 32,
    xl: 48,
  },
};
```

**Rule: Nothing smaller than `fontSizes.sm` (16px) ever appears on screen. Most senior-facing text uses `md` or larger.**

---

## Zustand Store (`useVelaStore.ts`)

One file. Person A writes this during hour 1.

```ts
import { create } from "zustand";
import type { Profile, Medication, DoseSlot } from "../../CONTRACTS";

type VelaStore = {
  // State
  profile: Profile | null;
  medications: Medication[];
  todaySlots: DoseSlot[];
  currentSlot: DoseSlot | null;  // the "due" slot shown on Now Card
  allTaken: boolean;

  // Actions
  setProfile: (p: Profile) => void;
  setMedications: (meds: Medication[]) => void;
  setSchedule: (slots: DoseSlot[], allTaken: boolean) => void;
  markTaken: (slotId: string) => void;
};
```

---

## API Calls (`api.ts`)

Person A writes this as a mock wrapper. Person B replaces the implementations.

```ts
// During development — import from mocks
// At integration — replace each function body with a real fetch()

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export async function fetchProfile(profileId: string) { ... }
export async function fetchTodaySchedule(profileId: string) { ... }
export async function fetchMedications(profileId: string) { ... }
export async function scanLabel(imageBase64: string) { ... }
export async function checkInteractions(existing: string[], newMed: string) { ... }
export async function generateVoice(text: string, seniorName: string) { ... }
export async function saveMedication(payload: SaveMedicationRequest) { ... }
export async function logDose(payload: LogDoseRequest) { ... }
```

**This single file is the integration seam.** At hour 10, Person B gives Person A the deployed Vercel URL. Person A sets `EXPO_PUBLIC_API_URL` in `.env` and swaps the mock returns for real `fetch()` calls. One file. Done.

---

## Environment Variables

### `mobile/.env`
```
EXPO_PUBLIC_API_URL=http://localhost:3000   # change to Vercel URL at integration
```

### `backend/.env.local`
```
GEMINI_API_KEY=
ELEVENLABS_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=vela-audio
```

**Rule: Never commit `.env` or `.env.local`. Both are in `.gitignore`.**

---

## Supabase Schema

Person B creates these tables at hour 0.

```sql
-- profiles
create table profiles (
  id uuid primary key default gen_random_uuid(),
  senior_name text not null,
  caregiver_name text not null,
  created_at timestamptz default now()
);

-- medications
create table medications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  name text not null,
  brand_name text,
  dosage text not null,
  form text not null,
  frequency text not null,
  scheduled_times text[] not null,
  instructions text not null,
  color text,
  interactions jsonb default '[]',
  created_at timestamptz default now()
);

-- dose_logs
create table dose_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  medication_id uuid references medications(id),
  scheduled_time text not null,
  taken_at timestamptz,
  date date not null,
  status text default 'upcoming'
);
```

---

## How to Run

```bash
# Terminal 1 — Mobile (Person A)
cd mobile
npx expo start

# Terminal 2 — Backend (Person B)
cd backend
npx vercel dev
```

Scan the QR code with Expo Go on your phone. Demo runs on a real device, not a simulator.

---

## Claude Prompting Template

Use this at the start of every Claude Code session:

```
You are building Vela, a medication companion app for seniors.

Read these three files for full context:
- HACKATHON.md — the product vision and all 5 screens
- CONTRACTS.md — all data types, API shapes, and mock data
- BUILD.md — the stack, folder structure, and conventions

Stack: Expo Router, Zustand, StyleSheet, Next.js API routes, Supabase, Gemini, ElevenLabs.
Folder: mobile/ for the app, backend/ for API routes.
Design: cream background (#FAF7F2), forest green (#2D5A3D), amber (#D4822A). Nothing under 16px font.

Current task: [DESCRIBE ONE SPECIFIC THING HERE]

Use mock data from CONTRACTS.md until told otherwise.
Follow the folder structure in BUILD.md exactly.
```

**Rule: One task per Claude session. "Build the Now Card" not "Build the whole app."**

---

## Demo Mode

Set this flag in `mobile/mocks/index.ts`:

```ts
export const DEMO_MODE = true;
```

When `DEMO_MODE` is true, `api.ts` returns mock data instead of calling the backend. Flip to `false` at integration. This means the demo never depends on network connectivity during the presentation.

---

## Person A / Person B Split (Quick Reference)

| Person A (Mobile) | Person B (Backend) |
|---|---|
| All 5 screens in `mobile/app/` | All 7 API routes in `backend/app/api/` |
| `theme.ts` design tokens | `lib/gemini.ts` Gemini client |
| `useVelaStore.ts` Zustand store | `lib/elevenlabs.ts` ElevenLabs client |
| `api.ts` (mocked during dev) | `lib/supabase.ts` Supabase client |
| All components in `mobile/components/` | Supabase schema + Storage bucket |
| ElevenLabs audio playback (given a URL) | ElevenLabs audio generation + upload |
| Demo mode seeding | Vercel deployment |

**Neither person touches the other's folder. Conflicts should be near zero.**
