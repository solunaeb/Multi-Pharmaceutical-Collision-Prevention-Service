# Database: 다제약물 충돌 방지 서비스 데이터 정의

> 이 문서는 서비스에서 저장·관리해야 하는 모든 데이터를 정의합니다.
> architecture.md에서 선택한 **PostgreSQL**을 기준으로 작성되었습니다.

---

## 1. ER 다이어그램 (관계 개요)

```
users (사용자)
  │
  │ 1:N
  ▼
profiles (가족 프로필: 아버지, 어머니 등)
  │
  │ 1:N                    1:N
  ├──────────────┐         │
  ▼              ▼         ▼
medications   interaction_logs   ocr_sessions
(약물 리스트)   (충돌 분석 기록)     (촬영·인식 기록)
  │
  │ N:M (interaction_logs.med_ids를 통해 연결)
  ▼
interaction_logs
```

---

## 2. 테이블 상세 정의

### 2-1. `users` — 사용자 계정

서비스에 가입한 사용자 (1차 타겟: 부모님을 돌보는 자녀).

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | UUID | PK, auto-gen | 사용자 고유 ID |
| `email` | VARCHAR(255) | UNIQUE, nullable | 소셜 로그인에서 받아온 이메일 (카카오는 선택 동의라 nullable) |
| `nickname` | VARCHAR(50) | NOT NULL | 표시 이름 (소셜 프로필에서 가져오거나 직접 입력) |
| `auth_provider` | ENUM | NOT NULL | `kakao` / `apple` / `google` |
| `auth_provider_id` | VARCHAR(255) | UNIQUE, NOT NULL | 소셜 로그인 제공자의 고유 사용자 ID |
| `created_at` | TIMESTAMP | NOT NULL, default NOW | 가입일시 |
| `updated_at` | TIMESTAMP | NOT NULL, default NOW | 최종 수정일시 |

**인덱스**: `auth_provider` + `auth_provider_id` (UNIQUE)

---

### 2-2. `profiles` — 가족 프로필

사용자가 관리하는 돌봄 대상자. 한 사용자가 여러 프로필(아버지, 어머니 등)을 가질 수 있다.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | UUID | PK, auto-gen | 프로필 고유 ID |
| `user_id` | UUID | FK → users.id, NOT NULL | 소유자 (자녀) |
| `name` | VARCHAR(20) | NOT NULL | 프로필 이름 (예: "아버지", "어머니", "외할머니") |
| `birth_year` | INTEGER | nullable | 출생 연도 — 노인주의 약물 판단에 활용 |
| `notes` | TEXT | nullable | 메모 (예: "고혈압+당뇨, 내과·비뇨기과 방문") |
| `created_at` | TIMESTAMP | NOT NULL, default NOW | 생성일시 |
| `updated_at` | TIMESTAMP | NOT NULL, default NOW | 최종 수정일시 |

**인덱스**: `user_id` (일반)

**비즈니스 규칙**:
- MVP에서는 사용자당 프로필 최대 5개 제한
- 프로필 삭제 시 하위 medications, interaction_logs 소프트 삭제 처리

---

### 2-3. `medications` — 약물 리스트 (핵심 테이블)

프로필에 등록된 개별 약물. 처방약·OTC·건강기능식품을 구분 없이 하나의 테이블에서 통합 관리한다.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | UUID | PK, auto-gen | 약물 고유 ID |
| `profile_id` | UUID | FK → profiles.id, NOT NULL | 소속 프로필 |
| `name` | VARCHAR(200) | NOT NULL | 약품명 (예: "암로디핀정 5mg", "타이레놀 500") |
| `ingredient` | VARCHAR(500) | NOT NULL | 주성분명 (예: "amlodipine besylate") |
| `dose` | VARCHAR(100) | nullable | 용량·용법 (예: "1일 1회 1정", "500mg") |
| `days` | INTEGER | nullable | 투약일수 (처방약의 경우, 예: 30) |
| `type` | ENUM | NOT NULL | `prescription` (처방약) / `otc` (일반의약품) / `supplement` (건강기능식품) |
| `source` | ENUM | NOT NULL | 데이터 입력 경로: `camera` (사진 촬영) / `manual` (수동 입력) |
| `status` | ENUM | NOT NULL, default 'active' | `active` (현재 복용 중) / `inactive` (복용 중단) |
| `image_url` | VARCHAR(500) | nullable | 원본 촬영 이미지 S3 URL |
| `ocr_session_id` | UUID | FK → ocr_sessions.id, nullable | 이 약물을 추출한 촬영 세션 |
| `registered_at` | TIMESTAMP | NOT NULL, default NOW | 등록일시 |
| `deactivated_at` | TIMESTAMP | nullable | 비활성화(복용 중단) 일시 |

