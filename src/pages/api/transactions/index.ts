import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { rateLimit } from "@/lib/rateLimit";
import { transactionCreateSchema, transactionListQuerySchema } from "@/lib/validation/transaction";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  // rate limit per user + endpoint
  const rl = rateLimit(`tx:${userId}:${req.method}`, 60, 60_000);
  res.setHeader("X-RateLimit-Remaining", String(rl.remaining));
  res.setHeader("X-RateLimit-Reset", String(rl.resetAt));
  if (!rl.ok) return res.status(429).json({ error: "Too many requests" });

  if (req.method === "GET") {
    const parsed = transactionListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
    }

    const { page, limit, type, category, month } = parsed.data;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = supabaseServer
      .from("transactions")
      .select("*", { count: "exact" })
      .eq("user_id", userId);

    if (type) q = q.eq("type", type);

    if (category?.trim()) {
      q = q.ilike("category", `%${category.trim()}%`);
    }

    if (month) {
      const start = `${month}-01`;
      const endDate = new Date(`${month}-01T00:00:00`);
      endDate.setMonth(endDate.getMonth() + 1);
      const end = endDate.toISOString().slice(0, 10);
      q = q.gte("date", start).lt("date", end);
    }

    const { data, error, count } = await q
      .order("date", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);

    if (error) return res.status(500).json({ error: error.message });

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.status(200).json({
      items: data ?? [],
      page,
      limit,
      total,
      totalPages,
    });
  }

  if (req.method === "POST") {
    const parsed = transactionCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }

    const payload = parsed.data;

    const { data, error } = await supabaseServer
      .from("transactions")
      .insert({
        user_id: userId,
        type: payload.type,
        amount: payload.amount,
        category: payload.category,
        date: payload.date,
        note: payload.note ?? null,
      })
      .select("*")
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ item: data });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
