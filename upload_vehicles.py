"""
WrapShop Pro — Vehicle Measurements Batch Uploader
Run this script ONCE from any machine with Python 3 installed.
It will restore all 2,045 vehicles directly to Supabase in batches.

Requirements: pip install requests
Run: python upload_vehicles.py
"""

import re
import uuid
import json
import urllib.request
import urllib.error

# ── CONFIG ─────────────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://uqfqkvslxoucxmxxrobt.supabase.co")
SERVICE_KEY   = os.environ["SUPABASE_SERVICE_ROLE_KEY"]  # set in environment, never hardcode
ORG_ID        = os.environ.get("ORG_ID", "d34a6c47-1ac0-4008-87d2-0f7741eebc4f")
BATCH_SIZE    = 100   # rows per request (safe for Supabase REST)
# ───────────────────────────────────────────────────────────────────────────────

HEADERS = {
    "Content-Type":  "application/json",
    "apikey":        SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Prefer":        "return=minimal",
}

# ── PARSE DATA FILE ────────────────────────────────────────────────────────────
import os, sys

# Find the data file — works from anywhere
script_dir = os.path.dirname(os.path.abspath(__file__))
data_file = os.path.join(script_dir, "Make_Model_Year_Side_Width_Side_Hei.txt")

if not os.path.exists(data_file):
    # Try current working directory
    data_file = "Make_Model_Year_Side_Width_Side_Hei.txt"

if not os.path.exists(data_file):
    print("ERROR: Cannot find Make_Model_Year_Side_Width_Side_Hei.txt")
    print(f"  Looked in: {script_dir} and current directory")
    print("  Place the .txt file in the same folder as this script and re-run.")
    sys.exit(1)

print(f"Reading vehicle data from: {data_file}")

with open(data_file, "r", encoding="utf-8-sig") as f:
    raw = f.read()

skip_patterns = ["Page ", "*** Measurements", "Make Model Year Side Width"]
lines = []
for line in raw.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
    line = line.strip()
    if not line:
        continue
    skip = False
    for p in skip_patterns:
        if p in line and (p != "Page " or line.startswith("Page ")):
            skip = True
            break
    if not skip:
        lines.append(line)

records = []
skipped = 0

for line in lines:
    if not line.strip():
        continue

    # Find year range (e.g. 2001-2026) or single year
    year_match = re.search(r"(1[89]\d\d|20\d\d)-(1[89]\d\d|20\d\d)", line)
    if not year_match:
        year_match = re.search(r"(1[89]\d\d|20\d\d)", line)
    if not year_match:
        skipped += 1
        continue

    year_str    = year_match.group(0)
    before_year = line[:year_match.start()].strip()
    after_year  = line[year_match.end():].strip()

    tokens = before_year.split()
    if not tokens:
        skipped += 1
        continue

    make  = tokens[0]
    model = " ".join(tokens[1:]) if len(tokens) > 1 else ""

    # Parse measurements (- = NULL/None)
    meas_vals = []
    for t in after_year.split():
        if t == "-":
            meas_vals.append(None)
        else:
            try:
                meas_vals.append(float(t))
            except ValueError:
                pass

    if not meas_vals:
        skipped += 1
        continue

    total_sqft = meas_vals[-1]
    if total_sqft is None:
        skipped += 1
        continue

    dims = meas_vals[:-1]
    if len(dims) < 12:
        dims += [None] * (12 - len(dims))
    else:
        dims = dims[:12]

    all_vals = dims + [total_sqft]  # 13 values

    records.append({
        "id":          str(uuid.uuid4()),
        "org_id":      ORG_ID,
        "make":        make,
        "model":       model,
        "year_range":  year_str,
        "side_width":  all_vals[0],
        "side_height": all_vals[1],
        "side_sqft":   all_vals[2],
        "back_width":  all_vals[3],
        "back_height": all_vals[4],
        "back_sqft":   all_vals[5],
        "hood_width":  all_vals[6],
        "hood_length": all_vals[7],
        "hood_sqft":   all_vals[8],
        "roof_width":  all_vals[9],
        "roof_length": all_vals[10],
        "roof_sqft":   all_vals[11],
        "total_sqft":  all_vals[12],
    })

print(f"Parsed {len(records)} vehicles ({skipped} skipped).")


# ── SUPABASE HELPERS ───────────────────────────────────────────────────────────

def supabase_request(method, path, body=None):
    url  = f"{SUPABASE_URL}/rest/v1/{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req  = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")


# ── STEP 1: ENSURE TABLE EXISTS ───────────────────────────────────────────────
# The table should already exist; we skip DDL here (REST API doesn't support it).
# If it doesn't exist, run this in Supabase SQL Editor first:
#
#   CREATE TABLE IF NOT EXISTS vehicle_measurements (
#     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
#     org_id uuid,
#     make text NOT NULL,
#     model text NOT NULL,
#     year_range text,
#     side_width numeric, side_height numeric, side_sqft numeric,
#     back_width numeric, back_height numeric, back_sqft numeric,
#     hood_width numeric, hood_length numeric, hood_sqft numeric,
#     roof_width numeric, roof_length numeric, roof_sqft numeric,
#     total_sqft numeric,
#     created_at timestamptz DEFAULT now()
#   );
#   ALTER TABLE vehicle_measurements ENABLE ROW LEVEL SECURITY;
#   CREATE POLICY "service_access" ON vehicle_measurements FOR ALL USING (true);


# ── STEP 2: DELETE EXISTING RECORDS FOR THIS ORG ─────────────────────────────
print("\nClearing existing vehicle records for this org...")
status, body = supabase_request(
    "DELETE",
    f"vehicle_measurements?org_id=eq.{ORG_ID}"
)
if status in (200, 204):
    print("  ✅ Cleared.")
else:
    print(f"  ⚠️  Delete returned {status}: {body}")
    print("  Continuing anyway — old records may remain.")


# ── STEP 3: INSERT IN BATCHES ─────────────────────────────────────────────────
total   = len(records)
batches = (total + BATCH_SIZE - 1) // BATCH_SIZE
failed  = 0

print(f"\nUploading {total} vehicles in {batches} batches of {BATCH_SIZE}...\n")

for i in range(batches):
    batch     = records[i * BATCH_SIZE : (i + 1) * BATCH_SIZE]
    status, body = supabase_request("POST", "vehicle_measurements", batch)

    if status in (200, 201):
        start = i * BATCH_SIZE + 1
        end   = min((i + 1) * BATCH_SIZE, total)
        print(f"  ✅ Batch {i+1}/{batches}  ({start}–{end})")
    else:
        print(f"  ❌ Batch {i+1}/{batches} FAILED — HTTP {status}")
        print(f"     {body[:300]}")
        failed += len(batch)

# ── DONE ──────────────────────────────────────────────────────────────────────
print()
if failed == 0:
    print(f"🎉 All {total} vehicles uploaded successfully!")
else:
    uploaded = total - failed
    print(f"⚠️  Done with errors: {uploaded}/{total} uploaded, {failed} failed.")
    print("   Re-run the script to retry — it clears old records first.")
