import "dotenv/config";
import { vi } from "vitest";

// `server-only` lança erro fora do bundler do Next; nos testes de domínio ele é irrelevante.
vi.mock("server-only", () => ({}));
