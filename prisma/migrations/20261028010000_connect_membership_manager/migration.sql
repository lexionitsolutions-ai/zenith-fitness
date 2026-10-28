-- Install only in the private zenith_app schema beside the existing management
-- schema. No source memberships, receipts, staff or device identifiers are moved.
DO $$ BEGIN
 IF current_schema() <> 'zenith_app' THEN RAISE EXCEPTION 'Use schema=zenith_app for this application'; END IF;
 IF to_regclass('public.members') IS NULL THEN RAISE EXCEPTION 'The membership-manager tables must exist in public first'; END IF;
END $$;
ALTER TABLE "Member" ADD COLUMN "managementMemberId" uuid;
CREATE UNIQUE INDEX "Member_managementMemberId_key" ON "Member"("managementMemberId");
ALTER TABLE "Membership" ADD COLUMN "managementMembershipId" uuid;
CREATE UNIQUE INDEX "Membership_managementMembershipId_key" ON "Membership"("managementMembershipId");
CREATE TABLE "ManagementSyncConfig" (
 "id" integer PRIMARY KEY DEFAULT 1 CHECK ("id"=1), "gymId" uuid NOT NULL,
 "initialPinHash" text
);
INSERT INTO "ManagementSyncConfig"("id","gymId") VALUES(1,'b80cd818-2abe-4a90-9027-e2ba1916aec4');

