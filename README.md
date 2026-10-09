# ClassCode Tracker — Institutional Competitive Programming Aggregator

> **Codolio-style Competitive-Programming Profile Aggregator for Academic Institutions**  
> *Zero-Cost Infrastructure: Supabase Free (Mumbai `ap-south-1`) + Vercel Hobby + GitHub Actions*

---

## 🌟 System Overview

ClassCode Tracker aggregates competitive programming metrics across 8 platforms: **LeetCode, CodeChef, Codeforces, AtCoder, GeeksforGeeks, HackerRank, InterviewBit, and Code360/CodeStudio**.

- **Students**: Connect coding platform handles via one-time verification tokens (`cct-<hex>`), track daily UTC submission heatmaps, view interactive contest rating trajectory charts, and inspect overall class rank standing.
- **Faculty & Admins**: Monitor cohort KPIs (Active Students, Total Solved, Avg Rating, DB Quota usage), perform student CRUD and bulk CSV imports, trigger password resets, review immutable audit log trails, and view student dashboards in a safe read-only masquerade mode.

---

## 🛠️ Free-Tier Infrastructure Setup Guide

### 1. Supabase Free Project Setup (Mumbai Region)
1. Log in to [Supabase Console](https://supabase.com) and create a new project.
2. Select Region: **Mumbai (`ap-south-1`)** (verifying compliance with India's DPDP Act 2023).
3. Under **Project Settings > Authentication**, **disable "Enable Email Signup"** (all student accounts are created server-side by faculty).
4. Run the SQL migration located at `supabase/migrations/20261008000000_init_schema_and_rls.sql` in the Supabase SQL Editor.
5. Under **Project Settings > Database**, locate your connection strings:
   - **Session Pooler (Port 5432)**: Used for schema migrations and `pg_dump` backups in GitHub Actions.
   - **Transaction Pooler (Port 6543)**: Used for high-concurrency Node sync worker scripts.

### 2. Environment Variables & GitHub Actions Secrets

#### Local `.env.local` File:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

#### GitHub Actions Repository Secrets:
Set the following secrets under **Settings > Secrets and variables > Actions**:

| Secret Name | Description | Example / Port |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | `https://xyz.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin key | `eyJhbG...` |
| `SUPABASE_DB_PASSWORD` | PostgreSQL Database Password | `MySecretPass123` |
| `SUPABASE_DB_SESSION_HOST` | Supabase Session Pooler Host | `aws-0-ap-south-1.pooler.supabase.com` (Port 5432) |
| `SUPABASE_DB_USER` | Supabase DB User String | `postgres.xyz` |
| `BACKUP_ENCRYPTION_PASSPHRASE` | Passphrase for AES-256 GPG Backup | `SuperSecretGpgKey2025` |

---

## 🚀 Deployment to Vercel Hobby

1. Push this repository to your GitHub account (private repository recommended).
2. Connect your repository to [Vercel](https://vercel.com).
3. Add environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
4. Deploy! Next.js 14+ App Router automatically optimizes pages with server-side rendering and edge middleware.

---

## 🔄 Automated Keep-Alive & Backup Runbook

### Preventing Project Auto-Pause
- **6-Hour Scheduled Worker (`sync.yml`)**: Queries the database every 6 hours, maintaining active database connections and keeping the project awake automatically.
- **Monthly Keep-Alive (`keepalive.yml`)**: Prevents GitHub's default 60-day scheduled workflow auto-disable by committing a lightweight ping if inactive.

### Database Backup & Restore Runbook

#### Downloading Weekly Backup:
Weekly encrypted backups are generated automatically by `.github/workflows/backup.yml` using `pg_dump` over Session Pooler port 5432 and saved as GPG AES-256 encrypted artifacts.

#### Restore Procedure:
1. Download the encrypted `.sql.gpg` file from your GitHub Actions workflow run artifacts.
2. Decrypt the file locally using GPG:
   ```bash
   gpg --decrypt --batch --passphrase "YOUR_BACKUP_ENCRYPTION_PASSPHRASE" db_dump_20261008.sql.gpg > db_dump_restored.sql
   ```
3. Restore the database using `psql` over the Supabase Session Pooler (port 5432):
   ```bash
   psql -h aws-0-ap-south-1.pooler.supabase.com -p 5432 -U postgres.xyz -d postgres -f db_dump_restored.sql
   ```

---

## 🔧 Adapter Maintenance & Scraper Fragility Guide

If a competitive programming platform changes its public HTML markup or API structure:

1. **Isolation**: Only the specific platform's adapter in `src/lib/adapters/` breaks (e.g. `src/lib/adapters/codechef.ts`). All other platform adapters continue operating independently.
2. **Circuit Breaker**: The system automatically trips `adapter_health` for that platform, sets `sync_status = 'STALE'`, and preserves historical data without failing student dashboards or crashing the sync runner.
3. **Updating Selectors**: Edit the regex or JSON parser inside `src/lib/adapters/<platform>.ts` and run `npm test` to verify.

---

## 🧪 Running Local Development & Unit Tests

```bash
# Install dependencies
npm install --legacy-peer-deps

# Run Vitest unit & security test suite
npm test

# Launch Next.js local dev server on http://localhost:3000
npm run dev
```
