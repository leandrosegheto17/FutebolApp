import "@testing-library/jest-dom/vitest";
import { expect } from "vitest";
import { toHaveNoViolations } from "jest-axe";

// `jest-axe` já exporta `toHaveNoViolations` no formato esperado por
// `expect.extend` (`{ toHaveNoViolations: matcherFn }`) — passar
// `{ toHaveNoViolations }` aqui aninharia o objeto de novo
// (`{ toHaveNoViolations: { toHaveNoViolations: fn } }`), fazendo o Vitest
// registrar um matcher que não é uma função (bug pré-existente, encontrado ao
// rodar a suíte de testes como parte de BE-01). `@types/jest-axe` tipa o
// matcher no formato do Jest, que não bate estruturalmente com
// `RawMatcherFn` do Vitest (mesmo comportamento em runtime) — cast local
// necessário só para o typecheck.
expect.extend(toHaveNoViolations as unknown as Record<string, never>);

// jsdom does not implement matchMedia — several components read
// `prefers-reduced-motion` (UX-SPEC.md Seção 3.1, `motion.duration`) and
// need a default mock so tests don't crash.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
