export type TxRow = {
  type: "INCOME" | "EXPENSE";
  amount: number | string;
  date: string; // yyyy-mm-dd
  category?: string | null;
};

function toAmount(x: number | string) {
  const n = typeof x === "string" ? Number(x) : x;
  return Number.isFinite(n) ? n : null;
}

export function computeTotals(rows: TxRow[]) {
  let income = 0;
  let expense = 0;

  for (const r of rows) {
    const amt = toAmount(r.amount);
    if (amt === null) continue;

    if (r.type === "INCOME") income += amt;
    else expense += amt;
  }

  return { income, expense, balance: income - expense };
}

export function groupExpensesByCategory(rows: TxRow[]) {
  const map: Record<string, number> = {};

  for (const r of rows) {
    const amt = toAmount(r.amount);
    if (amt === null) continue;
    if (r.type !== "EXPENSE") continue;

    const cat = (r.category ?? "Other").trim() || "Other";
    map[cat] = (map[cat] ?? 0) + amt;
  }

  return map;
}

export function groupExpensesByDay(rows: TxRow[]) {
  const map: Record<string, number> = {};

  for (const r of rows) {
    const amt = toAmount(r.amount);
    if (amt === null) continue;
    if (r.type !== "EXPENSE") continue;

    const day = r.date;
    map[day] = (map[day] ?? 0) + amt;
  }

  return map;
}

export function computeBudgetUsage(
  budgets: Record<string, number>,
  expenseByCategory: Record<string, number>
) {
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
}
