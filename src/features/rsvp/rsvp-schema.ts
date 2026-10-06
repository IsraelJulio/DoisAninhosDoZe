import { z } from "zod";
import { guestNameSchema } from "@/features/guests/guest-schema";

export const RSVP_MAX_PER_GROUP = 20;
export const RSVP_MESSAGE_MAX = 200;

const count = z.coerce
  .number({ message: "Número inválido" })
  .int("Use números inteiros")
  .min(0, "Não pode ser negativo")
  .max(RSVP_MAX_PER_GROUP, `Máximo de ${RSVP_MAX_PER_GROUP}`);

export const rsvpSchema = z
  .object({
    name: guestNameSchema,
    attending: z.enum(["yes", "no"], { message: "Conta pra gente se você vai" }).transform((v) => v === "yes"),
    adults: count,
    children: count,
    message: z
      .string()
      .trim()
      .max(RSVP_MESSAGE_MAX, `Máximo de ${RSVP_MESSAGE_MAX} caracteres`)
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .transform((data) => (data.attending ? data : { ...data, adults: 0, children: 0 }))
  .refine((data) => !data.attending || data.adults + data.children >= 1, {
    message: "Informe pelo menos 1 pessoa",
    path: ["adults"],
  });

export type RsvpInput = z.output<typeof rsvpSchema>;
