# IT/HR Management Platform - Technical Specification

## Project Overview

A comprehensive web-based platform for managing IT and HR operations including user onboarding/offboarding, asset management, and integration with Microsoft 365, BambooHR, and Unifi Network devices.

---

## System Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand for global state
- **Authentication**: MSAL (Microsoft Authentication Library)
- **API Integration**: Axios with interceptors
- **Charts**: Recharts
- **Animations**: Framer Motion + GSAP
- **Icons**: Lucide React
- **Notifications**: Sonner

### Backend Architecture (On-Prem Server)
- **Runtime**: Node.js 18+ with Express
- **Database**: SQLite (lightweight, file-based)
- **Authentication**: Passport.js with Azure AD strategy
- **APIs**: RESTful with OpenAPI documentation
- **Scheduling**: node-cron for automated tasks
- **Logging**: Winston

---

## Database Schema

### Tables

```sql
-- Users table (platform users - IT/HR staff)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    azure_ad_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT CHECK(role IN ('it_admin', 'hr_admin', 'it_user', 'hr_user')) NOT NULL,
    department TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- M365 Users cache
CREATE TABLE m365_users (
    id TEXT PRIMARY KEY,
    user_principal_name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    given_name TEXT,
    surname TEXT,
    email TEXT,
    department TEXT,
    job_title TEXT,
    office_location TEXT,
    account_enabled BOOLEAN,
    created_date DATETIME,
    last_sign_in DATETIME,
    mfa_enabled BOOLEAN,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Groups
CREATE TABLE user_groups (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    group_type TEXT,
    member_count INTEGER DEFAULT 0,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Group Memberships
CREATE TABLE user_group_memberships (
    user_id TEXT REFERENCES m365_users(id),
    group_id TEXT REFERENCES user_groups(id),
    PRIMARY KEY (user_id, group_id)
);

-- Assets
CREATE TABLE assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_tag TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    manufacturer TEXT,
    model TEXT,
    serial_number TEXT,
    purchase_date DATE,
    warranty_expiry DATE,
    status TEXT CHECK(status IN ('available', 'assigned', 'maintenance', 'retired', 'lost')) DEFAULT 'available',
    assigned_to TEXT REFERENCES m365_users(id),
    location TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Asset Categories
CREATE TABLE asset_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT
);

-- Onboarding Workflows
CREATE TABLE onboarding_workflows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_name TEXT NOT NULL,
    employee_email TEXT NOT NULL,
    bamboohr_id TEXT,
    start_date DATE NOT NULL,
    department TEXT,
    job_title TEXT,
    manager_id TEXT REFERENCES m365_users(id),
    location TEXT,
    status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Onboarding Tasks
CREATE TABLE onboarding_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id INTEGER REFERENCES onboarding_workflows(id),
    task_type TEXT NOT NULL,
    task_name TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'failed')) DEFAULT 'pending',
    assigned_to INTEGER REFERENCES users(id),
    due_date DATETIME,
    completed_at DATETIME,
    result_data TEXT,
    error_message TEXT
);

-- Offboarding Workflows
CREATE TABLE offboarding_workflows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES m365_users(id) NOT NULL,
    employee_name TEXT NOT NULL,
    departure_date DATE NOT NULL,
    reason TEXT,
    disable_account BOOLEAN DEFAULT 1,
    revoke_sessions BOOLEAN DEFAULT 1,
    remove_mfa BOOLEAN DEFAULT 1,
    remove_groups BOOLEAN DEFAULT 1,
    forward_email TEXT,
    archive_data BOOLEAN DEFAULT 1,
    status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Offboarding Tasks
CREATE TABLE offboarding_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id INTEGER REFERENCES offboarding_workflows(id),
    task_type TEXT NOT NULL,
    task_name TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'failed')) DEFAULT 'pending',
    assigned_to INTEGER REFERENCES users(id),
    due_date DATETIME,
    completed_at DATETIME,
    result_data TEXT,
    error_message TEXT
);

-- BambooHR Sync Log
CREATE TABLE bamboohr_sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sync_type TEXT NOT NULL,
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    status TEXT CHECK(status IN ('running', 'completed', 'failed')) NOT NULL,
    error_message TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Unifi Sites
CREATE TABLE unifi_sites (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    timezone TEXT,
    device_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1
);

-- Unifi Devices
CREATE TABLE unifi_devices (
    id TEXT PRIMARY KEY,
    site_id TEXT REFERENCES unifi_sites(id),
    name TEXT NOT NULL,
    device_type TEXT NOT NULL,
    model TEXT,
    mac_address TEXT,
    ip_address TEXT,
    status TEXT CHECK(status IN ('online', 'offline', 'adopting', 'pending')),
    version TEXT,
    uptime INTEGER,
    num_clients INTEGER DEFAULT 0,
    last_seen DATETIME,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER REFERENCES users(id),
    user_email TEXT,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    severity TEXT CHECK(severity IN ('info', 'warning', 'error', 'critical')) DEFAULT 'info'
);

-- Settings
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);
```

