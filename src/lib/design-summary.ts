import { formatMoney } from '@/lib/format-amount'

interface DesignSummaryInput {
  title?: string | null
  room_count?: number | null
  total_area?: number | null
  final_price?: number | null
  description?: string | null
  kujiale_link?: string | null
  cad_file?: string | null
  cad_file_url?: string | null
}

export interface DesignSummary {
  title: string
  roomCount: string
  totalArea: string
  amount: string
  description: string | null
  kujialeLink: string | null
  cadFileName: string | null
  cadFileUrl: string | null
}

export function buildDesignSummary(
  design: DesignSummaryInput | null | undefined,
  signedAmount?: number | null
): DesignSummary {
  return {
    title: design?.title || '方案信息',
    roomCount: design?.room_count ? String(design.room_count) : '未填写',
    totalArea: design?.total_area ? `${design.total_area} ㎡` : '未填写',
    amount: signedAmount
      ? `${formatMoney(signedAmount)}（来自订单）`
      : design?.final_price
        ? formatMoney(design.final_price)
        : '未填写',
    description: design?.description?.trim() || null,
    kujialeLink: design?.kujiale_link || null,
    cadFileName: design?.cad_file || null,
    cadFileUrl: design?.cad_file_url || null,
  }
}
