import { z } from "zod";
import { normalizeBrazilianPhone } from "@/lib/phone";

export const phoneSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const phone = normalizeBrazilianPhone(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "Confira o número: DDD + celular, ex.: (31) 91234-5678" });
      return z.NEVER;
    }
    return phone;
  });

export const guestNameSchema = z
  .string()
  .trim()
  .min(2, "Digite seu nome")
  .max(80, "Nome muito longo")
  .transform((value) => value.replace(/\s+/g, " "));