---

## API Integrations

### Microsoft Graph API

#### Required Permissions
```
User.Read.All
User.ReadWrite.All
Group.Read.All
Group.ReadWrite.All
Directory.Read.All
Directory.ReadWrite.All
AuditLog.Read.All
Organization.Read.All
DeviceManagementManagedDevices.Read.All
DeviceManagementApps.Read.All
```

#### Key Endpoints

**Users Management:**
```javascript
// List users
GET https://graph.microsoft.com/v1.0/users?$select=id,displayName,userPrincipalName,mail,department,jobTitle,officeLocation,accountEnabled,createdDateTime,signInActivity

// Get user details
GET https://graph.microsoft.com/v1.0/users/{id}?$expand=memberOf

// Disable user
PATCH https://graph.microsoft.com/v1.0/users/{id}
Body: { "accountEnabled": false }

// Revoke sessions
POST https://graph.microsoft.com/v1.0/users/{id}/revokeSignInSessions

// Delete MFA methods
GET https://graph.microsoft.com/v1.0/users/{id}/authentication/methods
DELETE https://graph.microsoft.com/v1.0/users/{id}/authentication/methods/{methodId}

// Get user groups
GET https://graph.microsoft.com/v1.0/users/{id}/memberOf

// Remove from group
DELETE https://graph.microsoft.com/v1.0/groups/{groupId}/members/{userId}/$ref
```

**Groups Management:**
```javascript
// List groups
GET https://graph.microsoft.com/v1.0/groups?$select=id,displayName,description,groupTypes,membershipRule

// Add member to group
POST https://graph.microsoft.com/v1.0/groups/{groupId}/members/$ref
Body: { "@odata.id": "https://graph.microsoft.com/v1.0/directoryObjects/{userId}" }
```

**Device Management (Intune):**
```javascript
// List managed devices
GET https://graph.microsoft.com/v1.0/deviceManagement/managedDevices

// Get device details
GET https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/{id}

// Retire device
POST https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/{id}/retire
```

### BambooHR API

#### Authentication
- API Key in header: `Authorization: Basic {base64(api_key:x)}`

#### Key Endpoints
```javascript
// Get employee directory
GET https://api.bamboohr.com/api/gateway.php/{companyDomain}/v1/employees/directory

// Get employee details
GET https://api.bamboohr.com/api/gateway.php/{companyDomain}/v1/employees/{id}?fields=firstName,lastName,workEmail,department,jobTitle,supervisor,hireDate,location

// Get time off requests
GET https://api.bamboohr.com/api/gateway.php/{companyDomain}/v1/time_off/requests

// Webhook setup for real-time updates
POST https://api.bamboohr.com/api/gateway.php/{companyDomain}/v1/webhooks
```

#### Webhook Events
- Employee created
- Employee updated
- Employee terminated
- Time off request

### Unifi Controller API

#### Authentication
```javascript
// Login
POST https://{controller}:8443/api/login
Body: { "username": "", "password": "" }

// Or use API key in header
Headers: { "X-API-KEY": "your-api-key" }
```

#### Key Endpoints
```javascript
// List sites
GET https://{controller}:8443/api/self/sites

// List devices for site
GET https://{controller}:8443/api/s/{siteName}/stat/device

// Get device details
GET https://{controller}:8443/api/s/{siteName}/stat/device/{mac}

// Restart device
POST https://{controller}:8443/api/s/{siteName}/cmd/devmgr
Body: { "cmd": "restart", "mac": "aa:bb:cc:dd:ee:ff" }

// List clients
GET https://{controller}:8443/api/s/{siteName}/stat/sta

// Get site stats
GET https://{controller}:8443/api/s/{siteName}/stat/health
```

