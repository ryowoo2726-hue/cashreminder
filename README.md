# Cash Reminder

Notion 연동 개인 가계부 웹 앱입니다. `유흥`, `식비`, `생활 물품` 3개 카테고리의 이번 달 소비 합계를 조회하고, 환경 변수로 설정한 월간 한도 대비 게이지로 보여줍니다.

## Setup

```bash
npm install
copy .env.example .env.local
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

## Environment Variables

`.env.local`에 아래 값을 설정합니다.

```bash
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LIMIT_ENTERTAINMENT=300000
LIMIT_FOOD=500000
LIMIT_LIVING=200000
```

`NOTION_DATABASE_ID`에는 Notion database ID를 넣으면 앱이 첫 번째 data source를 자동으로 찾아 사용합니다. 최신 Notion API의 data source ID를 직접 넣어도 동작하도록 처리되어 있습니다.

## Notion Database Properties

Notion DB에는 아래 속성이 필요합니다.

- `소비 항목`: Title
- `금액`: Number
- `날짜`: Date
- `카테고리`: Select, 값은 `유흥`, `식비`, `생활 물품`
- `메모`: Text 또는 Rich text

## Design Brief for Gemini

이 프로젝트는 Notion DB를 백엔드처럼 사용하는 개인용 가계부 웹 앱입니다. 사용자는 앱을 켜자마자 "이번 달에 카테고리별로 얼마나 썼고, 한도까지 얼마나 남았는지"를 빠르게 판단해야 합니다. 단순 기록 앱이 아니라 소비 통제를 돕는 대시보드형 입력 도구입니다.

### Product Goal

- 월간 소비 상태를 한눈에 보여주는 직관적인 가계부
- 사용자가 모바일에서 빠르게 소비를 입력하고 바로 게이지 변화를 확인하는 경험
- 핵심 감정: 복잡한 회계 앱보다 가볍고, 명확하고, 매일 열어도 부담 없는 돈 관리 도구

### Target User

- 개인 지출을 3개 큰 카테고리로만 관리하고 싶은 사용자
- 모바일 브라우저 또는 홈 화면 바로가기에서 자주 사용할 가능성이 높음
- 세부 분석보다 "이번 달 더 써도 되는지"를 즉시 알고 싶어 함

### Core Categories

카테고리는 고정이며 UI에서도 이 3개를 중심으로 설계해야 합니다.

- `유흥`: 술자리, 취미, 게임, 여가 활동
- `식비`: 장보기, 배달 음식, 외식, 카페
- `생활 물품`: 주유비, 화장품, 휴지/세제 같은 생필품

### Current Screen Structure

현재 첫 화면은 두 영역으로 구성되어 있습니다.

- 상단: 카테고리별 월간 예산 게이지
- 하단: 빠른 소비 입력 폼

게이지는 아래 기준으로 상태를 표현합니다.

- `0% ~ 70%`: 안전
- `70% ~ 90%`: 주의
- `90% 이상`: 위험 또는 초과

### Design Direction

- 모바일 우선으로 디자인합니다.
- 한 손으로 입력하기 쉽도록 버튼과 입력 필드는 충분히 크게 둡니다.
- 카테고리 선택은 텍스트만 나열하기보다 아이콘, 색, 선택 상태가 명확해야 합니다.
- 게이지는 현재 소비액과 한도 대비 위험도를 가장 먼저 인식할 수 있어야 합니다.
- 전체 분위기는 금융 앱처럼 신뢰감이 있어야 하지만, 너무 차갑거나 복잡하지 않아야 합니다.
- 카드 UI는 사용할 수 있지만 과하게 장식적인 랜딩 페이지처럼 만들지 않습니다.
- 사용자가 해야 할 행동은 `카테고리 선택 -> 금액 입력 -> 항목 입력 -> 저장`으로 즉시 보여야 합니다.

### Important Implementation Constraints

- Notion API 연동 로직은 유지해야 합니다.
- API route는 현재 다음 두 개입니다.
  - `GET /api/expenses/monthly`
  - `POST /api/expenses`
- 환경 변수 이름은 바꾸지 않습니다.
  - `NOTION_TOKEN`
  - `NOTION_DATABASE_ID`
  - `LIMIT_ENTERTAINMENT`
  - `LIMIT_FOOD`
  - `LIMIT_LIVING`
- Notion DB 속성명은 한국어 이름 그대로 유지합니다.
  - `소비 항목`
  - `금액`
  - `날짜`
  - `카테고리`
  - `메모`
- 카테고리 라벨도 `유흥`, `식비`, `생활 물품` 그대로 유지합니다.

### Files Most Relevant for Design Work

- `src/app/page.tsx`: 메인 화면 UI와 클라이언트 상태 처리
- `src/app/globals.css`: 전역 스타일
- `src/lib/categories.ts`: 카테고리 라벨, 설명, 한도 env key

디자인 변경 시 주로 `src/app/page.tsx`와 `src/app/globals.css`를 수정하면 됩니다. Notion 저장/조회 로직은 `src/lib/notion.ts`와 `src/app/api/**/route.ts`에 있으므로, 디자인 작업에서는 특별한 이유가 없으면 건드리지 않는 것이 좋습니다.

## Scripts

```bash
npm run dev
npm run lint
npm run build
```
