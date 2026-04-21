-- 1. 创建 orders 表
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  order_no TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  house_type TEXT,
  house_area DECIMAL(10,2),
  created_by UUID REFERENCES users(id),
  assigned_designer UUID REFERENCES users(id),
  assigned_installer UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending_dispatch',
  design_due_days INTEGER CHECK (design_due_days IN (7, 10, 12, 15)),
  design_due_date DATE,
  factory_records JSONB DEFAULT '[]',
  payment_status TEXT DEFAULT 'unpaid',
  payment_confirmed_at TIMESTAMPTZ,
  estimated_shipment_date DATE,
  installation_status TEXT DEFAULT 'pending_ship',
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  remarks JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建 factories 表
CREATE TABLE factories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 创建 notifications 表
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  type TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('urgent', 'important', 'normal', 'info')),
  title TEXT NOT NULL,
  summary TEXT,
  related_order_id UUID REFERENCES orders(id),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 创建 supplements 表
CREATE TABLE supplements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  order_id UUID REFERENCES orders(id) NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed')),
  confirmed_by UUID REFERENCES users(id),
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 修改 users 表添加 manager 角色
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('owner', 'manager', 'designer', 'sales', 'installer'));

-- 6. 创建索引
CREATE INDEX idx_orders_org ON orders(organization_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_designer ON orders(assigned_designer);
CREATE INDEX idx_orders_installer ON orders(assigned_installer);
CREATE INDEX idx_orders_created_by ON orders(created_by);
CREATE INDEX idx_orders_payment_date ON orders(payment_confirmed_at);
CREATE INDEX idx_factories_org ON factories(organization_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_supplements_order ON supplements(order_id);

-- 7. RLS 策略
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplements ENABLE ROW LEVEL SECURITY;

-- orders RLS
CREATE POLICY "orders_select_owner_manager" ON orders
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "orders_select_designer" ON orders
  FOR SELECT USING (assigned_designer = auth.uid());

CREATE POLICY "orders_select_sales" ON orders
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "orders_select_installer" ON orders
  FOR SELECT USING (assigned_installer = auth.uid());

CREATE POLICY "orders_insert_sales" ON orders
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "orders_update_owner_manager" ON orders
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "orders_update_designer" ON orders
  FOR UPDATE USING (
    assigned_designer = auth.uid() AND
    status IN ('pending_design', 'designing', 'pending_order', 'pending_shipment')
  );

CREATE POLICY "orders_update_installer" ON orders
  FOR UPDATE USING (
    assigned_installer = auth.uid() AND
    status = 'in_install'
  );

CREATE POLICY "orders_delete_owner_manager" ON orders
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- factories RLS
CREATE POLICY "factories_select" ON factories
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "factories_insert_owner_manager" ON factories
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "factories_update_owner_manager" ON factories
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "factories_delete_owner_manager" ON factories
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- notifications RLS
CREATE POLICY "notifications_select_owner_manager" ON notifications
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_system" ON notifications
  FOR INSERT WITH CHECK (true);

-- supplements RLS
CREATE POLICY "supplements_select_owner_manager" ON supplements
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "supplements_select_related" ON supplements
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE
        assigned_designer = auth.uid() OR
        assigned_installer = auth.uid() OR
        created_by = auth.uid()
    )
  );

CREATE POLICY "supplements_insert_installer" ON supplements
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM orders WHERE id = order_id AND assigned_installer = auth.uid()
    )
  );

CREATE POLICY "supplements_update_designer" ON supplements
  FOR UPDATE USING (
    (confirmed_by = auth.uid()) OR
    (status = 'completed')
  );
