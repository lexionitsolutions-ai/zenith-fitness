-- Run on a migrated staging DB. Every fixture and change rolls back.
BEGIN;
DO $$
DECLARE gym uuid='b80cd818-2abe-4a90-9027-e2ba1916aec4'; src uuid=gen_random_uuid(); plan uuid=gen_random_uuid(); period uuid=gen_random_uuid();
 app_id uuid; qr uuid; first_qr uuid; actual numeric; count_before integer;
BEGIN
 UPDATE zenith_app."ManagementSyncConfig" SET "initialPinHash"='temporary-test-hash' WHERE id=1;
 SELECT count(*) INTO count_before FROM zenith_app."User";
 INSERT INTO public.membership_plans(id,gym_id,code,name,duration_days) VALUES(plan,gym,'__app_sync_test__','Customize Package',NULL);
 INSERT INTO public.members(id,gym_id,admission_id,device_user_id,full_name,phone) VALUES(src,gym,'ZF-99901',64001,'Automatic sync test','9876500001');
 SELECT id,"qrToken" INTO app_id,first_qr FROM zenith_app."Member" WHERE "managementMemberId"=src;
 IF app_id IS NULL THEN RAISE EXCEPTION 'Admission did not create app member'; END IF;
 IF NOT EXISTS(SELECT 1 FROM zenith_app."User" WHERE "memberId"=app_id AND "mobileNumber"='+919876500001' AND "mustChangePassword") THEN RAISE EXCEPTION 'New member login not provisioned'; END IF;
 INSERT INTO public.memberships(id,gym_id,member_id,plan_id,kind,start_date,end_date,total_amount) VALUES(period,gym,src,plan,'renewal',current_date-1,current_date+30,6000);
 INSERT INTO public.payments(gym_id,membership_id,amount,payment_mode,paid_at) VALUES(gym,period,2000,'Cash',now()),(gym,period,3000,'Online',now());
 SELECT "pendingAmount" INTO actual FROM zenith_app."Membership" WHERE "managementMembershipId"=period;
 IF actual<>1000 THEN RAISE EXCEPTION 'Split ledger balance failed: %',actual; END IF;
 UPDATE public.memberships SET end_date=current_date+90 WHERE id=period;
 IF NOT EXISTS(SELECT 1 FROM zenith_app."Membership" WHERE "managementMembershipId"=period AND "endDate"=current_date+90) THEN RAISE EXCEPTION 'Renewal extension did not sync'; END IF;
 INSERT INTO public.payments(gym_id,membership_id,amount,payment_mode,kind,paid_at) VALUES(gym,period,500,'Cash','refund',now());
 SELECT "pendingAmount" INTO actual FROM zenith_app."Membership" WHERE "managementMembershipId"=period;
 IF actual<>1500 THEN RAISE EXCEPTION 'Refund balance failed'; END IF;
 PERFORM zenith_app.refresh_management_member(src);PERFORM zenith_app.refresh_management_member(src);
 IF (SELECT count(*) FROM zenith_app."Membership" WHERE "managementMembershipId"=period)<>1 THEN RAISE EXCEPTION 'Refresh duplicated a period'; END IF;
 UPDATE public.members SET phone='9876500002',full_name='Corrected test name' WHERE id=src;
 IF NOT EXISTS(SELECT 1 FROM zenith_app."User" WHERE "memberId"=app_id AND "mobileNumber"='+919876500002' AND "pinHash"='temporary-test-hash') THEN RAISE EXCEPTION 'Phone correction lost login/password'; END IF;
 UPDATE zenith_app."Member" SET "birthDate"='1997-05-07',address='Kalamba' WHERE id=app_id;
 IF NOT EXISTS(SELECT 1 FROM public.members WHERE id=src AND birth_date='1997-05-07') OR NOT EXISTS(SELECT 1 FROM public.member_private_details WHERE member_id=src AND address='Kalamba') THEN RAISE EXCEPTION 'Member profile did not sync back'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.sync_jobs WHERE payload->>'member_id'=src::text) THEN RAISE EXCEPTION 'Profile fallback refresh missing'; END IF;
 SELECT "qrToken" INTO qr FROM zenith_app."Member" WHERE id=app_id;
 IF qr<>first_qr THEN RAISE EXCEPTION 'Existing QR token changed'; END IF;
 UPDATE public.memberships SET status='cancelled' WHERE id=period;
 IF EXISTS(SELECT 1 FROM zenith_app."Membership" WHERE "managementMembershipId"=period AND "startDate" IS NOT NULL) THEN RAISE EXCEPTION 'Cancelled membership still eligible'; END IF;
 UPDATE public.memberships SET status='confirmed',accounting_verified=false WHERE id=period;
 IF NOT EXISTS(SELECT 1 FROM zenith_app."Membership" WHERE "managementMembershipId"=period AND "paymentStatus"='REVIEW_REQUIRED') THEN RAISE EXCEPTION 'Unknown accounting appeared verified'; END IF;
 UPDATE public.members SET is_archived=true WHERE id=src;
 IF EXISTS(SELECT 1 FROM zenith_app."User" WHERE "memberId"=app_id AND "isActive") THEN RAISE EXCEPTION 'Archived member account still enabled'; END IF;
 WITH g AS (INSERT INTO public.gyms(name) VALUES('Temporary member app isolation test') RETURNING id)
 INSERT INTO public.members(gym_id,admission_id,full_name,phone) SELECT id,'ZF-99902','Other gym','9876500003' FROM g;
 IF EXISTS(SELECT 1 FROM zenith_app."Member" WHERE "admissionId"='ZF-99902') THEN RAISE EXCEPTION 'Cross-gym data leaked'; END IF;
 RAISE NOTICE 'PASS: automatic admission, renewal, split payments, refunds, retry safety, profile sync, QR/password preservation, cancellation, review accounting and tenant isolation';
END $$;
ROLLBACK;
