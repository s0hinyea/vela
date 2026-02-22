# Vela AI Chatbot Feature - Implementation Plan

## Overview

This feature adds an intelligent, conversational AI assistant right into the
bottom navigation bar of the Vela mobile app. Represented by a friendly "Flame"
avatar, the chatbot allows users to ask specific questions about their currently
prescribed medications. To manage costs and ensure high-quality interactions,
users will select a medication context first and are limited to 3 questions per
day. This feature acts as the ultimate "WOW" factor for the hackathon by
utilizing Gemini's reasoning capabilities interactively.

## 1. Backend Architecture Updates (Next.js API)

### A. Rate Limiting Database Table `chat_logs`

We need a way to track how many questions a user has asked per day to enforce
the 3-question limit.

**Supabase Migration:**

```sql
CREATE TABLE public.chat_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    medication_id UUID REFERENCES public.medications(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);
```

### B. New API Endpoint: `/api/chat` (POST)

**Purpose:** Receives user query + medication context, checks rate limits,
queries Gemini, logs the usage, and returns the answer.

**Flow:**

1. **Validate Input:** Ensure `profileId`, `medicationId`, and `question` are
   provided.
2. **Check Rate Limit:** Query `chat_logs` for this `profileId` where
   `created_at` is today. If count >= 3, return an error block alerting the user
   they hit the daily limit.
3. **Fetch Context:** Retrieve the medication's name, dosage, instructions, and
   interactions from the database based on `medicationId`.
4. **Construct Gemini Prompt:** System Prompt: _"You are Vela, a friendly,
   professional, easy-to-understand medication assistant for seniors. Answer the
   user's question about the following medication. Be concise, reassuring, but
   always advise them to consult a doctor for serious issues. Context:
   [Medication details]"_
5. **Call Gemini API:** Feed the prompt + user question to `gemini-1.5-pro` (or
   `flash`).
6. **Log to DB:** Insert the question and Gemini's response into the `chat_logs`
   table.
7. **Return Response:** Send the answer back to the mobile app.

## 2. Mobile Frontend Updates (Expo / React Native)

### A. Bottom Navigation Update `mobile/app/(tabs)/_layout.tsx`

- Add a new `<Tabs.Screen>` entry placed exactly in the middle (between Home and
  Profile).
- Customize the `tabBarIcon` to use a Flame emoji (🔥) or a custom SVG
  representing the cartoony flame avatar.
- Set the label to "Ask Vela".

### B. New Screen: `mobile/app/(tabs)/chat.tsx`

This will be the main hub for the feature. It will have two distinct states:

#### State 1: Medication Selection Mode (If none selected yet)

- **UI:** "What medication do you need help with today?"
- A clean list/carousel displaying the user's active medications (fetched from
  `useVelaStore`).
- User taps a medication context, which updates local state to transition to
  Chat Mode.

#### State 2: Active Chat Mode

- **Header:** Shows the selected medication ("Asking about Lisinopril") + a
  "Back" button to select a different medication.
- **Flame Avatar:** A prominent circular avatar at the top of the chat area
  containing the Flame character, perhaps with a subtle breathing/floating
  animation using `Animated`.
- **Daily Limit Indicator:** A small pill-shaped badge showing remaining
  questions (e.g., "2/3 questions left today").
- **Message List:** A scrollable view showing the conversation history.
- **Input Area:** Text input field with a "Send" action.

### C. State Management & API Hook

- Expand `useVelaStore` (or create local state) to track `chatRemainingCount`
  (default 3), updating it upon successful API calls.
- Create a fetch function `askVelaChat(profileId, medId, question)` in `api.ts`
  to interface with the new backend route.

## 3. Step-by-Step Execution Plan

1. **Step 1: Database Setup**
   - Head to Supabase SQL editor and run the script to create the `chat_logs`
     table.
2. **Step 2: API Route Creation**
   - Create `backend/app/api/chat/route.ts`.
   - Implement the rate limiting and the rigorous Gemini prompt tailored for
     senior care.
3. **Step 3: Frontend Scaffolding**
   - Add the `chat.tsx` screen to the tabs layout right in the middle.
   - Design the simple 2-state UI (Selection List -> Chat view).
4. **Step 4: Integration & Polish**
   - Wire the frontend input to the `api.ts` call.
   - Add layout and loading animations (the flame pulsing while thinking).
   - Tie the daily limit warning to local state dynamically.

## 4. Prompt Engineering Gold (For Gemini)

To ensure the AI strictly acts responsibly and characteristically, use this
system prompt structure in the API:

```text
You are Vela, the friendly, caring, cartoon flame avatar assistant in the MedMax app. You answer questions specifically about a user's medication.
Do not offer diagnosing medical advice; advise them to speak to their doctor if it sounds life-threatening.
Keep answers extremely concise, very friendly, and simple for an elderly user to understand.

Patient Context:
Medication: {med.name}
Dosage: {med.dosage}
Instructions: {med.instructions}

User Question: {question}
```
