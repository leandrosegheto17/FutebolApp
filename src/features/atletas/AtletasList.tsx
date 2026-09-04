"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertBanner,
  Badge,
  Button,
  EmptyState,
  Skeleton,
  SkeletonGroup,
} from "@/components/ui";
import { ROUTES } from "@/lib/routes";
import { SessionExpiredError, useHandleSessionExpired } from "@/features/sessao";
import { fetchAtletas } from "./atletasApi";
import { formatNivelTecnico } from "./format";
import type { Atleta } from "./types";
import styles from "./AtletasList.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; items: Atleta[] };

const ERROR_MESSAGE = "Não foi possível carregar os atletas agora. Tente novamente.";
const SKELETON_ROW_COUNT = 5;

/**
 * T04 — lista de atletas (ponto de entrada da tela, UX-SPEC.md Seção 2 —
 * "Nível técnico... exibido apenas em modo leitura na lista/perfil do
 * atleta"). O wireframe da Seção 2 não desenha esta lista explicitamente
 * (só o formulário de criação/edição), mas sua existência é necessária e
 * implícita: é o único jeito de o organizador navegar até a edição de um
 * atleta já existente (RF-01.6) e alcançar a ação de anonimização
 * (disponível apenas na edição, nunca na criação). Decisão de detalhe
 * documentada (TASK.md Seção 1.0 — "não é lacuna estrutural que impeça a
 * implementação", não escalada ao `ux-ui`): lista mínima, mesmo padrão
 * visual/estados de carregamento-vazio-erro já usado por
 * `RankingList`/`PresencaMensal` (FE-02/FE-03).
 */
export function AtletasList() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const router = useRouter();
  const handleSessionExpired = useHandleSessionExpired();

  const load = useCallback(() => {
    setState({ status: "loading" });
    fetchAtletas()
      .then((items) => setState({ status: "success", items }))
      .catch((err) => {
        if (err instanceof SessionExpiredError) {
          handleSessionExpired();
          return;
        }
        setState({ status: "error", message: ERROR_MESSAGE });
      });
  }, [handleSessionExpired]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Atletas</h1>
        <Button type="button" onClick={() => router.push(ROUTES.novoAtleta)}>
          Novo atleta
        </Button>
      </div>

      {state.status === "loading" && (
        <SkeletonGroup label="Carregando atletas">
          {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
            <Skeleton key={index} height={56} />
          ))}
        </SkeletonGroup>
      )}

      {state.status === "error" && (
        <div className={styles.errorWrapper}>
          <AlertBanner variant="danger">{state.message}</AlertBanner>
          <Button variant="secondary" onClick={load}>
            Tentar novamente
          </Button>
        </div>
      )}

      {state.status === "success" && state.items.length === 0 && (
        <EmptyState title="Nenhum atleta cadastrado ainda" />
      )}

      {state.status === "success" && state.items.length > 0 && (
        <ul className={styles.list}>
          {state.items.map((atleta) => (
            <li key={atleta.id} className={styles.item}>
              <Link href={`/atletas/${atleta.id}`} className={styles.itemLink}>
                <span className={styles.itemName}>{atleta.nome_completo}</span>
                <span className={styles.itemMeta}>
                  Nível técnico: {formatNivelTecnico(atleta.nivel_tecnico)}
                  {!atleta.ativo && (
                    <Badge variant="neutral" className={styles.badge}>
                      {atleta.anonimizado_em ? "Anonimizado" : "Inativo"}
                    </Badge>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
