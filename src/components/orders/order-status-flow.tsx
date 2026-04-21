'use client'

const STATUS_STEPS = [
  { key: 'pending_dispatch', label: '待派单' },
  { key: 'pending_design', label: '待接单' },
  { key: 'designing', label: '设计中' },
  { key: 'pending_order', label: '待下单' },
  { key: 'pending_payment', label: '待打款' },
  { key: 'pending_shipment', label: '待出货' },
  { key: 'in_install', label: '安装中' },
  { key: 'completed', label: '已完成' }
]

interface OrderStatusFlowProps {
  currentStatus: string
}

export function OrderStatusFlow({ currentStatus }: OrderStatusFlowProps) {
  const currentIndex = STATUS_STEPS.findIndex(s => s.key === currentStatus)

  return (
    <div className="flex items-center overflow-x-auto pb-2">
      {STATUS_STEPS.map((step, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex
        return (
          <div key={step.key} className="flex items-center">
            <div className={`flex flex-col items-center ${isCompleted || isCurrent ? '' : 'opacity-40'}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  isCompleted ? 'bg-green-500 text-white' :
                  isCurrent ? 'bg-blue-500 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              <div className="text-xs mt-1 whitespace-nowrap">{step.label}</div>
            </div>
            {index < STATUS_STEPS.length - 1 && (
              <div className={`w-8 h-0.5 mx-1 ${index < currentIndex ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
