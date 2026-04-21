ALTER TABLE installations ADD COLUMN shipment_date DATE;
ALTER TABLE installations ADD COLUMN arrival_date DATE;
ALTER TABLE installations ADD COLUMN delivery_date DATE;
ALTER TABLE installations ADD COLUMN install_date DATE;
ALTER TABLE installations ADD COLUMN installer_name TEXT;
ALTER TABLE installations ADD COLUMN supplement_records JSONB DEFAULT '[]';
