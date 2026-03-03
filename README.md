# Unified User Lifecycle Dashboard

## 🚀 Overview

The **Unified User Lifecycle Dashboard** is an internal IT automation platform designed to streamline user management, license tracking, and onboarding/offboarding workflows. It integrates with **Microsoft Graph API** and **Google Workspace Admin API** for centralized identity and access management, and **Jira Service Management (JSM)** for automated ticket-based workflows.

## ✨ Key Features

### 1. 👥 Identity & User Management
- **Centralized User View**: Fetch and filter users from Microsoft 365 and Google Workspace.
- **Advanced Filtering**: Filter by department, location, and account status.
- **Bulk Actions**: Disable accounts, revoke sessions, and manage MFA status.
- **Device Insights**: View Intune-managed devices associated with users.

### 2. 💳 License Management
- **Real-time Tracking**: Monitor Microsoft 365 and Google Workspace license usage and availability.
- **Smart Filtering**: Automatically excludes free/trial licenses (e.g., Flow Free, PowerApps Viral) to focus on paid business licenses.
- **Visual Analytics**: collaborative usage bars and percentage indicators.

### 3. 🤖 Automation & Workflows
- **JSM Integration**: Webhook listener for Jira Service Management tickets.
- **Automated Workflows**:
  - **Onboarding**: Triggers tasks for account creation, license assignment, and device provisioning.
  - **Offboarding**: Automates account disablement, session revocation, and mailbox archiving.
- **Task Tracking**: Database-backed state machine for tracking workflow progress.

### 4. ⚡ Expanded IT Operations
- **Infrastructure Management**: Integrated Proxmox VM management.
- **Network & Sites**: Tracking and management of IT sites, networks, and software.
- **Security & Audit**: Audit logs and advanced reporting for IT administrators.

### 5. ⚡ Performance & Security
- **Server-Side Caching**: Intelligent caching for Graph API responses to minimize latency and API rate limits.
- **Secure Authentication**: MSAL (Microsoft Authentication Library) integration for secure access via Entra ID.
- **Role-Based Access**: Granular permissions for IT admins vs. IT users based on Azure AD/Entra ID groups.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons, Zustand, Recharts
- **Backend**: Node.js, Express, PostgreSQL
- **Integrations**: Microsoft Graph API, Google Workspace API, Jira Service Management (Webhooks), Proxmox VE API
- **Infrastructure**: PM2, NGINX (Reverse Proxy)

## 📂 Project Structure

```
unified-dashboard/
├── app/                  # Frontend (React + Vite)
│   ├── src/              # Source code
│   └── docs/             # Documentation & Guides
├── backend/              # Backend (Node.js + Express)
│   ├── server.js         # Main API server & Workflow Engine
│   ├── db.js             # Database connection (PostgreSQL)
│   └── services/         # Helper services
└── TechSpec.md           # Technical Specifications
```

## 🚀 Getting Started

### Prerequisites
- Node.js (LTS)
- PostgreSQL
- Microsoft 365 Tenant with Graph API Access

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd unified-dashboard
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env  # Configure your credentials
   node server.js
   ```

3. **Setup Frontend**
   ```bash
   cd ../app
   npm install
   npm run dev
   ```

## 📦 Deployment

For detailed production deployment instructions, please refer to the [Production Guide](app/docs/PRODUCTION_GUIDE.md).

### Quick Deploy (Server)
```bash
# Update code
git pull origin main

# Restart Backend
cd backend
npm install
pm2 restart backend

# Rebuild Frontend
cd ../app
npm install
npm run build
```

## 📝 Configuration

### Environment Variables (.env)
- `AZURE_CLIENT_ID`: Your Azure App Client ID
- `AZURE_TENANT_ID`: Your Azure Tenant ID
- `AZURE_CLIENT_SECRET`: Your Azure App Secret
- `JSM_WEBHOOK_SECRET`: Secret token for validating Jira webhooks
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`: PostgreSQL credentials

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/NewFeature`)
3. Commit changes (`git commit -m 'Add NewFeature'`)
4. Push to branch (`git push origin feature/NewFeature`)
5. Open a Pull Request
