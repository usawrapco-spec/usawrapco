# 🚀 QUICK START — Core Transaction Flow

## ⚡ Fast Deployment (5 minutes)

### Step 1: Run SQL Migration

**Go to Supabase SQL Editor:**
👉 https://uqfqkvslxoucxmxxrobt.supabase.co/project/_/sql

**Copy and paste this entire file:**
👉 `sql/core_transaction_flow.sql`

**Click "Run" ✓**

---

### Step 2: Verify Tables Created

Run this query to verify:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('estimates', 'sales_orders', 'invoices', 'payments');
```

You should see 4 tables.

---

### Step 3: Test the Flow

1. **Go to:** http://localhost:3000/estimates
2. **Click:** "New Estimate" button
3. **Add line items** (or use demo mode)
4. **Click:** "Convert to Sales Order"
5. **Select items** → "Create 1 Job"
6. **From SO page, click:** "Create Invoice"
7. **From Invoice page, click:** "Record Payment"
8. **Enter amount** → "Record Payment"
9. **Go to:** http://localhost:3000/reports/revenue

---

## 🎯 What You Can Do Now

- ✅ Create estimates (QT #1000, #1001...)
- ✅ Convert to sales orders (SO #1000, #1001...)
- ✅ Generate invoices (IN #1000, #1001...)
- ✅ Record payments (cash, card, check, etc.)
- ✅ Track revenue by period
- ✅ Click between linked documents (breadcrumbs)
- ✅ View payment status banners

---

## 📊 Key URLs

| Page | URL |
|------|-----|
| Estimates | `/estimates` |
| Sales Orders | `/sales-orders` |
| Invoices | `/invoices` |
| Revenue Report | `/reports/revenue` |

---

**You're done!** The core transaction flow is **live and ready**.
