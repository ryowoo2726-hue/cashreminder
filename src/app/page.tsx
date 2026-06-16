"use client";

import {
  CalendarDays,
  CheckCircle2,
  Coffee,
  Gamepad2,
  Loader2,
  Package,
  Plus,
  Save,
  TrendingUp,
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

  const grandTotal = useMemo(() => {
    return Object.values(totals).reduce((sum, value) => sum + value, 0);
  }, [totals]);

  const totalLimit = useMemo(() => {
    return Object.values(limits).reduce((sum, value) => sum + value, 0);
  }, [limits]);

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
      setSuccessMessage("성공적으로 저장되었습니다.");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
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

  const currentMonth = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#1E293B] pb-20">
      <div className="mx-auto max-w-2xl px-4 pt-8 sm:pt-12">
        {/* Header Section */}
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">내 소비 요약</h1>
            <div className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-500">
              <CalendarDays className="size-4" />
              <span>{currentMonth}</span>
            </div>
          </div>
          <div className="hidden sm:block">
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              실시간 동기화 중
            </span>
          </div>
        </header>

        {/* Total Summary Card */}
        <div className="mb-8 overflow-hidden rounded-3xl bg-[#0F172A] p-6 text-white shadow-xl shadow-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">이번 달 총 지출</p>
            <TrendingUp className="size-5 text-emerald-400" />
          </div>
          <p className="mt-2 text-4xl font-bold">
            {isLoading ? "..." : currencyFormatter.format(grandTotal)}
          </p>
          <div className="mt-6">
            <div className="flex justify-between text-xs font-medium text-slate-400 mb-2">
              <span>총 한도 {currencyFormatter.format(totalLimit)}</span>
              <span>{totalLimit > 0 ? Math.round((grandTotal / totalLimit) * 100) : 0}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div 
                className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(totalLimit > 0 ? (grandTotal / totalLimit) * 100 : 0, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Category Gauges */}
        <section className="mb-10 grid gap-4">
          <h2 className="text-lg font-bold">카테고리별 현황</h2>
          <div className="grid grid-cols-1 gap-4">
            {categories.map((category) => {
              const Icon = categoryIcons[category.key];
              return (
                <BudgetGauge
                  key={category.key}
                  icon={Icon}
                  label={category.label}
                  total={totals[category.key]}
                  limit={limits[category.key]}
                  isLoading={isLoading}
                />
              );
            })}
          </div>
        </section>

        {/* Quick Input Form */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Plus className="size-6" />
            </div>
            <h2 className="text-xl font-bold">빠른 지출 기록</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Selector */}
            <div className="grid grid-cols-3 gap-3">
              {categories.map((category) => {
                const Icon = categoryIcons[category.key];
                const isSelected = selectedCategory === category.label;

                return (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => setSelectedCategory(category.label)}
                    className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 py-4 transition-all ${
                      isSelected
                        ? "border-[#0F172A] bg-[#0F172A] text-white shadow-lg"
                        : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
                    }`}
                  >
                    <Icon className="size-6" />
                    <span className="text-xs font-bold">{category.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">금액</label>
              <div className="relative">
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  className="w-full rounded-2xl border-none bg-slate-100 px-6 py-4 text-2xl font-bold focus:ring-2 focus:ring-slate-900 outline-none"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold">원</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">항목</label>
                <input
                  value={item}
                  onChange={(event) => setItem(event.target.value)}
                  placeholder="무엇을 샀나요?"
                  className="w-full rounded-xl border-none bg-slate-100 px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">날짜</label>
                <input
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  type="date"
                  className="w-full rounded-xl border-none bg-slate-100 px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">메모 (선택)</label>
              <input
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                placeholder="추가 내용을 적어주세요"
                className="w-full rounded-xl border-none bg-slate-100 px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-slate-900 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-lg font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-600 active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none"
            >
              {isSaving ? (
                <Loader2 className="size-6 animate-spin" />
              ) : (
                <Save className="size-6" />
              )}
              <span>{isSaving ? "저장 중..." : "지출 기록하기"}</span>
            </button>

            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600 animate-pulse">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="size-4" />
                {successMessage}
              </div>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}

function BudgetGauge({
  icon: Icon,
  label,
  total,
  limit,
  isLoading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: CategoryLabel;
  total: number;
  limit: number;
  isLoading: boolean;
}) {
  const percent = limit > 0 ? Math.round((total / limit) * 100) : 0;
  const isOver = percent >= 100;
  
  const status = useMemo(() => {
    if (percent >= 90) return { color: "bg-red-500", text: "text-red-600", bg: "bg-red-50", label: "위험" };
    if (percent >= 70) return { color: "bg-amber-500", text: "text-amber-600", bg: "bg-amber-50", label: "주의" };
    return { color: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50", label: "안전" };
  }, [percent]);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 transition-all hover:border-slate-200 hover:shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`flex size-10 items-center justify-center rounded-xl ${status.bg} ${status.text}`}>
            <Icon className="size-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{label}</h3>
            <p className="text-xs font-medium text-slate-400">
              한도 {currencyFormatter.format(limit)}
            </p>
          </div>
        </div>
        <div className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${status.bg} ${status.text}`}>
          {status.label}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-bold text-slate-900">
            {isLoading ? "..." : currencyFormatter.format(total)}
          </span>
          <span className={`text-sm font-bold ${status.text}`}>
            {percent}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full ${status.color} transition-all duration-700 ease-out`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      </div>
      
      {isOver && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-red-500 animate-pulse" />
      )}
    </div>
  );
}
