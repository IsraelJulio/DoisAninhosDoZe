import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, isAdminToken } from "@/server/session/admin-token";

/**
 * Primeira barreira das rotas administrativas: sem cookie de admin válido, volta para o login.
 * Cada página e Server Action do admin TAMBÉM chama requireAdmin() (defesa em profundidade).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  if (!isAdminToken(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
