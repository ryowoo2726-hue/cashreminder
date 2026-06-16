import {
  Client,
  collectPaginatedAPI,
  isFullDatabase,
  isFullPage,
  type CreatePageParameters,
  type PageObjectResponse,
} from "@notionhq/client";

import {
  emptyTotals,
  getCategoryByLabel,
  isCategoryLabel,
  type CategoryLabel,
  type TotalsByCategory,
} from "@/lib/categories";

const propertyNames = {
  title: "소비 항목",
  amount: "금액",
  date: "날짜",
  category: "카테고리",
  memo: "메모",
} as const;

export type ExpenseInput = {
  item: string;
  amount: number;
  category: CategoryLabel;
  date: string;
  memo: string;
};

export type MonthlyExpenseSummary = {
  totals: TotalsByCategory;
  period: {
    start: string;
    end: string;
  };
};

export function validateExpenseInput(value: unknown): ExpenseInput {
  if (!isRecord(value)) {
    throw new Error("요청 형식이 올바르지 않습니다.");
  }

  const item = normalizeText(value.item);
  const memo = normalizeText(value.memo);
  const amount = Number(value.amount);
  const date = normalizeText(value.date);
  const category = value.category;

  if (!item) {
    throw new Error("소비 항목을 입력해 주세요.");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("금액은 0보다 커야 합니다.");
  }

  if (!isCategoryLabel(category)) {
    throw new Error("카테고리를 선택해 주세요.");
  }

  if (!isDateOnly(date)) {
    throw new Error("날짜 형식이 올바르지 않습니다.");
  }

  return {
    item,
    amount: Math.round(amount),
    category,
    date,
    memo,
  };
}

export async function createExpense(input: ExpenseInput) {
  const notion = createNotionClient();
  const dataSourceId = await resolveDataSourceId(notion);

  const properties: CreatePageParameters["properties"] = {
    [propertyNames.title]: {
      title: [
        {
          text: {
            content: input.item,
          },
        },
      ],
    },
    [propertyNames.amount]: {
      number: input.amount,
    },
    [propertyNames.date]: {
      date: {
        start: input.date,
      },
    },
    [propertyNames.category]: {
      select: {
        name: input.category,
      },
    },
  };

  if (input.memo) {
    properties[propertyNames.memo] = {
      rich_text: [
        {
          text: {
            content: input.memo,
          },
        },
      ],
    };
  }

  return notion.pages.create({
    parent: {
      data_source_id: dataSourceId,
    },
    properties,
  });
}

export async function getMonthlyExpenseSummary(): Promise<MonthlyExpenseSummary> {
  const notion = createNotionClient();
  const dataSourceId = await resolveDataSourceId(notion);
  const period = getCurrentMonthPeriod();
  const pages = await collectPaginatedAPI(notion.dataSources.query, {
    data_source_id: dataSourceId,
    filter: {
      and: [
        {
          property: propertyNames.date,
          date: {
            on_or_after: period.start,
          },
        },
        {
          property: propertyNames.date,
          date: {
            before: period.end,
          },
        },
      ],
    },
    page_size: 100,
  });

  const totals = pages.reduce<TotalsByCategory>((summary, page) => {
    if (!isFullPage(page)) {
      return summary;
    }

    const amount = readNumberProperty(page, propertyNames.amount);
    const categoryLabel = readSelectProperty(page, propertyNames.category);

    if (!amount || !categoryLabel || !isCategoryLabel(categoryLabel)) {
      return summary;
    }

    const category = getCategoryByLabel(categoryLabel);

    if (!category) {
      return summary;
    }

    summary[category.key] += amount;
    return summary;
  }, { ...emptyTotals });

  return {
    totals,
    period,
  };
}

async function resolveDataSourceId(notion: Client) {
  const configuredId = readRequiredEnv("NOTION_DATABASE_ID");

  try {
    const database = await notion.databases.retrieve({
      database_id: configuredId,
    });

    if (isFullDatabase(database)) {
      const firstDataSource = database.data_sources[0];

      if (firstDataSource) {
        return firstDataSource.id;
      }
    }
  } catch {
    return configuredId;
  }

  return configuredId;
}

function createNotionClient() {
  return new Client({
    auth: readRequiredEnv("NOTION_TOKEN"),
  });
}

function readRequiredEnv(key: string) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} 환경 변수가 설정되지 않았습니다.`);
  }

  return value;
}

function getCurrentMonthPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    start: formatDateOnly(start),
    end: formatDateOnly(nextMonth),
  };
}

function formatDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function readNumberProperty(page: PageObjectResponse, propertyName: string) {
  const property = page.properties[propertyName];

  if (property?.type !== "number") {
    return 0;
  }

  return property.number ?? 0;
}

function readSelectProperty(page: PageObjectResponse, propertyName: string) {
  const property = page.properties[propertyName];

  if (property?.type !== "select") {
    return null;
  }

  return property.select?.name ?? null;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);

  return !Number.isNaN(date.getTime()) && formatDateOnly(date) === value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
