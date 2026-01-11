# Dropshipping Management System (PMS)

**A comprehensive solution for managing dropshipping operations without physical stock, acting as a robust HUB between Suppliers and Marketplaces.**

---

## � Documentation

-   [**Architecture Overview**](docs/ARCHITECTURE.md): Learn about the tech stack and system design.
-   [**Setup Guide**](docs/SETUP.md): Step-by-step instructions to run the project locally.
-   [**API Reference**](docs/API.md): Detailed list of backend endpoints.
-   [**Database Schema**](docs/DATABASE.md): Explanation of data models and relationships.

---

## 🚀 Key Features

### 📦 Product & Inventory
-   **Multi-Supplier Support**: Single product sourced from multiple suppliers.
-   **Smart Stock Management**:
    -   **Virtual Stock**: Supplier's reported stock.
    -   **Safety Stock**: Configurable buffer.
    -   **Consolidated Stock**: Automatically calculated available quantity.
-   **Pricing Engine**: Dynamic pricing strategies (Fixed Margin or Percentage).

### 🛒 Order Management
-   **Full Lifecycle Tracking**: `Pending` -> `Paid` -> `Shipped` -> `Delivered`.
-   **Automated Sync**: Seamless integration with Mercado Livre orders.
-   **Manual Entry**: Support for direct sales channels.

### 💰 Financial System
-   **Double-Entry Ledger**: Immutable record of every cent.
-   **Supplier Wallet**: Real-time balance tracking (Available vs. Pending).
-   **Automated Payouts**: Withdrawal request workflow with admin approval.
-   **Subscription Plans**: SaaS model for suppliers with limits and commission rates.

### 📊 Business Intelligence
-   **Real-time Dashboard**: Sales metrics, low stock alerts, and financial health.
-   **Admin Tools**: Comprehensive control panel for system administrators.

### 🔌 Integrations
-   **Mercado Livre**: OAuth 2.0, Product Sync, Order Sync.
-   **Payment Gateways**: Infrastructure ready for Stripe & Mercado Pago.
-   **Push Notifications**: Mobile alerts for critical events.

---

## 🛠️ Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Backend** | **Node.js & Express** | High-performance REST API. |
| | **TypeScript** | Type safety and better developer experience. |
| | **Prisma ORM** | Type-safe database access (PostgreSQL/SQLite). |
| **Mobile** | **React Native** | Cross-platform mobile app (iOS & Android). |
| | **Expo** | Rapid development and deployment ecosystem. |
| **Auth** | **JWT** | Secure stateless authentication. |

---

## ⚡ Quick Start

1.  **Clone the repository**.
2.  **Setup Backend**:
    ```bash
    cd backend
    npm install
    npx prisma migrate dev
    npm run dev
    ```
3.  **Setup Mobile**:
    ```bash
    cd mobile
    npm install
    npx expo start
    ```

*For detailed instructions, please refer to the [Setup Guide](docs/SETUP.md).*

---

## 🤝 Contribution

Contributions are welcome! Please follow these steps:
1.  Fork the project.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
