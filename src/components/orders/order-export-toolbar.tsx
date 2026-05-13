'use client'

import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'

interface OrderExportToolbarProps {
  selectedCount: number
  totalCount: number
  allSelected: boolean
  onSelectAll: (checked: boolean) => void
  onExport: () => void
  isExporting: boolean
}

export function OrderExportToolbar({
  selectedCount,
  totalCount,
  allSelected,
  onSelectAll,
  onExport,
  isExporting,
}: OrderExportToolbarProps) {
  return (
    <div className="flex items-center justify-between py-3 px-1">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            checked={allSelected}
            onChange={(e) => onSelectAll(e.target.checked)}
          />
          <span className="text-muted-foreground">
            已选择 {selectedCount} / {totalCount} 个订单
          </span>
        </label>
      </div>

      <Button
        variant="default"
        size="sm"
        onClick={onExport}
        disabled={selectedCount === 0 || isExporting}
        className="bg-green-600 hover:bg-green-700 text-white"
      >
        {isExporting ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-1.5 h-4 w-4" />
        )}
        导出选中订单
      </Button>
    </div>
  )
}
