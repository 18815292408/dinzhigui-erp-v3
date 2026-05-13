export interface FeedbackEntry {
  content: string
  date: string
}

export function normalizeFeedbackRecords(value: unknown): FeedbackEntry[] {
  if (Array.isArray(value)) return value as FeedbackEntry[]
  if (typeof value !== 'string') return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
