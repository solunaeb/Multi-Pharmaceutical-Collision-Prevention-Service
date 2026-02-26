# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

다제약물 충돌 방지 서비스 ("약이름") — 약 사진 촬영 → AI 자동 인식 → 처방약·OTC·건강기능식품 통합 충돌 분석 → 쉬운 언어 안내. 부모님 약물 안전을 자녀가 원격으로 확인하는 모바일 서비스.

## Current State

**This repo is specification + data only.** No source code, no `apps/` directory, no `package.json`, no `docker-compose.yml` exist yet. Development begins at Phase 0 in `TASKS.md`. All task checkboxes are unchecked.

When starting development, follow `TASKS.md` strictly in order (Phase 0 → 1 → 2 → 3 → 4). Phase 0 creates the monorepo scaffolding, boilerplate, and DB setup.

## Development Commands (After Phase 0 Setup)

### Prerequisites

Node.js 18+, Docker & Docker Compose, Expo CLI (`npm install -g expo-cli`)

### Setup & Run

```bash
# 1. Environment variables
cp apps/server/.env.example apps/server/.env   # then fill in API keys

# 2. Start DB (PostgreSQL + Redis)
docker-compose up -d

# 3. Backend
cd apps/server && npm install
npm run db:migrate        # Prisma migration
npm run db:seed           # Seed test data (common_medications.json)
npm run dev               # http://localhost:3000
# verify: curl http://localhost:3000/health → {"status":"ok"}

# 4. Frontend
cd apps/mobile && npm install
npx expo start            # QR scan with Expo Go, or press i/a for simulator
```

### Code Quality

```bash
npm run lint              # ESLint
npm run format            # Prettier
npm run typecheck         # TypeScript type check
```

## Architecture Overview

**Monorepo** (npm workspaces): `apps/mobile` (React Native/Expo, TypeScript) + `apps/server` (Express, TypeScript).

| Layer | Technology |
|-------|-----------|
| Frontend | React Native (Expo), TypeScript |
| Backend | Node.js, Express, TypeScript, AWS Lambda |
| Database | PostgreSQL + Redis |
| AI | Claude Vision API (OCR) + Claude API (analysis + plain-language) |
| Auth | Kakao OAuth → JWT (access 15min / refresh 7d) |
| Storage | AWS S3 (presigned URLs, ap-northeast-2) |

### Data Flow

```
Camera photo → POST /api/v1/ocr/parse (Claude Vision API)
  → Extracted meds shown to user → User confirms + selects profile
  → POST /api/v1/meds/:profileId (saves meds, auto-triggers collision check)
  → Collision engine: ingredient_code lookup → contraindication_pairs + supplement_drug_interactions + duplicate_ingredient_groups matching
  → Claude API generates plain-language summary + action guide
  → interaction_logs saved → Result displayed (safe / caution / contraindicated)
```

### Backend Pattern

Controller → Service → Repository. Unified error format: `{ error: { code, message } }`. AI API calls require 30s timeout; on failure, prompt user to retry.

### Planned Directory Structure

```
apps/
├── mobile/src/
│   ├── components/    # Reusable UI (Card, Button, Badge, Tag)
│   ├── screens/       # HomeScreen, CameraScreen, HistoryScreen
│   ├── services/      # API call functions
│   ├── hooks/         # Custom hooks
│   ├── context/       # AuthContext, ProfileContext
│   ├── types/         # TypeScript type definitions
│   └── constants/     # Design tokens (colors, typography, spacing)
└── server/
    ├── controllers/   # Request handling
    ├── services/      # Business logic (collision engine, OCR, AI)
    ├── repositories/  # Data access (Prisma)
    ├── routes/        # Route definitions
    ├── middleware/     # Auth (requireAuth), error handling
    └── types/         # TypeScript type definitions
```

### API Endpoints

```
POST   /api/v1/ocr/parse                    # Image → drug data extraction
POST   /api/v1/analysis/check-interaction    # Run collision analysis
GET    /api/v1/meds/:profileId               # Active meds list for profile
POST   /api/v1/meds/:profileId               # Register new med (auto-triggers analysis)
DELETE /api/v1/meds/:profileId/:medId        # Deactivate med (stop taking)
```

### DB Tables (PostgreSQL)

`users` → 1:N → `profiles` → 1:N → `medications` + `ocr_sessions` + `interaction_logs`

Max 5 profiles per user. Medications use soft delete (status: inactive). Full schemas in `database.md`.

## Data Files (Already Present)

Drug safety dataset is in **two directories** in the repo:

