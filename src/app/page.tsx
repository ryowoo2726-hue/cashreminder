"use client";

import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Coffee,
  Gamepad2,
  Loader2,
  Package,
  Save,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  categories,
  emptyTotals,
  type CategoryKey,
  type CategoryLabel,
  type TotalsByCategory,
} from "@/lib/categories";

type MonthlyResponse = {
  totals: TotalsByCategory;
  limits: TotalsByCategory;
  period: {
    start: string;
    end: string;
  };
};

type ExpensePayload = {
  item: string;
  amount: number;
  category: CategoryLabel;
  date: string;
  memo: string;
};

const categoryIcons: Record<CategoryKey, React.ComponentType<{ className?: string }>> = {
  entertainment: Gamepad2,
  food: Coffee,
  living: Package,
};

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

function todayDateOnly() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function Home() {
  const [totals, setTotals] = useState<TotalsByCategory>(emptyTotals);
  const [limits, setLimits] = useState<TotalsByCategory>(emptyTotals);
  const [selectedCategory, setSelectedCategory] = useState<CategoryLabel>("식비");
  const [amount, setAmount] = useState("");
  const [item, setItem] = useState("");
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState(todayDateOnly);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedCategoryKey = useMemo(() => {
    return (
      categories.find((category) => category.label === selectedCategory)?.key ??
      "food"
    );
  }, [selectedCategory]);

  useEffect(() => {
    let isMounted = true;

    async function loadMonthlySummary() {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch("/api/expenses/monthly", {
          cache: "no-store",
        });
        const data = (await response.json()) as Partial<MonthlyResponse> & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "월간 소비 조회에 실패했습니다.");
        }

        if (!data.totals || !data.limits) {
          throw new Error("월간 소비 응답 형식이 올바르지 않습니다.");
        }

        if (isMounted) {
          setTotals(data.totals);
          setLimits(data.limits);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "월간 소비 조회에 실패했습니다.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMonthlySummary();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (!selectedCategory) {
      setError("카테고리를 선택해 주세요.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("금액은 0보다 크게 입력해 주세요.");
      return;
    }

    if (!item.trim()) {
      setError("소비 항목을 입력해 주세요.");
      return;
    }

    const payload: ExpensePayload = {
      item: item.trim(),
      amount: Math.round(numericAmount),
      category: selectedCategory,
      date,
      memo: memo.trim(),
    };

    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "소비 내역 저장에 실패했습니다.");
      }

      setTotals((currentTotals) => ({
        ...currentTotals,
        [selectedCategoryKey]:
          currentTotals[selectedCategoryKey] + payload.amount,
      }));
      setAmount("");
      setItem("");
      setMemo("");
      setDate(todayDateOnly());
      setSuccessMessage("저장되었습니다.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "소비 내역 저장에 실패했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-[#17201a]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 py-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#526158]">Cash Reminder</p>
            <h1 className="text-3xl font-bold tracking-normal text-[#17201a]">
              이번 달 소비 한도
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-[#526158]">
            <CalendarDays className="size-4" />
            <span>{date.slice(0, 7)}</span>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          {categories.map((category) => {
            const Icon = categoryIcons[category.key];

            return (
              <BudgetGauge
                key={category.key}
                icon={Icon}
                label={category.label}
                description={category.description}
                total={totals[category.key]}
                limit={limits[category.key]}
                isLoading={isLoading}
              />
            );
          })}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-start">
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-[#d7ddd3] bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="mb-4 flex items-center gap-2">
              <CircleDollarSign className="size-5 text-[#21605a]" />
              <h2 className="text-lg font-bold">소비 입력</h2>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {categories.map((category) => {
                const Icon = categoryIcons[category.key];
                const isSelected = selectedCategory === category.label;

                return (
                  <button
                    key={category.key}
                    type="button"
                    title={category.description}
                    onClick={() => setSelectedCategory(category.label)}
                    className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border px-2 text-center text-sm font-bold transition ${
                      isSelected
                        ? "border-[#21605a] bg-[#e8f4ef] text-[#17433f]"
                        : "border-[#d7ddd3] bg-white text-[#445049] hover:border-[#91aaa1]"
                    }`}
                  >
                    <Icon className="size-6" />
                    <span className="leading-tight">{category.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-semibold text-[#445049]">
                금액
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="35000"
                  className="h-14 rounded-lg border border-[#cfd7cc] bg-white px-4 text-lg font-bold text-[#17201a] outline-none transition focus:border-[#21605a] focus:ring-4 focus:ring-[#d7ece5]"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-semibold text-[#445049]">
                날짜
                <input
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  type="date"
                  className="h-14 rounded-lg border border-[#cfd7cc] bg-white px-4 text-base font-semibold text-[#17201a] outline-none transition focus:border-[#21605a] focus:ring-4 focus:ring-[#d7ece5]"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-semibold text-[#445049]">
                소비 항목
                <input
                  value={item}
                  onChange={(event) => setItem(event.target.value)}
                  placeholder="저녁 삼겹살"
                  className="h-12 rounded-lg border border-[#cfd7cc] bg-white px-4 text-base text-[#17201a] outline-none transition focus:border-[#21605a] focus:ring-4 focus:ring-[#d7ece5]"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-semibold text-[#445049]">
                메모
                <input
                  value={memo}
                  onChange={(event) => setMemo(event.target.value)}
                  placeholder="선택 입력"
                  className="h-12 rounded-lg border border-[#cfd7cc] bg-white px-4 text-base text-[#17201a] outline-none transition focus:border-[#21605a] focus:ring-4 focus:ring-[#d7ece5]"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-[#21605a] px-5 text-base font-bold text-white transition hover:bg-[#174d48] disabled:cursor-not-allowed disabled:bg-[#91aaa1]"
            >
              {isSaving ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Save className="size-5" />
              )}
              <span>{isSaving ? "저장 중" : "저장"}</span>
            </button>

            {error ? (
              <p className="mt-4 rounded-lg border border-[#e9b3a9] bg-[#fff1ef] px-3 py-2 text-sm font-semibold text-[#9b2f20]">
                {error}
              </p>
            ) : null}

            {successMessage ? (
              <p className="mt-4 flex items-center gap-2 rounded-lg border border-[#bad8bd] bg-[#eef8ef] px-3 py-2 text-sm font-semibold text-[#246231]">
                <CheckCircle2 className="size-4" />
                {successMessage}
              </p>
            ) : null}
          </form>

          <aside className="rounded-lg border border-[#d7ddd3] bg-[#17201a] p-4 text-white shadow-sm">
            <p className="text-sm font-semibold text-[#abc2b6]">월간 합계</p>
            <p className="mt-2 text-3xl font-bold">
              {currencyFormatter.format(
                Object.values(totals).reduce((sum, value) => sum + value, 0),
              )}
            </p>
            <div className="mt-5 space-y-3">
              {categories.map((category) => (
                <div
                  key={category.key}
                  className="flex items-center justify-between border-t border-white/10 pt-3 text-sm"
                >
                  <span className="text-[#d8e4dc]">{category.label}</span>
                  <span className="font-bold">
                    {currencyFormatter.format(totals[category.key])}
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function BudgetGauge({
  icon: Icon,
  label,
  description,
  total,
  limit,
  isLoading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: CategoryLabel;
  description: string;
  total: number;
  limit: number;
  isLoading: boolean;
}) {
  const percent = limit > 0 ? Math.round((total / limit) * 100) : 0;
  const displayPercent = Math.min(percent, 100);
  const state =
    percent >= 90 ? "danger" : percent >= 70 ? "warning" : "safe";
  const barColor = {
    safe: "bg-[#2f8a64]",
    warning: "bg-[#d5a72f]",
    danger: "bg-[#c43d31]",
  }[state];

  return (
    <article className="rounded-lg border border-[#d7ddd3] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Icon className="size-5 text-[#21605a]" />
            <h2 className="text-lg font-bold">{label}</h2>
          </div>
          <p className="mt-1 text-sm font-medium text-[#66736b]">
            {description}
          </p>
        </div>
        <span className="rounded-md bg-[#f0f3ee] px-2 py-1 text-sm font-bold text-[#445049]">
          {limit > 0 ? `${percent}%` : "한도 없음"}
        </span>
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-2xl font-bold">
            {isLoading ? "-" : currencyFormatter.format(total)}
          </p>
          <p className="text-sm font-semibold text-[#66736b]">
            / {currencyFormatter.format(limit)}
          </p>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#e6ebe2]">
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-500 ease-out`}
            style={{ width: `${displayPercent}%` }}
          />
        </div>
      </div>
    </article>
  );
}
