// Verifica o orçamento do JavaScript de arranque — Tarefa 19, decisão 8.
//
// Corre depois de `vite build` (ver `package.json`, script "build"). Lê
// dist/index.html, soma o tamanho gzip de cada <script type="module"> aí
// referenciado (o que carrega mesmo no arranque) e falha a build se
// ultrapassar o orçamento. VexFlow (Tarefa 13) e o modelo (Tarefa 7) nunca
// aparecem aqui — os dois só entram por import() dinâmico, por isso o
// Vite gera-os como chunks à parte, nunca referenciados por um <script> no
// HTML.
//
// Node puro (fs, zlib), sem dependência nova — mesma razão de
// scripts/copy-model-assets.js.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const distDir = join(root, 'dist')
const htmlPath = join(distDir, 'index.html')

/** KB, gzip. Escolhido com folga sobre o tamanho atual (~100 KB gzip:
 *  React, React DOM, o código da app, Toast do radix-ui, idb, o cliente de
 *  registo do service worker) — não medido em dispositivo real (ver
 *  docs/performance.md, Tarefa 19, decisão 1). O objetivo é impedir que o
 *  arranque cresça sem ninguém decidir isso, não afinar o número em si;
 *  subir este valor exige justificação na mesma alteração de código. */
const BUDGET_KB = 200

const html = readFileSync(htmlPath, 'utf-8')
const entryScripts = [...html.matchAll(/<script[^>]+src="(\/assets\/[^"]+\.js)"/g)].map(
  (match) => match[1],
)

if (entryScripts.length === 0) {
  console.error('[bundle-budget] não encontrei nenhum <script type="module"> em dist/index.html')
  process.exit(1)
}

let totalGzipBytes = 0
for (const src of entryScripts) {
  const filePath = join(distDir, src.replace(/^\//, ''))
  const raw = readFileSync(filePath)
  const gzipBytes = gzipSync(raw).length
  totalGzipBytes += gzipBytes
  console.log(`[bundle-budget] ${src}: ${(gzipBytes / 1024).toFixed(1)} KB gzip`)
}

const totalKb = totalGzipBytes / 1024
console.log(
  `[bundle-budget] total do arranque: ${totalKb.toFixed(1)} KB gzip (orçamento: ${BUDGET_KB} KB)`,
)

if (totalKb > BUDGET_KB) {
  console.error(
    `[bundle-budget] FALHOU: ${totalKb.toFixed(1)} KB excede o orçamento de ${BUDGET_KB} KB gzip — ver Tarefa 19, decisão 8, AGENTS.md.`,
  )
  process.exit(1)
}

console.log('[bundle-budget] OK')
