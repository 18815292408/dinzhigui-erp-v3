import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'

const root = process.cwd()
const require = createRequire(import.meta.url)
const sourcePath = path.join(root, 'src/lib/factory-shipment.ts')
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
  require,
})

const {
  confirmFactoryArrival,
  getFactoryShipmentViewState,
  hasAnyFactoryShipment,
  setFactoryShipmentDate,
} = module.exports

const records = [
  { factory_id: 'factory-a', factory_name: 'Factory A', amount: 12000 },
  { factory_id: 'factory-b', factory_name: 'Factory B', amount: 8000 },
]

const shipmentResult = setFactoryShipmentDate(records, 'factory-a', '2026-05-02')

assert.equal(shipmentResult.records[0].shipment_date, '2026-05-02')
assert.equal(shipmentResult.records[1].shipment_date, undefined)
assert.equal(shipmentResult.hasAnyShipment, true)
assert.equal(hasAnyFactoryShipment(shipmentResult.records), true)
assert.notEqual(shipmentResult.records, records, 'factory record updates must be immutable')
assert.notEqual(shipmentResult.records[0], records[0], 'updated factory record must be copied')

assert.throws(
  () => setFactoryShipmentDate(records, 'missing-factory', '2026-05-02'),
  /Factory record not found/
)

assert.throws(
  () => confirmFactoryArrival(records, 'factory-a', '2026-05-03T10:00:00.000Z'),
  /Shipment date is required/
)

const partialArrival = confirmFactoryArrival(
  shipmentResult.records,
  'factory-a',
  '2026-05-03T10:00:00.000Z'
)

assert.equal(partialArrival.records[0].arrival_date, '2026-05-03T10:00:00.000Z')
assert.equal(partialArrival.allArrived, false)

const allShipped = setFactoryShipmentDate(
  partialArrival.records,
  'factory-b',
  '2026-05-04'
).records
const allArrived = confirmFactoryArrival(
  allShipped,
  'factory-b',
  '2026-05-05T10:00:00.000Z'
)

assert.equal(allArrived.records[1].arrival_date, '2026-05-05T10:00:00.000Z')
assert.equal(allArrived.allArrived, true)

assert.equal(
  JSON.stringify(getFactoryShipmentViewState('customer', 'shipped', shipmentResult.records)),
  JSON.stringify({ showFactoryCard: true, canManageFactoryTiming: false }),
  'customer pages should display factory dates without allowing edits'
)

assert.equal(
  JSON.stringify(getFactoryShipmentViewState('installation', 'shipped', shipmentResult.records)),
  JSON.stringify({ showFactoryCard: true, canManageFactoryTiming: true }),
  'installation pages should manage factory shipment and arrival before all factories arrive'
)

assert.equal(
  JSON.stringify(getFactoryShipmentViewState('installation', 'arrived', partialArrival.records)),
  JSON.stringify({ showFactoryCard: true, canManageFactoryTiming: true }),
  'installation pages should still manage factory timing when the order status is arrived but some factories lack arrival dates'
)

assert.equal(
  JSON.stringify(getFactoryShipmentViewState('installation', 'arrived', allArrived.records)),
  JSON.stringify({ showFactoryCard: true, canManageFactoryTiming: false }),
  'installation pages should still show factory arrival times after all factories arrive'
)
