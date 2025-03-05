-- Materials Table
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_code TEXT UNIQUE,
  type TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_contact TEXT,
  received_date TIMESTAMP DEFAULT NOW(),
  current_stage TEXT DEFAULT 'received',
  status TEXT DEFAULT 'pending'
);

-- Tests Table
CREATE TABLE tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID REFERENCES materials(id),
  test_type TEXT,
  result TEXT,
  performed_by UUID,
  performed_at TIMESTAMP DEFAULT NOW()
);

-- Test Types Table
CREATE TABLE test_types (
  id SERIAL PRIMARY KEY,
  material_type TEXT,
  test_name TEXT
);

-- Insert Test Types
INSERT INTO test_types (material_type, test_name) VALUES
  ('sand', 'physical'), ('sand', 'chemical'),
  ('brick', 'strength'),
  ('metal', 'test1'), ('metal', 'test2'), ('metal', 'test3'), ('metal', 'test4');

-- QC Inspections Table
CREATE TABLE qc_inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID REFERENCES materials(id),
  inspected_by UUID,
  status TEXT,
  comments TEXT,
  inspected_at TIMESTAMP DEFAULT NOW()
);

-- Quotes Table
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID REFERENCES materials(id),
  amount DECIMAL,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Final Approvals Table
CREATE TABLE final_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID REFERENCES materials(id),
  approved_by UUID,
  status TEXT,
  comments TEXT,
  approved_at TIMESTAMP DEFAULT NOW()
);

-- Payments Table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID REFERENCES materials(id),
  amount DECIMAL,
  payment_date TIMESTAMP DEFAULT NOW(),
  payment_method TEXT,
  recorded_by UUID
);

##Supabase Context
These tables are set up in your existing Supabase account (materials-testing-shop) and contain the data for tracking materials, tests, and workflow stages.
User roles are configured in the raw_user_meta_data field of the auth.users table. For example, test@example.com should have "role": "uncle" for full permissions to test the entire workflow.
Ensure the "uncle" role has full access to all tables and actions across all stages for testing purposes. Other roles (Secretary, Tester, Manager, QC, Accounting) should be set similarly in raw_user_meta_data and restricted to their specific stages and actions via role-based logic in the app and Row-Level Security (RLS) if needed.