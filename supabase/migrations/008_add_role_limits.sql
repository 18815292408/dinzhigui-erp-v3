-- 添加老板账号创建限额字段
-- 格式: {"manager": 2, "sales": 5, "designer": 3, "installer": 3}
-- NULL 表示使用系统默认值（店长1、导购3、设计师3、安装3）
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role_limits JSONB DEFAULT NULL;

COMMENT ON COLUMN public.users.role_limits IS '老板账号的各类角色创建限额，null 使用默认值';
