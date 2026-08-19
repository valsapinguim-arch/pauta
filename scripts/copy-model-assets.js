// Copia o modelo Basic Pitch e os binários WASM do TensorFlow.js de
// node_modules para public/models/ — ver Tarefa 7, decisão 3.
//
// Corre-se uma vez, à mão (`pnpm copy-model-assets`), tal como
// `pnpm generate-pwa-assets` (Tarefa 2): os ficheiros gerados ficam
// versionados em `public/`, não recopiados a cada build. Assim o que está no
// repositório é exatamente o que a app serve, sem um passo de build a
// decidir isso sozinho — e um `pnpm install` mais tarde (com uma versão nova
// do modelo ou do tfjs-backend-wasm) só têm efeito quando alguém correr isto
// de propósito e rever o diff.
//
// Node puro (`fs`), sem dependência nova só para copiar ficheiros — script
// pequeno e corre em qualquer SO (Windows incluído, ver AGENTS.md).

import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

const BASIC_PITCH_MODEL_DIR = join(root, 'node_modules/@spotify/basic-pitch/model')
const TFJS_WASM_DIR = join(root, 'node_modules/@tensorflow/tfjs-backend-wasm/dist')

const MODEL_DEST = join(root, 'public/models/basic-pitch')
const WASM_DEST = join(root, 'public/models/tfjs-wasm')

const MODEL_FILES = ['model.json', 'group1-shard1of1.bin']
const WASM_FILES = [
  'tfjs-backend-wasm.wasm',
  'tfjs-backend-wasm-simd.wasm',
  'tfjs-backend-wasm-threaded-simd.wasm',
]

function copyAll(sourceDir, destDir, files) {
  mkdirSync(destDir, { recursive: true })
  for (const file of files) {
    copyFileSync(join(sourceDir, file), join(destDir, file))
    console.log(`copiado: ${file} -> ${destDir}`)
  }
}

copyAll(BASIC_PITCH_MODEL_DIR, MODEL_DEST, MODEL_FILES)
copyAll(TFJS_WASM_DIR, WASM_DEST, WASM_FILES)
