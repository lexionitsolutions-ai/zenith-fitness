-- Keep legacy duration-only plans for imported membership references.
UPDATE "MembershipPlan" SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "planCode" IN ('PLAN_30_DAYS', 'PLAN_90_DAYS', 'PLAN_180_DAYS', 'PLAN_365_DAYS');

INSERT INTO "MembershipPlan" ("id", "planCode", "planName", "durationDays", "category", "standardPrice", "isActive", "updatedAt")
SELECT gen_random_uuid(), v.code, v.name, v.days, v.category, v.price, true, CURRENT_TIMESTAMP
FROM (VALUES
  ('MALE_30_DAYS', 'Male - 1 Month', 30, 'MALE', 2000),
  ('MALE_90_DAYS', 'Male - 3 Months', 90, 'MALE', 4699),
  ('MALE_180_DAYS', 'Male - 6 Months', 180, 'MALE', 6499),
  ('MALE_365_DAYS', 'Male - 1 Year', 365, 'MALE', 9991),
  ('FEMALE_30_DAYS', 'Female - 1 Month', 30, 'FEMALE', 1499),
  ('FEMALE_90_DAYS', 'Female - 3 Months', 90, 'FEMALE', 3999),
  ('FEMALE_180_DAYS', 'Female - 6 Months', 180, 'FEMALE', 5699),
  ('FEMALE_365_DAYS', 'Female - 1 Year', 365, 'FEMALE', 8999),
  ('FEMALE_HAPPY_HOURS_30_DAYS', 'Female Happy Hours - 1 Month', 30, 'FEMALE_HAPPY_HOURS', 1000),
  ('FEMALE_HAPPY_HOURS_90_DAYS', 'Female Happy Hours - 3 Months', 90, 'FEMALE_HAPPY_HOURS', 3000),
  ('FEMALE_HAPPY_HOURS_180_DAYS', 'Female Happy Hours - 6 Months', 180, 'FEMALE_HAPPY_HOURS', 4500),
  ('FEMALE_HAPPY_HOURS_365_DAYS', 'Female Happy Hours - 1 Year', 365, 'FEMALE_HAPPY_HOURS', 6000)
) AS v(code, name, days, category, price)
ON CONFLICT ("planCode") DO UPDATE SET
  "planName" = EXCLUDED."planName", "durationDays" = EXCLUDED."durationDays",
  "category" = EXCLUDED."category", "standardPrice" = EXCLUDED."standardPrice",
  "isActive" = true, "updatedAt" = CURRENT_TIMESTAMP;
