-- Cấu hình Supabase Schema cho Shop Cash Manager

-- Xóa bảng nếu đã tồn tại để tránh lỗi
DROP TABLE IF EXISTS cash_reserve;
DROP TABLE IF EXISTS daily_closing;
DROP TABLE IF EXISTS shifts;
DROP TABLE IF EXISTS employees;

-- Bảng nhân viên
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  hourly_rate NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bảng ca làm việc
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  opening_cash NUMERIC DEFAULT 0,
  cash_revenue NUMERIC DEFAULT 0,
  bank_revenue NUMERIC DEFAULT 0,
  expense NUMERIC DEFAULT 0,
  -- Các cột expected_cash và difference sẽ được tính trên ứng dụng client hoặc có thể dùng GENERATED ALWAYS trong PG 12+
  expected_cash NUMERIC GENERATED ALWAYS AS (opening_cash + cash_revenue - expense) STORED,
  actual_cash NUMERIC,
  difference NUMERIC GENERATED ALWAYS AS (actual_cash - (opening_cash + cash_revenue - expense)) STORED,
  hours_worked NUMERIC,
  salary NUMERIC,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bảng đóng ca hàng ngày
CREATE TABLE daily_closing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE UNIQUE NOT NULL,
  cash_total NUMERIC NOT NULL,
  cash_reserved NUMERIC DEFAULT 0,
  next_day_opening NUMERIC GENERATED ALWAYS AS (cash_total - cash_reserved) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bảng quỹ tách riêng
CREATE TABLE cash_reserve (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bật RLS nhưng cho phép all access vì đây là app nội bộ
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_closing ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_reserve ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to employees" ON employees FOR ALL USING (true);
CREATE POLICY "Allow all access to shifts" ON shifts FOR ALL USING (true);
CREATE POLICY "Allow all access to daily_closing" ON daily_closing FOR ALL USING (true);
CREATE POLICY "Allow all access to cash_reserve" ON cash_reserve FOR ALL USING (true);
