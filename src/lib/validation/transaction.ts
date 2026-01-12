import { z } from "zod";

export const transactionCreateSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.coerce.number().finite().positive(),
  category: z.string().trim().min(1).max(50),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  note: z.string().trim().max(200).optional(),
});

export const transactionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),

  // filtre:
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  category: z.string().trim().max(100).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM").optional(),
});
