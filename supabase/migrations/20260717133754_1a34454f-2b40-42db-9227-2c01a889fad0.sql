
-- =========================================================================
-- RLS Hardening: replace permissive policies with permission-based checks.
-- Uses public.has_permission(uid, code) which already grants system_owner
-- and export_manager full access via is_admin().
-- =========================================================================

-- Helper macro-style: we drop + recreate per table.

-- ---------------- COMPANIES ----------------
DROP POLICY IF EXISTS "Auth read companies" ON public.companies;
DROP POLICY IF EXISTS "Auth insert companies" ON public.companies;
DROP POLICY IF EXISTS "Owner or admin update companies" ON public.companies;
DROP POLICY IF EXISTS "Admin delete companies" ON public.companies;

CREATE POLICY "companies_select" ON public.companies FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'companies.view'));
CREATE POLICY "companies_insert" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(),'companies.create'));
CREATE POLICY "companies_update" ON public.companies FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(),'companies.edit')
         AND (public.is_admin(auth.uid()) OR owner_id = auth.uid() OR created_by = auth.uid()
              OR public.is_system_owner(auth.uid()) OR public.is_export_manager(auth.uid())))
  WITH CHECK (public.has_permission(auth.uid(),'companies.edit'));
CREATE POLICY "companies_delete" ON public.companies FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(),'companies.delete'));

-- ---------------- CONTACTS ----------------
DROP POLICY IF EXISTS "Auth read contacts" ON public.contacts;
DROP POLICY IF EXISTS "Auth insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Auth update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admin delete contacts" ON public.contacts;

CREATE POLICY "contacts_select" ON public.contacts FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'contacts.view'));
CREATE POLICY "contacts_insert" ON public.contacts FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(),'contacts.create'));
CREATE POLICY "contacts_update" ON public.contacts FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(),'contacts.edit'))
  WITH CHECK (public.has_permission(auth.uid(),'contacts.edit'));
CREATE POLICY "contacts_delete" ON public.contacts FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(),'contacts.delete'));

-- ---------------- LEADS ----------------
DROP POLICY IF EXISTS "Auth read leads" ON public.leads;
DROP POLICY IF EXISTS "Auth insert leads" ON public.leads;
DROP POLICY IF EXISTS "Owner or admin update leads" ON public.leads;
DROP POLICY IF EXISTS "Admin delete leads" ON public.leads;

CREATE POLICY "leads_select" ON public.leads FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'leads.view'));
CREATE POLICY "leads_insert" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(),'leads.create'));
CREATE POLICY "leads_update" ON public.leads FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(),'leads.edit')
         AND (public.is_admin(auth.uid()) OR owner_id = auth.uid() OR created_by = auth.uid()))
  WITH CHECK (public.has_permission(auth.uid(),'leads.edit'));
CREATE POLICY "leads_delete" ON public.leads FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(),'leads.delete'));

-- ---------------- OPPORTUNITIES ----------------
DROP POLICY IF EXISTS "auth read opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "auth insert opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "auth update opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "admin delete opportunities" ON public.opportunities;

CREATE POLICY "opportunities_select" ON public.opportunities FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'opportunities.view'));
CREATE POLICY "opportunities_insert" ON public.opportunities FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(),'opportunities.create'));
CREATE POLICY "opportunities_update" ON public.opportunities FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(),'opportunities.edit'))
  WITH CHECK (public.has_permission(auth.uid(),'opportunities.edit'));
CREATE POLICY "opportunities_delete" ON public.opportunities FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(),'opportunities.delete'));

-- ---------------- QUOTATIONS ----------------
DROP POLICY IF EXISTS "auth read quotations" ON public.quotations;
DROP POLICY IF EXISTS "auth insert quotations" ON public.quotations;
DROP POLICY IF EXISTS "auth update quotations" ON public.quotations;
DROP POLICY IF EXISTS "admin delete quotations" ON public.quotations;
DROP POLICY IF EXISTS "auth read quot" ON public.quotations;
DROP POLICY IF EXISTS "auth ins quot" ON public.quotations;
DROP POLICY IF EXISTS "auth upd quot" ON public.quotations;
DROP POLICY IF EXISTS "admin del quot" ON public.quotations;

CREATE POLICY "quotations_select" ON public.quotations FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'quotations.view'));
CREATE POLICY "quotations_insert" ON public.quotations FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(),'quotations.create'));
CREATE POLICY "quotations_update" ON public.quotations FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(),'quotations.edit'))
  WITH CHECK (public.has_permission(auth.uid(),'quotations.edit'));
