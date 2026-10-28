-- Zenith production/staging smoke: actual admission RPC, everything rolled back.
BEGIN;
SELECT set_config('request.jwt.claim.sub','3cf3542d-3425-4b52-991a-858d4c4da6a1',true);
SELECT set_config('request.jwt.claims','{"sub":"3cf3542d-3425-4b52-991a-858d4c4da6a1","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE gym uuid='b80cd818-2abe-4a90-9027-e2ba1916aec4'; plan uuid; test_phone text; result jsonb; BEGIN
 SELECT id INTO plan FROM public.membership_plans WHERE gym_id=gym AND code='30';
 LOOP test_phone='9'||lpad(floor(random()*1000000000)::bigint::text,9,'0');EXIT WHEN NOT EXISTS(SELECT 1 FROM public.members m WHERE m.gym_id=gym AND m.phone=test_phone);END LOOP;
 result=public.submit_gym_form(gym,gen_random_uuid(),jsonb_build_object('kind','admission','full_name','Temporary app RPC sync test','phone',test_phone,'plan_id',plan,'start_date',current_date,'end_date',current_date+30,'total_amount',100,'paid_amount',100,'payment_mode','Cash'));
 PERFORM set_config('zenith_app.test_period',result->>'membershipId',true);
END $$;
RESET ROLE;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM zenith_app."Membership" WHERE "managementMembershipId"=current_setting('zenith_app.test_period')::uuid AND "amountPaid"=100 AND "pendingAmount"=0) THEN RAISE EXCEPTION 'Actual staff admission RPC did not update the app'; END IF;
 RAISE NOTICE 'PASS: actual authenticated management RPC automatically updated app membership and payment';
END $$;
ROLLBACK;
