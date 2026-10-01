# Git and Server Deployment Rules

## Git Repository
- **Remote**: `origin` (`https://github.com/sunseekerstours/crm-app-website.git`)
- **Default Production Branch**: `main`

## Production Server & VPS Access
- **Deployment Platform**: Dokploy
- **Server IP**: `69.62.106.189`
- **SSH User & Host**: `root@69.62.106.189` (pre-authenticated via local SSH key `~/.ssh/id_ed25519` on the user's Windows machine)
- **Direct SSH Test Command**:
  ```powershell
  ssh.exe root@69.62.106.189 "uptime"
  ```
- **Dokploy Dashboard**: `http://69.62.106.189:3000`
- **Dokploy App Name**: `sunseekers-crm-75eab8`
- **Dokploy Compose Project Directory on VPS**: `/etc/dokploy/compose/sunseekers-crm-75eab8/code`
- **Compose Project Name**: `sunseekers-crm`

## Services & Hosted Domains
- **Web CRM**: `https://sunseekers-crm-69-62-106-189.sslip.io` (Port 3001)
- **Admin Portal**: `https://sunseekers-admin-69-62-106-189.sslip.io` (Port 3003)
- **Public Website**: `https://sunseekers-site-69-62-106-189.sslip.io` (Port 3002)
- **Backend API**: `https://sunseekers-api-69-62-106-189.sslip.io` (Port 3000)

## Automatic Deployment Webhook
- **Webhook Endpoint**:
  `http://69.62.106.189:3000/api/deploy/compose/sst_deploy_9f2a74c18e3d489b9101d2`
- **GitHub Actions Workflow**: `.github/workflows/deploy.yml` triggers this webhook automatically on every `git push` to `main`.
- **Manual Webhook Trigger (via cURL or PowerShell)**:
  ```powershell
  curl.exe -s -X POST -H "Content-Type: application/json" -H "x-github-event: push" -d '{\"ref\":\"refs/heads/main\"}' "http://69.62.106.189:3000/api/deploy/compose/sst_deploy_9f2a74c18e3d489b9101d2"
  ```

## Direct Server Rebuild & Deploy Command (Fallback)
If you ever need to directly deploy via SSH without waiting for Dokploy:
```powershell
ssh.exe root@69.62.106.189 "cd /etc/dokploy/compose/sunseekers-crm-75eab8/code && git pull origin main && docker compose --env-file ../.env -p sunseekers-crm -f docker-compose.prod.yml up -d --build"
```

## Protocol for Every Session
1. Check types with `npx tsc --noEmit` on affected workspaces (`apps/web`, `apps/admin`, `apps/backend`).
2. Stage and commit with `git add` and `git commit`.
3. Push to `main` with `git push origin main`.
4. Trigger the Dokploy deploy webhook (or let GitHub Actions do it), or directly SSH and run `docker compose up -d --build`.
