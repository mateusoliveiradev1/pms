I have verified the codebase and confirmed the following:

1.  **`mobile/app.config.js`**: Contains the incorrect local fallback: `'http://192.168.3.118:3000/api'`. **This must be fixed.**
2.  **`mobile/src/config/env.ts`**: Correctly falls back to `'https://pms-backend-qalb.onrender.com/api'`.
3.  **`mobile/src/services/api.ts`**: Correctly uses `ENV.API_URL` from `env.ts`.
4.  No other hardcoded fallbacks were found in `constants.ts` or `axios.ts` (which does not exist, but `api.ts` covers it).

I will proceed with the validation and build process as strictly requested.

## Step 3: Production Validation
I will validate the production backend (`https://pms-backend-qalb.onrender.com/api`) using `curl` commands to ensure no code changes are required for validation.
1.  **Health Check**: `GET /api/health` - Expect 200 OK.
2.  **Admin Login**: `POST /api/auth/login` with admin credentials. Verify token and `SYSTEM_ADMIN` role.
3.  **User Creation**: `POST /api/auth/register` with new user credentials, followed by `POST /api/auth/login`. Verify success.

## Step 4: Mobile Config Fix
I will modify `mobile/app.config.js` to remove the local IP fallback and enforce the production URL.
- **Current**: `apiUrl: process.env.MOBILE_API_URL || 'http://192.168.3.118:3000/api'`
- **New**: `apiUrl: process.env.MOBILE_API_URL ?? 'https://pms-backend-qalb.onrender.com/api'`

## Step 5: APK Build
Once validation passes and the config is fixed, I will trigger the Android build.
1.  Navigate to `mobile/`.
2.  Run `npm run build:android:preview`.

I will report the results of each step and stop immediately if any validation fails.