**인덱스**:
- `profile_id` + `status` (복합) — 프로필별 활성 약물 조회 최적화
- `ingredient` (일반) — 성분 기반 중복 검색

**비즈니스 규칙**:
- 신규 등록 시 자동으로 `check-interaction` 분석 트리거
- `inactive` 전환 시 `deactivated_at` 기록, 기존 interaction_logs는 보존
- `ingredient`는 AI Vision 추출값 + DUR DB 매칭을 거쳐 정규화된 성분명 저장

---

### 2-4. `ocr_sessions` — 촬영·인식 기록

사용자가 사진을 촬영할 때마다 생성되는 세션. 한 번의 촬영에서 여러 약물이 추출될 수 있다 (예: 약봉투에 약물 5종 기재).

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | UUID | PK, auto-gen | 세션 고유 ID |
| `profile_id` | UUID | FK → profiles.id, NOT NULL | 대상 프로필 |
| `image_url` | VARCHAR(500) | NOT NULL | 원본 이미지 S3 URL |
| `image_type` | ENUM | NOT NULL | `prescription` (처방전) / `med_bag` (약봉투) / `otc_box` (OTC 박스) / `supplement_label` (건강기능식품 라벨) / `other` |
| `raw_ocr_result` | JSONB | NOT NULL | AI Vision API 원본 응답 (디버깅·개선용) |
| `parsed_meds_count` | INTEGER | NOT NULL, default 0 | 이 세션에서 추출된 약물 수 |
| `confidence_score` | DECIMAL(3,2) | nullable | AI 인식 신뢰도 (0.00~1.00) |
| `status` | ENUM | NOT NULL, default 'pending' | `pending` → `completed` → `confirmed` / `rejected` |
| `created_at` | TIMESTAMP | NOT NULL, default NOW | 촬영일시 |

**인덱스**: `profile_id` + `created_at` (복합, DESC)

**`raw_ocr_result` JSONB 구조 예시**:
```json
{
  "extracted_items": [
    {
      "name": "암로디핀베실산염정 5mg",
      "ingredient": "amlodipine besylate",
      "dose": "1일 1회 1정",
      "days": 30,
      "type": "prescription",
      "confidence": 0.95
    },
    {
      "name": "메트포르민염산염정 500mg",
      "ingredient": "metformin hydrochloride",
      "dose": "1일 2회 1정",
      "days": 30,
      "type": "prescription",
      "confidence": 0.92
    }
  ],
  "source_type": "med_bag",
  "raw_text": "... (전체 OCR 텍스트) ..."
}
```

**비즈니스 규칙**:
- `confirmed` — 사용자가 인식 결과를 확인하고 약물 등록까지 완료
- `rejected` — 사용자가 인식 결과가 부정확하다고 판단하여 취소
- `raw_ocr_result`는 추후 인식 정확도 개선을 위한 학습 데이터로 활용

---

### 2-5. `interaction_logs` — 충돌 분석 기록

