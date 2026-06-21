# Gemini Design Handoff

이 문서는 Cash Reminder의 기능/데이터 흐름을 유지한 채 프론트엔드 디자인을 수정하기 위한 안내서입니다. Gemini는 주로 `src/app/page.tsx`와 `src/app/globals.css`의 시각 표현을 다루고, API/Notion 연동 로직은 특별한 이유가 없으면 변경하지 않는 것을 권장합니다.

## Product Summary

Cash Reminder는 Notion DB를 백엔드처럼 사용하는 개인용 지출 관리 웹앱입니다.

핵심 목표는 사용자가 모바일에서 빠르게 지출을 입력하고, 이번 달 카테고리별 예산 대비 소비 상태를 즉시 확인하는 것입니다.

주요 사용자 행동:

- 이번 달 총 지출 확인
- 카테고리별 지출/남은 금액 확인
- 지출 빠른 입력
- 최근 소비 내역 확인 및 삭제
- 고정 지출 체크
- 카테고리별 예산 한도 수정
- 다크 모드 사용

## Fixed Domain Model

카테고리는 고정입니다. 라벨을 바꾸면 Notion select 값과 API 검증이 깨질 수 있습니다.

- `유흥`: `entertainment`
- `식비`: `food`
- `생활 물품`: `living`

Notion DB 속성명도 고정입니다.

- `소비 항목`: Title
- `금액`: Number
- `날짜`: Date
- `카테고리`: Select
- `메모`: Rich text

## Data Sources

### Notion 저장 데이터

실제 소비 내역은 Notion에 저장됩니다.

관련 API:

- `GET /api/expenses/monthly`
- `POST /api/expenses`
- `DELETE /api/expenses/[id]`

### Local Storage 저장 데이터

브라우저별 개인 설정은 Local Storage에 저장됩니다.

- `cashreminder.limits`: 사용자가 화면에서 편집한 카테고리별 예산 한도
- `cashreminder.darkMode`: 다크 모드 여부
- `cashreminder.fixedExpenses`: 고정 지출 체크리스트

주의: Local Storage 데이터는 기기/브라우저마다 다릅니다. 이 기능을 Notion과 동기화하는 디자인을 암시하면 실제 기능과 다르게 보일 수 있습니다.

## API Contracts

### GET `/api/expenses/monthly`

월간 대시보드에 필요한 데이터를 반환합니다.

```ts
type MonthlyResponse = {
  totals: {
    entertainment: number;
    food: number;
    living: number;
  };
  limits: {
    entertainment: number;
    food: number;
    living: number;
  };
  transactions: ExpenseRecord[];
  todayTotal: number;
  previousPeriodTotal: number;
  period: {
    start: string;
    end: string;
  };
  previousPeriod: {
    start: string;
    end: string;
  };
};
```

### POST `/api/expenses`

소비 내역을 Notion에 저장합니다.

요청:

```ts
type ExpensePayload = {
  item: string;
  amount: number;
  category: "유흥" | "식비" | "생활 물품";
  date: string; // YYYY-MM-DD
  memo: string;
};
```

응답:

```ts
type CreateExpenseResponse = {
  expense: ExpenseRecord;
};
```

### DELETE `/api/expenses/[id]`

Notion 페이지를 휴지통 처리합니다. UI에서는 삭제 성공 후 로컬 목록과 합계에서 즉시 제거합니다.

응답:

```ts
type DeleteExpenseResponse = {
  ok: true;
};
```

## Important UI Sections

현재 주요 UI는 `src/app/page.tsx` 안에 기능별 컴포넌트로 나뉘어 있습니다.

- `Home`: 전체 상태와 API 호출 관리
- `BudgetGauge`: 카테고리별 원형 게이지, 사용액, 한도, 남은 금액 표시
- `FixedExpenseSection`: 고정 지출 추가/삭제/체크
- `TransactionRow`: 최근 소비 내역 카드
- `TransactionSkeleton`: 소비 내역 로딩 스켈레톤
- `LimitEditor`: 예산 편집 모달
- `CategoryDetailPopup`: 카테고리 게이지 클릭 시 건별 소비 목록 팝업
- `BottomNavButton`: 모바일 하단 내비게이션
- `TextInput`: 공통 텍스트 입력

디자인 수정은 이 컴포넌트들의 JSX className과 레이아웃을 중심으로 진행하면 됩니다.

## State Flow To Preserve

디자인 변경 시 아래 흐름은 유지해야 합니다.

### 초기 로딩

