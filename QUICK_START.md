# ⚡ QUICK START GUIDE — WrapShop Pro v6.0

## 🚀 5-Minute Setup

### Step 1: Run Database Migration (2 min)
1. Go to https://uqfqkvslxoucxmxxrobt.supabase.co
2. Click **SQL Editor**
3. Open file: `supabase/migrations/001_all_tables.sql`
4. Copy all 2,921 lines
5. Paste into SQL Editor
6. Click **Run**
7. Wait for "Success" message

### Step 2: Set Yourself as Owner (30 sec)
In Supabase SQL Editor, run:
```sql
UPDATE profiles
SET is_owner = true
WHERE email = 'usawrapco@gmail.com';
```

### Step 3: Add Anthropic API Key (1 min)
1. Go to https://app.usawrapco.com/admin/integrations
2. Password: `1099`
3. Enter your Anthropic API key
4. Click Save

### Step 4: Configure Company Info (1 min)
1. Go to https://app.usawrapco.com/admin/org
2. Set:
   - Name: **USA Wrap Co**
   - Phone: **253-525-8148**
   - Email: **sales@usawrapco.com**
   - Address: **4124 124th St. NW, Gig Harbor, WA 98332**
3. Click Save

### Step 5: Create Your First Estimate (30 sec)
1. Go to https://app.usawrapco.com/dashboard
2. Click **+ New Estimate**
3. Select vehicle type: **Med Van**
4. Watch the live GPM calculator update
5. Click **Save Estimate**

**✅ You're live!**

---

## 🔑 Login Credentials

**Live App:** https://app.usawrapco.com
**Email:** usawrapco@gmail.com (or your Google account)
**Method:** Google OAuth (click "Sign in with Google")

**Admin Password:** `1099` (for /admin routes)

---

## 📊 Key URLs

| Feature | URL |
|---------|-----|
| Dashboard | https://app.usawrapco.com/dashboard |
| Pipeline | https://app.usawrapco.com/pipeline |
| Estimates | https://app.usawrapco.com/estimates |
| Design Studio | https://app.usawrapco.com/design |
| Installer Portal | https://app.usawrapco.com/installer-portal |
| Admin Center | https://app.usawrapco.com/admin |
| Settings | https://app.usawrapco.com/settings |

---

## 🎯 Common Tasks

### Create New Estimate
1. Dashboard → **+ New Estimate**
2. Fill customer info
3. Select vehicle type or enter custom dimensions
4. Watch GPM update live
5. Save

### Move Job Through Pipeline
1. Pipeline → Click job card
2. Complete required fields for current stage
3. Click **✓ Sign Off — [Stage Name]**
4. Job advances to next stage

### Upload Design Proof
1. Design Studio → Click project
2. Click **Upload File**
3. Drag/drop file or browse
4. Click **Send to Customer**

### Track Installer Time
1. Installer Portal → My Jobs → Click job
2. Install tab → Click **START TIMER**
3. Timer runs (persists across refresh)
4. Click **END** when done
5. Complete post-install checklist
6. Click **✓ Sign Off — Install**

### Send Customer Intake Form
1. Create estimate
2. In estimate, click **Send Intake Link**
3. Customer gets tokenized URL: `/intake/[token]`
4. They scan VIN, upload photos, enter design brief
5. Data auto-populates in your estimate

---

## 🤖 AI Features

### V.I.N.Y.L. Chat (Always Available)
- Click floating chat button (bottom-right)
- Ask questions: "What's our revenue this month?"
- Execute actions: "Create estimate for John Smith"
- Voice input on mobile

### AI Morning Briefing
- Appears on dashboard on login
- Shows: today's jobs, overdue tasks, pending estimates, pipeline summary
- Powered by Claude Opus 4.6

### AI Mockup Generator
- From estimate → Click **Generate Mockup**
- Enter design brief (colors, style, brand)
- Upload logo/brand files
- AI generates photorealistic vehicle wrap mockup
- Customer sees it on their portal

### AI Project Recap
- From job detail → Click **AI Recap**
- Generates narrative summary:
  - Financial (quoted vs actual, GPM, commission)
  - Production (materials, QC, waste)
  - Install (hours, checklists)
  - Design (revisions, approval timeline)

---

## 💰 Commission Structure Quick Reference

**Inbound (Company Leads):**
- Base: 4.5% of GP
- +1% bonus: Torq completed
- +2% bonus: GPM >73%
- Max: 7.5% of GP

**Outbound (Agent's Own Leads):**
- Base: 7% of GP
- +1% bonus: Torq completed
- +2% bonus: GPM >73%
- Max: 10% of GP

**Pre-Sold (Coordination):**
- Flat: 5% of GP
- No bonuses

**Protection Rule:**
- GPM <65%: base only, no bonuses
- GPM <70%: base only, no bonuses

**GP = Sale Price − COGS**
**COGS = Material + Installer Pay + Design Fee + Misc**

---

## 📱 Mobile Usage

**Installers:**
- Use /installer-portal on phone
- Accept bids, track time, upload photos
- Complete checklists, get customer signature

**Sales Reps:**
- Create estimates on phone
- Check pipeline, update job status
- Use V.I.N.Y.L. chat for quick actions

**Customers:**
- Scan QR code or click link
- Review designs, annotate, approve
- Track job progress

---

## 🔧 Troubleshooting

**Can't see admin menu items?**
- Run: `UPDATE profiles SET is_owner = true WHERE email = 'your@email.com';`
- Or set `role = 'admin'`

**V.I.N.Y.L. chat not responding?**
- Check Anthropic API key in /admin/integrations
- Verify key has credits

**Build errors when making changes?**
- Always run `npm run build` before committing
- Fix all errors before pushing
- Push triggers auto-deploy to Vercel

**Missing pages/routes?**
- All 119 routes should be accessible
- Check role permissions (admin sees everything)
- Clear browser cache and hard refresh

---

## 📞 Need Help?

**Documentation:**
- Full Spec: `WRAPSHOP_PRO_MASTER.md`
- Deployment: `V6_DEPLOYMENT_SUMMARY.md`
- Project Rules: `CLAUDE.md`

**Contact:**
- Chance Wallace: usawrapco@gmail.com
- Phone: 253-525-8148

**GitHub:**
- https://github.com/usawrapco-spec/usawrapco
- Issues, pull requests, feature requests

---

## ✅ Quick Checklist

- [ ] Database migration run (80 tables created)
- [ ] is_owner set on your profile
- [ ] Anthropic API key configured
- [ ] Company info set (logo, phone, address)
- [ ] Team members invited
- [ ] First test estimate created
- [ ] Test job moved through pipeline
- [ ] Design file uploaded and proofed
- [ ] Installer time tracked on test job
- [ ] Customer intake form tested

**Once all checked → You're production-ready! 🎉**

---

**🚀 WrapShop Pro v6.0 — Built for USA Wrap Co**
*The AI-First Vehicle Wrap Shop Operating System*
