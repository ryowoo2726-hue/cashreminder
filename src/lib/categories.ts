export const categories = [
  {
    key: "entertainment",
    label: "유흥",
    description: "술자리, 취미, 게임, 여가",
    envKey: "LIMIT_ENTERTAINMENT",
  },
  {
    key: "food",
    label: "식비",
    description: "장보기, 배달, 외식, 카페",
    envKey: "LIMIT_FOOD",
  },
  {
    key: "living",
    label: "생활 물품",
    description: "주유, 화장품, 생필품",
    envKey: "LIMIT_LIVING",
  },
] as const;

export type CategoryKey = (typeof categories)[number]["key"];
export type CategoryLabel = (typeof categories)[number]["label"];

export type TotalsByCategory = Record<CategoryKey, number>;

export const emptyTotals: TotalsByCategory = {
  entertainment: 0,
  food: 0,
  living: 0,
};

export function isCategoryLabel(value: unknown): value is CategoryLabel {
  return (
    typeof value === "string" &&
    categories.some((category) => category.label === value)
  );
}

export function getCategoryByLabel(label: CategoryLabel) {
  return categories.find((category) => category.label === label);
}

export function readLimitsFromEnv(): TotalsByCategory {
  return categories.reduce<TotalsByCategory>((limits, category) => {
    const rawValue = process.env[category.envKey];
    const parsedValue = Number(rawValue);

    limits[category.key] =
      Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;

    return limits;
  }, { ...emptyTotals });
}
