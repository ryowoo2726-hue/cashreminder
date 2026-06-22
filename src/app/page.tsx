"use client";

import Image from "next/image";
import {
  CalendarDays,
  CheckCircle2,
  Coffee,
  Gamepad2,
  Home as HomeIcon,
  ListTodo,
  Loader2,
  Moon,
  Package,
  Plus,
  ReceiptText,
  Save,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  categories,
  emptyTotals,
  type CategoryKey,
  type CategoryLabel,
  type TotalsByCategory,
} from "@/lib/categories";

type ExpenseRecord = {
  id: string;
  item: string;
  amount: number;
  category: CategoryLabel;
  date: string;
  memo: string;
};

type MonthlyResponse = {
  totals: TotalsByCategory;
  limits: TotalsByCategory;
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

type ExpensePayload = {
  item: string;
  amount: number;
  category: CategoryLabel;
  date: string;
  memo: string;
};

type FixedExpense = {
  id: string;
  title: string;
  amount: number;
  category: CategoryLabel;
  dueDay: number;
  paidMonth: string;
};

const categoryIcons: Record<
  CategoryKey,
  React.ComponentType<{ className?: string }>
> = {
  entertainment: Gamepad2,
  food: Coffee,
  living: Package,
};

const categoryConfig: Record<
  CategoryKey,
  {
    gradientFrom: string;
    gradientTo: string;
    iconBg: string;
    iconColor: string;
    activeClass: string;
    buttonClass: string;
    focusClass: string;
    borderClass: string;
    shadowColor: string;
  }
> = {
  entertainment: {
    gradientFrom: "#a855f7",
    gradientTo: "#ec4899",
    iconBg: "bg-purple-50 dark:bg-purple-950/50",
    iconColor: "text-purple-600 dark:text-purple-300",
    activeClass:
      "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25 border-transparent",
    buttonClass:
      "from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-purple-500/15",
    focusClass: "focus:ring-purple-500",
    borderClass: "border-purple-200 dark:border-purple-800",
    shadowColor: "rgba(168, 85, 247, 0.25)",
  },
  food: {
    gradientFrom: "#f59e0b",
    gradientTo: "#f43f5e",
    iconBg: "bg-amber-50 dark:bg-amber-950/50",
    iconColor: "text-amber-600 dark:text-amber-300",
    activeClass:
      "bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-lg shadow-amber-500/25 border-transparent",
    buttonClass:
      "from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 shadow-amber-500/15",
    focusClass: "focus:ring-amber-500",
    borderClass: "border-amber-200 dark:border-amber-800",
    shadowColor: "rgba(245, 158, 11, 0.25)",
  },
  living: {
    gradientFrom: "#0d9488",
    gradientTo: "#06b6d4",
    iconBg: "bg-teal-50 dark:bg-teal-950/50",
    iconColor: "text-teal-600 dark:text-teal-300",
    activeClass:
      "bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25 border-transparent",
    buttonClass:
      "from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 shadow-teal-500/15",
    focusClass: "focus:ring-teal-500",
    borderClass: "border-teal-200 dark:border-teal-800",
    shadowColor: "rgba(13, 148, 136, 0.25)",
  },
};

const storageKeys = {
  limits: "cashreminder.limits",
  darkMode: "cashreminder.darkMode",
  fixedExpenses: "cashreminder.fixedExpenses",
} as const;

const fixedExpenseBudget = 1300000;

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

function getCategoryKeyByLabel(label: CategoryLabel): CategoryKey {
  return categories.find((category) => category.label === label)?.key ?? "food";
}

function getCurrentMonthKey() {
  const date = new Date();
  const cycleStart =
    date.getDate() >= 17
      ? new Date(date.getFullYear(), date.getMonth(), 17)
      : new Date(date.getFullYear(), date.getMonth() - 1, 17);
  const year = cycleStart.getFullYear();
  const month = String(cycleStart.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-17`;
}

function readStoredFixedExpenses() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(storageKeys.fixedExpenses);
    if (!storedValue) {
      return [];
    }

    const parsedValue = JSON.parse(storedValue);
    return Array.isArray(parsedValue) ? (parsedValue as FixedExpense[]) : [];
  } catch {
    return [];
  }
}

function formatKoreanDate(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export default function Home() {
  const [totals, setTotals] = useState<TotalsByCategory>(emptyTotals);
  const [limits, setLimits] = useState<TotalsByCategory>(emptyTotals);
  const [draftLimits, setDraftLimits] =
    useState<TotalsByCategory>(emptyTotals);
  const [transactions, setTransactions] = useState<ExpenseRecord[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>(
    readStoredFixedExpenses,
  );
  const [fixedTitle, setFixedTitle] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [fixedCategory, setFixedCategory] = useState<CategoryLabel>("생활 물품");
  const [fixedDueDay, setFixedDueDay] = useState("1");
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryLabel>("식비");
  const [selectedDetailCategory, setSelectedDetailCategory] =
    useState<CategoryKey | null>(null);
  const [amount, setAmount] = useState("");
  const [item, setItem] = useState("");
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState(todayDateOnly);
  const [todayTotal, setTodayTotal] = useState(0);
  const [previousPeriodTotal, setPreviousPeriodTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [isLimitEditorOpen, setIsLimitEditorOpen] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [newTransactionId, setNewTransactionId] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(storageKeys.darkMode) === "true";
  });
  const [activeSection, setActiveSection] = useState<
    "dashboard" | "fixed" | "transactions" | "form"
  >("dashboard");

  const dashboardRef = useRef<HTMLDivElement>(null);
  const fixedExpensesRef = useRef<HTMLElement>(null);
  const transactionsRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLElement>(null);

  const selectedCategoryKey = useMemo(
    () => getCategoryKeyByLabel(selectedCategory),
    [selectedCategory],
  );
  const selectedTheme = categoryConfig[selectedCategoryKey];

  const grandTotal = useMemo(() => {
    return Object.values(totals).reduce((sum, value) => sum + value, 0);
  }, [totals]);

  const totalLimit = useMemo(() => {
    return Object.values(limits).reduce((sum, value) => sum + value, 0);
  }, [limits]);

  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);

  const paidFixedExpenseTotal = useMemo(() => {
    return fixedExpenses.reduce((sum, expense) => {
      return expense.paidMonth === currentMonthKey ? sum + expense.amount : sum;
    }, 0);
  }, [currentMonthKey, fixedExpenses]);

  const fixedExpenseRemaining = fixedExpenseBudget - paidFixedExpenseTotal;

  const recentTransactions = useMemo(() => transactions.slice(0, 20), [transactions]);

  const transactionsByDate = useMemo(() => {
    return recentTransactions.reduce<Record<string, ExpenseRecord[]>>(
      (groups, transaction) => {
        const dateKey = transaction.date || "날짜 없음";
        groups[dateKey] = [...(groups[dateKey] ?? []), transaction];
        return groups;
      },
      {},
    );
  }, [recentTransactions]);

  const detailTransactions = useMemo(() => {
    if (!selectedDetailCategory) {
      return [];
    }

    return transactions.filter(
      (transaction) =>
        getCategoryKeyByLabel(transaction.category) === selectedDetailCategory,
    );
  }, [selectedDetailCategory, transactions]);

  const insight = useMemo(() => {
    if (previousPeriodTotal <= 0 && grandTotal <= 0) {
      return "이번 달 소비를 기록하면 절약 흐름을 바로 보여드릴게요.";
    }

    if (previousPeriodTotal <= 0) {
      return `오늘은 ${currencyFormatter.format(todayTotal)}를 사용했어요. 이번 달 기준선을 만들어가는 중입니다.`;
    }

    const diff = previousPeriodTotal - grandTotal;
    const percent = Math.round((Math.abs(diff) / previousPeriodTotal) * 100);

    if (diff > 0) {
      return `지난달 이맘때보다 ${percent}% 덜 소비하고 있어요. 좋은 흐름입니다.`;
    }

    if (diff < 0) {
      return `지난달 이맘때보다 ${percent}% 더 소비 중이에요. 오늘은 속도를 조금 낮춰도 좋아요.`;
    }

    return "지난달 같은 기간과 거의 같은 속도로 소비 중입니다.";
  }, [grandTotal, previousPeriodTotal, todayTotal]);

  const comparePercent = useMemo(() => {
    if (previousPeriodTotal <= 0) return 0;
    const diff = previousPeriodTotal - grandTotal;
    return Math.round((Math.abs(diff) / previousPeriodTotal) * 100);
  }, [grandTotal, previousPeriodTotal]);

  const compareStatus = useMemo(() => {
    if (previousPeriodTotal <= 0) return null;
    const diff = previousPeriodTotal - grandTotal;
    if (diff > 0) {
      return { label: `지난달 대비 ${comparePercent}% 절약 중`, type: "save" };
    } else if (diff < 0) {
      return { label: `지난달 대비 ${comparePercent}% 초과 소비 중`, type: "over" };
    }
    return { label: "지난달과 동일한 속도", type: "equal" };
  }, [grandTotal, previousPeriodTotal, comparePercent]);

  useEffect(() => {
    window.localStorage.setItem(storageKeys.darkMode, String(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    window.localStorage.setItem(
      storageKeys.fixedExpenses,
      JSON.stringify(fixedExpenses),
    );
  }, [fixedExpenses]);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -60% 0px",
      threshold: 0.1,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (entry.target === dashboardRef.current) {
            setActiveSection("dashboard");
          } else if (entry.target === fixedExpensesRef.current) {
            setActiveSection("fixed");
          } else if (entry.target === transactionsRef.current) {
            setActiveSection("transactions");
          } else if (entry.target === formRef.current) {
            setActiveSection("form");
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    const dashEl = dashboardRef.current;
    const fixedEl = fixedExpensesRef.current;
    const transEl = transactionsRef.current;
    const formEl = formRef.current;

    if (dashEl) observer.observe(dashEl);
    if (fixedEl) observer.observe(fixedEl);
    if (transEl) observer.observe(transEl);
    if (formEl) observer.observe(formEl);

    return () => {
      if (dashEl) observer.unobserve(dashEl);
      if (fixedEl) observer.unobserve(fixedEl);
      if (transEl) observer.unobserve(transEl);
      if (formEl) observer.unobserve(formEl);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    let isMountedFetch = true;

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

        if (!data.totals || !data.limits || !data.transactions) {
          throw new Error("월간 소비 응답 형식이 올바르지 않습니다.");
        }

        const storedLimits = window.localStorage.getItem(storageKeys.limits);
        const resolvedLimits = storedLimits
          ? ({ ...data.limits, ...JSON.parse(storedLimits) } as TotalsByCategory)
          : data.limits;

        if (isMountedFetch) {
          setTotals(data.totals);
          setLimits(resolvedLimits);
          setDraftLimits(resolvedLimits);
          setTransactions(data.transactions);
          setTodayTotal(data.todayTotal ?? 0);
          setPreviousPeriodTotal(data.previousPeriodTotal ?? 0);
        }
      } catch (caughtError) {
        if (isMountedFetch) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "월간 소비 조회에 실패했습니다.",
          );
        }
      } finally {
        if (isMountedFetch) {
          setIsLoading(false);
        }
      }
    }

    loadMonthlySummary();

    return () => {
      isMountedFetch = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericAmount = Number(amount);

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
      const data = (await response.json()) as {
        expense?: ExpenseRecord;
        error?: string;
      };

      if (!response.ok || !data.expense) {
        throw new Error(data.error ?? "소비 내역 저장에 실패했습니다.");
      }

      setTotals((currentTotals) => ({
        ...currentTotals,
        [selectedCategoryKey]:
          currentTotals[selectedCategoryKey] + payload.amount,
      }));
      setTransactions((currentTransactions) => [
        data.expense!,
        ...currentTransactions,
      ]);
      setTodayTotal((currentTotal) =>
        payload.date === todayDateOnly()
          ? currentTotal + payload.amount
          : currentTotal,
      );
      setNewTransactionId(data.expense.id);
      setAmount("");
      setItem("");
      setMemo("");
      setDate(todayDateOnly());
      setSuccessMessage("성공적으로 저장되었습니다.");

      setTimeout(() => setSuccessMessage(""), 3000);
      setTimeout(() => setNewTransactionId(""), 1200);
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

  async function handleDeleteExpense(transaction: ExpenseRecord) {
    setDeletingId(transaction.id);
    setError("");

    try {
      const response = await fetch(`/api/expenses/${transaction.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "소비 내역 삭제에 실패했습니다.");
      }

      const categoryKey = getCategoryKeyByLabel(transaction.category);
      setTransactions((currentTransactions) =>
        currentTransactions.filter((item) => item.id !== transaction.id),
      );
      setTotals((currentTotals) => ({
        ...currentTotals,
        [categoryKey]: Math.max(
          currentTotals[categoryKey] - transaction.amount,
          0,
        ),
      }));
      setTodayTotal((currentTotal) =>
        transaction.date === todayDateOnly()
          ? Math.max(currentTotal - transaction.amount, 0)
          : currentTotal,
      );
      setSuccessMessage("삭제되었습니다.");
      setTimeout(() => setSuccessMessage(""), 2500);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "소비 내역 삭제에 실패했습니다.",
      );
    } finally {
      setDeletingId("");
    }
  }

  function handleSaveLimits() {
    setLimits(draftLimits);
    window.localStorage.setItem(storageKeys.limits, JSON.stringify(draftLimits));
    setIsLimitEditorOpen(false);
    setSuccessMessage("예산 한도가 저장되었습니다.");
    setTimeout(() => setSuccessMessage(""), 2500);
  }

  function handleAddFixedExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedAmount = Number(fixedAmount);
    const parsedDueDay = Number(fixedDueDay);

    if (!fixedTitle.trim()) {
      setError("고정 지출 이름을 입력해 주세요.");
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("고정 지출 금액은 0보다 크게 입력해 주세요.");
      return;
    }

    const newFixedExpense: FixedExpense = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}`,
      title: fixedTitle.trim(),
      amount: Math.round(parsedAmount),
      category: fixedCategory,
      dueDay: Math.min(Math.max(Math.round(parsedDueDay || 1), 1), 31),
      paidMonth: "",
    };

    setFixedExpenses((currentExpenses) => [
      newFixedExpense,
      ...currentExpenses,
    ]);
    setFixedTitle("");
    setFixedAmount("");
    setFixedDueDay("1");
    setError("");
    setSuccessMessage("고정 지출이 추가되었습니다.");
    setTimeout(() => setSuccessMessage(""), 2500);
  }

  function handleToggleFixedExpense(expenseId: string) {
    setFixedExpenses((currentExpenses) =>
      currentExpenses.map((expense) =>
        expense.id === expenseId
          ? {
              ...expense,
              paidMonth:
                expense.paidMonth === currentMonthKey ? "" : currentMonthKey,
            }
          : expense,
      ),
    );
  }

  function handleDeleteFixedExpense(expenseId: string) {
    setFixedExpenses((currentExpenses) =>
      currentExpenses.filter((expense) => expense.id !== expenseId),
    );
  }

  function scrollToSection(
    target: "dashboard" | "fixed" | "transactions" | "form",
  ) {
    const ref =
      target === "dashboard"
        ? dashboardRef
        : target === "fixed"
          ? fixedExpensesRef
        : target === "transactions"
          ? transactionsRef
          : formRef;

    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const currentMonth = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });
  const cycleStartLabel = currentMonthKey.replaceAll("-", ".");

  return (
    <main
      className={`min-h-screen pb-28 transition-colors duration-300 bg-grid-pattern ${
        isDarkMode
          ? "dark bg-slate-950 text-slate-100"
          : "bg-[#F8FAFC] text-[#0F172A]"
      }`}
    >
      <div className="relative z-10 mx-auto max-w-xl px-4 pt-8 sm:pt-14">
        <div ref={dashboardRef} className="space-y-6 mb-6">
          <header className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border p-0.5 shadow-sm ${
                  isDarkMode
                    ? "border-slate-700 bg-slate-900"
                    : "border-slate-200/50 bg-white"
                }`}
              >
              <Image
                src="/logo.png"
                alt="Cash Reminder Logo"
                width={48}
                height={48}
                className="h-full w-full rounded-xl object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="mb-0.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-500">
                <Sparkles className="size-3 animate-pulse" />
                <span>Smart Wallet</span>
              </div>
              <h1
                className={`truncate text-xl font-extrabold leading-none tracking-tight sm:text-2xl ${
                  isDarkMode ? "text-white" : "text-slate-950"
                }`}
              >
                내 소비 요약
              </h1>
              <div
                className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                <CalendarDays className="size-3.5" />
                <span>{currentMonth}</span>
                <span>· {cycleStartLabel} 시작</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsDarkMode((current) => !current)}
            className={`flex size-10 shrink-0 items-center justify-center rounded-2xl border shadow-sm transition ${
              isDarkMode
                ? "border-slate-700 bg-slate-900 text-amber-300 animate-none"
                : "border-slate-200 bg-white text-slate-700"
            }`}
            title="다크 모드 전환"
          >
            {isDarkMode ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </button>
        </header>

        <section className={`relative overflow-hidden rounded-3xl p-6 text-white shadow-2xl transition-all duration-300 border ${
          grandTotal > totalLimit
            ? "bg-gradient-to-br from-slate-900 via-rose-950/70 to-slate-950 border-rose-500/30 shadow-rose-500/5 animate-danger-pulse"
            : "bg-gradient-to-br from-slate-900 via-indigo-950/80 to-slate-950 border-indigo-900/30 shadow-indigo-500/10"
        }`}>
          <div className="dashboard-aura" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                이번 달 총 지출액
              </span>
              {compareStatus && (
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${
                  compareStatus.type === "save"
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                    : compareStatus.type === "over"
                    ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                    : "bg-slate-500/10 text-slate-300 border-slate-500/20"
                }`}>
                  {compareStatus.label}
                </span>
              )}
            </div>
            
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-black tracking-tight sm:text-4xl">
                {isLoading ? "..." : currencyFormatter.format(grandTotal)}
              </p>
              
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">
                  남은 예산
                </span>
                <span className={`text-sm font-extrabold ${grandTotal > totalLimit ? "text-rose-400" : "text-emerald-400"}`}>
                  {isLoading ? "..." : currencyFormatter.format(totalLimit - grandTotal)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-[11px] font-bold text-slate-400">
                <span>총 예산 {currencyFormatter.format(totalLimit)}</span>
                <span>
                  {totalLimit > 0 ? Math.round((grandTotal / totalLimit) * 100) : 0}%
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800/80 p-[2px]">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    grandTotal > totalLimit
                      ? "bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_12px_rgba(244,63,94,0.5)]"
                      : (totalLimit > 0 ? (grandTotal / totalLimit) * 100 : 0) >= 80
                      ? "bg-gradient-to-r from-amber-500 to-rose-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                      : "bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                  }`}
                  style={{
                    width: `${Math.min(
                      totalLimit > 0 ? (grandTotal / totalLimit) * 100 : 0,
                      100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <section
          className={`rounded-3xl border p-4.5 shadow-sm transition-all duration-300 ${
            isDarkMode
              ? "border-slate-800/80 bg-slate-900/40 backdrop-blur-md"
              : "border-indigo-50/50 bg-white/60 backdrop-blur-md"
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${
              grandTotal <= previousPeriodTotal || previousPeriodTotal === 0
                ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300"
                : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300"
            }`}>
              {grandTotal <= previousPeriodTotal || previousPeriodTotal === 0 ? (
                <TrendingDown className="size-5" />
              ) : (
                <TrendingUp className="size-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-[10px] font-extrabold uppercase tracking-wider ${
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Smart Insight
              </p>
              <p className="mt-1 text-sm font-extrabold leading-relaxed text-slate-800 dark:text-slate-100">{insight}</p>
              <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-2 text-[11px] font-semibold">
                <span className={isDarkMode ? "text-slate-500" : "text-slate-400"}>
                  오늘 지출
                </span>
                <span className={`font-extrabold ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                  {currencyFormatter.format(todayTotal)}
                </span>
              </div>
            </div>
          </div>
        </section>


        <section className="mb-6">
          <div className="mb-3.5 flex items-center justify-between">
            <h2
              className={`text-sm font-extrabold uppercase tracking-wide ${
                isDarkMode ? "text-slate-300" : "text-slate-700"
              }`}
            >
              카테고리별 한도 현황
            </h2>
            <button
              type="button"
              onClick={() => {
                setDraftLimits(limits);
                setIsLimitEditorOpen(true);
              }}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                isDarkMode
                  ? "bg-slate-900 text-slate-300"
                  : "bg-white text-slate-500"
              }`}
            >
              <Settings className="size-3" />
              예산 설정
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
            {categories.map((category) => {
              const Icon = categoryIcons[category.key];
              return (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => setSelectedDetailCategory(category.key)}
                  className="text-left"
                >
                  <BudgetGauge
                    categoryKey={category.key}
                    icon={Icon}
                    label={category.label}
                    total={totals[category.key]}
                    limit={limits[category.key]}
                    isLoading={isLoading}
                    isDarkMode={isDarkMode}
                  />
                </button>
              );
            })}
          </div>
        </section>
        </div>

        <section
          ref={formRef}
          className={`rounded-3xl border p-5 shadow-xl backdrop-blur-md transition-all duration-500 sm:p-6 ${
            isDarkMode
              ? `bg-slate-900/40 ${selectedTheme.borderClass}`
              : `bg-white/70 ${selectedTheme.borderClass}`
          }`}
          style={{
            boxShadow: isDarkMode 
              ? `0 15px 35px -10px rgba(0, 0, 0, 0.4), 0 0 24px -6px ${selectedTheme.shadowColor}`
              : `0 15px 35px -10px rgba(99, 102, 241, 0.05), 0 0 24px -6px ${selectedTheme.shadowColor}`
          }}
        >
          <div className="mb-5 flex items-center gap-2.5">
            <div
              className={`flex size-9 items-center justify-center rounded-xl transition-all duration-300 ${selectedTheme.iconBg} ${selectedTheme.iconColor}`}
            >
              <Plus className="size-5" />
            </div>
            <h2 className="text-base font-extrabold tracking-tight">빠른 지출 기록</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                카테고리 선택
              </label>
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
                      className={`group flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-3 transition-all duration-300 active:scale-95 cursor-pointer ${
                        isSelected
                          ? config.activeClass
                          : isDarkMode
                            ? "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700/80 hover:text-slate-200"
                            : "border-slate-200/50 bg-slate-50 text-slate-500 hover:border-indigo-100 hover:text-slate-800"
                      }`}
                      style={{
                        boxShadow: isSelected
                          ? `0 8px 20px -4px ${config.shadowColor}`
                          : "none",
                      }}
                    >
                      <Icon className={`size-5 transition-transform duration-300 group-hover:scale-110`} />
                      <span className="text-[11px] font-bold">
                        {category.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                금액
              </label>
              <div className="relative">
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  className={`w-full rounded-2xl border px-5 py-3.5 text-2xl font-black outline-none transition-all focus:ring-2 ${
                    selectedTheme.focusClass
                  } ${
                    isDarkMode
                      ? "border-slate-800 bg-slate-950/80 text-white focus:bg-slate-950"
                      : "border-slate-200 bg-slate-50 text-slate-950 focus:bg-white"
                  }`}
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  원
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {[5000, 10000, 30000, 50000, 100000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setAmount((previousAmount) => {
                        const current = Number(previousAmount) || 0;
                        return String(current + preset);
                      });
                    }}
                    className={`rounded-xl border px-3 py-1.5 text-[11px] font-bold shadow-sm transition-all active:scale-95 cursor-pointer ${
                      isDarkMode
                        ? "border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-300"
                        : "border-slate-200/60 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-600"
                    }`}
                  >
                    +{preset >= 10000 ? `${preset / 10000}만` : `${preset / 1000}천`}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAmount("")}
                  className="rounded-xl border border-rose-100 dark:border-rose-950 bg-rose-50/70 dark:bg-rose-950/20 px-3 py-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 shadow-sm transition-all active:scale-95 cursor-pointer hover:bg-rose-100/60 dark:hover:bg-rose-950/40"
                >
                  초기화
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput
                label="항목"
                value={item}
                placeholder="무엇을 샀나요?"
                onChange={setItem}
                focusClass={selectedTheme.focusClass}
                isDarkMode={isDarkMode}
              />
              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  날짜
                </span>
                <input
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  type="date"
                  className={`w-full rounded-xl border px-4 py-2.5 text-xs font-bold outline-none transition-all focus:ring-2 ${
                    selectedTheme.focusClass
                  } ${
                    isDarkMode
                      ? "border-slate-800 bg-slate-950/80 text-white focus:bg-slate-950"
                      : "border-slate-200 bg-slate-50 text-slate-700 focus:bg-white"
                  }`}
                />
              </label>
            </div>

            <TextInput
              label="메모 (선택)"
              value={memo}
              placeholder="추가 내용을 적어주세요"
              onChange={setMemo}
              focusClass={selectedTheme.focusClass}
              isDarkMode={isDarkMode}
            />

            <button
              type="submit"
              disabled={isSaving}
              className={`hover-scale flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r py-3.5 text-base font-extrabold text-white shadow-lg transition-all active:scale-[0.98] disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:shadow-none ${selectedTheme.buttonClass}`}
            >
              {isSaving ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Save className="size-5" />
              )}
              <span>{isSaving ? "저장 중..." : "지출 기록하기"}</span>
            </button>

            {error && (
              <div className="rounded-xl border border-rose-100 dark:border-rose-950 bg-rose-50/70 dark:bg-rose-950/20 p-3.5 text-xs font-bold text-rose-600 dark:text-rose-400 delete-confirm-badge">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-100 dark:border-emerald-950 bg-emerald-50/70 dark:bg-emerald-950/20 p-3.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 delete-confirm-badge">
                <CheckCircle2 className="size-4" />
                {successMessage}
              </div>
            )}
          </form>
        </section>

        <section ref={fixedExpensesRef} className="mt-6">
          <FixedExpenseSection
            fixedExpenses={fixedExpenses}
            fixedTitle={fixedTitle}
            fixedAmount={fixedAmount}
            fixedCategory={fixedCategory}
            fixedDueDay={fixedDueDay}
            currentMonthKey={currentMonthKey}
            paidFixedExpenseTotal={paidFixedExpenseTotal}
            fixedExpenseBudget={fixedExpenseBudget}
            fixedExpenseRemaining={fixedExpenseRemaining}
            isDarkMode={isDarkMode}
            onAdd={handleAddFixedExpense}
            onTitleChange={setFixedTitle}
            onAmountChange={setFixedAmount}
            onCategoryChange={setFixedCategory}
            onDueDayChange={setFixedDueDay}
            onToggle={handleToggleFixedExpense}
            onDelete={handleDeleteFixedExpense}
          />
        </section>

        <section ref={transactionsRef} className="mt-6">
          <div className="mb-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ReceiptText className="size-4 text-indigo-500" />
              <h2 className="text-sm font-extrabold uppercase tracking-wide">
                최근 소비 내역
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              최근 {recentTransactions.length}건
            </span>
          </div>

          {isLoading ? (
            <TransactionSkeleton isDarkMode={isDarkMode} />
          ) : transactions.length === 0 ? (
            <div
              className={`rounded-3xl border p-6 text-center text-sm font-bold ${
                isDarkMode
                  ? "border-slate-800 bg-slate-900 text-slate-400"
                  : "border-slate-100 bg-white text-slate-500"
              }`}
            >
              아직 기록된 소비가 없습니다.
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(transactionsByDate).map(([dateKey, items]) => (
                <div key={dateKey}>
                  <p className="mb-2 text-xs font-extrabold text-slate-400">
                    {formatKoreanDate(dateKey)}
                  </p>
                  <div className="space-y-2">
                    {items.slice(0, 20).map((transaction) => (
                      <TransactionRow
                        key={transaction.id}
                        transaction={transaction}
                        isDarkMode={isDarkMode}
                        isNew={transaction.id === newTransactionId}
                        isDeleting={transaction.id === deletingId}
                        onDelete={handleDeleteExpense}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <button
        type="button"
        onClick={() => scrollToSection("form")}
        className="fixed bottom-10 left-1/2 z-30 flex size-14 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-2xl shadow-indigo-500/30 sm:hidden"
        title="지출 입력"
      >
        <Plus className="size-6" />
      </button>

      <nav
        className={`fixed inset-x-0 bottom-0 z-20 border-t px-5 py-2 backdrop-blur-xl sm:hidden ${
          isDarkMode
            ? "border-slate-800 bg-slate-950/90"
            : "border-slate-200 bg-white/90"
        }`}
      >
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <BottomNavButton
            icon={HomeIcon}
            label="대시보드"
            isActive={activeSection === "dashboard"}
            onClick={() => scrollToSection("dashboard")}
          />
          <BottomNavButton
            icon={WalletCards}
            label="고정"
            isActive={activeSection === "fixed"}
            onClick={() => scrollToSection("fixed")}
          />
          <div className="w-14" />
          <BottomNavButton
            icon={ListTodo}
            label="내역"
            isActive={activeSection === "transactions"}
            onClick={() => scrollToSection("transactions")}
          />
          <BottomNavButton
            icon={SlidersHorizontal}
            label="입력"
            isActive={activeSection === "form"}
            onClick={() => scrollToSection("form")}
          />
        </div>
      </nav>

      {isLimitEditorOpen && (
        <LimitEditor
          draftLimits={draftLimits}
          totals={totals}
          onChange={setDraftLimits}
          onSave={handleSaveLimits}
          onClose={() => setIsLimitEditorOpen(false)}
          isDarkMode={isDarkMode}
        />
      )}

      {selectedDetailCategory && (
        <CategoryDetailPopup
          categoryKey={selectedDetailCategory}
          transactions={detailTransactions}
          total={totals[selectedDetailCategory]}
          limit={limits[selectedDetailCategory]}
          onDelete={handleDeleteExpense}
          onClose={() => setSelectedDetailCategory(null)}
          deletingId={deletingId}
          isDarkMode={isDarkMode}
        />
      )}
    </main>
  );
}

function TextInput({
  label,
  value,
  placeholder,
  onChange,
  focusClass,
  isDarkMode,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  focusClass: string;
  isDarkMode: boolean;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-transparent px-4 py-2.5 text-xs font-bold outline-none transition-all focus:ring-2 ${focusClass} ${
          isDarkMode
            ? "bg-slate-950/70 text-white placeholder:text-slate-600"
            : "bg-slate-50/70 text-slate-700 focus:bg-white"
        }`}
      />
    </label>
  );
}

function BudgetGauge({
  categoryKey,
  icon: Icon,
  label,
  total,
  limit,
  isLoading,
  isDarkMode,
}: {
  categoryKey: CategoryKey;
  icon: React.ComponentType<{ className?: string }>;
  label: CategoryLabel;
  total: number;
  limit: number;
  isLoading: boolean;
  isDarkMode: boolean;
}) {
  const percent = limit > 0 ? Math.round((total / limit) * 100) : 0;
  const isOver = percent >= 100;
  const remaining = limit - total;
  const config = categoryConfig[categoryKey];

  const status = useMemo(() => {
    if (percent >= 90) {
      return { 
        text: "text-rose-600 dark:text-rose-400", 
        bg: "bg-rose-500/10 border-rose-500/20", 
        label: "위험",
        dotColor: "bg-rose-500 status-pulse-orange" 
      };
    }
    if (percent >= 70) {
      return { 
        text: "text-amber-600 dark:text-amber-400", 
        bg: "bg-amber-500/10 border-amber-500/20", 
        label: "주의",
        dotColor: "bg-amber-500" 
      };
    }
    return { 
      text: "text-emerald-600 dark:text-emerald-400", 
      bg: "bg-emerald-500/10 border-emerald-500/20", 
      label: "안전",
      dotColor: "bg-emerald-500" 
    };
  }, [percent]);

  const remainingFormatted = useMemo(() => {
    const absVal = Math.abs(remaining);
    const text = absVal >= 10000 
      ? `${numberFormatter.format(Math.round(absVal / 10000))}만` 
      : `${numberFormatter.format(absVal)}`;
    return text + "원";
  }, [remaining]);

  const radius = 24;
  const strokeWidth = 4.5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (circumference * Math.min(percent, 100)) / 100;

  return (
    <div
      className={`group relative flex min-h-40 flex-col items-center justify-between rounded-2xl border p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
        isOver
          ? "animate-danger-pulse border-rose-400 bg-rose-500/5"
          : isDarkMode
            ? "border-slate-800 bg-slate-900/60 hover:border-slate-700/80 hover:shadow-indigo-500/5 backdrop-blur-md"
            : "border-slate-100 bg-white/70 hover:border-indigo-100/80 hover:shadow-indigo-500/5 backdrop-blur-md"
      }`}
    >
      <span
        className={`absolute right-2 top-2 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold tracking-tight border ${status.bg} ${status.text}`}
      >
        {percent >= 70 && <span className={`size-1.5 rounded-full ${status.dotColor}`} />}
        {percent}%
      </span>

      <div className="relative mb-2.5 mt-2.5 flex size-14 items-center justify-center">
        <svg className="absolute inset-0 h-full w-full -rotate-90">
          <circle
            cx="28"
            cy="28"
            r={radius}
            className={isDarkMode ? "stroke-slate-800" : "stroke-slate-100"}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
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
          />
          <defs>
            <linearGradient
              id={`gradient-${categoryKey}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor={config.gradientFrom} />
              <stop offset="100%" stopColor={config.gradientTo} />
            </linearGradient>
          </defs>
        </svg>

        <div
          className={`z-10 flex size-8 items-center justify-center rounded-full ${config.iconBg} ${config.iconColor} shadow-sm transition-transform duration-300 group-hover:scale-110`}
        >
          <Icon className="size-4" />
        </div>
      </div>

      <div className="mt-0.5 w-full text-center">
        <h3
          className={`text-xs font-bold leading-tight ${
            isDarkMode ? "text-slate-300" : "text-slate-600"
          }`}
        >
          {label}
        </h3>
        <p
          className={`mt-1 text-sm font-black leading-none sm:text-base ${
            isDarkMode ? "text-white" : "text-slate-900"
          }`}
        >
          {isLoading ? (
            <span className="inline-block h-3.5 w-8 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          ) : (
            numberFormatter.format(total)
          )}
          <span className="ml-0.5 text-[9px] font-bold text-slate-500">
            원
          </span>
        </p>
        <p className="mt-1 whitespace-nowrap text-[9px] font-semibold leading-none text-slate-400">
          한도{" "}
          {limit >= 10000
            ? `${numberFormatter.format(limit / 10000)}만`
            : `${numberFormatter.format(limit)}원`}
        </p>
        <p
          className={`mt-1.5 whitespace-nowrap text-[10px] font-extrabold leading-none ${
            remaining >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
          }`}
        >
          {remaining >= 0 ? "남음 " : "초과 "}
          {remainingFormatted}
        </p>
      </div>
    </div>
  );
}

function FixedExpenseSection({
  fixedExpenses,
  fixedTitle,
  fixedAmount,
  fixedCategory,
  fixedDueDay,
  currentMonthKey,
  paidFixedExpenseTotal,
  fixedExpenseBudget,
  fixedExpenseRemaining,
  isDarkMode,
  onAdd,
  onTitleChange,
  onAmountChange,
  onCategoryChange,
  onDueDayChange,
  onToggle,
  onDelete,
}: {
  fixedExpenses: FixedExpense[];
  fixedTitle: string;
  fixedAmount: string;
  fixedCategory: CategoryLabel;
  fixedDueDay: string;
  currentMonthKey: string;
  paidFixedExpenseTotal: number;
  fixedExpenseBudget: number;
  fixedExpenseRemaining: number;
  isDarkMode: boolean;
  onAdd: (event: FormEvent<HTMLFormElement>) => void;
  onTitleChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onCategoryChange: (value: CategoryLabel) => void;
  onDueDayChange: (value: string) => void;
  onToggle: (expenseId: string) => void;
  onDelete: (expenseId: string) => void;
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fixedBudgetPercent =
    fixedExpenseBudget > 0
      ? Math.round((paidFixedExpenseTotal / fixedExpenseBudget) * 100)
      : 0;
  const fixedBudgetWidth = Math.min(fixedBudgetPercent, 100);

  useEffect(() => {
    if (!confirmDeleteId) return;
    const timer = setTimeout(() => {
      setConfirmDeleteId(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [confirmDeleteId]);

  return (
    <section
      className={`mb-6 rounded-3xl border p-5 shadow-sm transition-all duration-300 ${
        isDarkMode
          ? "border-slate-800 bg-slate-900/60 backdrop-blur-md"
          : "border-slate-100 bg-white/70 backdrop-blur-md"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <WalletCards className="size-4 text-indigo-500" />
            <h2 className="text-sm font-extrabold uppercase tracking-wide">
              고정 지출 관리
            </h2>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            17일 기준 주기 · 예산 {currencyFormatter.format(fixedExpenseBudget)}
          </p>
        </div>
        <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
          {fixedExpenses.length}개
        </span>
      </div>

      <div
        className={`mb-4 rounded-2xl border p-3 ${
          isDarkMode
            ? "border-slate-800 bg-slate-950/70"
            : "border-slate-200/50 bg-slate-50/80"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              이번 주기 체크 완료
            </p>
            <p className="mt-1 text-lg font-black">
              {currencyFormatter.format(paidFixedExpenseTotal)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              남은 고정 예산
            </p>
            <p
              className={`mt-1 text-lg font-black ${
                fixedExpenseRemaining >= 0 ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {fixedExpenseRemaining >= 0 ? "" : "-"}
              {currencyFormatter.format(Math.abs(fixedExpenseRemaining))}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[10px] font-bold text-slate-400">
            <span>고정 지출 예산 사용률</span>
            <span>{fixedBudgetPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                fixedBudgetPercent >= 100
                  ? "bg-gradient-to-r from-rose-500 to-red-500"
                  : fixedBudgetPercent >= 80
                    ? "bg-gradient-to-r from-amber-500 to-rose-500"
                    : "bg-gradient-to-r from-indigo-500 to-cyan-500"
              }`}
              style={{ width: `${fixedBudgetWidth}%` }}
            />
          </div>
        </div>
      </div>

      <form onSubmit={onAdd} className="grid gap-2">
        <div className="grid grid-cols-[1fr_96px] gap-2">
          <input
            value={fixedTitle}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="예: 넷플릭스, 보험료"
            className={`rounded-xl border px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
              isDarkMode
                ? "border-slate-800 bg-slate-950 text-white focus:bg-slate-900 focus:border-transparent"
                : "border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-transparent"
            }`}
          />
          <input
            value={fixedAmount}
            onChange={(event) => onAmountChange(event.target.value)}
            inputMode="numeric"
            placeholder="금액"
            className={`rounded-xl border px-3 py-2.5 text-right text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
              isDarkMode
                ? "border-slate-800 bg-slate-950 text-white focus:bg-slate-900 focus:border-transparent"
                : "border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-transparent"
            }`}
          />
        </div>
        <div className="grid grid-cols-[1fr_76px_72px] gap-2">
          <select
            value={fixedCategory}
            onChange={(event) =>
              onCategoryChange(event.target.value as CategoryLabel)
            }
            className={`rounded-xl border px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
              isDarkMode
                ? "border-slate-800 bg-slate-950 text-white focus:bg-slate-900 focus:border-transparent"
                : "border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-transparent"
            }`}
          >
            {categories.map((category) => (
              <option key={category.key} value={category.label}>
                {category.label}
              </option>
            ))}
          </select>
          <input
            value={fixedDueDay}
            onChange={(event) => onDueDayChange(event.target.value)}
            inputMode="numeric"
            placeholder="일"
            className={`rounded-xl border px-3 py-2.5 text-center text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
              isDarkMode
                ? "border-slate-800 bg-slate-950 text-white focus:bg-slate-900 focus:border-transparent"
                : "border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-transparent"
            }`}
          />
          <button
            type="submit"
            className="rounded-xl bg-indigo-500 hover:bg-indigo-600 text-xs font-extrabold text-white transition-all active:scale-95 cursor-pointer"
          >
            추가
          </button>
        </div>
      </form>

      <div className="mt-4 space-y-2">
        {fixedExpenses.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-4 text-center text-xs font-bold text-slate-400">
            매달 나가는 항목을 추가해두면 2번 탭에서 바로 체크할 수 있어요.
          </p>
        ) : (
          fixedExpenses.map((expense) => {
            const categoryKey = getCategoryKeyByLabel(expense.category);
            const Icon = categoryIcons[categoryKey];
            const config = categoryConfig[categoryKey];
            const isPaid = expense.paidMonth === currentMonthKey;
            const isDeletingConfirmed = confirmDeleteId === expense.id;

            return (
              <div
                key={expense.id}
                className={`flex items-center gap-3 rounded-2xl border p-3 transition-all duration-300 ${
                  isPaid ? "opacity-60" : "opacity-100"
                } ${
                  isDarkMode
                    ? "border-slate-800 bg-slate-950/70"
                    : "border-slate-200/40 bg-slate-50/70"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isPaid}
                  onChange={() => onToggle(expense.id)}
                  className="custom-checkbox shrink-0"
                  title="이번 달 납부 체크"
                />
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${config.iconBg} ${config.iconColor}`}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`truncate text-sm font-extrabold transition-all duration-300 ${
                        isPaid ? "text-slate-400 dark:text-slate-500 line-through" : ""
                      }`}
                    >
                      {expense.title}
                    </p>
                    <p className={`shrink-0 text-xs font-extrabold transition-all duration-300 ${
                      isPaid ? "text-slate-400 dark:text-slate-500" : ""
                    }`}>
                      {currencyFormatter.format(expense.amount)}
                    </p>
                  </div>
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                    매월 {expense.dueDay}일 · {expense.category}
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    if (isDeletingConfirmed) {
                      onDelete(expense.id);
                      setConfirmDeleteId(null);
                    } else {
                      setConfirmDeleteId(expense.id);
                    }
                  }}
                  className={`flex shrink-0 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer ${
                    isDeletingConfirmed
                      ? "px-2.5 py-1 text-[11px] font-bold bg-rose-500 text-white hover:bg-rose-600 animate-pulse delete-confirm-badge"
                      : "size-8 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-500"
                  }`}
                  title={isDeletingConfirmed ? "정말 삭제할까요?" : "고정 지출 삭제"}
                >
                  {isDeletingConfirmed ? "삭제" : <Trash2 className="size-4" />}
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function TransactionRow({
  transaction,
  isDarkMode,
  isNew,
  isDeleting,
  onDelete,
}: {
  transaction: ExpenseRecord;
  isDarkMode: boolean;
  isNew: boolean;
  isDeleting: boolean;
  onDelete: (transaction: ExpenseRecord) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const categoryKey = getCategoryKeyByLabel(transaction.category);
  const Icon = categoryIcons[categoryKey];
  const config = categoryConfig[categoryKey];

  useEffect(() => {
    if (!confirmDelete) return;
    const timer = setTimeout(() => {
      setConfirmDelete(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [confirmDelete]);

  return (
    <div
      className={`transaction-card flex items-center gap-3 rounded-2xl border p-3.5 shadow-sm transition-all duration-300 ${
        isNew ? "transaction-card-new" : ""
      } ${
        isDarkMode
          ? "border-slate-800 bg-slate-900/80 hover:bg-slate-900"
          : "border-slate-100 bg-white hover:bg-slate-50"
      }`}
    >
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${config.iconBg} ${config.iconColor}`}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-extrabold">{transaction.item}</p>
          <p className="shrink-0 text-sm font-extrabold text-slate-800 dark:text-slate-100">
            {currencyFormatter.format(transaction.amount)}
          </p>
        </div>
        <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">
          {transaction.category}
          {transaction.memo ? ` · ${transaction.memo}` : ""}
        </p>
      </div>
      
      <button
        type="button"
        onClick={() => {
          if (confirmDelete) {
            onDelete(transaction);
            setConfirmDelete(false);
          } else {
            setConfirmDelete(true);
          }
        }}
        disabled={isDeleting}
        className={`flex shrink-0 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 ${
          confirmDelete
            ? "px-2.5 py-1 text-[11px] font-bold bg-rose-500 text-white hover:bg-rose-600 animate-pulse delete-confirm-badge"
            : "size-9 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-500"
        }`}
        title={confirmDelete ? "정말 삭제할까요?" : "삭제"}
      >
        {isDeleting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : confirmDelete ? (
          "삭제"
        ) : (
          <Trash2 className="size-4" />
        )}
      </button>
    </div>
  );
}

