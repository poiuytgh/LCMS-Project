-- Sample data for LCMS development and testing

-- Insert sample spaces
INSERT INTO public.spaces (code, name, type, description, status) VALUES
('A101', 'ห้องสำนักงาน A101', 'office', 'ห้องสำนักงานขนาด 50 ตร.ม. พร้อมเฟอร์นิเจอร์', 'available'),
('A102', 'ห้องสำนักงาน A102', 'office', 'ห้องสำนักงานขนาด 75 ตร.ม. วิวสวย', 'occupied'),
('B201', 'ร้านค้า B201', 'retail', 'ร้านค้าหน้าร้านขนาด 40 ตร.ม.', 'available'),
('B202', 'ร้านค้า B202', 'retail', 'ร้านค้าหน้าร้านขนาด 60 ตร.ม.', 'occupied'),
('C301', 'โกดังเก็บของ C301', 'warehouse', 'โกดังขนาด 200 ตร.ม. เหมาะสำหรับเก็บสินค้า', 'maintenance');

-- Note: Profiles will be created automatically when users register through Supabase Auth
-- Sample contracts will be inserted after user registration in development

-- Insert sample notifications types for reference
-- These will be created dynamically by the application
