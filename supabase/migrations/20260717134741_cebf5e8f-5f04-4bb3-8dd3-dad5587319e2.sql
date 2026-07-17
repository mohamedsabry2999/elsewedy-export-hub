-- Expand opportunity_stage enum to full 22-stage export pipeline (non-destructive)
ALTER TYPE public.opportunity_stage ADD VALUE IF NOT EXISTS 'contacted' AFTER 'new';
ALTER TYPE public.opportunity_stage ADD VALUE IF NOT EXISTS 'needs_analysis' AFTER 'qualified';
ALTER TYPE public.opportunity_stage ADD VALUE IF NOT EXISTS 'sample_requested' AFTER 'needs_analysis';
ALTER TYPE public.opportunity_stage ADD VALUE IF NOT EXISTS 'sample_sent' AFTER 'sample_requested';
ALTER TYPE public.opportunity_stage ADD VALUE IF NOT EXISTS 'sample_approved' AFTER 'sample_sent';
ALTER TYPE public.opportunity_stage ADD VALUE IF NOT EXISTS 'rfq_received' AFTER 'sample_approved';
ALTER TYPE public.opportunity_stage ADD VALUE IF NOT EXISTS 'proposal_sent' AFTER 'proposal';
ALTER TYPE public.opportunity_stage ADD VALUE IF NOT EXISTS 'contract_review' AFTER 'negotiation';
ALTER TYPE public.opportunity_stage ADD VALUE IF NOT EXISTS 'verbal_agreement' AFTER 'contract_review';
ALTER TYPE public.opportunity_stage ADD VALUE IF NOT EXISTS 'po_received' AFTER 'verbal_agreement';
ALTER TYPE public.opportunity_stage ADD VALUE IF NOT EXISTS 'deposit_pending' AFTER 'po_received';
ALTER TYPE public.opportunity_stage ADD VALUE IF NOT EXISTS 'deposit_received' AFTER 'deposit_pending';
ALTER TYPE public.opportunity_stage ADD VALUE IF NOT EXISTS 'production' AFTER 'deposit_received';
ALTER TYPE public.opportunity_stage ADD VALUE IF NOT EXISTS 'ready_to_ship' AFTER 'production';
ALTER TYPE public.opportunity_stage ADD VALUE IF NOT EXISTS 'shipped' AFTER 'ready_to_ship';
ALTER TYPE public.opportunity_stage ADD VALUE IF NOT EXISTS 'delivered' AFTER 'shipped';
ALTER TYPE public.opportunity_stage ADD VALUE IF NOT EXISTS 'on_hold' AFTER 'delivered';