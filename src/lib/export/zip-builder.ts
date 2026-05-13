import JSZip from 'jszip'

export interface OrderFiles {
  orderNo: string
  excelBuffer: Uint8Array | Buffer
  attachments: { fileName: string; fileBuffer: Buffer }[]
}

function sanitize(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || '未知订单'
}

export async function buildSingleOrderZip(order: OrderFiles): Promise<Uint8Array> {
  const zip = new JSZip()
  zip.file('订单信息表.xlsx', order.excelBuffer)

  if (order.attachments.length > 0) {
    const attFolder = zip.folder('附件')
    if (attFolder) {
      for (const att of order.attachments) {
        attFolder.file(att.fileName, att.fileBuffer)
      }
    }
  }

  return await zip.generateAsync({ type: 'uint8array' })
}

export async function buildBatchOrdersZip(orders: OrderFiles[]): Promise<Uint8Array> {
  const zip = new JSZip()

  for (const order of orders) {
    const folderName = sanitize(order.orderNo || order.orderNo)
    const orderFolder = zip.folder(folderName)
    if (!orderFolder) continue

    orderFolder.file('订单信息表.xlsx', order.excelBuffer)

    if (order.attachments.length > 0) {
      const attFolder = orderFolder.folder('附件')
      if (attFolder) {
        for (const att of order.attachments) {
          attFolder.file(att.fileName, att.fileBuffer)
        }
      }
    }
  }

  return await zip.generateAsync({ type: 'uint8array' })
}
