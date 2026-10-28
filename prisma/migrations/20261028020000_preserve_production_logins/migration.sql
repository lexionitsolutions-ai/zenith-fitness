CREATE TABLE "AppSessionAlias" (
 "previousUserId" uuid PRIMARY KEY,"previousMemberId" uuid,"userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "AppQrAlias" (
 token uuid PRIMARY KEY,"memberId" uuid NOT NULL REFERENCES "Member"(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "AppLoginAlias" (
 "mobileNumber" text PRIMARY KEY,"userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);
REVOKE ALL ON "AppSessionAlias","AppQrAlias","AppLoginAlias" FROM public;
DO $$ DECLARE r text; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
  EXECUTE format('REVOKE ALL ON zenith_app."AppSessionAlias",zenith_app."AppQrAlias",zenith_app."AppLoginAlias" FROM %I',r);
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='zenith_app_runtime') THEN
  GRANT SELECT ON "AppSessionAlias","AppQrAlias","AppLoginAlias" TO zenith_app_runtime;
 END IF;
END $$;
