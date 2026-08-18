# Chust Fitness - Advanced CRM & ERP System 🚀

A full-stack, enterprise-grade Enterprise Resource Planning (ERP) and Customer Relationship Management (CRM) system. Built with a strict focus on **data integrity, financial accuracy, real-time interactions, and scalable architecture**.

---

## 🏗️ Architecture & Tech Stack

This repository is structured as a **Monorepo** containing both the Client (Frontend) and Server (Backend) applications, enforcing a clean separation of concerns while maintaining unified version control.

### ⚡ Frontend (Client-Side)
- **Framework:** React 18 + Vite (for ultra-fast HMR and optimized production builds).
- **State Management & Caching:** React Query (TanStack Query) for robust server-state synchronization and optimistic UI updates.
- **Styling:** Tailwind CSS + Custom CSS Modules, delivering a premium, responsive, and accessible user interface.
- **Real-time Communication:** Socket.IO-client for instant UI state reflection (Stock changes, Order updates, Notifications).
- **PWA Ready:** Fully installable as a Progressive Web App, featuring offline capabilities and native-like Push Notifications.

### ⚙️ Backend (Server-Side)
- **Runtime Environment:** Node.js powered by Express.js.
- **Database:** MongoDB coupled with Mongoose ODM.
- **Data Integrity:** Implementation of **ACID Transactions** via MongoDB Sessions. This guarantees atomicity—ensuring no partial data writes during complex business logic (e.g., simultaneous order creation and inventory deduction).
- **Authentication & Authorization:** JWT (JSON Web Tokens) paired with a strictly enforced Role-Based Access Control (RBAC) middleware.
- **Real-time Engine:** Socket.IO for broadcasting context-aware, warehouse-specific events.

---

## 🌟 Key Features & Engineering Highlights

1. **Bulletproof Financial Engine** 💰
   - Employs **MongoDB ACID Transactions** across all core mutation endpoints (Order Creation, Confirmations, Cancellations, Refunds).
   - Utilizes **Integer Arithmetic** for all floating-point calculations (e.g., cashback ratios, micro-refunds) to systematically eliminate standard IEEE 754 decimal precision anomalies.
   - Built-in **Price Protection Engine** prevents unauthorized discounting below base cost prices.

2. **Advanced Inventory Management** 📦
   - Native Multi-branch (Warehouse) support with isolated stock tracking.
   - Real-time inventory deduction and asynchronous restoration logic.
   - Automated Low-Stock anomaly detection with integrated alerts via UI and Telegram Bot webhooks.

3. **Customer & Debt Management** 🤝
   - Real-time, transaction-based calculation of Customer Balances (Dynamic Debt vs. Store Credit aggregation).
   - Smart Cashback ecosystem featuring automated accrual, consumption logic, and transactional rollbacks on refunds.

4. **Optimized Database Layer** 🗄️
   - Strategic deployment of compound indexes (e.g., `{ warehouse: 1, status: 1, createdAt: -1 }`) optimizing latency for heavy aggregation and analytical reporting queries.
   - Race-condition resistant, sequential document numbering enforced via atomic `$inc` counters.

---

## 🛠️ Installation & Setup Guide

### Prerequisites
- **Node.js**: v18.x or higher recommended.
- **MongoDB**: Atlas cluster or Local instance with a Replica Set configured (Mandatory for ACID Transactions).

### 1. Clone the Repository
```bash
git clone https://github.com/chustfitnes/demo.git
cd demo
```

### 2. Backend Initialization
```bash
cd backend
npm install
```
- Create your environment configuration:
  `cp .env.example .env` *(Create `.env` if no example exists)*
- Populate the `.env` file with your `MONGODB_URI`, `JWT_SECRET`, and external API credentials.
- Boot the development server:
  ```bash
  npm run dev
  ```
  *(Default port: 5000)*

### 3. Frontend Initialization
Open a new terminal session:
```bash
cd frontend
npm install
```
- Create the frontend environment configuration:
  ```bash
  echo "VITE_API_URL=http://localhost:5000/api" > .env
  ```
- Launch the Vite development server:
  ```bash
  npm run dev
  ```

---

## 🔐 Security Protocols & Operational Rules

- **Environment Variables:** All `.env` and `.env.*` files are strictly isolated via `.gitignore`. **NEVER** commit cryptographic keys, database URIs, or production secrets to the repository.
- **Role-Based Access Control (RBAC):** The system enforces strict API guards. Destructive actions (Deletions, Global Configurations) are cryptographically restricted to `superadmin` and `admin` roles. Standard `cashier` roles are cryptographically sandboxed to their respective assigned branches.

---

*Designed, engineered, and maintained for maximum scalability, deterministic reliability, and exceptional developer & user experience.*