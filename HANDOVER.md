# Varys — Handover Document
_Last updated: 2026-06-22_

---

## What is this?

**Varys** is a private networking CRM. It lets you capture notes about people and conversations, get AI-powered analysis and action suggestions, track those actions, and build a searchable log of your network relationships. Named after the spymaster from Game of Thrones.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Node.js + Express 5, running on port 5000 via `nodemon` |
| Database | MongoDB Atlas (cloud), Mongoose ODM |
| Frontend | React (create-react-app), port 3000, proxies API to port 5000 |
| AI | Anthropic Claude API, model `claude-sonnet-4-6` |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Styling | Tailwind CSS |
| Brand colours | `#1C2B3A` (dark navy), `#B08D57` (gold) |

**To run:**
```bash
# Terminal 1 — backend
npm run dev

# Terminal 2 — frontend
cd client && npm start
```

**Environment variables** (in `.env`, never committed):
```
MONGO_URI=...
JWT_SECRET=...
ANTHROPIC_API_KEY=...
```

---

## Folder Structure

```
server.js               — Express app entry point
middleware/
  auth.js               — JWT requireAuth middleware
models/
  User.js               — Auth user (email + password hash)
  Person.js             — Network contact
  Me.js                 — User's own profile (name, role, goals, etc.)
  Action.js             — Pending/done/dismissed actions
  Conversation.js       — Saved chat threads (replaces old Entry model)
  Entry.js              — Legacy, no longer used
  Suppression.js        — "Stop suggesting this" records
routes/
  auth.js               — POST /auth/register, POST /auth/login
  people.js             — CRUD for Person documents
  me.js                 — GET/PUT for Me profile
  actions.js            — GET/PUT/DELETE for Action documents
  conversations.js      — CRUD + PUT update for Conversation documents
  insights.js           — All AI routes (capture, chat, person insights, draft-email)
  entries.js            — Legacy, no longer used
  suppressions.js       — POST /suppressions
client/src/
  App.js                — Router, lifted state, auth gate
  components/
    Login.js            — Login/register form
    QuickCapture.js     — Main capture + chat interface
    PeopleList.js       — Network tab, list of contacts
    PersonDetail.js     — Individual contact page with insights + conversations
    Actions.js          — Actions tab (pending actions, due dates, email drafting)
    Conversations.js    — Conversations tab (all saved threads)
    Me.js               — Profile tab + My Journal
    AddPerson.js        — Add contact form
```

---

## Data Models

### Person
```js
{ userId, name, role, company, goals, canHelpWith, notes, whereMet, connections[], createdAt }
```

### Conversation
```js
{ userId, title, captureText, messages: [{ role, content }], relatedPeople: [ObjectId], folder, createdAt, updatedAt }
// folder: 'MY_JOURNAL' or null
// relatedPeople: array of Person ObjectIds
```

### Action
```js
{ userId, type, description, personId, personName, status, outcome, sourceCapture, completedAt, dueDate, createdAt }
// type: 'follow_up' | 'introduction' | 'add_contact' | 'send_email' | 'other'
// status: 'pending' | 'done' | 'dismissed'
```

### Me
```js
{ userId, name, role, company, goals, currentProjects, lookingFor, ... }
```

### Suppression
```js
{ userId, description, personName, note }
// Tells AI "stop suggesting this action"
```

---

## API Routes

All routes except `/auth/*` require `Authorization: Bearer <token>` header.

### Auth
- `POST /auth/register` — `{ email, password }`
- `POST /auth/login` — `{ email, password }` → `{ token }`

### People
- `GET /people` — all contacts
- `POST /people` — create contact
- `GET /people/:id` — single contact
- `PUT /people/:id` — update contact
- `DELETE /people/:id` — delete contact

### Conversations
- `GET /conversations` — all conversations
- `GET /conversations/:id` — single conversation (full messages)
- `GET /conversations/person/:personId` — conversations tagged to a person
- `GET /conversations/mine` — conversations with folder=MY_JOURNAL
- `POST /conversations` — create `{ title, captureText, messages, relatedPeopleNames, folder }`
- `PUT /conversations/:id` — update any fields `{ title, captureText, messages, relatedPeopleNames, folder }`
- `DELETE /conversations/:id` — delete

### Actions
- `GET /actions` — all pending actions (populated with personId.name, personId.role)
- `PUT /actions/:id` — update `{ status, outcome, dueDate }`
- `DELETE /actions/:id` — delete

