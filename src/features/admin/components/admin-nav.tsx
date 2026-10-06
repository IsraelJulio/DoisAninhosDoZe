"use client";

import { CreditCard, Gift, Home, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/admin", label: "Visão geral", icon: Home },
  { href: "/admin/convidados", label: "Convidados", icon: Users },
  { href: "/admin/presentes", label: "Presentes", icon: Gift },
  { href: "/admin/pagamentos", label: "Pagamentos", icon: CreditCard },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export function AdminNav({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Seções do painel" data-scroll-x className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
      <ul className="flex w-max gap-2 pb-1">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex min-h-11 items-center gap-2 rounded-2xl px-3.5 text-sm font-bold transition",
                  active ? "bg-forest text-white shadow-[0_3px_0_var(--color-forest-dark)]" : "bg-paper text-ink ring-1 ring-line hover:ring-sand",
                )}
              >
                <Icon className="size-4.5" aria-hidden />
                {label}
                {href === "/admin/pagamentos" && pendingCount > 0 && (
                  <span className="grid min-w-5 place-items-center rounded-full bg-danger px-1 text-xs text-white" aria-label={`${pendingCount} pendentes`}>
                    {pendingCount}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
