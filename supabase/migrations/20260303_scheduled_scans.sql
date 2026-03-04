CREATE TABLE IF NOT EXISTS scheduled_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  location_id UUID REFERENCES business_locations(id) ON DELETE CASCADE,
  keywords JSONB NOT NULL DEFAULT '[]',
  grid_size INTEGER NOT NULL DEFAULT 7,
  radius DECIMAL(5,2) NOT NULL DEFAULT 2.0,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly')),
  next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scheduled_scans_business ON scheduled_scans(business_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_scans_next_run ON scheduled_scans(next_run_at) WHERE next_run_at IS NOT NULL;
