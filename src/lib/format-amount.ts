/**
 * 金额工具函数
 *
 * 统一规则：
 * - 数据库存储：元
 * - API 传输：元
 * - 用户输入：万元
 * - 用户显示：>= 10000 显示为 ¥X.X万，< 10000 显示为 ¥X
 */

/** 万元 → 元（用户输入值转数据库值） */
export function wanToYuan(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (Number.isNaN(n) || n === 0) return null
  return n * 10000
}

/** 元 → 万元显示值 */
export function yuanToWan(value: number | null | undefined): string {
  if (!value || value === 0) return ''
  return (value / 10000).toString()
}

/** 元 → 格式化显示字符串 */
export function formatMoney(value: number | null | undefined): string {
  if (!value && value !== 0) return '未填写'
  if (value === 0) return '¥0'
  if (value >= 10000) {
    const wan = value / 10000
    // 整数万不显示小数，非整数保留 1-2 位
    if (wan % 1 === 0) return `¥${wan}万`
    return `¥${wan.toFixed(2).replace(/\.?0+$/, '')}万`
  }
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
