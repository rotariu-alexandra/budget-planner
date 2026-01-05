import { useMemo, useState } from "react";


export type NewTransaction = {
  type: "INCOME" | "EXPENSE";
  amount: number;
  category: string;
  date: string; // yyyy-mm-dd
  note?: string;
};

type Props = {
  onAdd: (tx: NewTransaction) => Promise<void> | void;
};

const CATEGORIES = ["Food", "Transport", "Bills", "Shopping", "Health", "Salary", "Other"];

export default function TransactionForm({ onAdd }: Props) {
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const amountNumber = useMemo(() => Number(amount), [amount]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!category || !date) {
      alert("Category and date are required.");
      return;
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      alert("Amount must be a positive number.");
      return;
    }

    setSaving(true);
    try {
      await onAdd({
        type,
        amount: amountNumber,
        category,
        date,
        note: note.trim() ? note.trim() : undefined,
      });

      setAmount("");
      setCategory("");
      setDate("");
      setNote("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-5"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold">Add transaction</h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          amount &gt; 0 • category/date required
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700"
          >
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Amount
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 45.50"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700"
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-indigo-500"
          />
        </div>

        {/* Note */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Note (optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. groceries"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700"
          />
        </div>
      </div>
            {/* SUBMIT */}
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-gray-900"
        >
          {saving ? "Saving…" : "Save"}
        </button>

            {/* CLEAR */}
        <button
          type="button"
          onClick={() => {
            setType("EXPENSE");
            setAmount("");
            setCategory("");
            setDate("");
            setNote("");
          }}
          className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Clear
        </button>
      </div>
    </form>
  );
}
