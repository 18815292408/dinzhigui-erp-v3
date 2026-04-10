// AI intention analysis client helper
export async function analyzeIntention(customerId: string, accessToken: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-intention`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ customer_id: customerId }),
    }
  )
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`AI analysis failed: ${error}`)
  }

  return response.json()
}
