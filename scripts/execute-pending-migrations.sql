-- ============================================
-- 待执行的 SQL 迁移脚本
-- 根据验证结果，007_merge_design_order_flow.sql 需要执行
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ============================================

-- 迁移 007: 融合方案与订单流程的数据修复

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

-- 验证：确认迁移后没有 confirmed 状态的记录
SELECT 'confirmed designs after migration' as check_item, COUNT(*) as count 
FROM designs 
WHERE status = 'confirmed';

-- 验证：确认没有需要关联 customer_id 的记录
SELECT 'designs needing customer_id after migration' as check_item, COUNT(*) as count 
FROM designs 
WHERE order_id IS NOT NULL AND customer_id IS NULL;
