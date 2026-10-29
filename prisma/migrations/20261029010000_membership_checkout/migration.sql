CREATE TABLE "ApplicantProfile" (
 "userId" uuid PRIMARY KEY REFERENCES "User"(id) ON DELETE CASCADE,
 "gender" text NOT NULL, "address" text, "birthDate" date
);
CREATE TABLE "AppMembershipPurchase" (
 "id" uuid PRIMARY KEY, "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
 "kind" text NOT NULL CHECK ("kind" IN ('ADMISSION','RENEWAL')),
 "planCode" text NOT NULL, "planName" text NOT NULL, "durationMonths" integer NOT NULL,
 "price" integer NOT NULL, "pointsUsed" integer NOT NULL DEFAULT 0, "amountDue" integer NOT NULL,
 "status" text NOT NULL DEFAULT 'AWAITING_PAYMENT' CHECK ("status" IN ('AWAITING_PAYMENT','PENDING_REVIEW','APPROVED','REJECTED','CANCELLED')),
 "utr" text, "reportedAmount" integer, "paymentApp" text, "reviewNote" text,
 "reviewedById" uuid REFERENCES "User"(id), "reviewedAt" timestamp(3), "membershipId" uuid UNIQUE,
 "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL,
 CHECK ("price">0 AND "pointsUsed">=0 AND "amountDue"="price"-"pointsUsed" AND "amountDue">0),
 CHECK ("durationMonths" IN (1,3,6,12)),
 CHECK ("planCode" NOT LIKE 'FEMALE_HAPPY_%' OR "pointsUsed"=0)
);
CREATE INDEX "AppMembershipPurchase_status_createdAt_idx" ON "AppMembershipPurchase"("status","createdAt");
CREATE INDEX "AppMembershipPurchase_userId_createdAt_idx" ON "AppMembershipPurchase"("userId","createdAt");
CREATE INDEX "AppMembershipPurchase_utr_idx" ON "AppMembershipPurchase"("utr");
CREATE UNIQUE INDEX "AppMembershipPurchase_live_utr_key" ON "AppMembershipPurchase"("utr") WHERE "status" IN ('PENDING_REVIEW','APPROVED');
CREATE UNIQUE INDEX "AppMembershipPurchase_one_open_per_user" ON "AppMembershipPurchase"("userId") WHERE "status" IN ('AWAITING_PAYMENT','PENDING_REVIEW');

