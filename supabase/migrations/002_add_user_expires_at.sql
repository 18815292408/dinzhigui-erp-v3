-- 添加账号有效期字段
ALTER TABLE users ADD COLUMN expires_at TIMESTAMPTZ;

-- 允许 null 值表示永久有效
COMMENT ON COLUMN users.expires_at IS '账号过期时间，null 表示永久有效';
