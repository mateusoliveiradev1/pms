# Architecture Overview

The Dropshipping Management System (PMS) is designed as a centralized hub connecting Suppliers and Marketplaces (specifically Mercado Livre), enabling a dropshipping operation without physical stock.

## High-Level Architecture

The system consists of two main components:
1.  **Backend API (Node.js/Express)**: Handles business logic, database interactions, integrations with external APIs (Mercado Livre, Payment Gateways), and serves data to the mobile app.
2.  **Mobile Application (React Native/Expo)**: Provides a user interface for administrators and suppliers to manage products, orders, financial data, and settings.

## Tech Stack

### Backend
-   **Runtime**: Node.js
-   **Framework**: Express.js
-   **Language**: TypeScript
-   **ORM**: Prisma
-   **Database**: PostgreSQL (Production) / SQLite (Development)
-   **Authentication**: JWT (JSON Web Tokens)
-   **Integrations**:
    -   Mercado Livre API (OAuth & Products/Orders)
    -   Mercado Pago / Stripe (Payments)
    -   Expo Notifications (Push Notifications)

### Mobile
-   **Framework**: React Native with Expo
-   **Language**: TypeScript
-   **State Management**: React Context API
-   **Navigation**: React Navigation
-   **Networking**: Axios
-   **UI Library**: Custom components with native styling

## Key Modules

### 1. Inventory Management
-   **Virtual Stock**: Tracks stock levels at suppliers.
-   **Safety Stock**: Buffer to prevent overselling.
-   **Consolidated Stock**: Calculates available stock based on virtual stock minus safety stock.

### 2. Order Processing
-   **Lifecycle**: Pending -> Paid -> Shipped -> Delivered.
-   **Sync**: Automatically syncs orders from Mercado Livre.

### 3. Financial System
-   **Ledger**: Double-entry bookkeeping for all financial transactions.
-   **Wallet**: Manages Supplier balances (Available, Pending, Blocked).
-   **Payouts**: Handles withdrawal requests via PIX.

### 4. Integrations
-   **Mercado Livre**: Two-way sync for products and orders.
-   **Webhooks**: Internal webhooks for system extensibility.
