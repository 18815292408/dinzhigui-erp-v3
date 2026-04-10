import { IntentionBadge } from '@/components/customers/intention-badge'
import Link from 'next/link'
import { Clock, UserPlus, ArrowRight } from 'lucide-react'

export function RecentActivity({ customers }: { customers: any[] }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-apple-gray-200/50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-apple-blue/10 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-apple-blue" />
          </div>
          <div>
            <h3 className="text-[17px] font-semibold text-apple-gray-900">最近新增客户</h3>
            <p className="text-[13px] text-apple-gray-500">最新 {customers.length} 条记录</p>
          </div>
        </div>
        <Link
          href="/customers"
          className="flex items-center gap-1 text-[14px] font-medium text-apple-blue hover:text-apple-blue-hover transition-colors"
        >
          查看全部
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-apple-gray-100 flex items-center justify-center mb-4">
            <UserPlus className="w-8 h-8 text-apple-gray-300" />
          </div>
          <p className="text-[15px] text-apple-gray-500">暂无客户数据</p>
          <p className="text-[13px] text-apple-gray-300 mt-1">点击上方添加客户开始使用</p>
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map((customer, index) => (
            <Link
              key={customer.id}
              href={`/customers/${customer.id}`}
              className="flex items-center justify-between p-4 rounded-xl bg-apple-gray-50/50 hover:bg-apple-gray-100 active:bg-apple-gray-200 transition-all duration-200 group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center">
                  <span className="text-[15px] font-semibold text-white">
                    {customer.name?.charAt(0) || '新'}
                  </span>
                </div>

                <div>
                  <p className="text-[15px] font-semibold text-apple-gray-900">{customer.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-apple-gray-300" />
                    <span className="text-[13px] text-apple-gray-500">
                      {new Date(customer.created_at).toLocaleDateString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <IntentionBadge level={customer.intention_level} />
                <ArrowRight className="w-4 h-4 text-apple-gray-300 group-hover:text-apple-blue transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
