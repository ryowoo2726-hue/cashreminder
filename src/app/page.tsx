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
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";

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

// Colors and gradients for premium theme
const categoryConfig: Record<
  CategoryKey,
  {
    gradientFrom: string;
    gradientTo: string;
    iconBg: string;
    iconColor: string;
    activeClass: string;
    shadowColor: string;
  }
> = {
  entertainment: {
    gradientFrom: "#a855f7", // Purple
    gradientTo: "#ec4899", // Pink
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    activeClass: "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25 border-transparent",
    shadowColor: "rgba(168, 85, 247, 0.25)",
  },
  food: {
    gradientFrom: "#f59e0b", // Amber
    gradientTo: "#f43f5e", // Rose
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    activeClass: "bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-lg shadow-amber-500/25 border-transparent",
    shadowColor: "rgba(245, 158, 11, 0.25)",
  },
  living: {
    gradientFrom: "#0d9488", // Teal
    gradientTo: "#06b6d4", // Cyan
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
    activeClass: "bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25 border-transparent",
    shadowColor: "rgba(13, 148, 136, 0.25)",
  },
};

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("ko-KR", {
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
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-24 relative overflow-hidden">
      <div className="mx-auto max-w-xl px-4 pt-8 sm:pt-14 relative z-10">
        {/* Header Section */}
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo image container */}
            <div className="relative size-12 overflow-hidden rounded-2xl border border-slate-200/50 bg-white shadow-sm flex items-center justify-center p-0.5">
              <Image src="/logo.png" alt="Cash Reminder Logo" width={48} height={48} className="w-full h-full object-cover rounded-xl" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 tracking-wider uppercase mb-0.5">
                <Sparkles className="size-3 text-indigo-500 animate-pulse" />
                <span>Smart Wallet</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent leading-none">
                내 소비 요약
              </h1>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <CalendarDays className="size-3.5" />
                <span>{currentMonth}</span>
              </div>
            </div>
          </div>
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600 ring-1 ring-inset ring-emerald-500/20 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              실시간 동기화
            </span>
          </div>
        </header>

        {/* Total Summary Card */}
        <div className="mb-6 overflow-hidden rounded-3xl dark-glass-card p-6 text-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full filter blur-xl pointer-events-none -mr-8 -mt-8" />
          
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm font-semibold text-slate-400 tracking-wide">이번 달 총 지출액</p>
            <TrendingUp className="size-4.5 text-emerald-400" />
          </div>
          <p className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
            {isLoading ? "..." : currencyFormatter.format(grandTotal)}
          </p>
          
          <div className="mt-5">
            <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-2">
              <span>총 한도 {currencyFormatter.format(totalLimit)}</span>
              <span className="text-emerald-400">
                {totalLimit > 0 ? Math.round((grandTotal / totalLimit) * 100) : 0}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800/80 p-[1px]">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                style={{ width: `${Math.min(totalLimit > 0 ? (grandTotal / totalLimit) * 100 : 0, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Category Gauges in 3-column Grid (At a glance) */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-sm font-extrabold text-slate-700 tracking-wide uppercase">카테고리별 한도 현황</h2>
            <span className="text-[11px] text-slate-400 font-semibold">한눈에 보기</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
            {categories.map((category) => {
              const Icon = categoryIcons[category.key];
              return (
                <BudgetGauge
                  key={category.key}
                  categoryKey={category.key}
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
        <section className="rounded-3xl border border-slate-200/50 bg-white/75 backdrop-blur-md p-5 sm:p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-slate-50 text-slate-700 border border-slate-100">
              <Plus className="size-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">빠른 지출 기록</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Category Selector with dynamic color coding */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 tracking-wide uppercase">카테고리 선택</label>
              <div className="grid grid-cols-3 gap-2.5">
                {categories.map((category) => {
                  const Icon = categoryIcons[category.key];
                  const isSelected = selectedCategory === category.label;
                  const config = categoryConfig[category.key];

                  return (
                    <button
                      key={category.key}
                      type="button"
                      onClick={() => setSelectedCategory(category.label)}
                      className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-3 transition-all duration-300 active:scale-95 ${
                        isSelected
                          ? config.activeClass
                          : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200 hover:bg-slate-100/55"
                      }`}
                      style={{
                        boxShadow: isSelected ? `0 8px 20px -4px ${config.shadowColor}` : "none",
                      }}
                    >
                      <Icon className="size-5" />
                      <span className="text-[11px] font-bold">{category.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount Input with presets */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 tracking-wide uppercase">금액</label>
              <div className="relative">
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50/70 px-5 py-3.5 text-xl font-extrabold focus:bg-white focus:ring-2 focus:ring-slate-900 border-transparent outline-none transition-all"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">원</span>
              </div>
              
              {/* Presets for quick input */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[5000, 10000, 30000, 50000, 100000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setAmount((prev) => {
                        const current = Number(prev) || 0;
                        return String(current + preset);
                      });
                    }}
                    className="rounded-xl border border-slate-200/50 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 active:scale-95 shadow-sm transition-all"
                  >
                    +{preset >= 10000 ? `${preset / 10000}만` : `${preset / 1000}천`}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAmount("")}
                  className="rounded-xl border border-rose-100 bg-rose-50/70 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-100 active:scale-95 shadow-sm transition-all"
                >
                  초기화
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 tracking-wide uppercase">항목</label>
                <input
                  value={item}
                  onChange={(event) => setItem(event.target.value)}
                  placeholder="무엇을 샀나요?"
                  className="w-full rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 tracking-wide uppercase">날짜</label>
                <input
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  type="date"
                  className="w-full rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 tracking-wide uppercase">메모 (선택)</label>
              <input
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                placeholder="추가 내용을 적어주세요"
                className="w-full rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 text-base font-bold text-white shadow-md shadow-emerald-500/10 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none hover-scale cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Save className="size-5" />
              )}
              <span>{isSaving ? "저장 중..." : "지출 기록하기"}</span>
            </button>

            {error && (
              <div className="rounded-xl bg-red-50 p-3.5 text-xs font-bold text-red-600 animate-pulse border border-red-100">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3.5 text-xs font-bold text-emerald-600 border border-emerald-100">
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

// 3-Column Budget circular gauge component
function BudgetGauge({
  categoryKey,
  icon: Icon,
  label,
  total,
  limit,
  isLoading,
}: {
  categoryKey: CategoryKey;
  icon: React.ComponentType<{ className?: string }>;
  label: CategoryLabel;
  total: number;
  limit: number;
  isLoading: boolean;
}) {
  const percent = limit > 0 ? Math.round((total / limit) * 100) : 0;
  const isOver = percent >= 100;
  const config = categoryConfig[categoryKey];

  // Colors and statuses depending on ratio
  const status = useMemo(() => {
    if (percent >= 90) return { text: "text-rose-500", bg: "bg-rose-50/70", label: "위험" };
    if (percent >= 70) return { text: "text-amber-500", bg: "bg-amber-50/70", label: "주의" };
    return { text: "text-emerald-500", bg: "bg-emerald-50/70", label: "안전" };
  }, [percent]);

  // Radius for SVG ring
  const radius = 24;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * radius; // ~150.8
  const strokeDashoffset = circumference - (circumference * Math.min(percent, 100)) / 100;

  return (
    <div
      className={`group relative flex flex-col items-center justify-between rounded-2xl border p-3.5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 bg-white/70 backdrop-blur-md ${
        isOver 
          ? "animate-danger-pulse border-rose-300" 
          : "border-slate-100 hover:border-slate-200"
      }`}
      style={{
        boxShadow: isOver 
          ? '0 0 12px rgba(244, 63, 94, 0.12)' 
          : '0 4px 12px -2px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01)'
      }}
    >
      {/* Percentage label in absolute corner */}
      <span className={`absolute top-2 right-2 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold tracking-tight ${status.bg} ${status.text}`}>
        {percent}%
      </span>

      {/* SVG Ring and Icon */}
      <div className="relative flex items-center justify-center w-14 h-14 mt-1.5 mb-2.5">
        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
          {/* Background circle track */}
          <circle
            cx="28"
            cy="28"
            r={radius}
            className="stroke-slate-100"
            strokeWidth={strokeWidth}
            fill="transparent"
            style={{ cx: '50%', cy: '50%' }}
          />
          {/* Active progress circle */}
          <circle
            cx="28"
            cy="28"
            r={radius}
            stroke={`url(#gradient-${categoryKey})`}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
            style={{ cx: '50%', cy: '50%' }}
          />
          {/* Definitions for Gradients */}
          <defs>
            <linearGradient id={`gradient-${categoryKey}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={config.gradientFrom} />
              <stop offset="100%" stopColor={config.gradientTo} />
            </linearGradient>
          </defs>
        </svg>

        {/* Category Center Icon */}
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${config.iconBg} ${config.iconColor} z-10 shadow-sm`}>
          <Icon className="size-4" />
        </div>
      </div>

      {/* Text Details */}
      <div className="w-full text-center mt-0.5">
        <h3 className="font-bold text-xs text-slate-700 leading-tight">{label}</h3>
        <p className="mt-1 font-extrabold text-sm sm:text-base text-slate-900 leading-none">
          {isLoading ? (
            <span className="inline-block w-8 h-3.5 bg-slate-100 animate-pulse rounded" />
          ) : (
            numberFormatter.format(total)
          )}
          <span className="text-[10px] font-bold text-slate-500 ml-0.5">원</span>
        </p>
        <p className="mt-1 text-[9px] text-slate-400 font-semibold whitespace-nowrap leading-none">
          한도 {limit >= 10000 ? `${numberFormatter.format(limit / 10000)}만` : `${numberFormatter.format(limit)}원`}
        </p>
      </div>
    </div>
  );
}
