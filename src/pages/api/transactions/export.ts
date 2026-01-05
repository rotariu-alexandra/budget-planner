import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabaseClient";

function csvEscape(value: unknown) {
  const s = String(value ?? "");
  // dacă are virgulă, ghilimele sau newline, îl punem în quotes și escapăm quotes
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const type = typeof req.query.type === "string" ? req.query.type : "";
  const category =
    typeof req.query.category === "string" ? req.query.category.trim() : "";
  const month = typeof req.query.month === "string" ? req.query.month : ""; // YYYY-MM

  let query = supabase
    .from("transactions")
    .select("type,amount,category,date,note,created_at")
    .eq("user_id", userId);

  if (type === "INCOME" || type === "EXPENSE") query = query.eq("type", type);

  if (category) query = query.ilike("category", `%${category}%`);

  if (month) {
    const start = `${month}-01`;
    const endDate = new Date(`${month}-01T00:00:00`);
    endDate.setMonth(endDate.getMonth() + 1);
    const end = endDate.toISOString().slice(0, 10);
    query = query.gte("date", start).lt("date", end);
  }

  const { data, error } = await query.order("date", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const header = ["type", "amount", "category", "date", "note", "created_at"];
  const lines = [header.join(",")];

  for (const row of data ?? []) {
    lines.push(
      [
        csvEscape((row as any).type),
        csvEscape((row as any).amount),
        csvEscape((row as any).category),
        csvEscape((row as any).date),
        csvEscape((row as any).note ?? ""),
        csvEscape((row as any).created_at ?? ""),
      ].join(",")
    );
  }

  const csv = lines.join("\n");
  const fileName = `transactions${month ? `_${month}` : ""}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  return res.status(200).send(csv);
}