CREATE FUNCTION zenith_app.refresh_management_member(source_member uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE m public.members; details public.member_private_details; app_member uuid; mobile text;
 cfg zenith_app."ManagementSyncConfig"; p record; app_plan uuid; paid numeric; charge numeric; modes text; previous_sync text;
BEGIN
 SELECT * INTO cfg FROM zenith_app."ManagementSyncConfig" WHERE "id"=1;
 SELECT * INTO m FROM public.members WHERE id=source_member AND gym_id=cfg."gymId";
 IF m.id IS NULL THEN RETURN; END IF;
 previous_sync=current_setting('zenith_app.syncing',true);
 PERFORM set_config('zenith_app.syncing','1',true);
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('zenith-app:'||m.id::text,28));
 SELECT * INTO details FROM public.member_private_details WHERE member_id=m.id AND gym_id=m.gym_id;
 mobile=regexp_replace(coalesce(m.phone,''),'[^0-9]','','g');
 IF length(mobile)=12 AND left(mobile,2)='91' THEN mobile=substr(mobile,3); END IF;
 IF mobile ~ '^[6-9][0-9]{9}$' THEN mobile='+91'||mobile; ELSE mobile=NULL; END IF;
 IF (SELECT count(*) FROM zenith_app."Member" WHERE "managementMemberId"=m.id OR "admissionId"=m.admission_id)>1 THEN
  RAISE EXCEPTION 'App member ID conflict: reconcile this admission before syncing';
 END IF;
 SELECT id INTO app_member FROM zenith_app."Member" WHERE "managementMemberId"=m.id OR "admissionId"=m.admission_id;
 IF app_member IS NULL THEN
  app_member=gen_random_uuid();
  INSERT INTO zenith_app."Member"(id,"managementMemberId","admissionId","fullName","mobileNumber","originalMobileNumber",gender,"ageAtImport","birthDate",address,"medicalHistory","qrToken","createdAt","updatedAt")
  VALUES(app_member,m.id,m.admission_id,trim(m.full_name),mobile,m.phone,m.gender,m.legacy_age,m.birth_date,details.address,details.medical_history,gen_random_uuid(),m.created_at,now());
 ELSE
  UPDATE zenith_app."Member" SET "managementMemberId"=m.id,"admissionId"=m.admission_id,"fullName"=trim(m.full_name),"mobileNumber"=mobile,"originalMobileNumber"=m.phone,
   gender=m.gender,"ageAtImport"=m.legacy_age,"birthDate"=m.birth_date,address=details.address,"medicalHistory"=details.medical_history,"updatedAt"=now()
  WHERE id=app_member;
 END IF;
 -- Preserve every existing password, workout assignment, QR token and points ID.
 -- Only member accounts' login numbers follow canonical contact corrections.
 IF mobile IS NOT NULL AND NOT EXISTS(SELECT 1 FROM zenith_app."User" WHERE "mobileNumber"=mobile AND "memberId" IS DISTINCT FROM app_member) THEN
  UPDATE zenith_app."User" SET "mobileNumber"=mobile,"updatedAt"=now() WHERE "memberId"=app_member AND role='MEMBER';
  IF NOT m.is_archived AND cfg."initialPinHash" IS NOT NULL THEN
   INSERT INTO zenith_app."User"(id,"memberId","mobileNumber","pinHash",role,"mustChangePassword","updatedAt")
   SELECT gen_random_uuid(),app_member,mobile,cfg."initialPinHash",'MEMBER',true,now()
   WHERE NOT EXISTS(SELECT 1 FROM zenith_app."User" WHERE "memberId"=app_member OR "mobileNumber"=mobile)
   ON CONFLICT DO NOTHING;
  END IF;
 END IF;
 IF m.is_archived THEN UPDATE zenith_app."User" SET "isActive"=false,"updatedAt"=now() WHERE "memberId"=app_member AND role='MEMBER'; END IF;
 FOR p IN SELECT ms.*, mp.code AS plan_code,mp.name AS plan_name,mp.duration_days
  FROM public.memberships ms JOIN public.membership_plans mp ON mp.id=ms.plan_id AND mp.gym_id=ms.gym_id
  WHERE ms.member_id=m.id AND ms.gym_id=m.gym_id LOOP
  INSERT INTO zenith_app."MembershipPlan"(id,"planCode","planName","durationDays","updatedAt")
  VALUES(gen_random_uuid(),'SUPABASE_'||p.plan_id::text,p.plan_name,coalesce(p.duration_days,0),now())
  ON CONFLICT("planCode") DO UPDATE SET "planName"=excluded."planName","durationDays"=excluded."durationDays","updatedAt"=now()
  RETURNING id INTO app_plan;
  SELECT coalesce(p.opening_paid_amount,0)+coalesce(sum(CASE WHEN kind='refund' THEN -amount ELSE amount END),0),
   string_agg(DISTINCT payment_mode,' + ' ORDER BY payment_mode)
  INTO paid,modes FROM public.payments WHERE membership_id=p.id AND gym_id=m.gym_id;
  charge=coalesce(p.final_amount,p.historical_charge,0);
  INSERT INTO zenith_app."Membership"(id,"managementMembershipId","memberId","planId","planDays",category,"startDate","endDate",
   "totalAmount","discountAmount","finalAmount","amountPaid","pendingAmount","paymentMode","paymentStatus","membershipStatus","sourceSheet","sourceRow","sourceType","sourceTimestamp","updatedAt")
  VALUES(gen_random_uuid(),p.id,app_member,app_plan,p.end_date-p.start_date,m.category,
   CASE WHEN p.status='confirmed' THEN p.start_date ELSE NULL END,CASE WHEN p.status='confirmed' THEN p.end_date ELSE NULL END,
   coalesce(p.total_amount,p.historical_charge,0),coalesce(p.discount_amount,0),charge,paid,greatest(charge-paid,0),modes,
   (CASE WHEN NOT p.accounting_verified THEN 'REVIEW_REQUIRED' WHEN paid>charge THEN 'OVERPAID' WHEN charge=0 THEN 'UNKNOWN' WHEN paid>=charge THEN 'PAID' WHEN paid>0 THEN 'PARTIAL' ELSE 'UNPAID' END)::zenith_app."PaymentStatus",
   (CASE WHEN p.status<>'confirmed' THEN 'REVIEW_REQUIRED' WHEN p.start_date>(now() AT TIME ZONE 'Asia/Kolkata')::date THEN 'UPCOMING' WHEN p.end_date<(now() AT TIME ZONE 'Asia/Kolkata')::date THEN 'EXPIRED' ELSE 'ACTIVE' END)::zenith_app."MembershipStatus",
   'Supabase:'||p.id::text,1,'LEGACY_IMPORT',p.purchased_at,now())
  ON CONFLICT("managementMembershipId") DO UPDATE SET "memberId"=excluded."memberId","planId"=excluded."planId","planDays"=excluded."planDays",category=excluded.category,
   "startDate"=excluded."startDate","endDate"=excluded."endDate","totalAmount"=excluded."totalAmount","discountAmount"=excluded."discountAmount","finalAmount"=excluded."finalAmount",
   "amountPaid"=excluded."amountPaid","pendingAmount"=excluded."pendingAmount","paymentMode"=excluded."paymentMode","paymentStatus"=excluded."paymentStatus","membershipStatus"=excluded."membershipStatus","sourceTimestamp"=excluded."sourceTimestamp","updatedAt"=now();
 END LOOP;
 -- Deletions in the source invalidate the linked period without deleting app history.
 UPDATE zenith_app."Membership" a SET "startDate"=NULL,"endDate"=NULL,"membershipStatus"='REVIEW_REQUIRED',"updatedAt"=now()
 WHERE a."memberId"=app_member AND a."managementMembershipId" IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM public.memberships s WHERE s.id=a."managementMembershipId" AND s.gym_id=cfg."gymId" AND s.member_id=m.id);
 PERFORM set_config('zenith_app.syncing',coalesce(previous_sync,''),true);
