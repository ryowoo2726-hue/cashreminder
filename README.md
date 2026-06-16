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

## Scripts

```bash
npm run dev
npm run lint
npm run build
```
