import { LucideIcon } from 'lucide-react'

export function StatsCards({
  icon: Icon,
  label,
  value,
  gradient,
  bgGradient,
}: {
  icon: LucideIcon
  label: string
  value: number
  gradient: string
  bgGradient: string
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-apple-gray-200/50 hover:shadow-md transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${bgGradient}`}>
          <span className="text-[12px] font-medium text-apple-gray-900">全部</span>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[13px] font-medium text-apple-gray-500">{label}</p>
        <p className="text-[36px] font-semibold text-apple-gray-900 tracking-tight mt-1">{value}</p>
      </div>

      {/* Subtle trend indicator */}
      <div className="mt-4 flex items-center gap-1.5">
        <div className="w-6 h-6 rounded-full bg-apple-green/10 flex items-center justify-center">
          <svg className="w-3 h-3 text-apple-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </div>
        <span className="text-[13px] text-apple-gray-500">较上月持平</span>
      </div>
    </div>
  )
}
