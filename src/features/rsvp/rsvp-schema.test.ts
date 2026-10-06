import { describe, expect, it } from "vitest";
import { rsvpSchema } from "./rsvp-schema";

const base = { name: "Maria Silva", attending: "yes", adults: "2", children: "1", message: "" };

describe("rsvpSchema", () => {
  it("aceita confirmação com adultos e crianças separados", () => {
    const r = rsvpSchema.parse(base);
    expect(r).toMatchObject({ name: "Maria Silva", attending: true, adults: 2, children: 1 });
    expect(r.message).toBeUndefined();
  });

  it("zera contagens quando não vai participar", () => {
    const r = rsvpSchema.parse({ ...base, attending: "no" });
    expect(r).toMatchObject({ attending: false, adults: 0, children: 0 });
  });

  it("rejeita números negativos", () => {
    expect(rsvpSchema.safeParse({ ...base, adults: "-1" }).success).toBe(false);
    expect(rsvpSchema.safeParse({ ...base, children: "-3" }).success).toBe(false);
  });

  it("exige ao menos uma pessoa quando vai", () => {
    expect(rsvpSchema.safeParse({ ...base, adults: "0", children: "0" }).success).toBe(false);
  });

  it("limita o recado a 200 caracteres", () => {
    expect(rsvpSchema.safeParse({ ...base, message: "a".repeat(201) }).success).toBe(false);
    expect(rsvpSchema.safeParse({ ...base, message: "a".repeat(200) }).success).toBe(true);
  });

  it("exige nome", () => {
    expect(rsvpSchema.safeParse({ ...base, name: " " }).success).toBe(false);
  });
});
