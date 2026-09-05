#!/usr/bin/env node
// Gate de dependencias do job `security-scan` (.github/workflows/ci.yml).
//
// Substitui `npm audit --audit-level=high` puro (BLOCKER-008, .md/BLOCKERS.md):
// aquele comando trata QUALQUER advisory alta/critica como falha dura, sem
// reconhecer debito de seguranca ja triado e aceito com prazo em
// .md/SECURITY-REVIEW.md (DEBT-01/DEBT-02/DEBT-04). Este script:
//
//   1. Roda `npm audit --json` e extrai cada advisory individual (GHSA id),
//      nao apenas a contagem agregada por pacote.
//   2. Para cada advisory de severidade alta/critica: falha o gate, A MENOS
//      QUE o GHSA id esteja listado em security/npm-audit-allowlist.json e a
//      data de hoje ainda esteja dentro de `revisar_ate` daquela entrada.
//   3. Advisory nova (GHSA id ausente da allowlist) OU entrada expirada
//      (`revisar_ate` no passado) SEMPRE falha o gate — fail-closed para
//      achado nao avaliado, conforme exigido por SECURITY-REVIEW.md Secao 4
//      item 2 e pelos guardrails do DevSecOps.
//
// A allowlist e por GHSA id especifico, nunca por nome de pacote — uma nova
// advisory em `next`/`vitest`/etc. (ainda nao presente aqui) continua
// falhando o gate mesmo que outras advisories do mesmo pacote ja estejam
// aceitas.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ALLOWLIST_PATH = path.join(__dirname, "..", "security", "npm-audit-allowlist.json");
const GATE_SEVERITIES = new Set(["high", "critical"]);

function runNpmAudit() {
  try {
    const stdout = execFileSync("npm", ["audit", "--json"], {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024 * 20,
      shell: process.platform === "win32",
    });
    return JSON.parse(stdout);
  } catch (err) {
    // `npm audit` sai com exit code 1 quando ha vulnerabilidade — isso e
    // esperado aqui, o JSON ainda vem em stdout.
    if (err.stdout) {
      return JSON.parse(err.stdout);
    }
    throw err;
  }
}

function loadAllowlist() {
  const raw = readFileSync(ALLOWLIST_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  const map = new Map();
  for (const entry of parsed.entries ?? []) {
    map.set(entry.id, entry);
  }
  return map;
}

function collectHighSeverityAdvisories(auditJson) {
  const advisories = new Map(); // ghsaId -> { id, severity, title, packages: Set }
  const vulnerabilities = auditJson.vulnerabilities ?? {};
  for (const [pkgName, vuln] of Object.entries(vulnerabilities)) {
    for (const via of vuln.via ?? []) {
      if (typeof via !== "object" || !via.url) continue;
      if (!GATE_SEVERITIES.has(via.severity)) continue;
      const id = via.url.split("/").pop();
      if (!advisories.has(id)) {
        advisories.set(id, {
          id,
          severity: via.severity,
          title: via.title,
          packages: new Set(),
        });
      }
      advisories.get(id).packages.add(pkgName);
    }
  }
  return [...advisories.values()];
}

function isExpired(entry, today) {
  return entry.revisar_ate < today;
}

function main() {
  const today = new Date().toISOString().slice(0, 10);
  const auditJson = runNpmAudit();
  const advisories = collectHighSeverityAdvisories(auditJson);
  const allowlist = loadAllowlist();

  if (advisories.length === 0) {
    console.log(
      "[security-audit-gate] Nenhuma advisory alta/critica encontrada. Gate OK.",
    );
    return 0;
  }

  let failed = false;
  const accepted = [];
  const blocking = [];

  for (const adv of advisories) {
    const entry = allowlist.get(adv.id);
    if (!entry) {
      blocking.push({ adv, reason: "não está na allowlist (achado novo/não avaliado)" });
      continue;
    }
    if (isExpired(entry, today)) {
      blocking.push({
        adv,
        reason: `débito ${entry.debt} expirado (revisar_ate=${entry.revisar_ate}, hoje=${today}) — precisa de reavaliação do DevSecOps antes de renovar`,
      });
      continue;
    }
    accepted.push({ adv, entry });
  }

  if (accepted.length > 0) {
    console.log(
      "[security-audit-gate] Advisories aceitas como débito de segurança já triado:",
    );
    for (const { adv, entry } of accepted) {
      console.log(
        `  - ${adv.id} (${adv.severity}, ${[...adv.packages].join(",")}) — ${entry.debt}, válido até ${entry.revisar_ate}. ${adv.title}`,
      );
    }
  }

  if (blocking.length > 0) {
    failed = true;
    console.error("");
    console.error(
      "[security-audit-gate] FALHA — advisories alta/crítica não cobertas por débito aceito:",
    );
    for (const { adv, reason } of blocking) {
      console.error(
        `  - ${adv.id} (${adv.severity}, ${[...adv.packages].join(",")}): ${reason}`,
      );
      console.error(`    ${adv.title}`);
    }
    console.error("");
    console.error(
      "Ação: DevSecOps precisa triar cada advisory acima em .md/SECURITY-REVIEW.md (achado novo bloqueante, ou",
      "renovação de débito existente) e, se aceita como débito, adicioná-la/renová-la em",
      "security/npm-audit-allowlist.json com data revisar_ate atualizada. Achado de compliance obrigatório ou",
      "de classe CWE-285/863 (autorização) NUNCA deve ir para a allowlist — precisa ser corrigido.",
    );
  }

  return failed ? 1 : 0;
}

process.exit(main());
