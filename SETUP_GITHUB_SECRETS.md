# 🔐 Setup GitHub Secrets for Automated Deployment

## This Will Auto-Run Your SQL Migration!

Instead of pasting SQL manually, GitHub Actions will run it automatically when you push to main.

---

## ⚙️ Setup (One-Time, 2 minutes):

### Step 1: Get Your Supabase Credentials

1. **Go to:** https://supabase.com/dashboard/project/_/settings/api
2. **Copy these values:**
   - Project URL (looks like: `uqfqkvslxoucxmxxrobt`)
   - Service Role Key (starts with `eyJ...`)

3. **Get Database Password:**
   - Go to: https://supabase.com/dashboard/project/_/settings/database
   - Scroll to "Connection String"
   - Copy the password from the connection string

---

### Step 2: Add GitHub Secrets

1. **Go to your GitHub repo:**
   - https://github.com/your-username/usawrapco/settings/secrets/actions

2. **Click "New repository secret"**

3. **Add these 3 secrets:**

   **Secret 1:**
   - Name: `SUPABASE_PROJECT_ID`
   - Value: `uqfqkvslxoucxmxxrobt`

   **Secret 2:**
   - Name: `SUPABASE_DB_PASSWORD`
   - Value: [Your database password from Step 1]

   **Secret 3:**
   - Name: `SUPABASE_ACCESS_TOKEN`
   - Value: [Your service role key from Step 1]

---

### Step 3: Trigger the Workflow

**Option A - Automatic (Recommended):**
```bash
git add .
git commit -m "feat: trigger database migration"
git push origin main
```

The migration will run automatically! ✅

**Option B - Manual:**
1. Go to: https://github.com/your-username/usawrapco/actions
2. Click "Deploy Database Migration"
3. Click "Run workflow"
4. Click the green "Run workflow" button

---

## ✅ What Happens:

1. GitHub Action starts
2. Installs Supabase CLI
3. Connects to your database
4. Runs `sql/core_transaction_flow.sql`
5. Verifies tables were created
6. Reports success! ✓

---

## 🎯 After Setup:

Future migrations will run automatically when you:
- Push changes to `sql/core_transaction_flow.sql`
- Push changes to the workflow file

---

## ⚡ Benefits:

✅ No manual copy-paste needed
✅ Automatic on every push
✅ Logs show exactly what happened
✅ Can re-run if it fails
✅ Version controlled migrations

---

## 🔍 Check If It Worked:

After the workflow runs, check:
1. GitHub Actions tab shows green checkmark ✓
2. Go to your app: `/estimates` page works
3. Supabase dashboard shows new tables

---

## 🚨 Troubleshooting:

**If workflow fails:**
- Check GitHub Secrets are correct
- Check database password is right
- View logs in GitHub Actions tab

**If tables already exist:**
- That's OK! `CREATE TABLE IF NOT EXISTS` won't break anything
- Workflow will still succeed

---

## 🎉 Once Set Up:

You never need to manually run migrations again! Just:
```bash
git push
```

And everything deploys automatically - code AND database! 🚀
