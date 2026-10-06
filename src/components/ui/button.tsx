import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "wood";
type Size = "md" | "lg" | "sm";

export function buttonClasses({
  variant = "primary",
  size = "md",
  block = false,
}: { variant?: Variant; size?: Size; block?: boolean } = {}): string {
  return cn(
    "inline-flex items-center justify-center gap-2 font-display font-semibold transition",
    "active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-60",
    "rounded-[var(--radius-button)]",
    size === "lg" && "min-h-14 px-6 text-lg",
    size === "md" && "min-h-12 px-5 text-base",
    size === "sm" && "min-h-10 px-3.5 text-sm",
    block && "w-full",
    variant === "primary" &&
      "bg-forest text-white shadow-[0_6px_0_var(--color-forest-dark),0_10px_20px_rgba(15,94,53,0.3)] hover:bg-leaf",
    variant === "secondary" &&
      "border-2 border-line bg-paper text-forest-dark shadow-[var(--shadow-soft)] hover:border-sand",
    variant === "ghost" && "text-forest-dark hover:bg-forest/10",
    variant === "danger" && "bg-danger text-white shadow-[0_5px_0_#b8402f] hover:brightness-105",
    variant === "wood" && "wood-sign rounded-[var(--radius-button)]",
  );
}

interface ButtonProps extends ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export function Button({ variant, size, block, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonClasses({ variant, size, block }), className)} {...props} />;
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  children: ReactNode;
}

export function ButtonLink({ variant, size, block, className, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonClasses({ variant, size, block }), className)} {...props} />;
}