END $$;

CREATE FUNCTION zenith_app.management_changed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE row_data jsonb; member_id uuid; old_member uuid; item uuid;
BEGIN
 IF pg_trigger_depth()>1 THEN RETURN NULL; END IF;
 row_data=CASE WHEN tg_op='DELETE' THEN to_jsonb(old) ELSE to_jsonb(new) END;
 IF tg_table_name='members' THEN
  IF tg_op='DELETE' THEN
   UPDATE zenith_app."User" SET "isActive"=false WHERE "memberId" IN(SELECT id FROM zenith_app."Member" WHERE "managementMemberId"=(row_data->>'id')::uuid) AND role='MEMBER';
   UPDATE zenith_app."Membership" SET "startDate"=NULL,"endDate"=NULL,"membershipStatus"='REVIEW_REQUIRED' WHERE "memberId" IN(SELECT id FROM zenith_app."Member" WHERE "managementMemberId"=(row_data->>'id')::uuid);
   RETURN NULL;
  END IF;
  member_id=(row_data->>'id')::uuid;
 ELSIF tg_table_name='member_private_details' OR tg_table_name='memberships' THEN member_id=(row_data->>'member_id')::uuid;
 ELSIF tg_table_name='payments' THEN
  SELECT ms.member_id INTO member_id FROM public.memberships ms WHERE ms.id=(row_data->>'membership_id')::uuid AND ms.gym_id=(row_data->>'gym_id')::uuid;
 ELSE
  FOR item IN SELECT DISTINCT ms.member_id FROM public.memberships ms WHERE ms.plan_id=(row_data->>'id')::uuid LOOP PERFORM zenith_app.refresh_management_member(item); END LOOP;
  RETURN NULL;
 END IF;
 PERFORM zenith_app.refresh_management_member(member_id);
 IF tg_op='UPDATE' THEN
  IF tg_table_name='memberships' THEN old_member=old.member_id;
  ELSIF tg_table_name='payments' THEN SELECT ms.member_id INTO old_member FROM public.memberships ms WHERE ms.id=old.membership_id; END IF;
  IF old_member IS DISTINCT FROM member_id THEN PERFORM zenith_app.refresh_management_member(old_member); END IF;
 END IF;
 RETURN NULL;
END $$;

