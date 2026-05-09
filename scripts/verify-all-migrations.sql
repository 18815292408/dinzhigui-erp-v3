-- ============================================
-- 完整验证所有迁移状态的查询
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ============================================

-- 1. 验证 designs 是否还有 confirmed 状态 (007)
SELECT '007: confirmed designs' as migration, COUNT(*) as count FROM designs WHERE status = 'confirmed';

-- 2. 验证 users 表是否有 role_limits 字段 (008)
SELECT '008: users.role_limits' as migration, COUNT(*) as count 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'role_limits';

-- 3. 验证 users 表是否有 can_manage_users 字段 (009)
SELECT '009: users.can_manage_users' as migration, COUNT(*) as count 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'can_manage_users';

-- 4. 验证 installations.feedback 是否为 JSONB 类型 (010)
SELECT '010: feedback is JSONB' as migration, COUNT(*) as count 
FROM information_schema.columns 
WHERE table_name = 'installations' AND column_name = 'feedback' AND data_type = 'jsonb';

-- 5. 验证 installations 表是否有 after_sales_feedback 字段 (015)
SELECT '015: after_sales_feedback' as migration, COUNT(*) as count 
FROM information_schema.columns 
WHERE table_name = 'installations' AND column_name = 'after_sales_feedback';

-- 6. 验证 orders 表是否有 customer_id 字段
SELECT 'orders.customer_id' as migration, COUNT(*) as count 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'customer_id';
