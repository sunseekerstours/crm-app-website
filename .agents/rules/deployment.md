# Git and Server Deployment Rules

## Git Repository
- **Remote**: `origin` (`https://github.com/sunseekerstours/crm-app-website.git`)
- **Default Production Branch**: `main`

## Production Server & Dokploy Details
- **Deployment Platform**: Dokploy
- **Server IP**: `69.62.106.189`
- **Dokploy App Name**: `sunseekers-crm-75eab8`
- **Services Hosted**:
  - Web CRM: `https://sunseekers-crm-69-62-106-189.sslip.io` (Port 3001)
  - Admin Portal: `https://sunseekers-admin-69-62-106-189.sslip.io` (Port 3003)
  - Public Website: `https://sunseekers-site-69-62-106-189.sslip.io` (Port 3002)
  - Backend API: `https://sunseekers-api-69-62-106-189.sslip.io` (Port 3000)

## Deployment Protocol
1. Whenever the user requests to deploy or commit changes:
   - Run typechecks / builds (`apps/backend`, `apps/admin`, `apps/web`) to verify integrity.
   - Stage all required changes (`git add`).
   - Create a clear, descriptive commit message.
   - Push to `origin main` (`git push origin main`).
2. Pushing to `main` on GitHub directly triggers Dokploy's build and deployment pipeline on the server.
