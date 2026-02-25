# UI Fixes Report

## FIX 1 - Pipeline Department Filter Bar on /jobs Page

**Problem:** The department filter bar (All Jobs | Sales | Production/Design | Install) only showed on `/pipeline`, not on `/jobs`.

**Changes:**
- `components/jobs/JobsClient.tsx`
  - Added `Printer`, `Wrench` icon imports from lucide-react
  - Replaced simple `TABS` array with `DEPT_TABS` matching PipelineBoard style (icons, colors, count badges)
  - Added full department filter bar above the header with:
    - Barlow Condensed uppercase labels
    - Icon per department (LayoutGrid, Briefcase, Printer, Wrench)
    - Colored active states with box-shadow glow
    - JetBrains Mono count badges
    - Hover state transitions
  - Removed old simple text-only tab buttons from controls bar
  - Controls bar now right-aligned (division filter, search, view toggle)

## FIX 2 - AI Recap Model Upgrade

**Problem:** AI Recap used `claude-haiku-4-5-20251001` which produces lower quality summaries.

**Changes:**
- `app/api/ai/job-recap/route.ts`
  - Changed model from `claude-haiku-4-5-20251001` to `claude-sonnet-4-6`
  - Button handler, API endpoint structure, and recap panel display were already correct

## FIX 3 - Duplicate AI Chat Bubbles

**Problem:** Three chat widgets rendered simultaneously:
1. `VinylChat` in root layout (`app/layout.tsx`) - bottom-right floating button
2. `GenieFAB` in `Sidebar.tsx` - fixed bottom-right button (overlapping VinylChat)
3. `GenieFAB` in `TopNav.tsx` - fixed bottom-right button (overlapping VinylChat)

**Changes:**
- `components/layout/Sidebar.tsx`
  - Removed `GenieFAB` import
  - Removed `<GenieFAB>` render from sidebar component
- `components/layout/TopNav.tsx`
  - Removed `GenieFAB` import
  - Removed `<GenieFAB>` render from top nav component
- **Kept:** `VinylChat` in `app/layout.tsx` as the single global AI chat widget

## FIX 4 - AI Chat Context Awareness

**Problem:** VinylChat sent messages without page context, so the AI didn't know which page or project the user was viewing.

**Changes:**
- `components/vinyl-chat.tsx`
  - Added `usePathname` import from next/navigation
  - Added `pathname` state via `usePathname()` hook
  - `sendMessage()` now extracts project ID from URL if on a project page
  - Sends `context: { page, projectId }` with every API request
  - Updated `useCallback` dependency array to include `pathname`
- The `/api/ai/vinyl` endpoint already supported context fields and appends them to the system prompt

## Files Modified

| File | Fix |
|------|-----|
| `components/jobs/JobsClient.tsx` | 1 |
| `app/api/ai/job-recap/route.ts` | 2 |
| `components/layout/Sidebar.tsx` | 3 |
| `components/layout/TopNav.tsx` | 3 |
| `components/vinyl-chat.tsx` | 4 |
