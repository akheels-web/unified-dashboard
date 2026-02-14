📊 1. Architecture Diagram
Current Development Architecture (Local Only)
┌──────────────────────────┐
│  Admin Browser (Internal)│
└─────────────┬────────────┘
              │
              ▼
┌──────────────────────────┐
│        NGINX             │
│  (Reverse Proxy - HTTP)  │
└─────────────┬────────────┘
              │
              ▼
┌──────────────────────────┐
│      Node.js Backend     │
│  (Express + PM2)         │
│                          │
│  - Graph API Integration │
│  - JSM Webhook Endpoint  │
│  - Workflow Engine       │
└─────────────┬────────────┘
              │
     ┌────────┴────────┐
     ▼                 ▼
┌─────────────┐   ┌───────────────┐
│ Microsoft   │   │ PostgreSQL    │
│ Graph API   │   │ (Local DB)    │
└─────────────┘   └───────────────┘

Future Production Architecture (Recommended)
                   Internet
                       │
                       ▼
┌────────────────────────────────────┐
│ automation.company.com (HTTPS)    │
│ Let's Encrypt SSL                  │
└───────────────┬────────────────────┘
                │
                ▼
        ┌─────────────────┐
        │      NGINX      │
        │  Reverse Proxy  │
        └─────────┬───────┘
                  │
                  ▼
        ┌─────────────────┐
        │ Node Backend    │
        │ (PM2 Managed)   │
        └─────────┬───────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
  Microsoft Graph       PostgreSQL
  Atlassian JSM         (Local or Dedicated VM)

🏗 2. Production Deployment Checklist
Infrastructure

 VM provisioned (4 vCPU / 4GB RAM minimum)

 Ubuntu LTS installed

 Firewall enabled (UFW)

 SSH hardened (no root login via password)

 Swap enabled

 NGINX installed

 Node LTS installed

 PM2 installed

 PostgreSQL installed

Application Setup
git clone <repo>
cd unified-dashboard/backend
npm install
pm2 start server.js --name dashboard-backend
pm2 save
pm2 startup

Environment Configuration (.env)
PORT=3000
AZURE_CLIENT_ID=
AZURE_TENANT_ID=
AZURE_CLIENT_SECRET=

DB_HOST=localhost
DB_USER=dashboard_user
DB_PASSWORD=********
DB_NAME=unified_dashboard

JSM_WEBHOOK_SECRET=********

Database Setup
sudo -u postgres createdb unified_dashboard
sudo -u postgres psql unified_dashboard -f schema.sql

NGINX Reverse Proxy

Example config:

server {
    listen 80;
    server_name automation.company.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}


Then:

sudo nginx -t
sudo systemctl restart nginx

SSL Setup (Production Only)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d automation.company.com

PM2 Auto Restart on Reboot
pm2 startup
pm2 save

🔐 3. Security Hardening Checklist
Server Security

 Disable root SSH login

 Use SSH keys only

 Enable UFW firewall

 Allow only ports 22, 80, 443

 Disable direct port 3000 access

 Enable automatic security updates

Application Security

 Validate JSM webhook secret

 Add rate limiting middleware

 Enable Helmet.js for security headers

 Sanitize input fields

 Use parameterized SQL queries (already done)

 Avoid logging sensitive tokens

Database Security

 Use dedicated DB user

 Restrict DB to localhost

 Strong password policy

 Daily backup cron job

Example backup:

pg_dump unified_dashboard > backup.sql

Microsoft Graph Security

 Least privilege API permissions

 App Registration restricted to tenant

 Rotate client secret periodically

📝 4. Full Technical Documentation (Internal IT Version)
System Purpose

Unified Dashboard is an internal IT automation platform that:

Integrates Microsoft Entra ID (Azure AD)

Integrates Microsoft Graph

Tracks license usage

Manages user operations

Automates onboarding/offboarding via Jira Service Management

Tracks workflow tasks (account creation, device assignment, MFA removal, etc.)

Core Modules
1. User Management

Fetches users from Microsoft Graph

Filters by department, location, status

Disables users

Revokes sessions

Removes MFA

Shows assigned devices (Intune)

2. License Management

Fetches subscribed SKUs

Calculates usage

Filters only relevant licenses

3. Workflow Engine

Triggered via JSM webhook:

Onboarding Flow

Create M365 account

Assign license

Add to groups

Create Jira account

Assign device

Custody form

Send welcome email

Offboarding Flow

Disable account

Revoke sessions

Remove MFA

Remove groups

Collect device

Archive mailbox

Database Schema Overview
jsm_tickets

Stores:

ticket_key

ticket_type

employee_name

department

manager

employment_type

start_date

status

workflows

Stores:

ticket reference

workflow_type

status

workflow_tasks

Stores:

workflow_id

task_name

status

timestamps

Monitoring & Maintenance
Check Backend
pm2 list

Check Logs
pm2 logs dashboard-backend

Check DB
sudo -u postgres psql unified_dashboard

Backup Strategy

Recommended:

Weekly full DB dump

Store backup off-server

Snapshot VM monthly

Rollback Strategy

If JSM integration must be removed:

Remove webhook route from server.js

Remove DB dependency

Drop jsm tables

Restart PM2

System continues functioning for Graph features.

Known Limitations

Currently local-only (no public webhook)

No task automation execution yet (manual status update only)

No audit log module

No multi-role access control

Current Server Summary
Component	Status
Ubuntu	Running
NGINX	Running
Node	Running
PM2	Running
PostgreSQL	Running
Graph Integration	Working
JSM Integration	Local Testing
Future Enhancements

Public HTTPS deployment

Automated account provisioning

Automated license assignment

Role-based access control

Audit logging

Email notifications

SLA tracking