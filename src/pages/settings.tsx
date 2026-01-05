import Head from "next/head";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from "@clerk/nextjs";
import Layout from "@/components/Layout";
import { formatMoney, usePreferences } from "@/context/PreferencesContext";
import { useBudgets } from "@/hooks/useBudgets";

const CATEGORIES = [
  "Food",
  "Transport",
  "Bills",
  "Shopping",
  "Health",
  "Salary",
  "Other",
];

export default function SettingsPage() {
  const { user } = useUser();
  const userId = user?.id;

  const { currency, setCurrency } = usePreferences();

  const [month, setMonth] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");

  const { items, setItems, loading, error, reload } = useBudgets(userId, month);

  async function handleSave() {
    if (!userId) return;

    if (!month || !category || !amount) {
      alert("All fields required");
      return;
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      alert("Amount must be a positive number.");
      return;
    }

    const { error } = await supabase
      .from("budgets")
      .upsert(
        {
          user_id: userId,
          month,
          category,
          amount: numericAmount,
        },
        { onConflict: "user_id,month,category" } // ✅ robust
      );

    if (error) {
      alert(error.message);
      return;
    }

    setAmount("");
    setCategory("");
    await reload();
  }

  async function handleDelete(id: string) {
    if (!userId) return;

    if (!confirm("Delete this budget?")) return;

    const { error } = await supabase
      .from("budgets")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      alert(error.message);
      return;
    }

    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <>
      <Head>
        <title>Settings | Budget Planner</title>
      </Head>

      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>

      <SignedIn>
        <Layout>
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Budgets are saved per user and per month.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT */}
            <div className="lg:col-span-1 space-y-6">
              {/* Preferences */}
              <section className="rounded-2xl bg-white dark:bg-gray-900/60 p-6 shadow-sm">
                <h2 className="font-semibold mb-4">Preferences</h2>

                <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">
                  Preferred currency
                </label>

                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                >
                  <option value="RON">RON</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>

                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Display-only setting (no conversion).
                </p>
              </section>

              {/* Budgets list */}
              <section className="rounded-2xl bg-white dark:bg-gray-900/60 p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="font-semibold">Budgets</h2>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Selected month
                  </span>
                </div>

                {error ? (
                  <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                    {error}
                  </p>
                ) : null}

                {!month ? (
                  <p className="text-gray-500 dark:text-gray-400">
                    Pick a month to view budgets.
                  </p>
                ) : loading ? (
                  <p className="text-gray-600 dark:text-gray-400">Loading…</p>
                ) : items.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">
                    No budgets yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {items.map((b) => (
                      <li
                        key={b.id}
                        className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-900/40 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{b.category}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {formatMoney(b.amount, currency)}
                          </p>
                        </div>

                        <button
                          onClick={() => handleDelete(b.id)}
                          className="text-sm font-medium text-red-600 hover:opacity-80 dark:text-red-300"
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* RIGHT */}
            <div className="lg:col-span-2">
              <section className="rounded-2xl bg-white dark:bg-gray-900/60 p-6 shadow-sm">
                <h2 className="font-semibold mb-4">Set monthly budgets</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">
                      Month
                    </label>
                    <input
                      type="month"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                    >
                      <option value="">Select category</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">
                      Amount
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  className="mt-5 rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-500"
                >
                  Save budget
                </button>
              </section>
            </div>
          </div>
        </Layout>
      </SignedIn>
    </>
  );
}
