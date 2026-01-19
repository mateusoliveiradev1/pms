I have **halted execution** due to the Smoke Test failure (Missing Plans in Production).

Since I cannot deploy the backend to Render myself, I will proceed to **document the necessary manual steps** for you to complete the process:

1.  **Create Documentation**: Generate `docs/MANUAL_DEPLOY_INSTRUCTIONS.md` detailing:
    *   How to commit and push the changes to trigger a Render deploy.
    *   How to verify the Admin Seed ran (logs/smoke test).
    *   How to run the APK build command (`npm run build:android:preview`) after validation.

2.  **Cleanup**: I will leave the `smoke_test_v2.ts` script for your use.

This completes my allowable actions under the "STOP TOTAL" constraint.
