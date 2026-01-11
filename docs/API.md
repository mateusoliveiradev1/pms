# API Documentation

Base URL: `http://localhost:3000/api` (Development)

## Authentication (`/auth`)
-   `POST /register`: Register a new user (Supplier).
-   `POST /login`: Authenticate and receive JWT.
-   `POST /refresh-token`: Refresh expired access token.

## Dashboard (`/dashboard`)
-   `GET /stats`: General statistics (Sales, Orders, Low Stock).

## Products (`/products`)
-   `GET /`: List all products.
-   `GET /:id`: Get product details.
-   `POST /`: Create a new product.
-   `PUT /:id`: Update product details.
-   `DELETE /:id`: Remove a product.

## Orders (`/orders`)
-   `GET /`: List orders.
-   `POST /`: Create a manual order.
-   `PUT /:id/status`: Update order status (e.g., shipped).
-   `GET /stats`: Order statistics by status.

## Suppliers (`/suppliers`)
-   `GET /`: List all suppliers.
-   `GET /:id`: Get supplier details.
-   `POST /`: Create a new supplier.
-   `PUT /:id`: Update supplier info.

## Financial (`/financial`)
-   `GET /balance`: Get current wallet balance.
-   `GET /ledger`: Get transaction history.
-   `POST /withdraw`: Request a withdrawal.

## Admin Financial (`/financial-admin`)
-   `GET /withdrawals`: List all withdrawal requests.
-   `POST /withdrawals/:id/approve`: Approve a withdrawal.
-   `POST /withdrawals/:id/reject`: Reject a withdrawal.

## Business Intelligence (`/bi`)
-   `GET /financial`: Financial performance metrics.
-   `GET /sales`: Sales analytics.

## Integrations
### Mercado Livre (`/mercadolivre`)
-   `GET /auth`: Initiate OAuth flow.
-   `GET /callback`: OAuth callback.
-   `POST /sync/products`: Trigger product synchronization.
-   `POST /sync/orders`: Trigger order synchronization.

## Notifications (`/notifications`)
-   `GET /`: List user notifications.
-   `PUT /:id/read`: Mark notification as read.
-   `POST /register-push-token`: Register Expo Push Token.