---

## Backend API Structure

### Authentication Routes
```
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/me
GET  /api/auth/callback (Azure AD OAuth callback)
```

### User Routes
```
GET    /api/users
GET    /api/users/:id
GET    /api/users/:id/groups
GET    /api/users/:id/devices
POST   /api/users/:id/disable
POST   /api/users/:id/revoke-sessions
DELETE /api/users/:id/mfa
POST   /api/users/:id/groups/remove-all
POST   /api/users/sync (sync from M365)
```

### Group Routes
```
GET  /api/groups
GET  /api/groups/:id
GET  /api/groups/:id/members
POST /api/groups/:id/members
DELETE /api/groups/:id/members/:userId
```

### Asset Routes
```
GET    /api/assets
POST   /api/assets
GET    /api/assets/:id
PUT    /api/assets/:id
DELETE /api/assets/:id
POST   /api/assets/:id/assign
POST   /api/assets/:id/unassign
GET    /api/assets/categories
```

### Onboarding Routes
```
GET    /api/onboarding
POST   /api/onboarding
GET    /api/onboarding/:id
PUT    /api/onboarding/:id
POST   /api/onboarding/:id/execute
GET    /api/onboarding/:id/tasks
POST   /api/onboarding/:id/tasks/:taskId/complete
```

### Offboarding Routes
```
GET    /api/offboarding
POST   /api/offboarding
GET    /api/offboarding/:id
PUT    /api/offboarding/:id
POST   /api/offboarding/:id/execute
GET    /api/offboarding/:id/tasks
POST   /api/offboarding/:id/tasks/:taskId/complete
```

### BambooHR Routes
```
GET  /api/bamboohr/employees
GET  /api/bamboohr/employees/:id
POST /api/bamboohr/sync
GET  /api/bamboohr/sync-status
GET  /api/bamboohr/mappings
PUT  /api/bamboohr/mappings
```

### Unifi Routes
```
GET  /api/unifi/sites
GET  /api/unifi/sites/:siteId/devices
GET  /api/unifi/devices/:deviceId
POST /api/unifi/devices/:deviceId/restart
GET  /api/unifi/sites/:siteId/clients
GET  /api/unifi/sites/:siteId/stats
```

### Dashboard Routes
```
GET /api/dashboard/stats
GET /api/dashboard/activity
GET /api/dashboard/chart-data
```

### Audit Routes
```
GET /api/audit/logs
GET /api/audit/export
```

---

## Frontend Structure

### Route Structure
```
/                    - Dashboard (default)
/login               - Login page
/users               - Users list
/users/:id           - User detail
/assets              - Assets list
/assets/:id          - Asset detail
/onboarding          - Onboarding workflows
/onboarding/new      - New onboarding
/onboarding/:id      - Onboarding detail
/offboarding         - Offboarding workflows
/offboarding/new     - New offboarding
/offboarding/:id     - Offboarding detail
/bamboohr            - BambooHR integration
/network             - Unifi network
/reports             - Reports & analytics
/audit               - Audit logs
/settings            - Platform settings
```

### Component Structure
```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # Layout components
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── MainLayout.tsx
│   ├── common/          # Shared components
│   │   ├── DataTable.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── SearchInput.tsx
│   │   ├── FilterBar.tsx
│   │   └── LoadingState.tsx
│   └── widgets/         # Dashboard widgets
│       ├── StatsCard.tsx
│       ├── ActivityFeed.tsx
│       ├── ChartWidget.tsx
│       └── SystemStatus.tsx
├── pages/               # Page components
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Users.tsx
│   ├── Assets.tsx
│   ├── Onboarding.tsx
│   ├── Offboarding.tsx
│   ├── BambooHR.tsx
│   ├── Network.tsx
│   ├── Reports.tsx
│   ├── Audit.tsx
│   └── Settings.tsx
├── hooks/               # Custom hooks
│   ├── useAuth.ts
│   ├── useUsers.ts
│   ├── useAssets.ts
│   ├── useOnboarding.ts
│   ├── useOffboarding.ts
│   └── useAudit.ts
├── stores/              # Zustand stores
│   ├── authStore.ts
│   ├── userStore.ts
│   ├── assetStore.ts
│   └── uiStore.ts
├── services/            # API services
│   ├── api.ts
│   ├── authService.ts
│   ├── userService.ts
│   ├── assetService.ts
│   ├── onboardingService.ts
│   ├── offboardingService.ts
│   ├── bamboohrService.ts
│   └── unifiService.ts
├── types/               # TypeScript types
│   └── index.ts
├── lib/                 # Utilities
│   └── utils.ts
└── App.tsx
```

