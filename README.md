# Vela

Vela is a senior-first medication companion that helps caregivers set up medications safely and helps seniors follow through confidently, one dose at a time.

## Why Vela

Medication management is high-risk and high-stress for many seniors and families. Vela reduces that burden with a calm interface, strong safety guardrails, and caregiver visibility.

## Core Features

- Pill label scan to structured medication setup (with manual fallback)
- Gemini-powered medication interaction checks before saving new meds
- Deterministic daily schedule states: `upcoming`, `due`, `taken`, `missed`
- Strict dose confirmation window (±30 minutes)
- Warm voice reminders with ElevenLabs + notification flow
- Medication-aware in-app chatbot with guardrails and daily limits
- Caregiver PIN gate for high-impact medication changes
- Caregiver history dashboard for recent adherence trends
- Multilingual support (translated instructions + language-aware voice delivery)

## Architecture

- **Mobile:** Expo + React Native + Expo Router + Zustand
- **Backend:** Next.js API Routes (deployed on Vercel)
- **Data:** Supabase (Postgres + Storage + Auth)
- **AI:** Google Gemini (vision extraction + reasoning)
- **Voice:** ElevenLabs TTS

## Repository Layout

```text
MedMax/
├── mobile/    # Expo React Native app
├── backend/   # Next.js API backend
├── HACKATHON.md
├── BUILD.md
└── CONTRACTS.md
```

## Local Development

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

Create `backend/.env.local` with:

```bash
GEMINI_API_KEY=...
ELEVENLABS_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=vela-audio
```

### 2) Mobile

```bash
cd mobile
npm install
npx expo start
```

Create `mobile/.env` with:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

## Try It Out

- GitHub: https://github.com/s0hinyea/vela
- Backend: https://backend-zeta-rouge-59.vercel.app

## Team Docs

- `HACKATHON.md` for product story and demo narrative
- `BUILD.md` for stack and implementation decisions
- `CONTRACTS.md` for shared API/data contracts
