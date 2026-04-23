-- designs 表增加 order_id 字段
-- 用于关联订单，确保订单ID贯穿全流程

ALTER TABLE designs ADD COLUMN order_id UUID REFERENCES orders(id);

-- 创建索引
CREATE INDEX idx_designs_order ON designs(order_id);
