import Head from "next/head";
import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { getAuth } from "@clerk/nextjs/server";
import TransactionForm, { NewTransaction } from "@/components/TransactionForm";
import TransactionList, { Transaction } from "@/components/TransactionList";
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from "@clerk/nextjs";
import Layout from "@/components/Layout";
import { useDebounce } from "@/hooks/useDebounce";

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


  return {
    props: {
      ssrOk: true,
      ssrCount: 1,
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

  // pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // import
  const [csvText, setCsvText] = useState("");
  const [importMsg, setImportMsg] = useState<string>("");
  const [importErrs, setImportErrs] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  //change filters
  useEffect(() => {
    setPage(1);
  }, [typeFilter, monthFilter, debouncedCategory]);

  async function load() {
    if (!userId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (typeFilter) params.set("type", typeFilter);
      if (debouncedCategory.trim()) params.set("category", debouncedCategory.trim());
      if (monthFilter) params.set("month", monthFilter);

      const r = await fetch(`/api/transactions?${params.toString()}`);
      const data = await r.json();

      if (!r.ok) {
        alert(data?.error ?? "Failed to load transactions");
        return;
      }

      const mapped: Transaction[] = (data.items ?? []).map((row: any) => ({
        id: row.id,
        type: row.type,
        amount: Number(row.amount),
        category: row.category,
        date: row.date,
        note: row.note ?? undefined,
      }));

      setItems(mapped);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoaded || !userId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId, page, typeFilter, monthFilter, debouncedCategory]);

  async function handleAdd(tx: NewTransaction) {
    const r = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tx),
    });

    const data = await r.json();
    if (!r.ok) {
      alert(data?.error ?? "Failed to add transaction");
      return;
    }

    await load();
  }

  async function handleDelete(id: string) {
    const r = await fetch(`/api/transactions/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    const data = await r.json();
    if (!r.ok) {
      alert(data?.error ?? "Failed to delete transaction");
      return;
    }

    if (items.length === 1 && page > 1) {
      setPage((p) => p - 1);
      return; 
    }

    await load();
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
                      if (categoryFilter.trim()) params.set("category", categoryFilter.trim());

                      
                      window.location.href = `/api/transactions/export?${params.toString()}`;
                    }}
                    className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-500"
                  >
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Import CSV */}
              <details className="rounded-2xl bg-white dark:bg-gray-900/60 p-5 shadow-sm">
                <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300">
                  Advanced actions (CSV import)
                </summary>

                <div className="mt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Expected header:{" "}
                    <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                      type,amount,category,date,note
                    </code>{" "}
                    (note optional). Date format:{" "}
                    <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                      YYYY-MM-DD
                    </code>
                    .
                  </p>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <label className="inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                        Choose file
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            const reader = new FileReader();
                            reader.onload = () => {
                              setCsvText(String(reader.result ?? ""));
                              setImportMsg("");
                              setImportErrs([]);
                            };
                            reader.readAsText(file);
                          }}
                        />
                      </label>

                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {csvText.trim() ? "File loaded" : "No file selected"}
                      </span>
                    </div>

                    <textarea
                      value={csvText}
                      onChange={(e) => {
                        setCsvText(e.target.value);
                        setImportMsg("");
                        setImportErrs([]);
                      }}
                      className="w-full min-h-[170px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 p-3 text-sm font-mono"
                      placeholder={`type,amount,category,date,note
EXPENSE,25.5,Food,2026-01-05,Lunch
INCOME,3000,Salary,2026-01-01,`}
                    />

                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled={importing || !csvText.trim()}
                        onClick={async () => {
                          setImporting(true);
                          setImportMsg("");
                          setImportErrs([]);

                          try {
                            const r = await fetch("/api/transactions/import", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ csv: csvText }),
                            });

                            const data = await r.json();

                            if (!r.ok) {
                              setImportMsg(data?.error ?? "Import failed");
                              setImportErrs(Array.isArray(data?.details) ? data.details : []);
                              return;
                            }

                            setImportMsg(`Imported ${data.inserted} rows.`);
                            setCsvText("");
                            // page 1 come back
                            setPage(1);
                            await load();
                          } catch (err: any) {
                            setImportMsg(err?.message ?? "Import failed");
                          } finally {
                            setImporting(false);
                          }
                        }}
                        className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-indigo-500"
                      >
                        {importing ? "Importing…" : "Import CSV"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCsvText("");
                          setImportMsg("");
                          setImportErrs([]);
                        }}
                        className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Clear
                      </button>
                    </div>

                    {importMsg ? (
                      <div className="text-sm">
                        <p
                          className={
                            importErrs.length
                              ? "text-red-700 dark:text-red-300"
                              : "text-green-700 dark:text-green-300"
                          }
                        >
                          {importMsg}
                        </p>

                        {importErrs.length ? (
                          <ul className="mt-2 list-disc pl-5 text-red-700 dark:text-red-300 space-y-1">
                            {importErrs.map((x, idx) => (
                              <li key={idx}>{x}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </details>

              {/* History */}
              {loading ? (
                <div className="rounded-2xl bg-white dark:bg-gray-900/60 p-5 shadow-sm text-gray-600 dark:text-gray-400">
                  Loading…
                </div>
              ) : (
                <>
                  {}
                  <TransactionList items={items} onDelete={handleDelete} />

                  <div className="flex items-center justify-between gap-3 mt-3">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Prev
                    </button>

                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Page {page} of {totalPages} • {total} total
                    </span>

                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Layout>
      </SignedIn>
    </>
  );
}
