# ============================================================
# USA WRAP CO — Phase 1 Integration Script
# Run from: C:\Users\12065\Desktop\usawrapco-app\usawrapco
# ============================================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  USA WRAP CO — Phase 1 Integration" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# --- STEP 1: Patch ProjectDetail.tsx ---
Write-Host "[1/3] Patching ProjectDetail.tsx..." -ForegroundColor Yellow

$pdPath = "components\projects\ProjectDetail.tsx"
$pd = Get-Content $pdPath -Raw

# Add new imports after existing imports
$importInsert = @"

// Phase 1 Components
import FloatingFinancialBar from '@/components/financial/FloatingFinancialBar'
import JobChat from '@/components/chat/JobChat'
import JobImages from '@/components/images/JobImages'
import ProgressTicks from '@/components/pipeline/ProgressTicks'
"@

# Insert after the last import line
if ($pd -notmatch "FloatingFinancialBar") {
    $pd = $pd -replace "(import \{ canAccess \} from '@/types')", "`$1`n$importInsert"
    
    # Update tab state to support 5 tabs instead of 3
    $pd = $pd -replace "const \[tab, setTab\]\s*=\s*useState<1\|2\|3>\(1\)", "const [tab, setTab] = useState<1|2|3|4|5>(1)"
    
    Set-Content $pdPath $pd -NoNewline
    Write-Host "  + Added imports for FloatingFinancialBar, JobChat, JobImages, ProgressTicks" -ForegroundColor Green
    Write-Host "  + Updated tab state to support 5 tabs" -ForegroundColor Green
} else {
    Write-Host "  ~ Already patched, skipping" -ForegroundColor DarkGray
}

# --- STEP 2: Patch DashboardClient.tsx ---
Write-Host "`n[2/3] Patching DashboardClient.tsx..." -ForegroundColor Yellow

$dcPath = "components\dashboard\DashboardClient.tsx"
$dc = Get-Content $dcPath -Raw

$dashImport = @"

// Phase 1 Components
import InlineStatusEditor from '@/components/dashboard/InlineStatusEditor'
import ProgressTicks from '@/components/pipeline/ProgressTicks'
"@

if ($dc -notmatch "InlineStatusEditor") {
    # Find the last import line and add after it
    $dc = $dc -replace "(import \{ canAccess \} from '@/types')", "`$1`n$dashImport"
    
    # If that import doesn't exist, try another common one
    if ($dc -notmatch "InlineStatusEditor") {
        # Fallback: insert after 'use client'
        $dc = $dc -replace "('use client')", "`$1`n$dashImport"
    }
    
    Set-Content $dcPath $dc -NoNewline
    Write-Host "  + Added imports for InlineStatusEditor, ProgressTicks" -ForegroundColor Green
} else {
    Write-Host "  ~ Already patched, skipping" -ForegroundColor DarkGray
}

# --- STEP 3: Update component files with corrected stage keys ---
Write-Host "`n[3/3] Copying corrected component files..." -ForegroundColor Yellow

# The zip already has the corrected files, just confirm they exist
$files = @(
    "components\financial\FloatingFinancialBar.tsx",
    "components\pipeline\ProgressTicks.tsx",
    "components\dashboard\InlineStatusEditor.tsx",
    "components\chat\JobChat.tsx",
    "components\images\JobImages.tsx",
    "components\modals\NewJobModal.tsx"
)

$allGood = $true
foreach ($f in $files) {
    if (Test-Path $f) {
        Write-Host "  OK $f" -ForegroundColor Green
    } else {
        Write-Host "  MISSING $f" -ForegroundColor Red
        $allGood = $false
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "  All Phase 1 files in place!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan
    Write-Host "NEXT STEPS:" -ForegroundColor Yellow
    Write-Host "  1. Open components\projects\ProjectDetail.tsx" -ForegroundColor White
    Write-Host "     Find where Tab 3 content is rendered" -ForegroundColor White
    Write-Host "     Add these after Tab 3:" -ForegroundColor White
    Write-Host ""
    Write-Host '     {tab === 4 && (' -ForegroundColor DarkCyan
    Write-Host '       <JobChat' -ForegroundColor DarkCyan
    Write-Host '         projectId={project.id}' -ForegroundColor DarkCyan
    Write-Host '         orgId={project.org_id}' -ForegroundColor DarkCyan
    Write-Host '         currentUserId={profile.id}' -ForegroundColor DarkCyan
    Write-Host '         currentUserName={profile.full_name || profile.name}' -ForegroundColor DarkCyan
    Write-Host '       />' -ForegroundColor DarkCyan
    Write-Host '     )}' -ForegroundColor DarkCyan
    Write-Host ""
    Write-Host '     {tab === 5 && (' -ForegroundColor DarkCyan
    Write-Host '       <JobImages' -ForegroundColor DarkCyan
    Write-Host '         projectId={project.id}' -ForegroundColor DarkCyan
    Write-Host '         orgId={project.org_id}' -ForegroundColor DarkCyan
    Write-Host '         currentUserId={profile.id}' -ForegroundColor DarkCyan
    Write-Host '       />' -ForegroundColor DarkCyan
    Write-Host '     )}' -ForegroundColor DarkCyan
    Write-Host ""
    Write-Host "  2. Add tab buttons for Chat and Images in the tab bar" -ForegroundColor White
    Write-Host "  3. Add <FloatingFinancialBar project={project} /> after client info" -ForegroundColor White
    Write-Host "  4. Add <ProgressTicks currentStage={project.pipe_stage} /> in pipeline section" -ForegroundColor White
    Write-Host ""
    Write-Host "  5. Deploy:" -ForegroundColor Yellow
    Write-Host '     git add . && git commit -m "Phase 1 integration" && git push' -ForegroundColor White
} else {
    Write-Host "  Some files are missing! Re-extract the zip." -ForegroundColor Red
    Write-Host "========================================`n" -ForegroundColor Cyan
}
