# Database Schema Documentation

The database is managed using **Prisma ORM**. Below is a detailed description of the key models and their relationships.

## Core Models

### `User`
Represents system users (Admins and Suppliers).
-   **Role**: `ADMIN` or `SUPPLIER`.
-   **Status**: `ACTIVE` or `INACTIVE`.
-   **Relationships**: Has one `Supplier` profile (if role is SUPPLIER).

### `Supplier`
Contains business and financial details for a supplier.
-   **Financial Status**: `ACTIVE`, `SUSPENDED`, `OVERDUE`.
-   **Wallet**: `walletBalance` (Available), `pendingBalance` (Future release), `blockedBalance`.
-   **Billing**: Invoice details (Name, Doc, Address).
-   **Relationships**:
    -   `ProductSupplier`: Products provided by this supplier.
    -   `Order`: Orders fulfilled by this supplier.
    -   `FinancialLedger`: History of transactions.
    -   `WithdrawalRequest`: Payout requests.

### `Product`
The master product catalog.
-   **SKU**: Unique identifier.
-   **Stock**: `stockAvailable` (Global calculated stock).
-   **Mercado Livre**: `mercadoLivreId` mapping.
-   **Relationships**:
    -   `ProductSupplier`: Links to multiple suppliers offering this product.

### `ProductSupplier` (Pivot)
Manages the N:N relationship between Products and Suppliers.
-   **Price**: Supplier-specific cost price.
-   **Stock**: `stock` (Real), `virtualStock` (feed), `safetyStock`.

### `Order`
Sales orders from marketplaces or manual entry.
-   **Status**: `PENDING`, `PAID`, `SHIPPED`, `DELIVERED`, `CANCELLED`.
-   **Financial**: `totalAmount`, `commissionValue`, `netValue` (Supplier payout).
-   **Relationships**:
    -   `OrderItem`: Items in the order.
    -   `Supplier`: The supplier fulfilling the order.

### `FinancialLedger`
Immutable record of all financial movements.
-   **Type**: `SALE_REVENUE`, `COMMISSION_DEBIT`, `WITHDRAWAL`, `ADJUSTMENT`.
-   **Amount**: Positive (Credit) or Negative (Debit).
-   **Status**: `PENDING`, `COMPLETED`, `RELEASED`.

### `Plan` & `SupplierSubscription`
SaaS subscription management for suppliers.
-   **Plan**: Defines limits (products, orders) and costs.
-   **Subscription**: Active plan for a supplier.

## Logs & Audits

### `AdminLog`
Audit trail for sensitive admin actions (e.g., approving withdrawals).

### `InventoryLog`
History of stock changes.

### `InternalWebhook` & `WebhookLog`
System for broadcasting events to external URLs.
