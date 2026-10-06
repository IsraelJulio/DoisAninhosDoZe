"use client";

// Último recurso quando o próprio layout falha: HTML mínimo, sem dependências.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#FFF4DE", color: "#33251D", textAlign: "center", padding: "4rem 1.5rem" }}>
        <h1>Ops, algo deu errado</h1>
        <p>Tente novamente em instantes.</p>
        <button
          onClick={reset}
          style={{ background: "#168447", color: "#fff", border: 0, borderRadius: 18, padding: "0.9rem 1.5rem", fontSize: "1rem" }}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