### Insights (AI)
- `POST /insights/capture` — `{ text }` → `{ insights, suggestedActions, peopleMentioned, suggestedSaves, conversationTitle }`
- `POST /insights/chat` — `{ history, pendingActions }` → `{ response, newActions, retireActions, suggestedSaves }`
- `POST /insights/person/:personId` — → `{ insights }`
- `POST /insights/draft-email` — `{ actionId }` → `{ subject, body }`
- `POST /insights/actions` — save accepted actions `[{ type, description, personName, dueDate }]`

### Me / Suppressions
- `GET /me`, `PUT /me`
- `POST /suppressions`

---

## Key Architectural Decisions

### AI Context
Every AI call fetches **all conversations** for the user and sends full message history in a flat pool (via `formatAllConversations` helper in `routes/insights.js`). No per-person filtering, no deduplication issues. Format:
```
--- [date] "title" (person1, person2)
User: ...
Varys: ...
```
This means AI always has full network context regardless of which route is called.

### Conversation Auto-Save
Conversations are **auto-saved** — no manual save button. Flow:
1. User submits capture text → AI responds → conversation created automatically in DB
2. Every follow-up chat message → conversation updated with full message array
3. `savedConversationId` is lifted to App.js state so it survives React Router tab navigation
4. Title and person tags are editable after save; title has a "Save" button, tag checkboxes update immediately

### RETIRE_ACTION System
When the AI (in chat) wants to remove a pending action, it emits:
```
RETIRE_ACTION: <exact description string>
```
The frontend does an exact string match against `capturePendingActions` and removes matches. Claude has the exact strings in its system prompt under `CURRENT PENDING ACTIONS`.

### Action Due Dates
- Stored as `dueDate: Date` on Action model
- Actions tab sorts: overdue → soon (≤3 days) → upcoming → no date
- Red border = overdue, amber = soon
- QuickCapture shows a date picker when accepting an action, with +3d/+7d/+14d quick buttons

### Email Drafting
On `follow_up`, `introduction`, `send_email` action types, a "Draft email" button calls `POST /insights/draft-email`. Claude reads the person profile + conversation history and drafts subject + body calibrated to the relationship tone. Draft is cached per action — clicking again reopens the same draft.

---

## Frontend State Management

All **capture-related state** is lifted to `App.js` so it persists across React Router tab navigation (QuickCapture unmounts when you leave the `/` route):

```js
captureText, setCaptureText
captureResult, setCaptureResult
captureSaves, setCaptureSaves          // { personName: bool, MY_JOURNAL: bool }
capturePendingActions, setCapturePendingActions
captureAcceptedActions, setCaptureAcceptedActions
chatHistory, setChatHistory            // [{ role, content }]
conversationTitle, setConversationTitle
savedConversationId, setSavedConversationId  // DB _id of auto-saved conversation
```

---

## Navigation (5 tabs)

| Tab | Route | Component |
|---|---|---|
| Capture | `/` | QuickCapture |
| Network | `/network` | PeopleList + AddPerson |
| Conversations | `/conversations` | Conversations |
| Actions | `/actions` | Actions |
| Profile | `/me` | Me |

---

## Feature Backlog (priority order)

1. ~~In-app action due dates + overdue surfacing~~ ✅
2. ~~Email drafting on send_email/follow_up/introduction actions~~ ✅
3. **Bulk contact import** — CSV or LinkedIn export upload to create Person records in bulk (removes onboarding friction)
4. **Background network search** — scheduled job querying Perplexity or Tavily API for news about contacts, surfaced in app
5. **Weekly digest** — Monday email (via SendGrid): overdue actions, who you haven't touched recently, patterns Varys spots
6. **Full calendar integration** — Google Calendar OAuth, sync action due dates as calendar events

---

## Things to Know

- Deleting a conversation from anywhere deletes the single MongoDB document — it disappears from all views (person profile, Me journal, Conversations tab) automatically.
- The AI model is `claude-sonnet-4-6` throughout.
- `authFetch` in `App.js` is a thin wrapper around `fetch` that adds the `Authorization: Bearer` header from localStorage.
- `POST /insights/capture` response includes `PEOPLE_MENTIONED`, `SUGGESTED_SAVES`, `TITLE` parsed from the AI response text using regex.
- The chat route also returns `suggestedSaves` now — new people mentioned mid-conversation get merged into the save checkboxes.
- GitHub repo: https://github.com/Hazbotbeepboop/networking-app
