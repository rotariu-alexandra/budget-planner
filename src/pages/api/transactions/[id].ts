import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { rateLimit } from "@/lib/rateLimit";
import { z } from "zod";

const idSchema = z.string().min(1).max(200);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const rl = rateLimit(`txdel:${userId}`, 60, 60_000);
  if (!rl.ok) return res.status(429).json({ error: "Too many requests" });

  const idParsed = idSchema.safeParse(req.query.id);
  if (!idParsed.success) return res.status(400).json({ error: "Invalid id" });

  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const id = idParsed.data;

  const { error } = await supabaseServer
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true });
}
