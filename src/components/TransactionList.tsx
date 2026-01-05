import { formatMoney, usePreferences } from "@/context/PreferencesContext";

type TransactionType = "INCOME" | "EXPENSE";

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string; // yyyy-mm-dd
  note?: string;
};

type Props = {
  items: Transaction[];
  onDelete: (id: string) => void;
};

export default function TransactionList({ items, onDelete }: Props) {
  const { currency } = usePreferences();

  if (items.length === 0) {
    return (
      <div className="mt-4 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg p-4 text-gray-600 dark:text-gray-400">
        No transactions yet.
      </div>
    );
  }

  return (
    <div className="mt-4 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b dark:border-gray-800 flex items-center justify-between">
        <h3 className="font-semibold">History</h3>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {items.length} items
        </span>
      </div>

      <ul className="divide-y dark:divide-gray-800">
        {items.map((t) => (
          <li
            key={t.id}
            className="px-4 py-3 flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    t.type === "EXPENSE"
                      ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-900"
                      : "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-900"
                  }`}
                >
                  {t.type}
                </span>

                <span className="font-medium truncate">{t.category}</span>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t.date}
                {t.note ? ` • ${t.note}` : ""}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-semibold">
                {t.type === "EXPENSE" ? "-" : "+"}
                {formatMoney(t.amount, currency)}
              </span>

              <button
                onClick={() => onDelete(t.id)}
                className="text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
