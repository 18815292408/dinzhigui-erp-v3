-- 开启 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 门店表（单店 MVP 固定一条记录）
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT '我的门店',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  email TEXT,
  phone TEXT,
  display_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'designer', 'sales', 'installer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- 索引：users.organization_id
CREATE INDEX idx_users_org ON users(organization_id);

-- 客户表
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  house_type TEXT,
  requirements TEXT,
  intention_level TEXT CHECK (intention_level IN ('high', 'medium', 'low')),
  intention_reason TEXT,
  ai_analyzed_at TIMESTAMPTZ,
  follow_ups JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引：customers.created_by
CREATE INDEX idx_customers_created_by ON customers(created_by);

-- 方案表
CREATE TABLE designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'confirmed')),
  title TEXT,
  room_count INTEGER,
  total_area DECIMAL(10,2),
  description TEXT,
  price DECIMAL(12,2),
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引：designs.organization_id, designs.created_by
CREATE INDEX idx_designs_org ON designs(organization_id);
CREATE INDEX idx_designs_created_by ON designs(created_by);

-- 安装表
CREATE TABLE installations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  design_id UUID REFERENCES designs(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  scheduled_date DATE,
  completed_at TIMESTAMPTZ,
  feedback TEXT,
  issues JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引：installations.organization_id, installations.assigned_to
CREATE INDEX idx_installations_org ON installations(organization_id);
CREATE INDEX idx_installations_assigned_to ON installations(assigned_to);

-- AI 意向分析记录表
CREATE TABLE intention_analysis_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  input_data JSONB NOT NULL,
  output_level TEXT NOT NULL,
  output_reason TEXT,
  api_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引：intention_analysis_logs.customer_id
CREATE INDEX idx_intention_logs_customer ON intention_analysis_logs(customer_id);

-- 启用 RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE intention_analysis_logs ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can only see own organization" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Owner can manage organization" ON organizations
  FOR ALL USING (
    id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Users can view own org users" ON users
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage their own profile" ON users
  FOR UPDATE USING (id = auth.uid());

-- MVP: Users can delete their own profile (auth.users cascade handles cleanup)
CREATE POLICY "Users can delete own profile" ON users
  FOR DELETE USING (id = auth.uid());

-- NOTE: For MVP simplicity, these policies grant org-wide access to ALL members.
-- Role-based access control can be added in future iterations.

CREATE POLICY "All org members can manage customers" ON customers
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "All org members can manage designs" ON designs
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "All org members can manage installations" ON installations
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can read own org logs" ON intention_analysis_logs
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

-- 创建额外索引
CREATE INDEX idx_customers_intention ON customers(intention_level);
CREATE INDEX idx_designs_customer ON designs(customer_id);
CREATE INDEX idx_installations_customer ON installations(customer_id);

-- 创建初始 organization（MVP 单店）
INSERT INTO organizations (id, name) VALUES ('00000000-0000-0000-0000-000000000001', '我的门店');

-- 创建自动创建 user profile 的 trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, organization_id, email, phone, display_name, role)
  VALUES (
    new.id,
    '00000000-0000-0000-0000-000000000001',
    new.email,
    new.raw_user_meta_data->>'phone',
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'sales'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
