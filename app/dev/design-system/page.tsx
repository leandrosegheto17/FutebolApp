"use client";

import { useRef, useState } from "react";
import {
  Accordion,
  AppNav,
  Badge,
  BrandCrest,
  Button,
  Card,
  CardFooter,
  CardHeader,
  DateInput,
  EmptyState,
  Icon,
  type IconName,
  Modal,
  NumberInput,
  PasswordInput,
  SegmentedControl,
  SessionExpiryBanner,
  Skeleton,
  SkeletonGroup,
  Stepper,
  StepperCounter,
  Tabs,
  TextInput,
  useToast,
} from "@/components/ui";
import styles from "./page.module.css";

/**
 * Guia de estilo do Design System (FE-00) — não é uma tela de produto do
 * UX-SPEC.md, é uma vitrine viva de cada componente da Seção 3.2 nos seus
 * estados relevantes, usada como referência manual de QA/revisão e como
 * smoke test de build. As telas reais (FE-01…FE-12) importam de
 * `@/components/ui`, nunca reimplementam o que está aqui.
 *
 * Realocada de `/` para `/dev/design-system` em FE-02: `/` passou a ser a
 * primeira tela de produto real (T02 — Ranking Público, site map da
 * UX-SPEC.md Seção 1.2 — é o ponto de entrada da Área Pública), então não
 * podia mais ser ocupada pela vitrine manual de QA. Decisão de organização
 * de rotas (implementação), não uma mudança de UX-SPEC — nenhum conteúdo
 * deste arquivo foi alterado, só o caminho.
 */
const ICON_NAMES: IconName[] = [
  "lock",
  "alert-triangle",
  "eye",
  "eye-off",
  "zap",
  "more-vertical",
  "menu",
];

