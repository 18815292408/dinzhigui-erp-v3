-- ============================================
-- 最终验证：一次性检查所有迁移状态
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ============================================

SELECT 
  '007: confirmed designs' as migration,
  CASE WHEN (SELECT COUNT(*) FROM designs WHERE status = 'confirmed') = 0 
    THEN '✅ 已完成' ELSE '❌ 未完成' END as status
UNION ALL
SELECT 
  '008: users.role_limits',
  CASE WHEN (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role_limits') = 1 
    THEN '✅ 已完成' ELSE '❌ 未完成' END
UNION ALL
SELECT 
  '009: users.can_manage_users',
  CASE WHEN (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'can_manage_users') = 1 
    THEN '✅ 已完成' ELSE '❌ 未完成' END
UNION ALL
SELECT 
  '010: feedback is JSONB',
  CASE WHEN (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'installations' AND column_name = 'feedback' AND data_type = 'jsonb') = 1 
    THEN '✅ 已完成' ELSE '❌ 未完成' END
UNION ALL
SELECT 
  '015: after_sales_feedback',
  CASE WHEN (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'installations' AND column_name = 'after_sales_feedback') = 1 
    THEN '✅ 已完成' ELSE '❌ 未完成' END
UNION ALL
SELECT 
  'orders.customer_id',
  CASE WHEN (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_id') = 1 
    THEN '✅ 已完成' ELSE '❌ 未完成' END;
