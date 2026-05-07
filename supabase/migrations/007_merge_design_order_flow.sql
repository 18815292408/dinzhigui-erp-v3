-- 融合方案与订单流程的数据修复
-- 将 designs 表的 confirmed 状态迁移为 submitted
-- 为已有 order_id 的 design 关联 customer_id（通过 orders 表的 customer_name 匹配 customers 表）

-- 1. 将 designs 的 confirmed 状态改为 submitted（融合后没有 confirmed 状态了）
UPDATE designs
SET status = 'submitted', updated_at = NOW()
WHERE status = 'confirmed';

-- 2. 为有 order_id 但 customer_id 为 null 的 design 关联客户
-- 通过 orders 表的 customer_name 匹配 customers 表
UPDATE designs
SET customer_id = (
  SELECT c.id FROM customers c
  WHERE c.name = (
    SELECT o.customer_name FROM orders o WHERE o.id = designs.order_id
  )
  LIMIT 1
)
WHERE designs.order_id IS NOT NULL
  AND designs.customer_id IS NULL;

-- 3. 确保 orders 表有 customer_id 字段（如果还没有的话）
-- 注意：如果 orders 表已经通过其他方式有了 customer_id，这一步可以跳过
-- 如果报错说字段已存在，可以删除这行
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
