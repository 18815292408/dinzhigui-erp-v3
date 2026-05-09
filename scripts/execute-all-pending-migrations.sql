-- ============================================
-- 待执行的 SQL 迁移脚本汇总
-- 根据验证结果执行以下迁移
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ============================================

-- ============================================
-- 迁移 1: 添加 orders.customer_id 字段
-- 对应文件: 007_merge_design_order_flow.sql (第3部分)
-- ============================================

-- 为 orders 表添加 customer_id 字段（如果不存在）
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- 为已有订单关联 customer_id（通过 customer_name 匹配）
UPDATE orders
SET customer_id = (
  SELECT c.id FROM customers c
  WHERE c.name = orders.customer_name
  LIMIT 1
)
WHERE orders.customer_id IS NULL
  AND orders.customer_name IS NOT NULL;

-- ============================================
-- 验证所有迁移是否完成
-- ============================================

-- 验证 orders.customer_id 是否已添加
SELECT 'orders.customer_id exists' as check_item, COUNT(*) as count 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'customer_id';

-- 验证 orders 表中是否还有未关联 customer_id 的记录
SELECT 'orders needing customer_id' as check_item, COUNT(*) as count 
FROM orders 
WHERE customer_id IS NULL AND customer_name IS NOT NULL;
