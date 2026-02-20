# 약이름 — 다제약물 충돌 방지 서비스

> 약 사진 촬영 → AI 자동 인식 → 처방약·OTC·건강기능식품 통합 충돌 분석 → 쉬운 언어 안내

부모님이 여러 병원에서 받은 약, 약국에서 직접 산 약, 건강기능식품이 서로 충돌하지 않는지 사진 한 장으로 확인할 수 있는 서비스입니다.

---

## 프로젝트 구조

```
yakieum/
├── apps/
│   ├── mobile/                # React Native (Expo) — iOS/Android
│   └── server/                # Node.js (Express) + AWS Lambda
├── docs/
│   ├── CLAUDE.md              # Claude Code 마스터 지침서
│   ├── TASKS.md               # Phase별 개발 작업 목록
│   ├── PRD.md                 # 문제 정의, 타겟 유저, 3 core features
│   ├── benchmark.md           # 유사 서비스 분석, UX 패턴
│   ├── architecture.md        # 기술 스택 선택
│   ├── database.md            # DB 테이블 정의, ER 관계, 쿼리 패턴
│   └── design-reference.md    # 비주얼 스타일, 컬러, 레이아웃
├── data/
│   ├── service-database.json  # 통합 약물 안전 DB (45,893 레코드)
│   ├── ingredients.json       # 성분 마스터 (5,537)
│   ├── contraindication_pairs.json  # 병용금기 성분쌍 (35,399)
│   ├── supplement_drug_interactions.json  # 건기식↔의약품 (15)
│   ├── duplicate_ingredient_groups.json  # 성분 중복 그룹 (7)
│   ├── age_contraindications.json   # 연령금기 (527)
│   ├── pregnancy_contraindications.json  # 임산부금기 (3,793)
│   ├── elderly_caution.json   # 노인주의 (590)
│   ├── common_medications.json  # 테스트용 약물 (25)
│   ├── design-tokens.json     # 디자인 토큰
│   ├── api-spec.json          # API 스펙
│   └── external-data-sources.json  # 외부 데이터 소스 가이드
└── README.md
```

---

## 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| Frontend | React Native (Expo), TypeScript | iOS/Android 크로스플랫폼 |
| Backend | Node.js, Express, TypeScript | REST API |
| Database | PostgreSQL + Redis | 관계형 + 캐시 |
| AI | Claude Vision API + Claude API | OCR + 충돌 분석 + 쉬운 언어 |
| Auth | 카카오 소셜 로그인, JWT | |
| Storage | AWS S3 | 촬영 이미지 저장 |
| Hosting | AWS (Lambda + RDS + S3) | ap-northeast-2 (서울) |
| 약물 데이터 | 심평원 DUR 2024.5 + 자체 구축 | `data/` 폴더 |

> ⚠️ 기술 스택은 MVP 기준 초안이며, 변경될 수 있습니다. `docs/architecture.md` 참고.

---

## 로컬 개발 환경 셋업

### 사전 요구사항

- Node.js 18+
- npm 9+ 또는 yarn 1.22+
- Docker & Docker Compose (PostgreSQL, Redis 로컬 실행용)
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) 또는 Android Emulator, 또는 Expo Go 앱

### 1. 저장소 클론

```bash
git clone <repository-url>
cd yakieum
```

### 2. 환경 변수 설정

```bash
cp apps/server/.env.example apps/server/.env
```

`.env` 파일을 열고 아래 값을 채웁니다:

```env
# Database
DATABASE_URL=postgresql://yakieum:yakieum@localhost:5432/yakieum

# Redis
REDIS_URL=redis://localhost:6379

# Anthropic (Claude API)
ANTHROPIC_API_KEY=sk-ant-...

# Kakao OAuth
KAKAO_CLIENT_ID=...
KAKAO_REDIRECT_URI=...

# AWS S3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=yakieum-images
AWS_REGION=ap-northeast-2

# JWT
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

### 3. 데이터베이스 실행

```bash
docker-compose up -d
```

`docker-compose.yml` (프로젝트 루트):
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: yakieum
      POSTGRES_PASSWORD: yakieum
      POSTGRES_DB: yakieum
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

### 4. 백엔드 실행

```bash
cd apps/server
npm install
npm run db:migrate    # Prisma 마이그레이션 실행
npm run db:seed       # 테스트 데이터 시딩 (common_medications.json 기반)
npm run dev           # http://localhost:3000
```

확인: `curl http://localhost:3000/health` → `{"status":"ok"}`

