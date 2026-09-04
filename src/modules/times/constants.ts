/**
 * Constantes do Serviço de Times (BE-11, TASK.md Seção 3.1/Seção 6.2 item 3).
 */

/**
 * Orçamento de tempo (ms) para a geração completa de uma sugestão de times
 * (backtracking, ADR-007, + busca local) dentro da função de API — decisão
 * já registrada no `TASK.md` Seção 6.2 item 3: "guarda de tempo de 8
 * segundos... margem de segurança abaixo do limite prático de execução
 * serverless do tier gratuito/hobby da Vercel" (10s no plano Hobby para
 * Serverless/Route Handlers). 8s deixa ~2s de margem para overhead de
 * rede/parsing/serialização antes que a própria plataforma corte a
 * execução — o guard precisa "vencer a corrida" contra o timeout da
 * plataforma, nunca o contrário (se o guard só disparasse depois, o
 * resultado seria a função inteira sendo abortada pela Vercel sem resposta
 * nenhuma ao cliente, o oposto do que esta tarefa exige).
 */
export const TIMEOUT_MONTAGEM_MS = 8_000;

/** Quantidade mínima de presentes aceita — abaixo disso não há o que dividir em times. */
export const MIN_ATLETAS_PARA_MONTAGEM = 2;

/**
 * Teto de `quantidade_times` aceito pela API — decisão de detalhe (não
 * escalada): nem RF-05.1 nem o ADR-010 fixam um limite superior para `N`
 * (só exigem que o algoritmo seja parametrizado por ele, TASK.md Seção
 * 1.4). Um teto evita abuso/erro de input (ex.: `quantidade_times: 1000`
 * para uma lista de 20 presentes) sem contradizer a exigência de
 * parametrização — a interface desta release expõe só `N=2` (TASK.md Seção
 * 6.2 item 1), então 10 já é uma folga generosa para qualquer uso real
 * futuro de "times menores para treino" sem abrir a porta para um input
 * degenerado.
 */
export const MAX_QUANTIDADE_TIMES = 10;

/**
 * Teto de iterações da fase 2 (busca local, swap iterativo) — proteção
 * adicional independente do `deadline`: garante que a busca local sempre
 * termina em tempo previsível mesmo se o cálculo de custo por iteração for,
 * por algum motivo, mais caro que o esperado. Na prática, o `deadline`
 * compartilhado (`TIMEOUT_MONTAGEM_MS`) já limita o tempo total antes deste
 * teto ser alcançado para o volume real esperado (~30-40 presentes, ADR-007).
 */
export const MAX_ITERACOES_BUSCA_LOCAL = 200;

/** Tolerância mínima de melhoria de custo para aceitar um swap (evita "flutuação" por ponto flutuante). */
export const EPSILON_MELHORIA_CUSTO = 1e-9;