export default function StyleGuidePage() {
  const { showToast } = useToast();
  const [presenca, setPresenca] = useState<string | null>("presente");
  const [gols, setGols] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [tab, setTab] = useState("ranking");
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <main className={styles.page}>
      <AppNav
        items={[
          { href: "#atletas", label: "Atletas", active: true },
          { href: "#rodada", label: "Rodada" },
          { href: "#historico", label: "Histórico" },
          { href: "#times", label: "Times" },
          { href: "#restricoes", label: "Restrições" },
        ]}
        onLogout={() => showToast({ variant: "info", message: "Sessão encerrada." })}
        brand="Turma do Rola - Comary"
      />

      <div className={styles.content}>
        <h1>Design System — Turma do Rola Comary</h1>
        <p className={styles.lead}>
          Fundação do Design System (FE-00): tokens + componentes reutilizáveis base,
          conforme UX-SPEC.md Seção 3.
        </p>

        <SessionExpiryBanner visible />

        <section className={styles.section}>
          <h2>Button</h2>
          <div className={styles.row}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
            <Button variant="primary" loading>
              Confirmar Lançamento
            </Button>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Inputs</h2>
          <div className={styles.grid}>
            <TextInput label="Nome completo" required placeholder="Ex.: Carlinhos" />
            <TextInput
              label="Nome completo"
              error="Já existe um atleta com este nome"
              defaultValue="Carlinhos"
            />
            <DateInput label="Data de nascimento" required />
            <NumberInput label="Pontuação inicial" min={0} defaultValue={0} />
            <PasswordInput label="Senha" required />
          </div>
        </section>

        <section className={styles.section}>
          <h2>SegmentedControl</h2>
          <SegmentedControl
            label="Presença de Carlinhos"
            value={presenca}
            onChange={setPresenca}
            options={[
              { value: "presente", label: "Presente" },
              { value: "ausente", label: "Ausente" },
              { value: "lesionado", label: "Lesionado" },
            ]}
          />
        </section>

        <section className={styles.section}>
          <h2>StepperCounter</h2>
          <StepperCounter label="Gols de Carlinhos" value={gols} onChange={setGols} />
        </section>

        <section className={styles.section}>
          <h2>Badge/Tag</h2>
          <div className={styles.row}>
            <Badge variant="success" icon={<span>✓</span>}>
              Presente
            </Badge>
            <Badge variant="danger" icon={<span>✕</span>}>
              Ausente
            </Badge>
            <Badge variant="warning" icon={<span>⚕</span>}>
              Lesionado
            </Badge>
            <Badge variant="warning">🟨 1 cartão amarelo</Badge>
            <Badge variant="danger">🟥 0 cartões vermelhos</Badge>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Card</h2>
          <Card>
            <CardHeader>João Pedro — 1º lugar</CardHeader>
            <p>42 pts · 12 presenças · 1 cartão</p>
            <CardFooter>Atualizado em 02/09/2026</CardFooter>
          </Card>
        </section>

        <section className={styles.section}>
          <h2>Tabs</h2>
          <Tabs
            label="Navegação pública"
            value={tab}
            onChange={setTab}
            items={[
              {
                value: "ranking",
                label: "Ranking",
                panel: <p>Lista de ranking aqui.</p>,
              },
              {
                value: "presenca",
                label: "Presença Mensal",
                panel: <p>Lista de presença mensal aqui.</p>,
              },
            ]}
          />
        </section>

        <section className={styles.section}>
          <h2>Accordion</h2>
          <Accordion
            items={[
              {
                value: "05-09",
                title: "05/09 · Presentes: 18",
                content: <p>João Pedro, Carlinhos, Rafa…</p>,
              },
              {
                value: "12-09",
                title: "12/09 · Presentes: 15",
                content: <p>Marquinhos, Bruno…</p>,
              },
            ]}
          />
        </section>

        <section className={styles.section}>
          <h2>Modal/Dialog</h2>
          <Button variant="danger" onClick={() => setModalOpen(true)}>
            Excluir rodada
          </Button>
          <Modal
            open={modalOpen}
            title="Excluir rodada 05/09/2026?"
            onClose={() => setModalOpen(false)}
            initialFocusRef={cancelRef as React.RefObject<HTMLElement>}
            actions={
              <>
                <Button
                  ref={cancelRef}
                  variant="ghost"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setModalOpen(false);
                    showToast({
                      variant: "success",
                      message: "Correção aplicada, log de auditoria atualizado.",
                    });
                  }}
                >
                  Sim, excluir e estornar
                </Button>
              </>
            }
          >
            <p>
              Isso reverte automaticamente TODOS os pontos desta rodada (presença, gols,
              cartões, substituições vinculadas) para 20 atletas. Esta ação gera registro
              no log de auditoria e não pode ser desfeita.
            </p>
          </Modal>
        </section>

        <section className={styles.section}>
          <h2>Toast/Alert banner</h2>
          <div className={styles.row}>
            <Button
              variant="primary"
              onClick={() =>
                showToast({ variant: "success", message: "Atleta salvo com sucesso" })
              }
            >
              Disparar toast de sucesso
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                showToast({
                  variant: "danger",
                  message: "Não foi possível salvar. Tente novamente.",
                })
              }
            >
              Disparar toast de erro
            </Button>
          </div>
        </section>

        <section className={styles.section}>
          <h2>EmptyState</h2>
          <EmptyState
            title="Nenhuma rodada lançada ainda"
            description="Lance a primeira rodada para começar o histórico."
            action={<Button>Lançar rodada</Button>}
          />
        </section>

        <section className={styles.section}>
          <h2>Skeleton</h2>
          <SkeletonGroup label="Carregando ranking">
            <Skeleton height={20} width="60%" />
            <Skeleton height={20} width="80%" />
            <Skeleton height={20} width="40%" />
          </SkeletonGroup>
        </section>

        <section className={styles.section}>
          <h2>Icon (FE-R00)</h2>
          <p>
            Substitui apenas os emoji da Parte I sem evidência no mockup real — os 5 emoji
            confirmados no mockup (🥇🥈🥉⚽🟨🟥🔄✓) permanecem emoji, não migram para este
            componente (UX-SPEC.md Parte II Seção 3.4).
          </p>
          <div className={styles.row}>
            {ICON_NAMES.map((name) => (
              <span
                key={name}
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <Icon name={name} aria-label={name} />
                <code>{name}</code>
              </span>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2>BrandCrest (FE-R00)</h2>
          <p>
            Placeholder até PM+stakeholder confirmarem direito de uso do brasão real
            (`logo.jpg`, RNF-D04) — ver comentário em `BrandCrest.tsx`.
          </p>
          <div className={styles.row} style={{ alignItems: "center" }}>
            <BrandCrest size="large" />
            <BrandCrest size="compact" />
          </div>
        </section>

        <section className={styles.section}>
          <h2>Stepper (wizard)</h2>
          <Stepper
            steps={["Presença", "Eventos", "Revisão e Confirmação"]}
            currentStep={wizardStep}
            onBack={() => setWizardStep((s) => Math.max(0, s - 1))}
            onNext={() => setWizardStep((s) => Math.min(2, s + 1))}
            nextLabel={wizardStep === 2 ? "Confirmar Lançamento" : "Continuar →"}
          >
            <p>Conteúdo da etapa {wizardStep + 1} (preenchido pela tela real, FE-05).</p>
          </Stepper>
        </section>
      </div>
    </main>
  );
}
