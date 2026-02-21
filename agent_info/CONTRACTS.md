# Vela — API Contracts & Mock Data Reference

> **This is the shared agreement between Person A (frontend) and Person B (backend).**
> Write it once. Don't change it without telling the other person.
> Person A mocks these exact shapes. Person B returns these exact shapes.
> Integration should take 20 minutes, not 3 hours.

---

## Rule: How to Use This Doc

- **Person A**: Copy the mock data into a `mocks.ts` file in the frontend. Build every screen against it. Use a `mockApiCall()` helper that adds 1–2s fake delay. Never call a real endpoint until hour 10.
- **Person B**: Build every API route to return exactly these shapes. Test in Postman before handing off. Don't invent new fields.
- **Both**: Scheduled times are always `"HH:MM"` 24-hour strings (e.g. `"08:00"`, `"22:00"`). Dates are always `"YYYY-MM-DD"`. Timestamps are always ISO 8601.

---

## Core Data Types

### Profile
One per device. No login. Created on first launch.

```
id            string   UUID
seniorName    string   e.g. "Martha" — used in all greetings
caregiverName string   e.g. "Sarah" — shown during setup
createdAt     string   ISO 8601
```

---

### Medication
Saved after caregiver confirms a scan.

```
id               string              UUID
profileId        string              FK → Profile.id
name             string              e.g. "Metformin"
brandName        string | null       e.g. "Glucophage"
dosage           string              e.g. "500mg"
form             MedicationForm      see enum below
frequency        Frequency           see enum below
scheduledTimes   string[]            e.g. ["08:00", "18:00"]
instructions     string              plain English, e.g. "Take with food"
color            string | null       e.g. "white oval" — helps senior identify pill
interactions     InteractionWarning[]  computed at scan time, stored here
createdAt        string              ISO 8601
```

**MedicationForm enum:** `"tablet"` | `"capsule"` | `"liquid"` | `"patch"` | `"inhaler"` | `"other"`

**Frequency enum:** `"once"` | `"twice"` | `"three_times"` | `"four_times"` | `"as_needed"`

---

### DoseSlot
A single dose event in today's schedule. Pre-computed at schedule-generation time.

```
id                string         UUID for this specific slot
medicationId      string         FK → Medication.id
medicationName    string         denormalized (so UI doesn't need a join)
dosage            string         denormalized
instructions      string         denormalized
scheduledTime     string         "HH:MM" 24hr
scheduledTimeLabel string        "8:00 AM" — display-ready label
status            DoseStatus     see enum below
takenAt           string | null  ISO 8601 if taken, null otherwise
audioUrl          string | null  pre-cached ElevenLabs audio URL
```

**DoseStatus enum:** `"upcoming"` | `"due"` | `"taken"` | `"missed"`

- `"due"` = the one currently shown on the Now Card
- There should be at most **one** `"due"` slot at any given time

---

### InteractionWarning
A drug-drug interaction found by Gemini's reasoning call.

```
drugs          [string, string]    the two medication names
severity       "MAJOR" | "MODERATE" | "MINOR"
explanation    string              plain English, e.g. "Taking these together can raise potassium to dangerous levels."
recommendation string              e.g. "Ask Martha's doctor before adding this."
```

---

### ScannedMedication
What Gemini returns from a label scan. NOT saved to DB yet — shown on Confirm Screen first.

```
name            string          e.g. "Potassium Chloride"
brandName       string | null
dosage          string          e.g. "10mEq"
form            MedicationForm
frequency       Frequency
suggestedTimes  string[]        Gemini's suggested schedule e.g. ["08:00", "18:00"]
instructions    string
color           string | null
confidence      number          0–1, how confident Gemini is
rawLabelText    string          raw text Gemini read off the label (for debugging)
```

---

## API Routes

All routes live at `/api/...` on the Next.js backend.
All responses follow: `{ success: true, data: ... }` or `{ success: false, error: "string" }`

---

### POST `/api/scan`
Receives a pill bottle photo. Calls Gemini Vision. Returns extracted medication info.

**Request:**
```
imageBase64   string   base64-encoded JPEG or PNG
```

