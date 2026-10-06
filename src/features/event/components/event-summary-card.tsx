import { CalendarDays, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { EVENT } from "@/features/event/event";

/** Resumo de data, horário e local (Home e telas de confirmação). */
export function EventSummaryCard({ showDirectionsLink = true }: { showDirectionsLink?: boolean }) {
  return (
    <div className="paper-card divide-y divide-line/80 px-4 py-1">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
        <p className="flex items-center gap-2 font-display text-lg font-semibold">
          <CalendarDays className="size-5.5 text-orange" aria-hidden />
          <span>
            <span className="sr-only">Data: </span>
            {EVENT.displayDate}
          </span>
        </p>
        <p className="flex items-center gap-2 font-display text-lg font-semibold">
          <Clock className="size-5.5 text-orange" aria-hidden />
          <span>
            <span className="sr-only">Horário: </span>
            {EVENT.displayTime}
          </span>
        </p>
      </div>
      <div className="flex items-start gap-2 py-3">
        <MapPin className="mt-0.5 size-5.5 shrink-0 text-danger" aria-hidden />
        <div className="min-w-0 text-sm">
          <p className="font-bold">{EVENT.venue}</p>
          <p className="text-ink-soft">{EVENT.address}</p>
          {showDirectionsLink && (
            <Link href="/local" className="mt-1 inline-block font-bold text-forest-dark underline underline-offset-2">
              Ver detalhes e como chegar
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
