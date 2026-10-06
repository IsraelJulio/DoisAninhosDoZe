import { BlockList, isIP } from "node:net";

// Proteção contra SSRF do importador de produtos: só aceitamos URLs públicas http(s).

export class UnsafeUrlError extends Error {}

const blocked = new BlockList();
// IPv4 privados, loopback, link-local (inclui 169.254.169.254 — metadata de cloud), CGNAT, reservados
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(net, prefix, "ipv4");
}
// IPv6 loopback, não especificado, ULA (fc00::/7), link-local, multicast, documentação, NAT64
for (const [net, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["2001:db8::", 32],
  ["64:ff9b::", 96],
  ["100::", 64],
] as const) {
  blocked.addSubnet(net, prefix, "ipv6");
}

export function isPublicIp(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return !blocked.check(address, "ipv4");
  if (version === 6) return !blocked.check(address, "ipv6"); // ::ffff:a.b.c.d é verificado como IPv4
  return false;
}

const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home", ".corp", ".intranet"];

/** Valida a URL informada pelo admin (ou recebida em um redirect). Não resolve DNS. */
export function assertSafeUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new UnsafeUrlError("Link inválido. Cole o endereço completo, começando com https://");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new UnsafeUrlError("Apenas links http:// ou https:// são aceitos.");
  }
  if (url.username || url.password) throw new UnsafeUrlError("Links com usuário/senha não são aceitos.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new UnsafeUrlError("Porta não permitida.");

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) {
    throw new UnsafeUrlError("Endereço interno não permitido.");
  }
  if (isIP(host)) {
    if (!isPublicIp(host)) throw new UnsafeUrlError("Endereço interno não permitido.");
  } else if (!host.includes(".")) {
    throw new UnsafeUrlError("Endereço interno não permitido.");
  }
  return url;
}