**Response (success):**
```
data: ScannedMedication
```

**Response (error):**
```
error: "Could not read label clearly. Please try again or enter manually."
```

> Person A mock: return `MOCK_SCAN_RESULT` after 1.5s delay.

---

### POST `/api/interact`
Checks if a new medication conflicts with existing ones. Calls Gemini reasoning.

**Request:**
```
existingMedications  string[]   names of all current medications
newMedication        string     name of the newly scanned medication
```

**Response (success):**
```
data:
  warnings       InteractionWarning[]
  scheduleNotes  string | null    e.g. "Space Atorvastatin 2hr from Metformin"
  safe           boolean          false if any MAJOR warning exists
```

> Person A mock: if `newMedication === "Potassium Chloride"`, return `MOCK_INTERACTIONS`. Otherwise return empty warnings + `safe: true`.

---

### POST `/api/voice`
Generates and caches an ElevenLabs voice clip.

**Request:**
```
text         string   the text to speak (backend injects seniorName where needed)
seniorName   string
```

**Response (success):**
```
data:
  id         string   UUID
  text       string   the spoken text
  audioUrl   string   public URL to the audio file (Supabase Storage)
  durationMs number
  createdAt  string
```

> Person A mock: return a placeholder MP3 URL immediately. Use a local dummy audio file.

---

### POST `/api/medications`
Saves a confirmed medication to Supabase and pre-generates all voice clips for it.

**Request:**
```
profileId     string               
scanned       ScannedMedication    the confirmed/edited scan data
interactions  InteractionWarning[] the output from /api/interact
finalTimes    string[]             caregiver's chosen schedule (may differ from suggestedTimes)
```

**Response (success):**
```
data: Medication   (the saved record, with id and createdAt filled in)
```

> Person A mock: return `MOCK_MEDICATIONS[0]` after 1s delay.

---

### GET `/api/medications?profileId=xxx`
Returns all medications for a profile.

**Response (success):**
```
data: Medication[]
```

> Person A mock: return `MOCK_MEDICATIONS`.

---

### GET `/api/schedule/today?profileId=xxx`
Returns today's full dose schedule, sorted by time.

**Response (success):**
```
data:
  date      string       "YYYY-MM-DD"
  slots     DoseSlot[]   sorted by scheduledTime ascending
  allTaken  boolean      true → show End of Day screen
  nextSlot  DoseSlot | null   the current "due" slot (or null)
```

> Person A mock: use `MOCK_TODAY_SCHEDULE` for normal flow. Use `MOCK_ALL_DONE_SCHEDULE` to test the End of Day screen.

---

### POST `/api/doses/log`
Marks a dose as taken.

**Request:**
```
doseSlotId    string   
profileId     string
medicationId  string
takenAt       string   ISO 8601
```

**Response (success):**
```
data:
  id            string
  doseSlotId    string
  medicationId  string
  profileId     string
  takenAt       string
  date          string   "YYYY-MM-DD"
```

> Person A mock: return immediately with a generated id.

---

### POST `/api/profile`
Creates a new profile on first launch.

**Request:**
```
seniorName     string
caregiverName  string
```

**Response (success):**
```
data: Profile
```

---

### GET `/api/profile?profileId=xxx`
Returns profile data.

**Response (success):**
```
data: Profile
```

> Person A mock: return `MOCK_PROFILE`.

---

## Mock Data (Copy into `mocks.ts`)

### MOCK_PROFILE
```ts
{
  id: "profile-demo-001",
  seniorName: "Martha",
  caregiverName: "Sarah",
  createdAt: "2026-02-21T08:00:00Z"
}
```

---

### MOCK_MEDICATIONS
```ts
[
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
    createdAt: "2026-02-21T08:00:00Z"
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
    createdAt: "2026-02-21T08:00:00Z"
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
    createdAt: "2026-02-21T08:00:00Z"
  }
]
```

---

### MOCK_TODAY_SLOTS
> Change `status` values to test different UI states.

