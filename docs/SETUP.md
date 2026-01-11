# Setup Guide

Follow these instructions to set up the project locally.

## Prerequisites
-   **Node.js**: Version 18 or higher.
-   **npm** or **yarn**: Package manager.
-   **Expo Go**: App installed on your physical device (Android/iOS) for testing mobile.
-   **PostgreSQL** (Optional): Recommended for production, but SQLite is pre-configured for development.

## 1. Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Environment Configuration:
    Create a `.env` file in the `backend` root with the following variables:
    ```env
    # Database
    DATABASE_URL="file:./dev.db"  # Or your PostgreSQL connection string

    # Security
    JWT_SECRET="your-super-secret-key-change-this"
    PORT=3000

    # Mercado Livre Integration (Optional for local dev)
    ML_CLIENT_ID="your_ml_app_id"
    ML_CLIENT_SECRET="your_ml_secret"
    ML_REDIRECT_URI="http://localhost:3000/api/mercadolivre/callback"

    # Payments (Optional)
    STRIPE_SECRET_KEY="sk_test_..."
    MERCADO_PAGO_ACCESS_TOKEN="TEST-..."
    ```

4.  Database Migration & Seeding:
    ```bash
    # Run migrations to create tables
    npx prisma migrate dev

    # Seed the database with admin user and initial data
    npx ts-node prisma/seed.ts
    ```
    > **Default Admin User:**
    > -   Email: `admin@pms.com`
    > -   Password: `123456`

5.  Start the Server:
    ```bash
    npm run dev
    ```
    The server will start at `http://localhost:3000`.

## 2. Mobile Setup

1.  Navigate to the mobile directory:
    ```bash
    cd mobile
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure API URL:
    Open `src/services/api.ts` and locate the `baseURL`.
    -   **Emulator**: Use `http://10.0.2.2:3000` (Android Studio).
    -   **Physical Device**: Use your computer's local IP address (e.g., `http://192.168.1.15:3000`).
    
    > **Tip**: Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux) to find your local IP.

4.  Start the Expo server:
    ```bash
    npx expo start --clear
    ```

5.  Run on Device:
    -   Scan the QR code with the **Expo Go** app (Android) or Camera app (iOS).
    -   Or press `a` to run on Android Emulator.
    -   Or press `i` to run on iOS Simulator (Mac only).

## Troubleshooting

-   **Network Error**: Ensure your phone and computer are on the same Wi-Fi network. Check if your firewall is blocking port 3000.
-   **Database Error**: Try deleting the `backend/prisma/dev.db` file and running `npx prisma migrate dev` again to reset the database.
