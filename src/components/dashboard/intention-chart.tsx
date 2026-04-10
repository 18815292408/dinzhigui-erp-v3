'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Target } from 'lucide-react'

const COLORS = ['#FF3B30', '#FF9500', '#34C759']

export function IntentionChart({ distribution }: { distribution: { high: number, medium: number, low: number } }) {
  const data = [
    { name: '重度意向', value: distribution.high, color: '#FF3B30' },
    { name: '中度意向', value: distribution.medium, color: '#FF9500' },
    { name: '轻度意向', value: distribution.low, color: '#34C759' },
  ].filter(d => d.value > 0)

  const total = distribution.high + distribution.medium + distribution.low

  if (total === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-apple-gray-200/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-apple-orange/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-apple-orange" />
          </div>
          <div>
            <h3 className="text-[17px] font-semibold text-apple-gray-900">客户意向分布</h3>
            <p className="text-[13px] text-apple-gray-500">AI 分析结果</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-[180px] text-apple-gray-500">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-apple-gray-100 flex items-center justify-center">
              <Target className="w-8 h-8 text-apple-gray-300" />
            </div>
            <p className="text-[15px]">暂无意向数据</p>
            <p className="text-[13px] mt-1">添加客户后查看分布</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-apple-gray-200/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-apple-orange/10 flex items-center justify-center">
          <Target className="w-5 h-5 text-apple-orange" />
        </div>
        <div>
          <h3 className="text-[17px] font-semibold text-apple-gray-900">客户意向分布</h3>
          <p className="text-[13px] text-apple-gray-500">AI 分析结果</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Pie chart */}
        <div className="w-[160px] h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginTop: '-160px', height: '160px' }}>
            <div className="text-center">
              <p className="text-[24px] font-semibold text-apple-gray-900">{total}</p>
              <p className="text-[11px] text-apple-gray-500">总计</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-4">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[14px] text-apple-gray-900">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold text-apple-gray-900">{item.value}</span>
                <span className="text-[13px] text-apple-gray-500">
                  ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
