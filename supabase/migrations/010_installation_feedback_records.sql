-- 将 installations.feedback 从 TEXT 改为 JSONB，支持多条反馈记录
-- 旧数据：单条文本 → 转为数组 [{ content: 原文本, date: updated_at }]
ALTER TABLE installations
  ALTER COLUMN feedback TYPE JSONB
  USING CASE
    WHEN feedback IS NULL THEN '[]'::jsonb
    WHEN feedback = '' THEN '[]'::jsonb
    ELSE jsonb_build_array(jsonb_build_object(
      'content', feedback,
      'date', COALESCE(updated_at::text, NOW()::text)
    ))
  END;

ALTER TABLE installations
  ALTER COLUMN feedback SET DEFAULT '[]'::jsonb;