-- This is deliberately a narrow bridge: the runtime never gets direct write
-- access to the manager. All values come from a locked, admin-approved order.
CREATE FUNCTION approve_app_membership(order_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o record; u record; a record; m record; cfg record; source_member uuid;
 source_plan uuid; period uuid=gen_random_uuid(); app_member uuid;
 admission text; device_id integer; starts date; ends date; latest date;
BEGIN
 SELECT * INTO o FROM zenith_app."AppMembershipPurchase" WHERE id=order_id FOR UPDATE;
 IF o.id IS NULL OR o.status<>'PENDING_REVIEW' OR o."reviewedById" IS NULL THEN RAISE EXCEPTION 'Admin-reviewed order required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM zenith_app."User" WHERE id=o."reviewedById" AND role='ADMIN' AND "isActive") THEN RAISE EXCEPTION 'Active admin required'; END IF;
 SELECT * INTO u FROM zenith_app."User" WHERE id=o."userId" FOR UPDATE;
 SELECT * INTO cfg FROM zenith_app."ManagementSyncConfig" WHERE id=1;
 IF cfg.id IS NULL THEN RAISE EXCEPTION 'Management connection not configured'; END IF;
 IF EXISTS(SELECT 1 FROM public.payments WHERE gym_id=cfg."gymId" AND reference=o.utr AND kind='payment') THEN RAISE EXCEPTION 'UTR already recorded in the merchant payment ledger'; END IF;
 -- Match the manager's lock and counter, including reserved fingerprint IDs.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(cfg."gymId"::text,1));
 SELECT * INTO m FROM zenith_app."Member" WHERE id=u."memberId";
 source_member=m."managementMemberId";
 IF o.kind='ADMISSION' THEN
  IF u."memberId" IS NOT NULL THEN RAISE EXCEPTION 'Account already admitted'; END IF;
  SELECT * INTO a FROM zenith_app."ApplicantProfile" WHERE "userId"=u.id;
  IF a.address IS NULL OR a."birthDate" IS NULL THEN RAISE EXCEPTION 'Complete profile required'; END IF;
  IF EXISTS(SELECT 1 FROM public.members WHERE gym_id=cfg."gymId" AND phone=regexp_replace(u."mobileNumber",'^\+91','') AND NOT is_archived) THEN RAISE EXCEPTION 'Phone already admitted; reconcile this account before approval'; END IF;
  INSERT INTO public.member_id_counters(gym_id,last_assigned_id) VALUES(cfg."gymId",660) ON CONFLICT(gym_id) DO NOTHING;
  SELECT greatest(c.last_assigned_id,660,
   coalesce((SELECT max(s.device_user_id) FROM public.members s WHERE s.gym_id=cfg."gymId" AND NOT EXISTS(SELECT 1 FROM public.reserved_device_ids r WHERE r.gym_id=cfg."gymId" AND (r.device_user_id=s.device_user_id OR r.admission_id=s.admission_id))),0),
   coalesce((SELECT max(substring(s.admission_id FROM 4)::integer) FROM public.members s WHERE s.gym_id=cfg."gymId" AND s.admission_id ~ '^ZF-[0-9]{1,5}$' AND NOT EXISTS(SELECT 1 FROM public.reserved_device_ids r WHERE r.gym_id=cfg."gymId" AND (r.device_user_id=s.device_user_id OR r.admission_id=s.admission_id))),0))+1
  INTO device_id FROM public.member_id_counters c WHERE c.gym_id=cfg."gymId" FOR UPDATE;
  WHILE EXISTS(SELECT 1 FROM public.reserved_device_ids WHERE gym_id=cfg."gymId" AND device_user_id=device_id) LOOP device_id=device_id+1; END LOOP;
  IF device_id>65535 THEN RAISE EXCEPTION 'Fingerprint ID capacity reached'; END IF;
  UPDATE public.member_id_counters SET last_assigned_id=device_id WHERE gym_id=cfg."gymId";
  admission='ZF-'||device_id::text;
  source_member=gen_random_uuid();
  INSERT INTO public.members(id,gym_id,admission_id,device_user_id,full_name,phone,gender,birth_date,category)
   VALUES(source_member,cfg."gymId",admission,device_id,u."displayName",regexp_replace(u."mobileNumber",'^\+91',''),a.gender,a."birthDate",CASE WHEN o."planCode" LIKE 'FEMALE_HAPPY_%' THEN 'Female Happy Hours · 10 AM–4 PM' ELSE a.gender END);
  INSERT INTO public.member_private_details(member_id,gym_id,address) VALUES(source_member,cfg."gymId",a.address);
  SELECT id INTO app_member FROM zenith_app."Member" WHERE "managementMemberId"=source_member;
  UPDATE zenith_app."User" SET "memberId"=app_member,"updatedAt"=now() WHERE id=u.id;
 ELSE
  IF source_member IS NULL THEN RAISE EXCEPTION 'Reconcile this member with the management system before approval'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.members WHERE id=source_member AND gym_id=cfg."gymId" AND NOT is_archived) THEN RAISE EXCEPTION 'Active canonical member required'; END IF;
  app_member=u."memberId";
 END IF;
 SELECT id INTO source_plan FROM public.membership_plans WHERE gym_id=cfg."gymId" AND code='APP_'||o."planCode";
 IF source_plan IS NULL THEN
  source_plan=gen_random_uuid();
  INSERT INTO public.membership_plans(id,gym_id,code,name,duration_days)
   VALUES(source_plan,cfg."gymId",'APP_'||o."planCode",o."planName",o."durationMonths"*30);
 END IF;
 SELECT max(end_date) INTO latest FROM public.memberships WHERE member_id=source_member AND gym_id=cfg."gymId" AND status='confirmed';
 starts=greatest((now() AT TIME ZONE 'Asia/Kolkata')::date,coalesce(latest+1,(now() AT TIME ZONE 'Asia/Kolkata')::date));
 ends=(starts+make_interval(months=>o."durationMonths"))::date-1;
 INSERT INTO public.memberships(id,gym_id,member_id,plan_id,kind,start_date,end_date,total_amount,discount_amount,opening_paid_amount,accounting_verified,purchased_at,source_key)
  VALUES(period,cfg."gymId",source_member,source_plan,CASE WHEN o.kind='ADMISSION' THEN 'admission' ELSE 'renewal' END,starts,ends,o.price,o."pointsUsed",0,true,now(),'app-order:'||o.id::text);
 INSERT INTO public.payments(gym_id,membership_id,amount,payment_mode,paid_at,reference,source_key) VALUES(cfg."gymId",period,o."amountDue",'Online',now(),o.utr,'app-order:'||o.id::text);
 INSERT INTO public.sync_jobs(gym_id,destination,event_type,deduplication_key,payload)
  SELECT cfg."gymId",destination,'membership.saved',period::text,jsonb_build_object('member_id',source_member,'membership_id',period)
  FROM unnest(ARRAY['google_sheets','fingerprint']) AS destination;
 INSERT INTO public.audit_logs(gym_id,action,entity_type,entity_id,details)
  VALUES(cfg."gymId",'membership.approved','member_app',source_member,jsonb_build_object('order_id',o.id,'reviewed_by',o."reviewedById",'utr',o.utr,'points',o."pointsUsed"));
 PERFORM zenith_app.refresh_management_member(source_member);
 SELECT id INTO period FROM zenith_app."Membership" WHERE "managementMembershipId"=period;
 IF period IS NULL THEN RAISE EXCEPTION 'Membership sync failed'; END IF;
 RETURN period;
END $$;
REVOKE ALL ON FUNCTION approve_app_membership(uuid) FROM PUBLIC;

-- Preserve the existing server-only privilege model for app runtime logins.
DO $$ DECLARE runtime_role text; BEGIN
 FOR runtime_role IN SELECT rolname FROM pg_roles WHERE rolcanlogin AND NOT rolsuper
  AND rolname NOT IN ('anon','authenticated','authenticator')
  AND has_schema_privilege(rolname,current_schema(),'USAGE')
  AND has_table_privilege(rolname,'"User"','SELECT')
  AND has_table_privilege(rolname,'"User"','INSERT')
  AND has_table_privilege(rolname,'"User"','UPDATE') LOOP
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON "ApplicantProfile","AppMembershipPurchase" TO %I',runtime_role);
  EXECUTE format('GRANT EXECUTE ON FUNCTION approve_app_membership(uuid) TO %I',runtime_role);
 END LOOP;
END $$;