### 5. 프론트엔드 실행

```bash
cd apps/mobile
npm install
npx expo start
```

Expo Go 앱에서 QR 코드 스캔, 또는 `i` (iOS Simulator) / `a` (Android Emulator) 키로 실행.

---

## 약물 안전 DB

`data/service-database.json` (17MB)에 8개 테이블, **45,893 레코드**가 통합되어 있습니다.

| 테이블 | 레코드 | 설명 |
|--------|--------|------|
| `ingredients` | 5,537 | 성분 마스터 — 성분코드·DUR 카테고리 매핑 |
| `contraindication_pairs` | 35,399 | 병용금기 성분쌍 (심평원 DUR 79만 행에서 정규화) |
| `supplement_drug_interactions` | 15 | 건기식↔의약품 상호작용 (DUR 미커버) |
| `duplicate_ingredient_groups` | 7 | OTC 성분 중복 그룹 |
| `age_contraindications` | 527 | 연령금기 (성분 레벨) |
| `pregnancy_contraindications` | 3,793 | 임산부금기 (성분 레벨) |
| `elderly_caution` | 590 | 노인주의 제품 |
| `common_medications` | 25 | 시드/테스트용 약물 |

데이터 소스: 건강보험심사평가원 DUR 의약품 목록 2024.5, 건강기능식품 정보포털, 자체 구축.

---

## 핵심 API

| Method | Path | 설명 |
|--------|------|------|
| `POST` | `/api/v1/ocr/parse` | 약물 사진 → AI 자동 추출 |
| `POST` | `/api/v1/meds/:profileId` | 약물 등록 (→ 충돌 분석 자동 트리거) |
| `GET` | `/api/v1/meds/:profileId` | 프로필별 활성 약물 리스트 |
| `DELETE` | `/api/v1/meds/:profileId/:medId` | 약물 비활성화 (복용 중단) |
| `POST` | `/api/v1/analysis/check-interaction` | 충돌 분석 실행 |

상세 스펙: `data/api-spec.json`

---

## 개발 가이드

### 커밋 컨벤션

[Conventional Commits](https://www.conventionalcommits.org/) 규칙을 따릅니다.

```
feat: 약물 등록 API 구현
fix: 충돌 분석 시 건기식 타입 누락 수정
docs: README 셋업 가이드 추가
refactor: DataLoader 서비스 캐시 로직 분리
```

### 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 변수·함수 | camelCase | `checkInteraction`, `activeMeds` |
| 컴포넌트 | PascalCase | `MedCard`, `RiskBadge` |
| DB 컬럼 | snake_case | `ingredient_code`, `risk_level` |
| 파일 (컴포넌트) | PascalCase | `MedCard.tsx`, `HomeScreen.tsx` |
| 파일 (유틸) | camelCase | `dataLoader.ts`, `authMiddleware.ts` |

### 코드 품질

```bash
npm run lint          # ESLint
npm run format        # Prettier
npm run typecheck     # TypeScript 타입 체크
```

---

## 문서 목록

| 문서 | 내용 | 대상 |
|------|------|------|
| `CLAUDE.md` | 프로젝트 마스터 지침서 | Claude Code |
| `TASKS.md` | Phase별 개발 작업 목록 | 개발자 |
| `README.md` | 프로젝트 셋업 가이드 | 개발자 |
| `PRD.md` | 문제 정의, 타겟 유저, 기능 | 전체 |
| `benchmark.md` | 유사 서비스 분석, UX 패턴 | 디자인·기획 |
| `architecture.md` | 기술 스택 선택 | 개발자 |
| `database.md` | DB 스키마, 쿼리 패턴 | 백엔드 |
| `design-reference.md` | 비주얼, 컬러, 와이어프레임 | 프론트엔드·디자인 |

---

## 라이선스

이 프로젝트는 비공개(private) 저장소로 운영됩니다.
약물 데이터(DUR)는 공공데이터포털의 공공 라이선스를 따릅니다.
Pretendard 서체는 SIL Open Font License를 따릅니다.
