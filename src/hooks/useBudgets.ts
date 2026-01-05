import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type Budget = {
  id: string;
  month: string;
  category: string;
  amount: number;
};

export function useBudgets(userId: string | undefined, month: string) {
  const [items, setItems] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const load = useCallback(async () => {
    if (!userId || !month) {
      setItems([]);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", userId)
      .eq("month", month)
      .order("category");

    if (error) {
      setError(error.message);
      setItems([]);
      setLoading(false);
      return;
    }

    setItems(
      (data ?? []).map((b: any) => ({
        id: b.id,
        month: b.month,
        category: b.category,
        amount: Number(b.amount),
      }))
    );

    setLoading(false);
  }, [userId, month]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, setItems, loading, error, reload: load };
}
