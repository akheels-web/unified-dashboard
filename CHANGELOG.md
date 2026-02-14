# Changelog

All notable changes to the **Unified User Lifecycle Dashboard** project will be documented in this file.

## [Unreleased] - 2026-02-14

### 🚀 Added
- **Jira Service Management (JSM) Integration**: Added `/api/jsm/webhook` endpoint to automate onboarding and offboarding workflows triggered by JSM tickets.
- **Workflow Engine**: Implemented database schema (`jsm_tickets`, `workflows`, `workflow_tasks`) and logic to track automation states.
- **Database Connection**: Added `db.js` module for PostgreSQL connection pooling.
- **Production Guide**: Created detailed `app/docs/PRODUCTION_GUIDE.md` covering architecture, deployment, and security.

### 🐛 Fixed
- **Critical Server Crash**: Resolved `Duplicate declaration of LICENSE_NAME_MAP` error in `server.js` that caused 502 Bad Gateway errors.
- **License Filtering**: Fixed license count discrepancies by:
  - Correctly separating **Microsoft 365 Business Premium**, **Business Standard**, and **Business Premium + Copilot**.
  - Filtering out 10+ free/trial licenses (e.g., *Flow Free*, *PowerApps Viral*, *Windows Store*) to show only accurate paid license counts.
  - Removing duplicate SKU mappings that were inflating counts (e.g., Power BI Pro showing 1M+ licenses).
- **Performance**: Implemented server-side caching for Microsoft Graph API responses (`dashboardStats`, `licenses`, `deviceDistribution`) to reduce latency and API calls.

### 🧹 Cleanup
- Removed temporary debug endpoints (`/api/debug/all-licenses`) and console logging from the Licenses page.
- Consolidated license filtering logic into a single source of truth in `server.js`.

---

## [1.1.0] - 2026-02-13

### ✨ Enhanced
- **Dashboard Redesign**: Updated dashboard UI with new stats cards, charts, and improved layout.
- **User Management**: Added advanced filtering for users by department and location.
- **Asset Management**: Integrated Intune device data into user profiles.

### 🐛 Fixed
- **Pagination**: Fixed pagination issues on the Users page where data would desync.
- **OS Filtering**: Corrected operating system filtering logic for assets.

---

## [1.0.0] - 2026-02-10

### 🎉 Initial Release
- **Core Features**:
  - Microsoft Graph API integration.
  - User listing and details view.
  - Basic license usage tracking.
  - Group management.
  - Secure authentication with MSAL.
