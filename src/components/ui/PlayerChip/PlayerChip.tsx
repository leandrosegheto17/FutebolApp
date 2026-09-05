import type { DragEvent } from "react";
import { cn } from "@/lib/cn";
import styles from "./PlayerChip.module.css";

export interface PlayerChipProps {
  /** `atleta_id` — usado só como payload do HTML5 DnD (`dataTransfer`), nunca exibido. */
  atletaId: string;
  nome: string;
  /** RN-03. `null` no fallback local de "Gerar mesmo assim" (`times.ts`). */
  nivelTecnico: number | null;
  /**
   * Rótulo de posição tática decorativo (ATA/MEI/VOL/LAT/ZAG) — UX-SPEC.md
   * Parte II Seção 2.6/7.2 item 8: "decisão direta do organizador", texto
   * fixo de apresentação sem nenhum campo de dado real associado, sem
   * controle de atribuição. Renderizado como texto visível normal (não
   * `aria-hidden`) — ao contrário de um ícone puramente redundante, este é
   * conteúdo visual real sem equivalente textual adjacente, então escondê-lo
   * do leitor de tela seria uma perda de paridade de informação para quem
   * usa tecnologia assistiva, não um ganho de "limpeza" (WCAG 1.1.1 é sobre
   * não OMITIR informação, não sobre nunca marcar nada como decorativo).
   */
  posicao: string;
  /** Abre o seletor modal "trocar com quem?" (RF-05.4) — sempre disponível, em qualquer viewport. */
  onClick: () => void;
  /**
   * Atalho opcional de HTML5 DnD nativo (`ADR-014`, `lg`) — quando presente,
   * o chip aceita ser alvo de drop de outro `PlayerChip` e dispara a troca
   * dos dois atletas (mesmo efeito de selecionar este candidato no modal).
   * Decisão de detalhe (documentada, não escalada): o atributo `draggable`
   * fica sempre presente no DOM (sem detecção de breakpoint via JS) — a API
   * nativa de Drag and Drop do HTML5 só é acionada por um ponteiro de mouse
   * real (touch não dispara `dragstart` nativo em nenhum navegador-alvo,
   * RNF-09), o que já restringe o atalho a desktop/mouse na prática, sem
   * precisar de `matchMedia`/JS extra — e nunca remove/esconde o botão
   * "Trocar jogador" (Guardrail 30, RF-D01.4), que continua sendo este
   * mesmo elemento (`onClick`).
   */
  onDropAtleta?: (atletaIdArrastado: string) => void;
  className?: string;
}

/**
 * `PlayerChip` — UX-SPEC.md Parte II Seção 2.6/3.2 (novo, específico do
 * domínio, variante leve de `Card`). Elemento DOM real (`<button>`),
 * focável — herda navegação por teclado/leitura de tela nativamente, sem
 * reimplementar semântica (`ADR-014`, consequência positiva (a)/(b)).
 *
 * `aria-label` explícito ("Trocar {nome}, nível técnico {valor}") define a
 * *accessible name* do botão diretamente — o conteúdo visual (pin/nome) não
 * precisa ser individualmente escondido para evitar leitura duplicada,
 * porque `aria-label` já substitui o nome calculado a partir do conteúdo.
 * `nivelTecnico` (dado real de `AtletaMontado`, RN-03) fica só no rótulo
 * acessível, não pintado no chip — o mockup real (Seção 2.6) não desenha um
 * número por jogador, só o rótulo de posição decorativo; isto reconcilia a
 * descrição da Seção 3.2 ("nome + nível técnico") com o comp aprovado sem
 * reabrir nenhuma decisão visual (decisão de detalhe, documentada, não
 * escalada).
 */
export function PlayerChip({
  atletaId,
  nome,
  nivelTecnico,
  posicao,
  onClick,
  onDropAtleta,
  className,
}: PlayerChipProps) {
  const draggable = Boolean(onDropAtleta);

  function handleDragStart(event: DragEvent<HTMLButtonElement>) {
    event.dataTransfer.setData("text/plain", atletaId);
    event.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!onDropAtleta) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!onDropAtleta) return;
    event.preventDefault();
    const atletaIdArrastado = event.dataTransfer.getData("text/plain");
    if (atletaIdArrastado && atletaIdArrastado !== atletaId) {
      onDropAtleta(atletaIdArrastado);
    }
  }

  const nivelTexto =
    nivelTecnico === null
      ? "nível técnico não disponível"
      : `nível técnico ${nivelTecnico.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}`;

  return (
    <div
      className={cn(styles.wrapper, className)}
      onDragOver={draggable ? handleDragOver : undefined}
      onDrop={draggable ? handleDrop : undefined}
    >
      <button
        type="button"
        className={styles.chip}
        draggable={draggable}
        onDragStart={draggable ? handleDragStart : undefined}
        onClick={onClick}
        aria-label={`Trocar ${nome}, ${nivelTexto}`}
      >
        <span className={styles.pin}>{iniciaisChip(nome)}</span>
        <span className={styles.nome}>{nome}</span>
      </button>
      <span className={styles.posicao}>{posicao}</span>
    </div>
  );
}

function iniciaisChip(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "";
  if (partes.length === 1) return partes[0]!.slice(0, 2).toUpperCase();
  return `${partes[0]![0]}${partes[1]![0]}`.toUpperCase();
}
