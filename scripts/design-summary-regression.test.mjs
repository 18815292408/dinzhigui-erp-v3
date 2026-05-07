import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'

const root = process.cwd()
const require = createRequire(import.meta.url)
function loadTypeScriptModule(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  })
  const module = { exports: {} }
  vm.runInNewContext(compiled.outputText, {
    exports: module.exports,
    module,
    require,
  })
  return module.exports
}

const sourcePath = path.join(root, 'src/lib/design-summary.ts')
const source = fs.readFileSync(sourcePath, 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
})

const module = { exports: {} }
vm.runInNewContext(compiled.outputText, {
  exports: module.exports,
  module,
  require: (specifier) => {
    if (specifier === '@/lib/format-amount') {
      return loadTypeScriptModule('src/lib/format-amount.ts')
    }
    return require(specifier)
  },
})

const { buildDesignSummary } = module.exports

const summary = buildDesignSummary(
  {
    title: '全屋定制方案',
    room_count: 3,
    total_area: 110,
    final_price: 98000,
    description: '客餐厅一体化设计',
    kujiale_link: 'https://example.com/kujiale',
    cad_file: 'layout.dwg',
    cad_file_url: 'https://example.com/layout.dwg',
  },
  120000
)

assert.equal(
  JSON.stringify(summary),
  JSON.stringify({
    title: '全屋定制方案',
    roomCount: '3',
    totalArea: '110 ㎡',
    amount: '¥12万（来自订单）',
    description: '客餐厅一体化设计',
    kujialeLink: 'https://example.com/kujiale',
    cadFileName: 'layout.dwg',
    cadFileUrl: 'https://example.com/layout.dwg',
  })
)

const fallbackSummary = buildDesignSummary(
  {
    title: null,
    room_count: null,
    total_area: null,
    final_price: 56000,
    description: '',
    kujiale_link: null,
    cad_file: null,
    cad_file_url: null,
  },
  null
)

assert.equal(fallbackSummary.title, '方案信息')
assert.equal(fallbackSummary.roomCount, '未填写')
assert.equal(fallbackSummary.totalArea, '未填写')
assert.equal(fallbackSummary.amount, '¥5.6万')
assert.equal(fallbackSummary.description, null)
