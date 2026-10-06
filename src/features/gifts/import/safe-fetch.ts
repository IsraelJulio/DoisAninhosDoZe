import { lookup } from "node:dns";
import type { LookupAddress, LookupOptions } from "node:dns";
import { Agent, fetch as undiciFetch, type Dispatcher } from "undici";
import { assertSafeUrl, isPublicIp, UnsafeUrlError } from "./url-guard";

export const MAX_REDIRECTS = 5;
export const MAX_HTML_BYTES = 1_500_000;
export const TIMEOUT_MS = 8_000;

export interface FetchedPage {
  finalUrl: string;
  status: number;
  /** null quando a resposta não é HTML ou veio com erro HTTP */
  html: string | null;
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

/**
 * DNS com checagem de IP público, usado NO MOMENTO DA CONEXÃO (não só antes): impede DNS
 * rebinding (o domínio resolver para IP público na checagem e para IP interno na conexão).
 * Respeita as duas assinaturas do lookup do Node (all: true → lista; senão → endereço único).
 */
export function guardedLookup(hostname: string, options: LookupOptions, callback: LookupCallback) {
  lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, []);
    const list = Array.isArray(addresses) ? addresses : [];
    if (!list.length || list.some((a) => !isPublicIp(a.address))) {
      return callback(new UnsafeUrlError("O link aponta para um endereço interno."), []);
    }
    if (options.all) return callback(null, list);
    callback(null, list[0]!.address, list[0]!.family);
  });
}

const agent = new Agent({
  connect: { timeout: TIMEOUT_MS, lookup: guardedLookup as never },
  headersTimeout: TIMEOUT_MS,
  bodyTimeout: TIMEOUT_MS,
});

async function readLimited(body: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!body) return "";
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (total + value.byteLength > MAX_HTML_BYTES) {
      chunks.push(value.subarray(0, MAX_HTML_BYTES - total)); // guarda até o limite (o <head> fica no começo)
      await reader.cancel();
      break;
    }
    total += value.byteLength;
    chunks.push(value);
  }
  return new TextDecoder("utf-8").decode(Buffer.concat(chunks));
}

/** GET seguro de uma página HTML pública, seguindo no máximo 5 redirects validados um a um. */
export async function safeFetchHtml(rawUrl: string, { dispatcher = agent }: { dispatcher?: Dispatcher } = {}): Promise<FetchedPage> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let url = assertSafeUrl(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await undiciFetch(url, {
      dispatcher,
      redirect: "manual",
      signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; JoseBirthdayGiftImporter/1.0; uso pessoal)",
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
        "accept-language": "pt-BR,pt;q=0.9",
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) return { finalUrl: url.toString(), status: response.status, html: null };
      url = assertSafeUrl(new URL(location, url).toString());
      continue;
    }

    const contentType = response.headers.get("content-type") ?? "";
    const length = Number(response.headers.get("content-length") ?? 0);
    if (!response.ok || (contentType && !contentType.includes("html")) || length > MAX_HTML_BYTES * 4) {
      await response.body?.cancel();
      return { finalUrl: url.toString(), status: response.status, html: null };
    }
    const html = await readLimited(response.body as ReadableStream<Uint8Array> | null);
    return { finalUrl: url.toString(), status: response.status, html };
  }
  throw new UnsafeUrlError("Redirecionamentos demais.");
}
