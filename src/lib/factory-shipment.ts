export interface FactoryShipmentRecord {
  factory_id: string
  factory_name?: string | null
  contact_name?: string | null
  contact_phone?: string | null
  amount?: number | null
  shipment_date?: string | null
  arrival_date?: string | null
  [key: string]: unknown
}

export function normalizeFactoryRecords(records: unknown): FactoryShipmentRecord[] {
  if (!Array.isArray(records)) return []

  return records.filter((record): record is FactoryShipmentRecord => {
    return Boolean(
      record &&
      typeof record === 'object' &&
      'factory_id' in record &&
      typeof (record as FactoryShipmentRecord).factory_id === 'string'
    )
  })
}

export function hasAnyFactoryShipment(records: FactoryShipmentRecord[]): boolean {
  return records.some((record) => Boolean(record.shipment_date))
}

export function setFactoryShipmentDate(
  records: FactoryShipmentRecord[],
  factoryId: string,
  shipmentDate: string
): { records: FactoryShipmentRecord[]; hasAnyShipment: boolean } {
  if (!factoryId) throw new Error('Factory id is required')
  if (!shipmentDate) throw new Error('Shipment date is required')

  let found = false
  const updatedRecords = records.map((record) => {
    if (record.factory_id !== factoryId) return record
    found = true
    return {
      ...record,
      shipment_date: shipmentDate,
    }
  })

  if (!found) throw new Error('Factory record not found')

  return {
    records: updatedRecords,
    hasAnyShipment: hasAnyFactoryShipment(updatedRecords),
  }
}

export function confirmFactoryArrival(
  records: FactoryShipmentRecord[],
  factoryId: string,
  arrivalDate: string
): { records: FactoryShipmentRecord[]; allArrived: boolean } {
  if (!factoryId) throw new Error('Factory id is required')
  if (!arrivalDate) throw new Error('Arrival date is required')

  let found = false
  const updatedRecords = records.map((record) => {
    if (record.factory_id !== factoryId) return record

    found = true
    if (!record.shipment_date) throw new Error('Shipment date is required before arrival')

    return {
      ...record,
      arrival_date: arrivalDate,
    }
  })

  if (!found) throw new Error('Factory record not found')

  return {
    records: updatedRecords,
    allArrived: updatedRecords.length > 0 && updatedRecords.every((record) => Boolean(record.arrival_date)),
  }
}

export function getFactoryShipmentViewState(
  page: 'customer' | 'installation',
  installationStatus: string | null | undefined,
  factoryRecords?: unknown
): { showFactoryCard: boolean; canManageFactoryTiming: boolean } {
  const status = String(installationStatus || '')
  const records = normalizeFactoryRecords(factoryRecords)
  const hasFactoryRecords = records.length > 0
  const allFactoriesArrived = hasFactoryRecords && records.every((record) => Boolean(record.arrival_date))
  const isShipmentStage = ['pending_ship', 'shipped'].includes(status)
  const isArrivalOrInstallStage = [
    'arrived',
    'delivering',
    'installing',
    'supplement_pending',
    'installed',
  ].includes(status)

  if (page === 'customer') {
    return {
      showFactoryCard: isShipmentStage || isArrivalOrInstallStage,
      canManageFactoryTiming: false,
    }
  }

  return {
    showFactoryCard: isShipmentStage || isArrivalOrInstallStage,
    canManageFactoryTiming: isShipmentStage || (status === 'arrived' && hasFactoryRecords && !allFactoriesArrived),
  }
}
