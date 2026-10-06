import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function WoodSign({
  as: Tag = "div",
  className,
  children,
}: {
  as?: "div" | "h1" | "h2" | "h3" | "p";
  className?: string;
  children: ReactNode;
}) {
  return <Tag className={cn("wood-sign", className)}>{children}</Tag>;
}