CREATE POLICY "quotations_delete" ON public.quotations FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(),'quotations.delete'));

-- ---------------- ORDERS ----------------
DROP POLICY IF EXISTS "auth read orders" ON public.orders;
DROP POLICY IF EXISTS "auth insert orders" ON public.orders;
DROP POLICY IF EXISTS "auth update orders" ON public.orders;
DROP POLICY IF EXISTS "admin del orders" ON public.orders;

CREATE POLICY "orders_select" ON public.orders FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'orders.view'));
CREATE POLICY "orders_insert" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(),'orders.create'));
CREATE POLICY "orders_update" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(),'orders.edit'))
  WITH CHECK (public.has_permission(auth.uid(),'orders.edit'));
CREATE POLICY "orders_delete" ON public.orders FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(),'orders.delete'));

-- ---------------- PAYMENTS ----------------
DROP POLICY IF EXISTS "auth read pay" ON public.payments;
DROP POLICY IF EXISTS "auth ins pay" ON public.payments;
DROP POLICY IF EXISTS "auth upd pay" ON public.payments;
DROP POLICY IF EXISTS "admin del pay" ON public.payments;

CREATE POLICY "payments_select" ON public.payments FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'payments.view'));
CREATE POLICY "payments_insert" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(),'payments.create'));
CREATE POLICY "payments_update" ON public.payments FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(),'payments.edit'))
  WITH CHECK (public.has_permission(auth.uid(),'payments.edit'));
CREATE POLICY "payments_delete" ON public.payments FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(),'payments.delete'));

-- ---------------- SHIPMENTS ----------------
DROP POLICY IF EXISTS "auth read ship" ON public.shipments;
DROP POLICY IF EXISTS "auth ins ship" ON public.shipments;
DROP POLICY IF EXISTS "auth upd ship" ON public.shipments;
DROP POLICY IF EXISTS "admin del ship" ON public.shipments;

CREATE POLICY "shipments_select" ON public.shipments FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'shipments.view'));
CREATE POLICY "shipments_insert" ON public.shipments FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(),'shipments.create'));
CREATE POLICY "shipments_update" ON public.shipments FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(),'shipments.edit'))
  WITH CHECK (public.has_permission(auth.uid(),'shipments.edit'));
CREATE POLICY "shipments_delete" ON public.shipments FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(),'shipments.delete'));

-- ---------------- SAMPLES ----------------
DROP POLICY IF EXISTS "auth read samples" ON public.samples;
DROP POLICY IF EXISTS "auth ins samples" ON public.samples;
DROP POLICY IF EXISTS "auth upd samples" ON public.samples;
DROP POLICY IF EXISTS "admin del samples" ON public.samples;

CREATE POLICY "samples_select" ON public.samples FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'samples.view'));
CREATE POLICY "samples_insert" ON public.samples FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(),'samples.create'));
CREATE POLICY "samples_update" ON public.samples FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(),'samples.edit'))
  WITH CHECK (public.has_permission(auth.uid(),'samples.edit'));
CREATE POLICY "samples_delete" ON public.samples FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(),'samples.delete'));

-- ---------------- EXPORT_DOCUMENTS ----------------
DROP POLICY IF EXISTS "auth read docs" ON public.export_documents;
DROP POLICY IF EXISTS "auth ins docs" ON public.export_documents;
DROP POLICY IF EXISTS "auth upd docs" ON public.export_documents;
DROP POLICY IF EXISTS "admin del docs" ON public.export_documents;

CREATE POLICY "export_documents_select" ON public.export_documents FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'export_documents.view'));
CREATE POLICY "export_documents_insert" ON public.export_documents FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(),'export_documents.create'));
CREATE POLICY "export_documents_update" ON public.export_documents FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(),'export_documents.edit'))
  WITH CHECK (public.has_permission(auth.uid(),'export_documents.edit'));
CREATE POLICY "export_documents_delete" ON public.export_documents FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(),'export_documents.delete'));

-- ---------------- PRODUCTS ----------------
DROP POLICY IF EXISTS "auth read products" ON public.products;
DROP POLICY IF EXISTS "auth ins products" ON public.products;
DROP POLICY IF EXISTS "auth upd products" ON public.products;
DROP POLICY IF EXISTS "admin del products" ON public.products;
DROP POLICY IF EXISTS "auth read prod" ON public.products;
DROP POLICY IF EXISTS "auth ins prod" ON public.products;
DROP POLICY IF EXISTS "auth upd prod" ON public.products;
DROP POLICY IF EXISTS "admin del prod" ON public.products;

CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "products_insert" ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "products_update" ON public.products FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "products_delete" ON public.products FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- ---------------- EXHIBITIONS ----------------
DROP POLICY IF EXISTS "auth read exh" ON public.exhibitions;
DROP POLICY IF EXISTS "auth ins exh" ON public.exhibitions;
DROP POLICY IF EXISTS "auth upd exh" ON public.exhibitions;
DROP POLICY IF EXISTS "admin del exh" ON public.exhibitions;

CREATE POLICY "exhibitions_select" ON public.exhibitions FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'exhibitions.view'));
CREATE POLICY "exhibitions_insert" ON public.exhibitions FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(),'exhibitions.manage'));
CREATE POLICY "exhibitions_update" ON public.exhibitions FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(),'exhibitions.manage'))
  WITH CHECK (public.has_permission(auth.uid(),'exhibitions.manage'));
CREATE POLICY "exhibitions_delete" ON public.exhibitions FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(),'exhibitions.manage'));

-- ---------------- TASKS ----------------
DROP POLICY IF EXISTS "auth read tasks" ON public.tasks;
DROP POLICY IF EXISTS "auth insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "auth update tasks" ON public.tasks;
DROP POLICY IF EXISTS "admin delete tasks" ON public.tasks;

CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'tasks.view'));
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(),'tasks.create'));
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(),'tasks.edit')
         OR assigned_to = auth.uid() OR created_by = auth.uid())
  WITH CHECK (public.has_permission(auth.uid(),'tasks.edit')
              OR assigned_to = auth.uid() OR created_by = auth.uid());
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(),'tasks.delete'));

-- ---------------- ACTIVITIES ----------------
DROP POLICY IF EXISTS "auth read activities" ON public.activities;
DROP POLICY IF EXISTS "auth insert activities" ON public.activities;
DROP POLICY IF EXISTS "auth update activities" ON public.activities;
DROP POLICY IF EXISTS "auth delete activities" ON public.activities;

CREATE POLICY "activities_select" ON public.activities FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'activities.view'));
CREATE POLICY "activities_insert" ON public.activities FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(),'activities.create'));
CREATE POLICY "activities_update" ON public.activities FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "activities_delete" ON public.activities FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- ---------------- CHILD TABLES (inherit parent perms) ----------------

-- order_items
DROP POLICY IF EXISTS "auth manage order items" ON public.order_items;
CREATE POLICY "order_items_select" ON public.order_items FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'orders.view'));
CREATE POLICY "order_items_write" ON public.order_items FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'orders.edit'))
  WITH CHECK (public.has_permission(auth.uid(),'orders.edit'));

-- quotation_items
DROP POLICY IF EXISTS "auth manage quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "auth manage quot items" ON public.quotation_items;
CREATE POLICY "quotation_items_select" ON public.quotation_items FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'quotations.view'));
CREATE POLICY "quotation_items_write" ON public.quotation_items FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'quotations.edit'))
  WITH CHECK (public.has_permission(auth.uid(),'quotations.edit'));

-- production_stages
DROP POLICY IF EXISTS "auth manage prod stages" ON public.production_stages;
DROP POLICY IF EXISTS "auth manage production stages" ON public.production_stages;
CREATE POLICY "production_stages_select" ON public.production_stages FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'orders.view'));
CREATE POLICY "production_stages_write" ON public.production_stages FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'orders.edit'))
  WITH CHECK (public.has_permission(auth.uid(),'orders.edit'));

-- shipment_events
DROP POLICY IF EXISTS "auth manage shipment events" ON public.shipment_events;
CREATE POLICY "shipment_events_select" ON public.shipment_events FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'shipments.view'));
CREATE POLICY "shipment_events_write" ON public.shipment_events FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'shipments.edit'))
  WITH CHECK (public.has_permission(auth.uid(),'shipments.edit'));

-- opportunity_stage_history
DROP POLICY IF EXISTS "auth read stage history" ON public.opportunity_stage_history;
DROP POLICY IF EXISTS "auth insert stage history" ON public.opportunity_stage_history;
CREATE POLICY "opp_stage_history_select" ON public.opportunity_stage_history FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'opportunities.view'));
CREATE POLICY "opp_stage_history_insert" ON public.opportunity_stage_history FOR INSERT TO authenticated
  WITH CHECK (changed_by = auth.uid());
