import {
  computeTotals,
  groupExpensesByCategory,
  groupExpensesByDay,
  computeBudgetUsage,
  type TxRow,
} from "./finance";
import { describe, it, expect } from "vitest";


describe("finance helpers", () => {
  const rows: TxRow[] = [
    { type: "INCOME", amount: 3000, date: "2026-01-01", category: "Salary" },
    { type: "EXPENSE", amount: 25.5, date: "2026-01-05", category: "Food" },
    { type: "EXPENSE", amount: "10", date: "2026-01-05", category: "Food" },
    { type: "EXPENSE", amount: 50, date: "2026-01-06", category: "Transport" },
    { type: "EXPENSE", amount: "not-a-number", date: "2026-01-06", category: "Food" },
  ];

  it("computeTotals sums income/expenses and returns balance", () => {
    const t = computeTotals(rows);
    expect(t.income).toBe(3000);
    expect(t.expense).toBeCloseTo(25.5 + 10 + 50);
    expect(t.balance).toBeCloseTo(3000 - (25.5 + 10 + 50));
  });

  it("groupExpensesByCategory groups only EXPENSE and ignores invalid amounts", () => {
    const m = groupExpensesByCategory(rows);
    expect(m["Food"]).toBeCloseTo(35.5);
    expect(m["Transport"]).toBe(50);
    expect(m["Salary"]).toBeUndefined(); 
  });

  it("groupExpensesByDay groups expenses by date", () => {
    const m = groupExpensesByDay(rows);
    expect(m["2026-01-05"]).toBeCloseTo(35.5);
    expect(m["2026-01-06"]).toBe(50);
  });

  it("computeBudgetUsage computes pct and sorts by pct desc", () => {
    const expenseByCategory = { Food: 80, Transport: 20, Bills: 0 };
    const budgets = { Food: 100, Transport: 10 }; 

    const list = computeBudgetUsage(budgets, expenseByCategory);

    expect(list[0].cat).toBe("Transport");
    expect(list[0].pct).toBeCloseTo(200);

    const food = list.find((x) => x.cat === "Food")!;
    expect(food.pct).toBeCloseTo(80);

    const bills = list.find((x) => x.cat === "Bills")!;
    expect(bills.pct).toBe(null); 
  });
});
