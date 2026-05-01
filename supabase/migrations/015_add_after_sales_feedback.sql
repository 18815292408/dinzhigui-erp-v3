ALTER TABLE installations ADD COLUMN IF NOT EXISTS after_sales_feedback JSONB DEFAULT '[]'::jsonb;
