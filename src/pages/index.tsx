import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import CategoryDoughnut from "@/components/charts/CategoryDoughnut";
import DailyExpensesBar from "@/components/charts/DailyExpensesBar";
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from "@clerk/nextjs";
import Layout from "@/components/Layout";
import { formatMoney, usePreferences } from "@/context/PreferencesContext";

type TxRow = {
  type: "INCOME" | "EXPENSE";
  amount: number | string;
  date: string;
  category: string;
};

function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);

  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const label = `${year}-${String(month + 1).padStart(2, "0")}`;
  return { startStr, endStr, label };
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TxRow[]>([]);
  const [error, setError] = useState<string>("");

  const { user, isLoaded } = useUser();
  const userId = user?.id;

  const { currency } = usePreferences();

  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const { startStr, endStr, label } = useMemo(() => getCurrentMonthRange(), []);

  useEffect(() => {
    if (!isLoaded || !userId) return;

    async function load() {
      setLoading(true);
      setError("");

      const { data: txData, error: txErr } = await supabase
        .from("transactions")
        .select("type, amount, date, category")
        .eq("user_id", userId)
        .gte("date", startStr)
        .lt("date", endStr);

      if (txErr) {
        setError(txErr.message);
        setRows([]);
        setBudgets({});
        setLoading(false);
        return;
      }

      const { data: budgetRows, error: budgetErr } = await supabase
        .from("budgets")
        .select("category, amount")
        .eq("user_id", userId)
        .eq("month", label);

      if (budgetErr) {
        setError(budgetErr.message);
        setRows((txData as any[]) ?? []);
        setBudgets({});
        setLoading(false);
        return;
      }

      const budgetMap: Record<string, number> = {};
      for (const b of budgetRows ?? []) {
        const cat = (b as any).category as string;
        const amt = Number((b as any).amount);
        if (cat && Number.isFinite(amt)) budgetMap[cat] = amt;
      }

      setRows((txData as any[]) ?? []);
      setBudgets(budgetMap);
      setLoading(false);
    }

    load();
  }, [isLoaded, userId, startStr, endStr, label]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const r of rows) {
      const amt = typeof r.amount === "string" ? Number(r.amount) : r.amount;
      if (!Number.isFinite(amt)) continue;

      if (r.type === "INCOME") income += amt;
      else expense += amt;
    }

    return { income, expense, balance: income - expense };
  }, [rows]);

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      const amt = typeof r.amount === "string" ? Number(r.amount) : r.amount;
      if (!Number.isFinite(amt)) continue;
      if (r.type !== "EXPENSE") continue;

      const cat = r.category ?? "Other";
      map[cat] = (map[cat] ?? 0) + amt;
    }
    return map;
  }, [rows]);

  const expenseByDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      const amt = typeof r.amount === "string" ? Number(r.amount) : r.amount;
      if (!Number.isFinite(amt)) continue;
      if (r.type !== "EXPENSE") continue;

      const day = r.date;
      map[day] = (map[day] ?? 0) + amt;
    }
    return map;
  }, [rows]);

  const budgetUsage = useMemo(() => {
    const categories = new Set([
      ...Object.keys(budgets),
      ...Object.keys(expenseByCategory),
    ]);

    const list = Array.from(categories).map((cat) => {
      const spent = expenseByCategory[cat] ?? 0;
      const limit = budgets[cat] ?? 0;
      const pct = limit > 0 ? (spent / limit) * 100 : null;
      return { cat, spent, limit, pct };
    });

    list.sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
    return list;
  }, [budgets, expenseByCategory]);

  return (
    <>
      <Head>
        <title>Dashboard | Budget Planner</title>
      </Head>

      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>

      <SignedIn>
        <Layout>
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Current month: {label}
            </p>
          </div>

          {error ? (
            <div className="rounded-2xl bg-white dark:bg-gray-900/60 p-5 shadow-sm text-red-700 dark:text-red-300 mb-6">
              Error: {error}
            </div>
          ) : null}

          {/* Totals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white dark:bg-gray-900/60 p-5 shadow-sm">
              <p className="text-sm text-gray-600 dark:text-gray-400">Income</p>
              <p className="text-2xl font-bold mt-1">
                {loading ? "…" : formatMoney(totals.income, currency)}
              </p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-gray-900/60 p-5 shadow-sm">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Expenses
              </p>
              <p className="text-2xl font-bold mt-1">
                {loading ? "…" : formatMoney(totals.expense, currency)}
              </p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-gray-900/60 p-5 shadow-sm">
              <p className="text-sm text-gray-600 dark:text-gray-400">Balance</p>
              <p className="text-2xl font-bold mt-1">
                {loading ? "…" : formatMoney(totals.balance, currency)}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white dark:bg-gray-900/60 p-5 shadow-sm">
              <h2 className="font-semibold mb-3">Expenses by category</h2>
              {loading ? (
                <p className="text-gray-600 dark:text-gray-400">Loading…</p>
              ) : (
                <CategoryDoughnut dataMap={expenseByCategory} />
              )}
            </div>

            <div className="rounded-2xl bg-white dark:bg-gray-900/60 p-5 shadow-sm">
              <h2 className="font-semibold mb-3">Daily expenses</h2>
              {loading ? (
                <p className="text-gray-600 dark:text-gray-400">Loading…</p>
              ) : (
                <DailyExpensesBar dataMap={expenseByDay} />
              )}
            </div>
          </div>

          {/* Budget Progress */}
          <div className="mt-6 rounded-2xl bg-white dark:bg-gray-900/60 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-semibold">Budget progress</h2>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Warn at 80%
              </span>
            </div>

            {loading ? (
              <p className="text-gray-600 dark:text-gray-400 mt-3">Loading…</p>
            ) : budgetUsage.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400 mt-3">
                No budgets or expenses for this month.
              </p>
            ) : (
              <div className="space-y-3 mt-4">
                {budgetUsage.map((b) => {
                  const pct = b.pct;
                  const pctClamped =
                    pct === null ? 0 : Math.min(100, Math.max(0, pct));
                  const isWarn = pct !== null && pct >= 80 && pct < 100;
                  const isOver = pct !== null && pct >= 100;

                  return (
                    <div
                      key={b.cat}
                      className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium">{b.cat}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Spent: {formatMoney(b.spent, currency)} / Budget:{" "}
                            {b.limit ? formatMoney(b.limit, currency) : "—"}
                          </p>
                        </div>

                        <div className="text-sm font-semibold">
                          {pct === null ? "No budget" : `${pct.toFixed(0)}%`}
                        </div>
                      </div>

                      <div className="mt-3 h-2 rounded-full bg-gray-200 dark:bg-gray-800">
                        <div
                          className={`h-2 rounded-full ${
                            isOver
                              ? "bg-red-600"
                              : isWarn
                              ? "bg-yellow-500"
                              : "bg-green-600"
                          }`}
                          style={{ width: `${pctClamped}%` }}
                        />
                      </div>

                      {isWarn ? (
                        <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                          ⚠️ You are close to exceeding this budget.
                        </p>
                      ) : null}

                      {isOver ? (
                        <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                          ⛔ Budget exceeded for this category.
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="mt-6 rounded-2xl bg-white dark:bg-gray-900/60 p-6 shadow-sm">
            <h2 className="font-semibold mb-2">Quick notes</h2>
            <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 text-sm space-y-1">
              <li>These totals and charts are for the current month only.</li>
              <li>
                Budgets are loaded from the Settings page for the same month.
              </li>
              <li>Data is scoped to your logged-in account (Clerk user).</li>
            </ul>
          </div>
        </Layout>
      </SignedIn>
    </>
  );
}
