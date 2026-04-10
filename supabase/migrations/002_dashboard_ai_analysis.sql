-- Dashboard AI Analysis storage table
CREATE TABLE IF NOT EXISTS dashboard_ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  insights JSONB NOT NULL,
  summary TEXT,
  total_customers INTEGER DEFAULT 0,
  analyzed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_dashboard_ai_analysis_org ON dashboard_ai_analysis(organization_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_ai_analysis_created ON dashboard_ai_analysis(created_at DESC);
