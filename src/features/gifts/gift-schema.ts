import { z } from "zod";
import { parseBRLToCents } from "@/lib/money";

const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => {
    if (!v) return true;
    if (v.startsWith("/assets/")) return true; // asset local (ex.: placeholder)
    try {
      const url = new URL(v);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Use um link http(s) válido");

/** Formulário de presente do admin. Preço digitado em reais ("149,90") e salvo em centavos. */
export const giftFormSchema = z.object({
  title: z.string().trim().min(2, "Informe o nome do presente").max(120),
  description: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v ? v : undefined)),
  price: z
    .string()
    .trim()
    .transform((value, ctx) => {
      const cents = parseBRLToCents(value);
      if (cents === null || cents <= 0) {
        ctx.addIssue({ code: "custom", message: "Preço inválido (ex.: 149,90)" });
        return z.NEVER;
      }
      if (cents > 10_000_000) {
        ctx.addIssue({ code: "custom", message: "Preço muito alto" });
        return z.NEVER;
      }
      return cents;
    }),
  category: z.string().trim().min(2, "Informe a categoria").max(40),
  stockQuantity: z.coerce.number().int("Use número inteiro").min(0).max(100),
  imageUrl: optionalUrl,
  sourceUrl: optionalUrl,
  source: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v ? v : undefined)),
  active: z
    .enum(["on", "true", "false"])
    .optional()
    .transform((v) => v === "on" || v === "true"),
  importId: z.string().max(64).optional(),
});

export type GiftFormInput = z.output<typeof giftFormSchema>;