1. `GET /api/expenses/monthly` 호출
2. `totals`, `limits`, `transactions`, `todayTotal`, `previousPeriodTotal` 세팅
3. Local Storage에 저장된 예산 한도가 있으면 API 한도보다 우선 적용

### 소비 저장

1. 입력 폼 제출
2. `POST /api/expenses`
3. 응답의 `expense`를 최근 내역 맨 위에 추가
4. 해당 카테고리 `totals`를 즉시 증가
5. 오늘 날짜 지출이면 `todayTotal`도 증가

### 소비 삭제

1. 삭제 버튼 클릭
2. `DELETE /api/expenses/[id]`
3. 성공하면 최근 내역에서 제거
4. 해당 카테고리 `totals`를 즉시 감소
5. 오늘 날짜 지출이면 `todayTotal`도 감소

### 고정 지출

1. `FixedExpenseSection`에서 Local Storage 기반으로 추가
2. 체크박스는 이번 달 납부 여부만 토글
3. 고정 지출은 실제 Notion 소비 내역에 자동 반영되지 않음

## Safe Design Areas

마음껏 바꿔도 비교적 안전한 영역:

- 카드 레이아웃
- 색상, 그림자, border radius
- 간격, 폰트 크기, 반응형 grid
- 버튼/입력 필드 스타일
- 모달 배치와 애니메이션
- 스켈레톤 모양
- 다크 모드 색상
- `src/app/globals.css`의 애니메이션/유틸리티 클래스

## Risky Areas

가능하면 바꾸지 말아야 하는 영역:

- API 경로 문자열
  - `/api/expenses/monthly`
  - `/api/expenses`
  - `/api/expenses/${transaction.id}`
- 카테고리 한국어 라벨
  - `유흥`
  - `식비`
  - `생활 물품`
- Local Storage key
  - `cashreminder.limits`
  - `cashreminder.darkMode`
  - `cashreminder.fixedExpenses`
- `ExpensePayload`, `ExpenseRecord`, `MonthlyResponse`의 필수 필드
- `handleSubmit`, `handleDeleteExpense`, `handleSaveLimits`, `handleAddFixedExpense`, `handleToggleFixedExpense`의 핵심 동작
- Notion 관련 파일
  - `src/lib/notion.ts`
  - `src/app/api/**/route.ts`

## Mobile Design Requirements

이 앱은 모바일 우선입니다.

- 금액 입력은 한 손으로 누르기 쉬워야 합니다.
- 카테고리 3개는 항상 즉시 보이는 것이 좋습니다.
- 최근 내역과 고정 지출 체크는 2번 탭/내역 영역에서 찾기 쉬워야 합니다.
- 하단 내비게이션과 FAB는 모바일 조작성을 위한 핵심 요소입니다.
- 확대 방지는 `src/app/layout.tsx`의 viewport 설정으로 처리되어 있습니다.

## Icon And PWA Notes

로고 파일은 `public/logo.png`입니다.

사용 위치:

- 앱 헤더 로고
- favicon
- iPhone Safari 홈 화면 웹앱 아이콘
- `public/site.webmanifest`

로고를 교체할 때는 같은 경로인 `public/logo.png`를 유지하면 코드 변경이 적습니다.

## Suggested Design Direction

기능이 많아졌기 때문에 디자인은 화려함보다 정보 우선순위가 중요합니다.

추천 우선순위:

1. 총 지출 카드: 이번 달 상태를 가장 먼저 보여주기
2. 카테고리 게이지: 사용액, 한도, 남은 금액을 빠르게 스캔 가능하게 만들기
3. 입력 폼: 카테고리 선택, 금액, 항목, 저장 버튼을 명확하게 유지
4. 고정 지출: 체크리스트처럼 단순하고 반복 사용하기 쉽게 만들기
5. 최근 내역: 삭제 버튼이 실수로 눌리지 않도록 충분한 터치 영역과 시각적 경고 제공

## Acceptance Checklist

디자인 수정 후 아래를 확인하세요.

- `npm run lint` 통과
- `npm run build` 통과
- 월간 데이터가 로드되는가
- 새 소비 저장 후 최근 내역과 게이지가 즉시 갱신되는가
- 삭제 후 최근 내역과 게이지에서 사라지는가
- 고정 지출 추가/체크/삭제가 새로고침 후에도 유지되는가
- 카테고리 게이지 클릭 시 팝업이 열리는가
- iPhone Safari 홈 화면 추가 시 `logo.png` 아이콘이 보이는가
- 모바일에서 화면 확대가 되지 않는가