CREATE FUNCTION zenith_app.app_profile_changed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE gym uuid; changed_request uuid;
BEGIN
 IF pg_trigger_depth()>1 OR current_setting('zenith_app.syncing',true)='1' OR new."managementMemberId" IS NULL THEN RETURN new; END IF;
 SELECT "gymId" INTO gym FROM zenith_app."ManagementSyncConfig" WHERE id=1;
 UPDATE public.members SET full_name=new."fullName",phone=CASE WHEN new."mobileNumber" LIKE '+91%' THEN substr(new."mobileNumber",4) ELSE new."mobileNumber" END,
  gender=new.gender,birth_date=new."birthDate",updated_at=now()
 WHERE id=new."managementMemberId" AND gym_id=gym;
 INSERT INTO public.member_private_details(member_id,gym_id,address,medical_history)
 VALUES(new."managementMemberId",gym,new.address,new."medicalHistory")
 ON CONFLICT(member_id) DO UPDATE SET address=excluded.address,medical_history=excluded.medical_history,updated_at=now();
 changed_request=gen_random_uuid();
 INSERT INTO public.sync_jobs(gym_id,destination,event_type,deduplication_key,payload)
 SELECT gym,destination,'member.updated',changed_request::text,jsonb_build_object('member_id',new."managementMemberId")
 FROM unnest(ARRAY['google_sheets','fingerprint']) AS destination;
 INSERT INTO public.audit_logs(gym_id,action,entity_type,entity_id,details)
 VALUES(gym,'profile.updated','member_app',new."managementMemberId",jsonb_build_object('source','zenith_app','app_member_id',new.id));
 RETURN new;
END $$;

CREATE FUNCTION zenith_app.sync_management_all() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item uuid; total integer=0;
BEGIN
 FOR item IN SELECT m.id FROM public.members m JOIN zenith_app."ManagementSyncConfig" c ON c."gymId"=m.gym_id AND c.id=1 LOOP
  PERFORM zenith_app.refresh_management_member(item);total=total+1;
 END LOOP;
 RETURN total;
END $$;

CREATE TRIGGER zenith_member_app_sync AFTER INSERT OR UPDATE OR DELETE ON public.members FOR EACH ROW EXECUTE FUNCTION zenith_app.management_changed();
CREATE TRIGGER zenith_private_app_sync AFTER INSERT OR UPDATE OR DELETE ON public.member_private_details FOR EACH ROW EXECUTE FUNCTION zenith_app.management_changed();
CREATE TRIGGER zenith_membership_app_sync AFTER INSERT OR UPDATE OR DELETE ON public.memberships FOR EACH ROW EXECUTE FUNCTION zenith_app.management_changed();
CREATE TRIGGER zenith_payment_app_sync AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION zenith_app.management_changed();
CREATE TRIGGER zenith_plan_app_sync AFTER UPDATE ON public.membership_plans FOR EACH ROW EXECUTE FUNCTION zenith_app.management_changed();
CREATE TRIGGER zenith_app_profile_sync AFTER UPDATE OF "fullName","mobileNumber",gender,"birthDate",address,"medicalHistory" ON zenith_app."Member"
FOR EACH ROW WHEN(old."fullName" IS DISTINCT FROM new."fullName" OR old."mobileNumber" IS DISTINCT FROM new."mobileNumber" OR old.gender IS DISTINCT FROM new.gender OR old."birthDate" IS DISTINCT FROM new."birthDate" OR old.address IS DISTINCT FROM new.address OR old."medicalHistory" IS DISTINCT FROM new."medicalHistory") EXECUTE FUNCTION zenith_app.app_profile_changed();

-- The schema is used only through the app server, never exposed through the API.
DO $$ DECLARE role_name text; BEGIN
 FOR role_name IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
  EXECUTE format('REVOKE ALL ON SCHEMA zenith_app FROM %I',role_name);
  EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA zenith_app FROM %I',role_name);
  EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA zenith_app FROM %I',role_name);
 END LOOP;
END $$;
REVOKE ALL ON SCHEMA zenith_app FROM public;
REVOKE ALL ON ALL TABLES IN SCHEMA zenith_app FROM public;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA zenith_app FROM public;