- **`files_real/`** — Production data (45,893 records total, ~17MB combined)
  - `service-database.json` — All 8 tables integrated (17MB)
  - `ingredients.json` — 5,537 active ingredients (master, keyed by `ingredient_code`)
  - `contraindication_pairs.json` — 35,399 drug-drug pairs (13MB)
  - `supplement_drug_interactions.json` — 15 supplement↔drug interactions
  - `duplicate_ingredient_groups.json` — 7 OTC duplicate groups
  - `age_contraindications.json` — 527 age-based contraindications
  - `pregnancy_contraindications.json` — 3,793 pregnancy contraindications
  - `elderly_caution.json` — 590 elderly caution products
  - `common_medications.json` — 25 test medications for DB seeding
  - `api-spec.json` — Detailed API request/response specs
  - `design-tokens.json` — Design system tokens (colors, typography, spacing)

- **`files_light ver_MVP_test/`** — Lightweight test data (same structure, smaller)

During Phase 0 (T-0.5), these should be organized into a `data/` folder and a DataLoader service should load `service-database.json` into memory at app startup.

## Domain Rules (Apply to All Code)

### Only 3 Features — Never Add More

1. **Photo → Auto-extraction**: Camera captures med bag/OTC box/label → AI Vision extracts drug name, ingredient, dose, days → structured data
2. **Multi-source collision analysis**: Prescription + OTC + supplements merged → new registration auto-checked against all existing → detects contraindication, duplicate ingredient, dose excess
3. **Plain-language risk guide**: LLM converts pharmacological info to everyday language → includes "tell your doctor this" action guide

Anything outside these 3 features is out of scope (no reminders/scheduling, no multi-person dashboard, no pharmacist reports).

### Target User

Primary (MVP): 30–40대 adult children caring for parents remotely. All UI text, error messages, and guides must be understandable by a non-expert. When technical terms are needed, write the plain term first with the technical term in parentheses.

### Medical Disclaimer

This is an **information service**, not medical advice. Every analysis result screen must include:
- "이 정보는 참고용이며, 의학적 진단을 대체하지 않습니다."
- Never say "stop taking immediately" — always say "confirm with your doctor/pharmacist"
- When uncertain, use "확인이 필요합니다" (conservative guide principle)

## Key ENUMs (Use Exactly These Values)

| ENUM | Values | Used In |
|------|--------|---------|
| `med_type` | `prescription`, `otc`, `supplement` | medications |
| `med_status` | `active`, `inactive` | medications |
| `risk_level` | `safe`, `caution`, `contraindicated` | interaction_logs |
| `interaction_type` | `contraindication`, `duplicate`, `dose_excess` | interaction_logs (JSONB) |
| `auth_provider` | `kakao`, `apple`, `google` | users |
| `ocr_status` | `pending`, `completed`, `confirmed`, `rejected` | ocr_sessions |
| `image_type` | `prescription`, `med_bag`, `otc_box`, `supplement_label`, `other` | ocr_sessions |
| `med_source` | `camera`, `manual` | medications |

## Coding Conventions

- Language: **TypeScript** (frontend + backend)
- Naming: variables/functions `camelCase`, components `PascalCase`, DB columns `snake_case`
- File naming: components `PascalCase.tsx` (e.g., `MedCard.tsx`), utilities `camelCase.ts` (e.g., `dataLoader.ts`)
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`)
- Frontend state: React Context (MVP scale); navigation: React Navigation (bottom tabs + stack)
- Red color (`#EF4444`) only for `contraindicated` warnings; never in general UI
- All icons must have text labels (no icon-only buttons)
- Min text size 16px; 14px only for captions/disclaimers
- Font: Pretendard

## Detailed Documentation

| Doc | Contents |
|-----|----------|
| `TASKS.md` | Phase-by-phase dev task checklist (Phase 0–4) — **follow this for work order** |
| `PRD.md` | Problem definition, target user personas, 3 core features, scope limits |
| `architecture.md` | Tech stack rationale, hosting, auth flow (draft — not finalized) |
| `database.md` | Full table schemas, JSONB structures, ER diagram, query patterns, Redis cache keys |
| `design-reference.md` | Color palette, typography scale, layout wireframes, component styles |
| `benchmark.md` | Competitor analysis (DUR, Medisafe, PillPack), UX patterns |
| `files_real/api-spec.json` | Detailed API request/response specs |
| `files_real/design-tokens.json` | Design tokens (colors, typography, spacing) as JSON |

**Priority**: When docs conflict, this CLAUDE.md takes precedence.

## Don'ts

- Do NOT add features beyond the 3 core features
- Do NOT give medical directives ("stop taking this")
- Do NOT use technical jargon without a plain-language explanation first
- Do NOT use red color outside of `contraindicated` warnings
- Do NOT attempt handwritten prescription recognition (printed only)
- Do NOT include secondary-target (관리사) features in MVP
