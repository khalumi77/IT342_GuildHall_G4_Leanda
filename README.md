# GuildHall 📜

A gamified community service platform built around an Adventurer's Guild theme. Users post **Quests**, join **Guilds**, earn **XP**, and level up their rank — from Bronze all the way to Adamantite.

---

## Tech Stack

### Backend
- **Java 17** — Spring Boot 3.5
- **Spring Security** — JWT authentication, BCrypt password hashing, Role-Based Access Control
- **Spring Data JPA** — Repository layer over Supabase PostgreSQL
- **WebSocket / STOMP** — Real-time one-to-one chat
- **Vertical Slice Architecture** — Code organized by feature domain (`auth`, `guild`, `quest`, `chat`, `payment`, `admin`, `profile`)

### Web Frontend
- **React 19 + Vite** — TypeScript
- **Axios** — HTTP client
- **React Router DOM 7** — Client-side routing
- **Supabase JS SDK** — Direct file uploads to Supabase Storage

### Mobile (Android)
- **Kotlin** — XML layouts (View system, no Jetpack Compose)
- **Retrofit 2** — HTTP client
- **Kotlin Coroutines** — Async work
- **Google Sign-In SDK** — OAuth2 via backend-driven flow
- **minSdk 24**

### External Services
| Service | Purpose |
|---|---|
| Supabase (PostgreSQL) | Primary database — users, quests, guilds, payments, messages, memberships |
| Supabase Storage | File attachments — images and PDFs, URL persisted in quests table |
| Google OAuth2 | Backend-driven sign-in for both web and mobile |
| PayMongo | Checkout sessions for paid quests (sandbox mode) |
| Quotable API | Daily inspirational quote on the guild dashboard |
| SMTP | Welcome emails on registration |

---

## Features

1. **JWT Authentication + Google OAuth2** — Native registration or Google sign-in. Stateless JWT sessions with 24-hour expiry.
2. **Role-Based Access Control** — `ROLE_ADVENTURER` and `ROLE_GUILDMASTER`. Enforced at the Spring Security config level.
3. **Quest Board (Full CRUD)** — Post, categorize, attach files, set volunteer or paid reward, accept, and complete quests. State machine: `OPEN → PENDING → COMPLETED` (paid quests: `PENDING_PAYMENT → OPEN`).
4. **File Attachments** — Web client compresses images client-side before uploading via Supabase JS SDK. Mobile client sends attachments as Base64 in the request payload.
5. **PayMongo Integration** — Paid quests require a PayMongo Checkout session before going live on the board. Poster pays upfront; reward is released to the helper on completion.
6. **Real-Time Chat** — WebSocket over STOMP. One-to-one conversations with automated SYSTEM messages triggered on quest accept and quest completion.
7. **XP + Leveling** — Completing quests awards XP. Rank titles calculated server-side: Bronze → Silver → Gold → Mithril → Adamantite.
8. **Guildmaster Admin Dashboard** — Create/delete guilds, view any user profile, ban users.
9. **Quotable API Integration** — Random inspirational quote fetched from the Quotable public REST API on each guild dashboard load, cached daily on the backend.

---

## Getting Started

### Prerequisites

- Java 17
- Node.js 18+
- Android Studio (for mobile)
- A Supabase project (PostgreSQL + Storage bucket)
- A PayMongo account (sandbox keys)
- Google OAuth2 credentials (web client ID)
- An SMTP server or service (e.g. Gmail, Mailtrap)

### Backend

```bash
cd backend/guildhall
# Configure application.properties or application.yml with:
# - Supabase DB URL + credentials
# - JWT secret
# - Google OAuth2 client ID + secret
# - PayMongo secret key
# - SMTP credentials
./mvnw spring-boot:run
# Runs on http://localhost:8080
```

### Web Frontend

```bash
cd web
npm install
# Create .env with:
# VITE_API_BASE_URL=http://localhost:8080/api/v1
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
npm run dev
# Runs on http://localhost:5173
```

### Mobile

1. Open the `mobile/` folder in Android Studio.
2. In `RetrofitClient.kt`, update `BASE_URL` to your machine's LAN IP (e.g. `http://192.168.1.x:8080/api/v1/`) for physical device testing, or keep `10.0.2.2` for the emulator.
3. Update `google_web_client_id` in `strings.xml` with your OAuth2 web client ID.
4. Run on emulator or connected device (minSdk 24).

---

## Author

**John Luis Catarina Leanda**
Cebu Institute of Technology – University
IT342 — Systems Integration and Architecture