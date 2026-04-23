-- orders 表新增字段
ALTER TABLE orders ADD COLUMN IF NOT EXISTS signed_amount DECIMAL(12,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS final_order_amount DECIMAL(12,2);

-- customers 表新增字段
ALTER TABLE customers ADD COLUMN IF NOT EXISTS order_stage TEXT DEFAULT NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS has_active_order BOOLEAN DEFAULT FALSE;
