-- installations 表增加 order_id 字段
-- 用于关联订单，确保订单ID贯穿全流程

ALTER TABLE installations ADD COLUMN order_id UUID REFERENCES orders(id);

-- 创建索引
CREATE INDEX idx_installations_order ON installations(order_id);
