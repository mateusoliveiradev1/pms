I will configure the Supabase Transaction Pooler (Port 6543) using the required `postgres.[PROJECT_REF]` username format to ensure stability.

Step 1: Update `backend/.env`

* Set `DATABASE_URL` to `postgresql://postgres.dimvlcrgaqeqarohpszl:[PASSWORD]@db.dimvlcrgaqeqarohpszl.supabase.co:6543/postgres?pgbouncer=true`.

* This ensures compatibility with the pooler without code patches.

Step 2: Verify Connection

* Run `scripts/verify_simple_connection.ts` to confirm the connection works locally with this configuration.

Step 3: Commit

* Commit the changes (infra/connection verification) with the message "fix: use supabase transaction pooler 6543 for production stability".

Step 4: Output

* Provide the final `DATABASE_URL` for Render.