```ts
[
  // 8am slot — already taken (morning dose done)
  { id: "slot-001", medicationId: "med-001", medicationName: "Metformin",
    dosage: "500mg", instructions: "Take with food",
    scheduledTime: "08:00", scheduledTimeLabel: "8:00 AM",
    status: "taken", takenAt: "2026-02-21T08:07:00Z", audioUrl: null },

  { id: "slot-002", medicationId: "med-002", medicationName: "Lisinopril",
    dosage: "10mg", instructions: "Take in the morning",
    scheduledTime: "08:00", scheduledTimeLabel: "8:00 AM",
    status: "taken", takenAt: "2026-02-21T08:07:00Z", audioUrl: null },

  // 6pm slot — ACTIVE (this is what the Now Card shows)
  { id: "slot-003", medicationId: "med-001", medicationName: "Metformin",
    dosage: "500mg", instructions: "Take with food",
    scheduledTime: "18:00", scheduledTimeLabel: "6:00 PM",
    status: "due", takenAt: null, audioUrl: null },

  // 10pm slot — upcoming
  { id: "slot-004", medicationId: "med-003", medicationName: "Atorvastatin",
    dosage: "20mg", instructions: "Take at bedtime",
    scheduledTime: "22:00", scheduledTimeLabel: "10:00 PM",
    status: "upcoming", takenAt: null, audioUrl: null }
]
```

---

### MOCK_SCAN_RESULT
> Used on Confirm Screen after a live scan.

```ts
{
  name: "Potassium Chloride",
  brandName: "Klor-Con",
  dosage: "10mEq",
  form: "tablet",
  frequency: "twice",
  suggestedTimes: ["08:00", "18:00"],
  instructions: "Take with a full glass of water",
  color: "yellow oblong",
  confidence: 0.94,
  rawLabelText: "Potassium Chloride Extended-Release Tablets, USP 10 mEq..."
}
```

---

### MOCK_INTERACTIONS
> What Gemini returns when Potassium Chloride is scanned alongside Lisinopril. This is the demo's AI wow moment.

```ts
[
  {
    drugs: ["Potassium Chloride", "Lisinopril"],
    severity: "MAJOR",
    explanation: "Taking potassium supplements with Lisinopril can raise potassium levels in the blood to dangerous levels, causing irregular heartbeat.",
    recommendation: "Ask Martha's doctor before adding this supplement."
  }
]
```

---

### MOCK_VOICE_CLIPS
> Placeholder text for each voice clip. Person B will replace `audioUrl` with real ElevenLabs URLs.

```ts
{
  greeting: {
    text: "Good evening, Martha. Let's see what's next for you today.",
    audioUrl: "/audio/mock-greeting.mp3",
    durationMs: 3800
  },
  nowCard: {
    text: "Martha, it's time for your evening Metformin — that's the white oval pill. Take it with dinner.",
    audioUrl: "/audio/mock-now-card.mp3",
    durationMs: 5200
  },
  interactionWarning: {
    text: "Heads up. The new supplement can interact with Martha's Lisinopril. Worth checking with her doctor first.",
    audioUrl: "/audio/mock-interaction.mp3",
    durationMs: 6000
  },
  goodnight: {
    text: "All done for today, Martha. Every single one. You did great. Get some rest.",
    audioUrl: "/audio/mock-goodnight.mp3",
    durationMs: 5800
  }
}
```

---

## Integration Checklist (Hour 10)

When Person B says "API is live", Person A does the following swaps:

| Was | Becomes |
|-----|---------|
| `mockApiCall(MOCK_PROFILE)` | `fetch('/api/profile?profileId=...')` |
| `mockApiCall(MOCK_MEDICATIONS)` | `fetch('/api/medications?profileId=...')` |
| `mockApiCall(MOCK_TODAY_SCHEDULE)` | `fetch('/api/schedule/today?profileId=...')` |
| `mockApiCall(MOCK_SCAN_RESULT)` | `fetch('/api/scan', { method: 'POST', body: { imageBase64 } })` |
| `mockApiCall(MOCK_INTERACTIONS)` | `fetch('/api/interact', { method: 'POST', body: { existingMedications, newMedication } })` |
| Local voice URL | `fetch('/api/voice', { method: 'POST', body: { text, seniorName } })` |

Each swap is one line change. That's the goal.
