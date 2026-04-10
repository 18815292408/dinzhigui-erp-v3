const intentionConfig = {
  high: { label: '重度', bg: 'bg-apple-red/10', text: 'text-apple-red', dot: 'bg-apple-red' },
  medium: { label: '中度', bg: 'bg-apple-orange/10', text: 'text-apple-orange', dot: 'bg-apple-orange' },
  low: { label: '轻度', bg: 'bg-apple-green/10', text: 'text-apple-green', dot: 'bg-apple-green' },
}

export function IntentionBadge({ level }: { level: string | null }) {
  if (!level || !intentionConfig[level as keyof typeof intentionConfig]) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-apple-gray-100 text-[13px] font-medium text-apple-gray-500">
        <span className="w-1.5 h-1.5 rounded-full bg-apple-gray-300" />
        未分析
      </span>
    )
  }

  const config = intentionConfig[level as keyof typeof intentionConfig]

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}意向
    </span>
  )
}
