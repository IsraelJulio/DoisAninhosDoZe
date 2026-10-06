import { lookup } from "node:dns";
import { Agent, fetch as undiciFetch } from "undici";
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

/**
 * O IP é validado NO MOMENTO DA CONEXÃO (lookup customizado do undici), não só antes:
 * isso impede DNS rebinding (o domínio resolver para IP público na checagem e interno na conexão).
 */
const agent = new Agent({
  connect: {
    timeout: TIMEOUT_MS,
    lookup(hostname, options, callback) {
      lookup(hostname, { ...options, all: true }, (error, addresses) => {
        if (error) return callback(error, [] as never);
        const list = Array.isArray(addresses) ? addresses : [];
        if (!list.length || list.some((a) => !isPublicIp(a.address))) {
          return callback(new UnsafeUrlError("O link aponta para um endereço interno."), [] as never);
        }
        callback(null, list as never);
      });
    },
  },
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
    total += value.byteLength;
    if (total > MAX_HTML_BYTES) {
      await reader.cancel();
      break; // usamos só o começo da página (metadados ficam no <head>)
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8").decode(Buffer.concat(chunks));
}

/** GET seguro de uma página HTML pública, seguindo no máximo 5 redirects validados um a um. */
export async function safeFetchHtml(rawUrl: string): Promise<FetchedPage> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let url = assertSafeUrl(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await undiciFetch(url, {
      dispatcher: agent,
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
