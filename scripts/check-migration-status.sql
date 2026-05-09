-- ============================================
-- 验证 SQL 迁移执行状态的查询脚本
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ============================================

-- 1. 检查 users 表是否有 role_limits 和 can_manage_users 字段
-- 对应迁移: 008_add_role_limits.sql, 009_add_can_manage_users.sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('role_limits', 'can_manage_users')
ORDER BY column_name;

-- 2. 检查 installations 表是否有 after_sales_feedback 字段
-- 对应迁移: 015_add_after_sales_feedback.sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'installations'
  AND column_name = 'after_sales_feedback';

-- 3. 检查 installations.feedback 字段类型是否为 JSONB
-- 对应迁移: 010_installation_feedback_records.sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'installations'
  AND column_name = 'feedback';

-- 4. 检查 designs 表中是否还有 status='confirmed' 的记录
-- 对应迁移: 007_merge_design_order_flow.sql
-- 如果返回 0 条，说明迁移已执行；如果有记录，说明需要执行
SELECT COUNT(*) as confirmed_designs_count
FROM designs
WHERE status = 'confirmed';

-- 5. 检查 designs 表中 order_id 不为空但 customer_id 为空的记录
-- 对应迁移: 007_merge_design_order_flow.sql
SELECT COUNT(*) as designs_needing_customer_id
FROM designs
WHERE order_id IS NOT NULL
  AND customer_id IS NULL;