약물 등록·변경 시 실행되는 충돌 분석 결과를 저장한다. 프로필의 전체 활성 약물 간 분석 스냅샷.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | UUID | PK, auto-gen | 분석 기록 고유 ID |
| `profile_id` | UUID | FK → profiles.id, NOT NULL | 대상 프로필 |
| `trigger_med_id` | UUID | FK → medications.id, NOT NULL | 이 분석을 트리거한 신규/변경 약물 |
| `analyzed_med_ids` | UUID[] | NOT NULL | 분석에 포함된 전체 활성 약물 ID 배열 |
| `risk_level` | ENUM | NOT NULL | `safe` / `caution` / `contraindicated` |
| `interactions` | JSONB | NOT NULL | 발견된 상호작용 상세 목록 |
| `summary` | TEXT | NOT NULL | 쉬운 언어로 변환된 요약 (LLM 생성) |
| `action_guide` | TEXT | nullable | 행동 가이드 (예: "다음 진료 시 의사에게 이렇게 말씀하세요") |
| `analyzed_at` | TIMESTAMP | NOT NULL, default NOW | 분석 실행 일시 |

**인덱스**:
- `profile_id` + `analyzed_at` (복합, DESC) — 최신 분석 결과 빠른 조회
- `risk_level` (일반) — 위험도별 필터링

**`interactions` JSONB 구조 예시**:
```json
{
  "found_count": 2,
  "details": [
    {
      "type": "contraindication",
      "severity": "contraindicated",
      "med_a": {
        "id": "uuid-1",
        "name": "아스피린정 100mg",
        "ingredient": "aspirin"
      },
      "med_b": {
        "id": "uuid-2",
        "name": "이부프로펜정 200mg",
        "ingredient": "ibuprofen"
      },
      "reason_technical": "NSAIDs 병용 시 GI bleeding risk 증가 및 aspirin의 항혈소판 효과 감소",
      "reason_plain": "아스피린과 이부프로펜을 함께 드시면 위장관 출혈 위험이 증가하고, 아스피린의 효과가 떨어질 수 있어요.",
      "source": "DUR 병용금기"
    },
    {
      "type": "duplicate",
      "severity": "caution",
      "med_a": {
        "id": "uuid-3",
        "name": "콜드에스정",
        "ingredient": "acetaminophen 300mg + ..."
      },
      "med_b": {
        "id": "uuid-4",
        "name": "타이레놀정 500mg",
        "ingredient": "acetaminophen"
      },
      "reason_technical": "Acetaminophen 효능군 중복, 일일 총 용량 초과 위험",
      "reason_plain": "두 약 모두 아세트아미노펜 성분이 들어있어요. 함께 드시면 간에 부담이 될 수 있어요.",
      "source": "성분 중복 검출"
    }
  ]
}
```

**비즈니스 규칙**:
- 약물 등록·삭제·변경 시마다 새 로그 생성 (기존 로그는 히스토리로 보존)
- `risk_level`은 `interactions.details` 중 가장 높은 severity를 따름
- `summary`와 `action_guide`는 Claude API(LLM)가 생성한 쉬운 언어 텍스트

---

## 3. ENUM 정의 모음

| ENUM 이름 | 값 | 사용 테이블 |
|-----------|-----|------------|
| `auth_provider_enum` | `kakao`, `apple`, `google` | users |
| `med_type_enum` | `prescription`, `otc`, `supplement` | medications |
| `med_source_enum` | `camera`, `manual` | medications |
| `med_status_enum` | `active`, `inactive` | medications |
| `image_type_enum` | `prescription`, `med_bag`, `otc_box`, `supplement_label`, `other` | ocr_sessions |
| `ocr_status_enum` | `pending`, `completed`, `confirmed`, `rejected` | ocr_sessions |
| `risk_level_enum` | `safe`, `caution`, `contraindicated` | interaction_logs |
| `interaction_type_enum` | `contraindication`, `duplicate`, `dose_excess` | interaction_logs (JSONB 내부) |

---

## 4. 데이터 흐름 (시나리오별)

### 시나리오 A: 새 약물 사진 촬영·등록

```
1. 사용자가 약봉투 사진 촬영
2. → ocr_sessions 레코드 생성 (status: pending)
3. → AI Vision API 호출 → raw_ocr_result 저장 (status: completed)
4. → 인식 결과를 사용자에게 카드로 표시
5. → 사용자 "맞아요" 탭 → medications에 약물 1~N건 INSERT (status: active)
6. → ocr_sessions status → confirmed
7. → 자동으로 check-interaction 실행
8. → interaction_logs 레코드 생성
9. → 결과(안전/주의/금기)를 사용자에게 표시
```

