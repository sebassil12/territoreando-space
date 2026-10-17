import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve, relative, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// Use existing TypeScript to exercise browser-independent logic and SSR without new dependencies.
const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../src')
const temporaryRoot = await mkdtemp(join(tmpdir(), 'scenario-ui-tests-'))
const compiled = new Map()
async function compile(source) {
  if (compiled.has(source)) return compiled.get(source)
  const target = join(temporaryRoot, relative(sourceRoot, source).replace(/\.tsx?$/, '.mjs'))
  const url = pathToFileURL(target).href
  compiled.set(source, url)
  let code = ts.transpileModule(await readFile(source, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    fileName: source,
  }).outputText
  for (const match of [...code.matchAll(/\bfrom\s+(['"])([^'"]+)\1/g)]) {
    const dependency = match[2]
    const child = dependency.startsWith('.') ? await resolveSource(resolve(dirname(source), dependency)) : null
    const childUrl = child ? await compile(child) : import.meta.resolve(dependency)
    code = code.replace(match[0], `from '${childUrl}'`)
  }
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, code)
  return url
}
async function resolveSource(path) {
  for (const extension of ['.ts', '.tsx']) {
    try { await readFile(path + extension); return path + extension } catch { /* Try the next source extension. */ }
  }
  throw new Error(`Unknown test source: ${path}`)
}
export const loadSource = async (name) => import(await compile(resolve(sourceRoot, name)))
export const cleanModules = () => rm(temporaryRoot, { recursive: true, force: true })
