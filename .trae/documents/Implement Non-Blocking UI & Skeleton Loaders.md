Understood. You want **Global Performance Improvement** without breaking *any* existing functionality. "Perfect Performance" means **Zero UI Blocking** and **Instant Feedback**.

My plan is strict and safe:
1.  **Do NOT touch backend logic**: Data fetching remains exactly as is (100% functional).
2.  **UI-Only "Perceived Performance" Upgrade**:
    *   **Eliminate Screen Blink**: Currently, the screen "blinks" to a white loading screen on every action. I will stop this. The data will stay on screen while updating.
    *   **Add Skeleton Loading**: Only for the *very first* time you open a screen. Never again.
    *   **Global Optimization**: I will create the `Skeleton` component and apply this "Non-Blocking" pattern to the **Admin Financial Screen** first (since it's the current focus and heaviest screen).

**Safety Guarantee**:
*   Functionality (filters, modals, clicks) remains 100% identical.
*   The only difference is visual: instead of a loading spinner replacing the whole screen, the screen stays visible and interactive while data updates.

**Steps:**
1.  Create `mobile/src/ui/components/Skeleton.tsx`.
2.  Update `AdminFinancialScreen.tsx` to remove the "Blocking Loading State" (`if (loading) return ...`) and implement the Skeleton pattern for initial load only.
3.  Update `AdminStatsCards.tsx` to handle "loading" updates gracefully (e.g., small opacity change instead of disappearing).

This is the safest way to improve "feel" without risking logic bugs.