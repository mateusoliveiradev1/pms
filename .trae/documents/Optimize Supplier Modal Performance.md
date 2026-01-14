I will optimize the Supplier Selection Modal performance to eliminate the delay and blinking effect.

### Changes in `AdminFinancialScreen.tsx`

1.  **Immediate Fetch on Open**:
    *   Update the "Alterar" button `onPress` handler to call `fetchSuppliers('', 'ALL')` **immediately**. This ensures the loading starts instantly when the user requests the modal, removing the 500ms delay.
2.  **Optimize Search Logic**:
    *   Modify the `useEffect` hook to **only** listen to `modalSearch` changes (removing `supplierModalVisible` from dependencies).
    *   This prevents the "double trigger" or "delayed trigger" when simply opening the modal.
    *   Keep the 500ms debounce **only** for when the user is actively typing in the search bar.

This change will make the modal feel responsive: data loading starts the moment the button is pressed, and the list appears as soon as data is ready, without the awkward "open -> wait -> load" sequence.