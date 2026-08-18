# HB CRM - Advanced Business Management Platform 🚀

**HB CRM** is a comprehensive, full-stack Customer Relationship Management (CRM) and Enterprise Resource Planning (ERP) platform. Engineered for modern businesses, it delivers real-time data synchronization, fault-tolerant financial calculations, and a seamless cross-device user experience.

---

## 📖 1. Project Overview (Loyiha Mazmuni)

HB CRM is designed to centralize and automate core business processes. It eliminates the friction between sales, inventory management, and customer relationship tracking. By providing a single source of truth, it empowers business owners and managers to make data-driven decisions while ensuring that cashiers and floor staff can process operations rapidly and without error. 

The system strictly enforces **data integrity** through transactional database operations, preventing any partial writes or ghost records during complex operations like order processing and stock deduction.

---

## ✨ 2. Core Capabilities (Asosiy Imkoniyatlar)

- **Real-Time Data Synchronization:** 
  Utilizing WebSockets, any changes in inventory, new orders, or customer debt are instantly reflected across all active client sessions without manual refreshing.
- **Fault-Tolerant Financial Engine:** 
  All monetary values are processed using strict integer arithmetic to avoid floating-point precision errors. Database operations are wrapped in **MongoDB ACID Transactions** to ensure atomic consistency.
- **Advanced Inventory & Warehouse Management:** 
  Supports multi-warehouse routing, low-stock threshold alerts, and real-time product tracking.
- **Smart Debt & Customer Management:** 
  Automated tracking of customer balances, dynamic debt calculations, and a built-in Cashback/Store Credit ecosystem.
- **Omnichannel Notifications:** 
  Integration with Telegram Bots for instant managerial alerts, alongside Web Push Notifications for staff.
- **Progressive Web App (PWA):** 
  The client application is fully installable on mobile devices, offering native-like performance, offline resilience, and caching.
- **Role-Based Access Control (RBAC):** 
  Cryptographically secure endpoints ensuring that cashiers, managers, and superadmins only access permitted features.

---

## 🛠 3. Technology Stack (Texnologiyalar)

The project follows a modern **Monorepo** architecture, splitting the frontend and backend into highly optimized micro-environments.

### Frontend (Client-Side)
- **Framework:** React 18 powered by Vite for instant Hot Module Replacement (HMR) and optimized build chunks.
- **State Management:** React Query (TanStack) for asynchronous server-state caching.
- **Styling:** Tailwind CSS integrated with customized CSS Modules for an adaptive, responsive UI.
- **Real-Time:** Socket.io-client.
- **PWA:** Vite PWA Plugin for Service Workers and caching strategies.

### Backend (Server-Side)
- **Runtime:** Node.js with Express.js REST API architecture.
- **Database:** MongoDB & Mongoose ODM (Replica Set required for ACID transactions).
- **Authentication:** JWT (JSON Web Tokens) with short-lived access tokens and secure refresh mechanisms.
- **Real-Time:** Socket.io server.
- **Integrations:** Telegram Bot API, Cloudinary (for media assets), and Groq AI (for intelligent analytics).

---

## 🚀 4. How to Use & Installation (Qanday Ishlatilishi)

Follow these steps to deploy and run HB CRM in your local development environment.

### Prerequisites
- Node.js (v18.x or newer)
- MongoDB Atlas cluster (or Local Replica Set)
- Git

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/chustfitnes/demo.git
   cd demo
   ```

2. **Backend Setup**
   Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   npm install
   ```
   - Create a `.env` file (you can copy from `.env.example` if available).
   - Ensure the following crucial variables are set:
     ```env
     MONGODB_URI=your_mongodb_connection_string
     JWT_SECRET=your_super_secret_key
     PORT=5000
     ```
   - Start the backend server:
     ```bash
     npm run dev
     ```

3. **Frontend Setup**
   Open a second terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   ```
   - Create a `.env` file and point it to your backend API:
     ```env
     VITE_API_URL=http://localhost:5000/api
     ```
   - Start the Vite development server:
     ```bash
     npm run dev
     ```

4. **Access the Application**
   Open your browser and navigate to `http://localhost:5173`. The system will automatically establish a WebSocket connection with the backend.

---
*Developed for unparalleled speed, robust security, and seamless business administration.*