---

## Security Considerations

### Authentication & Authorization
- Azure AD OAuth 2.0 integration
- JWT tokens with short expiry
- Role-based access control (RBAC)
- Session management
- CSRF protection

### Data Protection
- API keys stored securely (environment variables)
- Encrypted database connections
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- XSS protection

### Audit & Compliance
- All actions logged
- Immutable audit logs
- Data retention policies
- GDPR compliance for user data

---

## Deployment Guide

### Prerequisites
- Node.js 18+ installed
- Windows Server 2019+ or Linux
- IIS or Nginx as reverse proxy
- SSL certificate

### Installation Steps

1. **Clone and install dependencies**
```bash
cd /path/to/app
npm install
```

2. **Environment Configuration**
Create `.env` file:
```
# Server
PORT=3000
NODE_ENV=production

# Database
DB_PATH=./data/platform.db

# Azure AD
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id
AZURE_REDIRECT_URI=https://your-domain/api/auth/callback

# Microsoft Graph
GRAPH_API_URL=https://graph.microsoft.com/v1.0

# BambooHR
BAMBOOHR_API_KEY=your-api-key
BAMBOOHR_COMPANY_DOMAIN=your-company

# Unifi
UNIFI_CONTROLLER_URL=https://your-controller:8443
UNIFI_USERNAME=your-username
UNIFI_PASSWORD=your-password
UNIFI_API_KEY=your-api-key

# Session
SESSION_SECRET=your-random-secret
JWT_SECRET=your-jwt-secret
```

3. **Initialize Database**
```bash
npm run db:init
```

4. **Build Frontend**
```bash
npm run build
```

5. **Start Server**
```bash
npm start
# or using PM2
pm2 start server.js --name it-hr-platform
```

### Windows Service Setup
```powershell
# Using nssm
nssm install IT-HR-Platform "C:\Program Files\nodejs\node.exe" "C:\app\server.js"
nssm set IT-HR-Platform AppDirectory "C:\app"
nssm start IT-HR-Platform
```

### IIS Reverse Proxy Configuration
```xml
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxy" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:3000/{R:1}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

---

## Scheduled Tasks

### Automated Sync Jobs
```javascript
// Sync M365 users every 4 hours
cron.schedule('0 */4 * * *', syncM365Users);

// Sync BambooHR every 2 hours
cron.schedule('0 */2 * * *', syncBambooHR);

// Sync Unifi devices every 5 minutes
cron.schedule('*/5 * * * *', syncUnifiDevices);

// Process pending offboardings daily at 9 AM
cron.schedule('0 9 * * *', processPendingOffboardings);

// Cleanup old audit logs (keep 90 days)
cron.schedule('0 0 * * 0', cleanupAuditLogs);
```

---

## Monitoring & Alerting

### Health Checks
- API endpoint: GET /api/health
- Database connectivity
- External API status (M365, BambooHR, Unifi)

### Alerts
- Failed offboarding tasks
- Sync failures
- Unifi device offline
- Low license availability

---

## Future Enhancements

1. **PowerShell Automation**: Run PowerShell scripts for advanced M365 operations
2. **Email Templates**: Customizable email notifications
3. **Workflow Builder**: Visual workflow customization
4. **Mobile App**: React Native companion app
5. **AI Assistant**: GPT-powered help and automation suggestions
6. **SSO Integration**: Additional identity providers
7. **Asset Scanning**: Barcode/QR code scanning
8. **SLA Tracking**: Service level agreement monitoring
