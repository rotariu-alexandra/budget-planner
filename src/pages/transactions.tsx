import Head from "next/head";
import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { getAuth } from "@clerk/nextjs/server";
import TransactionForm, { NewTransaction } from "@/components/TransactionForm";
import TransactionList, { Transaction } from "@/components/TransactionList";
import { supabase } from "@/lib/supabaseClient";
import { useDebounce } from "@/hooks/useDebounce";
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from "@clerk/nextjs";
import Layout from "@/components/Layout";

type Props = {
  ssrOk: boolean;
  ssrCount: number;
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const { userId } = getAuth(ctx.req);

  if (!userId) {
    return {
      redirect: { destination: "/sign-in", permanent: false },
    };
  }

  const { data, error } = await supabase
    .from("transactions")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (error) {
    console.error("SSR fetch error:", error.message);
  }

  return {
    props: {
      ssrOk: true,
      ssrCount: data?.length ?? 0,
    },
  };
};

export default function TransactionsPage(_props: Props) {
  const { user, isLoaded } = useUser();
  const userId = user?.id;

  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState<"" | "INCOME" | "EXPENSE">("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [monthFilter, setMonthFilter] = useState<string>("");
  const debouncedCategory = useDebounce(categoryFilter, 300);

  // import
  const [csvText, setCsvText] = useState("");
  const [importMsg, setImportMsg] = useState<string>("");
  const [importErrs, setImportErrs] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  async function load() {
    if (!userId) return;

    setLoading(true);

    let query = supabase.from("transactions").select("*").eq("user_id", userId);

    if (typeFilter) query = query.eq("type", typeFilter);

    if (debouncedCategory.trim()) {
      query = query.ilike("category", `%${debouncedCategory.trim()}%`);
    }

    if (monthFilter) {
      const start = `${monthFilter}-01`;
      const endDate = new Date(`${monthFilter}-01T00:00:00`);
      endDate.setMonth(endDate.getMonth() + 1);
      const end = endDate.toISOString().slice(0, 10);
      query = query.gte("date", start).lt("date", end);
    }

    const { data, error } = await query.order("date", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const mapped: Transaction[] =
      (data ?? []).map((row: any) => ({
        id: row.id,
        type: row.type,
        amount: Number(row.amount),
        category: row.category,
        date: row.date,
        note: row.note ?? undefined,
      })) ?? [];

    setItems(mapped);
    setLoading(false);
  }

  useEffect(() => {
    if (!isLoaded || !userId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId, typeFilter, monthFilter, debouncedCategory]);

  async function handleAdd(tx: NewTransaction) {
    if (!userId) return;

    if (!tx.type || !tx.category || !tx.date) {
      alert("Type, category and date are required.");
      return;
    }
    if (!(tx.amount > 0)) {
      alert("Amount must be positive.");
      return;
    }

    const { error } = await supabase.from("transactions").insert({
      user_id: userId,
      type: tx.type,
      amount: tx.amount,
      category: tx.category,
      date: tx.date,
      note: tx.note ?? null,
    });

    if (error) {
      alert(error.message);
      return;
    }

    await load();
  }

  async function handleDelete(id: string) {
    if (!userId) return;

    const { error } = await supabase
      .from("transactions")
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
        <title>Transactions | Budget Planner</title>
      </Head>

      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>

      <SignedIn>
       <Layout>
  {/* Header */}
  <div className="mb-6">
    <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
    <p className="text-gray-600 dark:text-gray-400">
      Saved in Supabase (scoped to your Clerk account).
    </p>
  </div>

  {/* Main grid */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* LEFT */}
    <div className="lg:col-span-1">
      <TransactionForm onAdd={handleAdd} />
    </div>

    {/* RIGHT */}
    <div className="lg:col-span-2 space-y-6">
      {/* Filters */}
      <div className="rounded-2xl bg-white dark:bg-gray-900/60 p-5 shadow-sm">
        <h2 className="font-semibold mb-4">Filters</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Month */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">
              Month
            </label>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">
              Category
            </label>
            <input
              type="text"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              placeholder="e.g. Food"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setMonthFilter("");
              setTypeFilter("");
              setCategoryFilter("");
            }}
            className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Clear filters
          </button>

          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams();
              if (monthFilter) params.set("month", monthFilter);
              if (typeFilter) params.set("type", typeFilter);
              if (categoryFilter.trim())
                params.set("category", categoryFilter.trim());

              window.location.href = `/api/transactions/export?${params.toString()}`;
            }}
            className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-500"
          >
            Export CSV
          </button>
        </div>
      </div>

     
      <details className="rounded-2xl bg-white dark:bg-gray-900/60 p-5 shadow-sm">
        <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300">
          Advanced actions
        </summary>

        <div className="mt-4">
        </div>
      </details>

      {/* History */}
      {loading ? (
        <div className="rounded-2xl bg-white dark:bg-gray-900/60 p-5 shadow-sm text-gray-600 dark:text-gray-400">
          Loading…
        </div>
      ) : (
        <TransactionList items={items} onDelete={handleDelete} />
      )}
    </div>
  </div>
</Layout>

      </SignedIn>
    </>
  );
}
