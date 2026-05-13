-- 添加退订相关字段到 orders 表
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id);

-- 添加退订订单日志表
CREATE TABLE IF NOT EXISTS order_cancel_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  order_id UUID REFERENCES orders(id) NOT NULL,
  cancelled_by UUID REFERENCES users(id) NOT NULL,
  cancelled_by_name TEXT,
  order_no TEXT NOT NULL,
  customer_name TEXT,
  signed_amount DECIMAL(12,2),
  final_order_amount DECIMAL(12,2),
  previous_status TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_orders_cancelled_at ON orders(cancelled_at);
CREATE INDEX IF NOT EXISTS idx_order_cancel_logs_org ON order_cancel_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_order_cancel_logs_order ON order_cancel_logs(order_id);

-- RLS 策略
ALTER TABLE order_cancel_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_cancel_logs_select_owner_manager" ON order_cancel_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "order_cancel_logs_select_related" ON order_cancel_logs
  FOR SELECT USING (
    cancelled_by = auth.uid() OR
    order_id IN (
      SELECT id FROM orders WHERE
        created_by = auth.uid() OR
        assigned_designer = auth.uid() OR
        assigned_installer = auth.uid()
    )
  );
