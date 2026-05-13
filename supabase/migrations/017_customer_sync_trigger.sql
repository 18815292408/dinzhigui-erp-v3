-- 客户信息变更时自动同步关联订单的冗余字段
-- 解决 customers 表与 orders 表数据一致性问题

-- 1. 创建触发器函数：当客户姓名变更时，同步更新 orders 表的 customer_name
CREATE OR REPLACE FUNCTION sync_customer_name_to_orders()
RETURNS TRIGGER AS $$
BEGIN
  -- 只有当 name 字段发生变化时才更新
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    UPDATE orders
    SET customer_name = NEW.name,
        updated_at = NOW()
    WHERE customer_name = OLD.name
      AND organization_id = NEW.organization_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 创建触发器：在 customers 表更新后执行
DROP TRIGGER IF EXISTS trg_sync_customer_name_to_orders ON customers;
CREATE TRIGGER trg_sync_customer_name_to_orders
  AFTER UPDATE OF name ON customers
  FOR EACH ROW
  EXECUTE FUNCTION sync_customer_name_to_orders();

-- 3. 创建触发器函数：当客户电话、地址、房型变更时，同步更新 orders 表的对应字段
-- 注意：只更新 orders 表中对应字段为空的记录，避免覆盖订单创建时填写的信息
CREATE OR REPLACE FUNCTION sync_customer_info_to_orders()
RETURNS TRIGGER AS $$
BEGIN
  -- 同步电话：只更新 orders 中 customer_phone 为空的记录
  IF OLD.phone IS DISTINCT FROM NEW.phone THEN
    UPDATE orders
    SET customer_phone = COALESCE(customer_phone, NEW.phone),
        updated_at = NOW()
    WHERE customer_name = NEW.name
      AND organization_id = NEW.organization_id
      AND customer_phone IS NULL;
  END IF;

  -- 同步地址：只更新 orders 中 customer_address 为空的记录
  IF OLD.address IS DISTINCT FROM NEW.address THEN
    UPDATE orders
    SET customer_address = COALESCE(customer_address, NEW.address),
        updated_at = NOW()
    WHERE customer_name = NEW.name
      AND organization_id = NEW.organization_id
      AND customer_address IS NULL;
  END IF;

  -- 同步房型：只更新 orders 中 house_type 为空的记录
  IF OLD.house_type IS DISTINCT FROM NEW.house_type THEN
    UPDATE orders
    SET house_type = COALESCE(house_type, NEW.house_type),
        updated_at = NOW()
    WHERE customer_name = NEW.name
      AND organization_id = NEW.organization_id
      AND house_type IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 创建触发器：在 customers 表更新后执行（针对电话、地址、房型）
DROP TRIGGER IF EXISTS trg_sync_customer_info_to_orders ON customers;
CREATE TRIGGER trg_sync_customer_info_to_orders
  AFTER UPDATE OF phone, address, house_type ON customers
  FOR EACH ROW
  EXECUTE FUNCTION sync_customer_info_to_orders();

-- 5. 添加注释说明
COMMENT ON FUNCTION sync_customer_name_to_orders() IS '当客户姓名变更时，自动同步更新关联订单的 customer_name 字段';
COMMENT ON FUNCTION sync_customer_info_to_orders() IS '当客户电话、地址、房型变更时，自动同步更新关联订单的对应字段（仅更新空值）';
