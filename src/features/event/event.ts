import eventConfig from "@docs/event-config.json";

// Fonte única dos dados do convite: docs/event-config.json (data, horário e endereço oficiais).

const { child, event } = eventConfig;

const [year, month, day] = event.date.split("-").map(Number) as [number, number, number];
const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(
  new Date(Date.UTC(year, month - 1, day)),
);

const mapsQuery = `${event.venue}, ${event.address}`;

export const EVENT = {
  childName: child.name,
  age: child.age,
  date: event.date,
  displayDate: event.displayDate,
  displayWeekday: weekday,
  time: event.time,
  displayTime: event.displayTime,
  venue: event.venue,
  address: event.address,
  /** "Rua Peroba Rosa, 429" */
  street: event.address.split(" - ")[0] ?? event.address,
  /** "Riacho da Mata, Sarzedo - MG" */
  district: event.address.split(" - ").slice(1).join(" - "),
  /** Data/hora local do evento (America/Sao_Paulo, UTC-3). */
  startsAt: new Date(`${event.date}T${event.time}:00-03:00`),
  /** URL oficial do Google Maps (Maps URLs API) — não requer chave. */
  googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`,
  /** Embed simples sem chave de API (carregado sob demanda). */
  googleMapsEmbedUrl: `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery)}&output=embed`,
} as const;

/** Duração padrão da reserva temporária dos presentes. */
export const DEFAULT_RESERVATION_MINUTES = 30;
