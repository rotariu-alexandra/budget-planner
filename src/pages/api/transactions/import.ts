import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabaseClient";

type ImportOk = { inserted: number };
type ImportErr = { error: string; details?: string[] };

function isValidDateYYYYMMDD(s: string) {
  
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}


function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out.map((x) => x.trim());
}

function normalizeHeader(h: string) {
  return h.trim().toLowerCase();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ImportOk | ImportErr>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const csv = typeof req.body?.csv === "string" ? req.body.csv : "";
  if (!csv.trim()) return res.status(400).json({ error: "CSV is empty" });

 
  const lines = csv.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();

  if (lines.length < 2) {
    return res.status(400).json({ error: "CSV must have header + at least 1 row" });
  }

  const headerCells = parseCsvLine(lines[0]).map(normalizeHeader);

  const idxType = headerCells.indexOf("type");
  const idxAmount = headerCells.indexOf("amount");
  const idxCategory = headerCells.indexOf("category");
  const idxDate = headerCells.indexOf("date");
  const idxNote = headerCells.indexOf("note"); 

  const missing: string[] = [];
  if (idxType === -1) missing.push("type");
  if (idxAmount === -1) missing.push("amount");
  if (idxCategory === -1) missing.push("category");
  if (idxDate === -1) missing.push("date");

  if (missing.length) {
    return res.status(400).json({
      error: "Missing required CSV columns",
      details: [`Required headers: type, amount, category, date. Missing: ${missing.join(", ")}`],
    });
  }

  const errors: string[] = [];
  const rowsToInsert: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;

    const cells = parseCsvLine(raw);

    const type = (cells[idxType] ?? "").trim().toUpperCase();
    const amountStr = (cells[idxAmount] ?? "").trim();
    const category = (cells[idxCategory] ?? "").trim();
    const date = (cells[idxDate] ?? "").trim();
    const note = idxNote !== -1 ? (cells[idxNote] ?? "").trim() : "";

    // Validări
    if (!(type === "INCOME" || type === "EXPENSE")) {
      errors.push(`Line ${i + 1}: invalid type "${type}" (must be INCOME or EXPENSE)`);
      continue;
    }

    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push(`Line ${i + 1}: invalid amount "${amountStr}" (must be positive number)`);
      continue;
    }

    if (!category) {
      errors.push(`Line ${i + 1}: category is required`);
      continue;
    }

    if (!isValidDateYYYYMMDD(date)) {
      errors.push(`Line ${i + 1}: invalid date "${date}" (must be YYYY-MM-DD)`);
      continue;
    }

    rowsToInsert.push({
      user_id: userId,
      type,
      amount,
      category,
      date,
      note: note ? note : null,
    });
  }

  if (errors.length) {
    
    return res.status(400).json({
      error: "CSV validation failed",
      details: errors.slice(0, 25),
    });
  }

  if (!rowsToInsert.length) {
    return res.status(400).json({ error: "No valid rows found" });
  }

  
  const CHUNK = 500;
  let inserted = 0;

  for (let i = 0; i < rowsToInsert.length; i += CHUNK) {
    const chunk = rowsToInsert.slice(i, i + CHUNK);
    const { error } = await supabase.from("transactions").insert(chunk);
    if (error) return res.status(500).json({ error: error.message });
    inserted += chunk.length;
  }

  return res.status(200).json({ inserted });
}
