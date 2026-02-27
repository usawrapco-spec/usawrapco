# DeckForge Build Report

**Version**: v6.2
**Build date**: 2026-02-28
**Status**: Build passing (377 pages generated)

---

## Overview

DeckForge is a full-screen browser-based design tool for boat decking. Users upload 3D scans (PLY/OBJ/STL), trace hardware, flatten the surface to a 2D template, draw shapes, and export cut-ready files.

---

## Files Created

### Database Migration
| File | Description |
|------|-------------|
| `supabase/migrations/20260228140000_deckforge_schema.sql` | Adds missing columns to deckforge_projects (org_id, boat_name, boat_make, boat_model, boat_length, notes, status, thumbnail_url, created_by); adds project_id FK to deckforge_annotations and deckforge_jobs; enables RLS on all 5 deckforge tables |

### API Routes
| Route | File | Methods |
|-------|------|---------|
| `/api/deckforge/projects` | `app/api/deckforge/projects/route.ts` | GET (list), POST (create) |
| `/api/deckforge/projects/[id]` | `app/api/deckforge/projects/[id]/route.ts` | GET, PUT, DELETE |
| `/api/deckforge/files` | `app/api/deckforge/files/route.ts` | GET (by project_id), POST |
| `/api/deckforge/annotations` | `app/api/deckforge/annotations/route.ts` | GET, POST (bulk), DELETE |
| `/api/deckforge/artboards` | `app/api/deckforge/artboards/route.ts` | GET, POST (upsert) |
| `/api/deckforge/detect-hardware` | `app/api/deckforge/detect-hardware/route.ts` | POST (Claude Vision) |

### Pages
| Route | File | Notes |
|-------|------|-------|
| `/deckforge` | `app/deckforge/page.tsx` | Projects grid — standard TopNav + MobileNav layout |
| `/deckforge/[id]` | `app/deckforge/[id]/page.tsx` | Full-screen tool — NO nav chrome |

### Components
| File | Description |
|------|-------------|
| `components/deckforge/DeckForgeProjectsClient.tsx` | Projects grid with thumbnail, boat info, status badge; New Project modal (name, boat make/model/length/notes) |
| `components/deckforge/DeckForgeTool.tsx` | Full-screen tool (~850 lines): top toolbar, collapsible left/right panels, SVG canvas, 3D/2D toggle, all 8 tools, hardware detection, export, keyboard shortcuts, auto-save |
| `components/deckforge/ThreeViewport.tsx` | Three.js 3D viewer: OrbitControls, PLY/OBJ/STL loaders, wireframe toggle, reset view, flatten-to-2D capture |

### Navigation
| File | Change |
|------|--------|
| `components/layout/SideNav.tsx` | Added DeckForge nav item (Anchor icon) in JOBS section for owner/admin/production/designer roles |

---

## Feature Summary

### 3D Viewport (ThreeViewport.tsx)
- Dynamic imports of Three.js inside `useEffect` for full SSR safety
- Loads PLY, OBJ, STL formats via respective Three.js loaders
- OrbitControls with damping (rotate: drag, pan: right-drag/two-finger, zoom: scroll)
- Auto-fits camera to model bounding box on load
- Wireframe toggle (Grid3x3 button)
- Reset view (RotateCcw button)
- Flatten to 2D: captures `renderer.domElement.toDataURL()` → passes to canvas view
- ResizeObserver for container resize

### 2D Canvas (DeckForgeTool.tsx)
- SVG-based canvas with pan (Space+drag / middle-mouse) and zoom (scroll wheel, cursor-centered)
- Grid overlay toggle
- 8 tools (keyboard shortcuts):
  - **V** — Select (drag/resize shapes)
  - **R** — Rectangle
  - **C** — Circle
  - **L** — Line
  - **T** — Text
  - **H** — Hardware marker (screw/bolt/cleat/drain/fitting/other)
  - **M** — Measurement (line with length readout)
  - **E** — Eraser (delete shapes)
- Delete key removes selected shape
- Ctrl+S saves

### Layers Panel (left, collapsible)
- Lists all canvas objects by type + name
- Visibility toggle (eye icon) per layer
- Lock toggle per layer
- Click to select
- Selected layer highlighted

### Properties Panel (right, collapsible)
- **Hardware**: type selector, notes, size field
- **Rectangle/Circle**: fill color, stroke color, opacity, width/height
- **Line**: stroke color, width
- **Text**: content, font size, color
- **Measurement**: computed length display

### Hardware Detection
- "Detect Hardware" button sends canvas image as base64 to `/api/deckforge/detect-hardware`
- Claude Vision (claude-sonnet-4-6) analyzes image and returns JSON array of annotations
- Each annotation: `{ type, x, y, label, notes }` (x/y as percentage of image dimensions)
- Color-coded markers: screw=#f25a5a, bolt=#f59e0b, cleat=#22c07a, drain=#22d3ee, fitting=#8b5cf6, other=#9299b5

### Export
| Format | Method |
|--------|--------|
| SVG | `XMLSerializer` on the SVG element |
| PNG | SVG → Canvas → `toDataURL('image/png')` |
| DXF | Text format — LINE entities for rectangles/lines/measurements, CIRCLE for circles; Y-axis inverted for CAD convention |
| PDF | Browser print dialog (Ctrl+P) |

### Auto-Save
- 5-second debounce on any canvas state change
- Saves to `deckforge_artboards` table as JSONB (canvas_data: `{ layers, bgImage, viewMode }`)
- Upsert logic — updates existing artboard for the project or creates new one

---

## Database Tables Used

| Table | Purpose |
|-------|---------|
| `deckforge_projects` | Project list (name, boat info, status, org_id) |
| `deckforge_files` | Uploaded 3D/image files linked to projects |
| `deckforge_annotations` | Hardware/pin annotations (project_id, type, x, y) |
| `deckforge_artboards` | Canvas state snapshots (canvas_data JSONB) |
| `deckforge_jobs` | Production job records linked to projects |

All tables have RLS enabled with org_id-based policies.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| V | Select tool |
| R | Rectangle tool |
| C | Circle tool |
| L | Line tool |
| T | Text tool |
| H | Hardware marker tool |
| M | Measurement tool |
| E | Eraser tool |
| Space + Drag | Pan canvas |
| Middle-mouse drag | Pan canvas |
| Scroll | Zoom (cursor-centered) |
| Delete | Delete selected shape |
| Ctrl+S | Save now |

---

## Style
- Background: `#141414`
- Accent: `#2dd4bf` (teal)
- Panels: `#1a1a1a`
- Borders: `#2a2a2a`
- Text: `#e8eaed` / `#888`
- Monospace font throughout
- Professional CAD aesthetic — no emojis, no rounded bubbly UI
