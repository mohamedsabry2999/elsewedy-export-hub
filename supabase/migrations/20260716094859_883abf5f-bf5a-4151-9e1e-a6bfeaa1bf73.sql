
-- Enums
CREATE TYPE public.app_role AS ENUM (
  'system_owner','export_manager','sales_specialist','sales_coordinator',
  'pricing','production','logistics','accounting','viewer'
);

CREATE TYPE public.lead_status AS ENUM (
  'new','contacted','qualified','nurturing','proposal','won','lost'
);

CREATE TYPE public.lead_temperature AS ENUM ('hot','warm','cold');

CREATE TYPE public.company_status AS ENUM ('active','inactive','prospect','customer','archived');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  job_title TEXT,
  department TEXT,
  language TEXT DEFAULT 'ar',
  timezone TEXT DEFAULT 'Africa/Cairo',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('system_owner','export_manager')
  )
$$;

-- Profiles policies
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "Admins insert profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) OR auth.uid() = id);
CREATE POLICY "Admins delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- User roles policies
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- updated_at trigger fn
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto profile + first user = owner
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count INT;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)));
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'system_owner');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Companies
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_ar TEXT,
  logo_url TEXT,
  country TEXT,
  city TEXT,
  address TEXT,
  website TEXT,
  linkedin TEXT,
  industry TEXT,
  company_type TEXT,
  company_size TEXT,
  employees_count INT,
  description TEXT,
  products_offered TEXT,
  products_needed TEXT,
  current_supplier TEXT,
  expected_volume TEXT,
  priority TEXT DEFAULT 'medium',
  rating TEXT,
  source TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.company_status NOT NULL DEFAULT 'prospect',
  currency TEXT DEFAULT 'USD',
  language TEXT DEFAULT 'en',
  timezone TEXT,
  last_contact_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read companies" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert companies" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Owner or admin update companies" ON public.companies FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Admin delete companies" ON public.companies FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE TRIGGER companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Contacts
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  job_title TEXT,
  department TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  linkedin TEXT,
  country TEXT,
  city TEXT,
  language TEXT,
  timezone TEXT,
  is_decision_maker BOOLEAN DEFAULT false,
  is_influencer BOOLEAN DEFAULT false,
  influence_level TEXT,
  preferred_channel TEXT,
  best_time_to_contact TEXT,
  birthday DATE,
  notes TEXT,
  last_contact_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read contacts" ON public.contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert contacts" ON public.contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update contacts" ON public.contacts FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Admin delete contacts" ON public.contacts FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER contacts_updated BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_name TEXT,
  contact_name TEXT,
  country TEXT,
  city TEXT,
  industry TEXT,
  source TEXT,
  exhibition_id UUID,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_requested TEXT,
  print_type TEXT,
  expected_quantity TEXT,
  size TEXT,
  material TEXT,
  finishes TEXT,
  expected_order_date DATE,
  expected_value NUMERIC(14,2),
  currency TEXT DEFAULT 'USD',
  temperature public.lead_temperature DEFAULT 'warm',
  priority TEXT DEFAULT 'medium',
  probability INT DEFAULT 20 CHECK (probability BETWEEN 0 AND 100),
  lead_score INT DEFAULT 0 CHECK (lead_score BETWEEN 0 AND 100),
  status public.lead_status NOT NULL DEFAULT 'new',
  next_step TEXT,
  next_followup_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Owner or admin update leads" ON public.leads FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Admin delete leads" ON public.leads FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_companies_country ON public.companies(country);
CREATE INDEX idx_companies_status ON public.companies(status);
CREATE INDEX idx_contacts_company ON public.contacts(company_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_owner ON public.leads(owner_id);
