import Link from 'next/link'
import { ArrowRight, CheckCircle, ClipboardList, CreditCard, FileText, Truck, UserRoundCheck } from 'lucide-react'

const iconByKey: Record<string, any> = {
  pending_dispatch: ClipboardList,
  design: FileText,
  pending_order: UserRoundCheck,
  pending_payment: CreditCard,
  install: Truck,
  completed_this_month: CheckCircle,
}

const colorByKey: Record<string, string> = {
  pending_dispatch: 'bg-slate-100 text-slate-700',
  design: 'bg-blue-100 text-blue-700',
  pending_order: 'bg-purple-100 text-purple-700',
  pending_payment: 'bg-amber-100 text-amber-700',
  install: 'bg-cyan-100 text-cyan-700',
  completed_this_month: 'bg-green-100 text-green-700',
}

export function OrderFlowCards({ cards }: { cards: any[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
      {cards.map((card) => {
        const Icon = iconByKey[card.key] || ClipboardList
        return (
          <Link
            key={card.key}
            href={card.href}
            className="rounded-lg border bg-white p-4 transition-colors hover:bg-gray-50"
          >
            <div className="flex items-center justify-between gap-2">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colorByKey[card.key] || 'bg-gray-100 text-gray-700'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-3xl font-semibold">{card.count}</p>
              <p className="mt-2 min-h-[32px] text-xs text-muted-foreground">{card.description}</p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