function TransactionSkeleton({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className={`rounded-2xl border p-3 ${
            isDarkMode
              ? "border-slate-800 bg-slate-900"
              : "border-slate-100 bg-white"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl shimmer-bg" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-2/3 rounded shimmer-bg" />
              <div className="h-2.5 w-1/2 rounded shimmer-bg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LimitEditor({
  draftLimits,
  totals,
  onChange,
  onSave,
  onClose,
  isDarkMode,
}: {
  draftLimits: TotalsByCategory;
  totals: TotalsByCategory;
  onChange: (limits: TotalsByCategory) => void;
  onSave: () => void;
  onClose: () => void;
  isDarkMode: boolean;
}) {
  return (
    <div className="modal-overlay fixed inset-0 z-40 flex items-end bg-slate-950/60 p-4 backdrop-blur-md sm:items-center sm:justify-center">
      <div
        className={`modal-content w-full max-w-md rounded-3xl border p-6 shadow-2xl transition-all duration-300 ${
          isDarkMode
            ? "border-slate-800/80 bg-slate-950/95 text-white"
            : "border-slate-200/60 bg-white/95 text-slate-950"
        }`}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">
              Budget Editor
            </p>
            <h2 className="text-xl font-extrabold">카테고리별 예산 설정</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`flex size-9 items-center justify-center rounded-xl transition cursor-pointer ${
              isDarkMode 
                ? "bg-slate-900 hover:bg-slate-800 text-slate-400" 
                : "bg-slate-100 hover:bg-slate-200 text-slate-500"
            }`}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-5">
          {categories.map((category) => {
            const Icon = categoryIcons[category.key];
            const config = categoryConfig[category.key];
            const currentSpent = totals[category.key];
            const draftVal = draftLimits[category.key];
            const isExceeded = currentSpent > draftVal;

            return (
              <div key={category.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex size-8 items-center justify-center rounded-xl ${config.iconBg} ${config.iconColor}`}
                    >
                      <Icon className="size-4" />
                    </div>
                    <span className="text-sm font-extrabold">
                      {category.label}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      value={draftVal}
                      onChange={(event) =>
                        onChange({
                          ...draftLimits,
                          [category.key]: Math.max(Number(event.target.value), 0),
                        })
                      }
                      inputMode="numeric"
                      className={`w-28 rounded-xl px-3 py-2 text-right text-xs font-black outline-none focus:ring-2 ${config.focusClass} border border-transparent ${
                        isDarkMode ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-950"
                      }`}
                    />
                  </div>
                </div>
                
                <input
                  type="range"
                  min={0}
                  max={1000000}
                  step={10000}
                  value={draftVal}
                  onChange={(event) =>
                    onChange({
                      ...draftLimits,
                      [category.key]: Number(event.target.value),
                    })
                  }
                  className="w-full accent-indigo-500"
                />

                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>지출: {currencyFormatter.format(currentSpent)}</span>
                  {isExceeded ? (
                    <span className="text-rose-500 font-extrabold animate-pulse">예산 초과 지출 중!</span>
                  ) : (
                    <span className="text-emerald-500 font-extrabold">남음: {currencyFormatter.format(draftVal - currentSpent)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onSave}
          className="mt-6 flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-500/20 hover:scale-[0.99] active:scale-[0.98] transition cursor-pointer"
        >
          예산 저장
        </button>
      </div>
    </div>
  );
}

function CategoryDetailPopup({
  categoryKey,
  transactions,
  total,
  limit,
  onDelete,
  onClose,
  deletingId,
  isDarkMode,
}: {
  categoryKey: CategoryKey;
  transactions: ExpenseRecord[];
  total: number;
  limit: number;
  onDelete: (transaction: ExpenseRecord) => void;
  onClose: () => void;
  deletingId: string;
  isDarkMode: boolean;
}) {
  const category = categories.find((item) => item.key === categoryKey)!;
  const Icon = categoryIcons[categoryKey];
  const config = categoryConfig[categoryKey];
  const percent = limit > 0 ? Math.round((total / limit) * 100) : 0;

  return (
    <div className="modal-overlay fixed inset-0 z-40 flex items-end bg-slate-950/60 p-4 backdrop-blur-md sm:items-center sm:justify-center">
      <div
        className={`modal-content max-h-[80vh] w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl transition-all duration-300 ${
          isDarkMode
            ? "border-slate-800/80 bg-slate-950/95 text-white"
            : "border-slate-200/60 bg-white/95 text-slate-950"
        }`}
      >
        <div className="flex flex-col border-b border-slate-100 p-5 dark:border-slate-800/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex size-10 items-center justify-center rounded-2xl ${config.iconBg} ${config.iconColor}`}
              >
                <Icon className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold">{category.label}</h2>
                <p className="text-xs font-semibold text-slate-400">
                  {currencyFormatter.format(total)} / {currencyFormatter.format(limit)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`flex size-9 items-center justify-center rounded-xl transition cursor-pointer ${
                isDarkMode 
                  ? "bg-slate-900 hover:bg-slate-800 text-slate-400" 
                  : "bg-slate-100 hover:bg-slate-200 text-slate-500"
              }`}
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-[10px] font-bold text-slate-400">
              <span>예산 사용률</span>
              <span className={percent >= 100 ? "text-rose-500" : percent >= 80 ? "text-amber-500" : "text-emerald-500"}>
                {percent}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percent >= 100
                    ? "bg-gradient-to-r from-rose-500 to-red-500"
                    : percent >= 80
                    ? "bg-gradient-to-r from-amber-500 to-rose-500"
                    : "bg-gradient-to-r from-emerald-500 to-teal-500"
                }`}
                style={{ width: `${Math.min(percent, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="max-h-[50vh] space-y-2.5 overflow-y-auto p-4">
          {transactions.length === 0 ? (
            <p className="py-12 text-center text-xs font-bold text-slate-400">
              이 카테고리의 소비 내역이 없습니다.
            </p>
          ) : (
            transactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                isDarkMode={isDarkMode}
                isNew={false}
                isDeleting={transaction.id === deletingId}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function BottomNavButton({
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-14 flex-col items-center gap-0.5 text-[10px] font-bold transition-all duration-300 active:scale-95 ${
        isActive
          ? "text-indigo-600 dark:text-indigo-400"
          : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-400"
      }`}
    >
      <Icon className={`size-4.5 transition-transform duration-300 ${isActive ? "scale-110" : ""}`} />
      <span className="leading-none">{label}</span>
    </button>
  );
}