### 시나리오 B: 약물 복용 중단

```
1. 사용자가 약물 리스트에서 특정 약물 "복용 중단" 탭
2. → medications.status → inactive, deactivated_at 기록
3. → 자동으로 check-interaction 재실행 (남은 활성 약물 대상)
4. → 새 interaction_logs 레코드 생성
5. → 갱신된 결과 표시
```

### 시나리오 C: 프로필 전환 후 약물 조회

```
1. 사용자가 "어머니" 프로필 탭
2. → medications WHERE profile_id = 어머니.id AND status = 'active' 조회
3. → 최신 interaction_logs WHERE profile_id = 어머니.id ORDER BY analyzed_at DESC LIMIT 1
4. → 홈 화면에 약물 리스트 + 충돌 상태 요약 표시
```

---

## 5. 데이터 보존·삭제 정책

| 데이터 | 보존 기간 | 삭제 방식 | 사유 |
|--------|-----------|-----------|------|
| users | 계정 삭제 요청 시 | 하드 삭제 (30일 유예) | 개인정보보호법 준수 |
| profiles | 소유자 계정 삭제 시 함께 삭제 | cascade | 사용자 데이터 일괄 정리 |
| medications | 영구 보존 (inactive 포함) | 계정 삭제 시에만 삭제 | 과거 복용 이력이 충돌 분석에 참고 가치 있음 |
| ocr_sessions | 1년 보존 후 이미지(S3) 삭제, 메타데이터 보존 | S3 lifecycle policy | 스토리지 비용 관리 |
| interaction_logs | 영구 보존 | 계정 삭제 시에만 삭제 | 분석 히스토리가 안전 추적에 필수 |

---

## 6. Redis 캐시 데이터

Redis는 PostgreSQL과 별도로, 빠른 조회가 필요한 임시 데이터를 관리한다.

| 키 패턴 | 데이터 | TTL | 용도 |
|---------|--------|-----|------|
| `session:{userId}` | JWT refresh token 메타 | 7일 | 인증 세션 관리 |
| `profile_meds:{profileId}` | 활성 약물 리스트 JSON | 10분 | 홈 화면 약물 리스트 빠른 로딩 |
| `latest_interaction:{profileId}` | 최신 충돌 분석 결과 | 10분 | 홈 화면 충돌 상태 요약 |
| `dur_ingredient:{ingredientName}` | DUR 성분 기초 정보 | 24시간 | 식약처 API 호출 최소화 |
| `ocr_temp:{sessionId}` | OCR 파싱 중간 결과 | 30분 | 사용자 확인 전 임시 저장 |

---

## 7. 핵심 쿼리 패턴

```sql
-- 프로필별 활성 약물 전체 조회 (홈 화면)
SELECT id, name, ingredient, dose, type, registered_at
FROM medications
WHERE profile_id = :profileId AND status = 'active'
ORDER BY registered_at DESC;

-- 최신 충돌 분석 결과 조회
SELECT risk_level, summary, action_guide, interactions, analyzed_at
FROM interaction_logs
WHERE profile_id = :profileId
ORDER BY analyzed_at DESC
LIMIT 1;

-- 성분 중복 검사 (신규 등록 시)
SELECT id, name, ingredient
FROM medications
WHERE profile_id = :profileId
  AND status = 'active'
  AND ingredient ILIKE :newIngredient;

-- 사용자의 전체 프로필 + 각 프로필별 활성 약물 수 + 최신 위험도
SELECT
  p.id, p.name, p.birth_year,
  COUNT(m.id) AS active_med_count,
  il.risk_level AS latest_risk
FROM profiles p
LEFT JOIN medications m ON m.profile_id = p.id AND m.status = 'active'
LEFT JOIN LATERAL (
  SELECT risk_level FROM interaction_logs
  WHERE profile_id = p.id
  ORDER BY analyzed_at DESC LIMIT 1
) il ON true
WHERE p.user_id = :userId
GROUP BY p.id, p.name, p.birth_year, il.risk_level;
```
