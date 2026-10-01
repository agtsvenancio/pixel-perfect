CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  empresa TEXT NOT NULL,
  email TEXT NOT NULL,
  investe_marketing TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  appointment_status TEXT NOT NULL DEFAULT 'pending',
  appointment_date DATE,
  appointment_start TIMESTAMPTZ,
  appointment_end TIMESTAMPTZ,
  calendar_event_id TEXT,
  meeting_url TEXT,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT, utm_term TEXT,
  gclid TEXT, fbclid TEXT, landing_page TEXT, referrer TEXT
);
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;