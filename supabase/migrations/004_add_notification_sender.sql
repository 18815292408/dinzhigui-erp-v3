ALTER TABLE notifications ADD COLUMN sender_id UUID REFERENCES users(id);
CREATE INDEX idx_notifications_sender ON notifications(sender_id);
