'use client';

import { useState } from 'react';
import { ExternalLink, AlertTriangle, Info, ChevronDown, ChevronUp, Fish, Anchor } from 'lucide-react';

type FishCategory = 'salmon' | 'bottomfish' | 'shellfish' | 'flatfish';

interface SpeciesInfo {
  id: string;
  commonName: string;
  latinName: string;
  category: FishCategory;
  season: string;
  sizeLimit: string;
  bagLimit: string;
  bestSpots: string[];
  methods: string[];
  tips: string;
  typicalSize: string;
  gear?: string;
  statusNote: string;
}

const SPECIES: SpeciesInfo[] = [
  {
    id: 'chinook',
    commonName: 'Chinook Salmon (King)',
    latinName: 'Oncorhynchus tshawytscha',
    category: 'salmon',
    season: 'WDFW-determined annually — check wdfw.wa.gov for current dates',
    sizeLimit: 'Varies by area and season — verify regulations',
    bagLimit: 'Varies by area — check current regulations',
    bestSpots: ['Point Defiance', 'Tacoma Narrows', 'Commencement Bay', 'Browns Point', 'Carr Inlet'],
    methods: ['Trolling herring/anchovy', 'Mooching', 'Back-bouncing'],
    tips: 'Best bite occurs on incoming tides, 2 hours before and after high tide. Use 15–25 lb monofilament with 2/0–4/0 octopus hooks. Dodger or flasher rigs increase strikes significantly.',
    typicalSize: '10–40+ lbs, up to 58 inches',
    gear: '15–25 lb mono, 2/0–4/0 octopus hooks, dodger/flasher',
    statusNote: 'CHECK REGS',
  },
  {
    id: 'coho',
    commonName: 'Coho Salmon (Silver)',
    latinName: 'Oncorhynchus kisutch',
    category: 'salmon',
    season: 'Typically July–October — verify current WDFW schedule',
    sizeLimit: 'Varies by area — check regulations',
    bagLimit: 'Varies by area — check regulations',
    bestSpots: ['Nearshore kelp beds', 'Puyallup River mouth', 'Nisqually River mouth', 'Commencement Bay'],
    methods: ['Trolling spoons and spinners near surface', 'Jigging', 'Casting from shore near river mouths'],
    tips: 'Coho are most active early morning and on overcast days. Work the upper water column (top 20 ft) with flashy spoons or hoochies. River mouths become productive in September and October.',
    typicalSize: '8–20 lbs',
    statusNote: 'CHECK REGS',
  },
  {
    id: 'pink',
    commonName: 'Pink Salmon (Humpy)',
    latinName: 'Oncorhynchus gorbuscha',
    category: 'salmon',
    season: 'Odd years only in most Puget Sound areas — July–September run',
    sizeLimit: 'Verify current regulations',
    bagLimit: 'Verify current regulations',
    bestSpots: ['Puyallup River mouth', 'Nisqually River', 'South Puget Sound inlets'],
    methods: ['Pink/chartreuse spinners', 'Small spoons', 'Fly fishing', 'Light spinning gear'],
    tips: 'Pink salmon return in odd-numbered years in most of South Puget Sound. They are smaller fish and excellent on light tackle. Use smaller lures — pink and chartreuse are traditional favorites.',
    typicalSize: '3–6 lbs',
    statusNote: 'ODD YEARS ONLY',
  },
  {
    id: 'chum',
    commonName: 'Chum Salmon (Dog Salmon)',
    latinName: 'Oncorhynchus keta',
    category: 'salmon',
    season: 'Fall run — typically October through December near river mouths',
    sizeLimit: 'Verify current regulations',
    bagLimit: 'Verify current regulations',
    bestSpots: ['Nisqually River mouth', 'Puyallup River mouth', 'Henderson Inlet', 'Minter Creek'],
    methods: ['Jigs', 'Spinners', 'Flies', 'Casting from shore near river mouths'],
    tips: 'Chum are strong fighters pound-for-pound. They hold near the surface in tidal areas as they stage to enter rivers. Bright flies and pink or chartreuse jigs work well. Good option when other salmon seasons are closed.',
    typicalSize: '8–15 lbs',
    statusNote: 'CHECK REGS',
  },
  {
    id: 'halibut',
    commonName: 'Pacific Halibut',
    latinName: 'Hippoglossus stenolepis',
    category: 'bottomfish',
    season: 'IPHC quota-based, typically May–September with very limited openings — check wdfw.wa.gov/fishing/halibut',
    sizeLimit: 'Varies by year — verify IPHC and WDFW regulations',
    bagLimit: 'Typically 1 per day — verify current quota allocation',
    bestSpots: ['South Puget Sound openings when announced', 'Offshore in Strait of Juan de Fuca', 'Western Strait'],
    methods: ['Whole herring on spreader bar', 'Octopus bait', 'Salmon belly strips', 'Heavy jigs'],
    tips: 'Halibut in Puget Sound are subject to very strict quota limits. Fish hard-bottom areas in 150–400 ft near strong current. Use heavy weights (12–32 oz) to hold bottom. Check for any South Sound special openings through WDFW.',
    typicalSize: '20–100+ lbs',
    gear: '80–100 lb braid, 60–80 lb leader, 8/0–10/0 circle hooks, spreader bar',
    statusNote: 'CHECK REGS',
  },
  {
    id: 'lingcod',
    commonName: 'Lingcod',
    latinName: 'Ophiodon elongatus',
    category: 'bottomfish',
    season: 'Year-round in most areas with closures — verify current regulations',
    sizeLimit: 'Minimum 22 inches — verify current WDFW regulations',
    bagLimit: '2 per day in most areas — verify current regulations',
    bestSpots: ['Tacoma Narrows rocky areas', 'Point Defiance structure', 'Rocky reefs 40–200 ft', 'Underwater pinnacles'],
    methods: ['Large herring (whole)', 'Heavy metal jigs', 'Large swimbaits', 'Leadhead jigs with plastic'],
    tips: 'Lingcod are ambush predators that hold on rocky structure. Drop jigs to bottom and work them aggressively. They will follow a hooked rockfish up — keep the rockfish in the water and present a jig alongside it. Lingcod have sharp teeth — use wire leader or heavy fluorocarbon.',
    typicalSize: '5–30+ lbs, up to 5 feet',
    gear: '50–65 lb braid, 40–60 lb fluoro leader, large jigs 3–8 oz',
    statusNote: 'CHECK REGS',
  },
  {
    id: 'rockfish',
    commonName: 'Rockfish (Multiple Species)',
    latinName: 'Sebastes spp.',
    category: 'bottomfish',
    season: 'Varies by species and area — closures are common and change frequently',
    sizeLimit: 'Varies by species — some have no minimum, others are non-retention',
    bagLimit: 'Varies — aggregate limits apply',
    bestSpots: ['Rocky bottom structure 30–150 ft', 'Underwater ledges', 'Artificial reefs'],
    methods: ['Drop-shotting', 'Jigging', 'Bait fishing near bottom', 'Drift fishing'],
    tips: 'IMPORTANT: Canary Rockfish and Yelloweye Rockfish are federally protected — release immediately if caught. Black Rockfish school near the surface and midwater. Quillback and Copper Rockfish hold tight to rocky bottom. Check current rockfish regulations carefully as rules change frequently.',
    typicalSize: '1–15 lbs depending on species',
    statusNote: 'CHECK REGS — SOME PROTECTED',
  },
  {
    id: 'dungeness',
    commonName: 'Dungeness Crab',
    latinName: 'Metacarcinus magister',
    category: 'shellfish',
    season: 'Generally December 1 through September 15 in most areas — verify current WDFW regulations',
    sizeLimit: 'Minimum 6.25 inches carapace width (tip to tip)',
    bagLimit: '5 male crabs per day',
    bestSpots: ['Carr Inlet', 'Henderson Bay', 'Commencement Bay', 'Quartermaster Harbor', 'Sandy/gravel bottom 20–60 ft'],
    methods: ['Crab ring net (max 2 per person)', 'Crab pot/trap (check regulations on pot use)', 'Check bait daily'],
    tips: 'Males only — look for narrow pointed abdomen flap (females have wide round flap). Best bait is fresh salmon carcass, chicken legs, or cured razor clams. Check pots frequently — crabs can escape over time. Sandy and gravel bottom in 20–60 ft is prime habitat.',
    typicalSize: '1.5–4 lbs, 6–10 inches across',
    gear: 'Crab ring or pot, 100–150 ft of rope, bait box',
    statusNote: 'CHECK REGS',
  },
  {
    id: 'spotshrimp',
    commonName: 'Spot Shrimp',
    latinName: 'Pandalus platyceros',
    category: 'shellfish',
    season: 'Very short season, typically in May — special permit required through WDFW',
    sizeLimit: 'No size limit',
    bagLimit: 'Strictly enforced — check current regulations',
    bestSpots: ['Deep basins 150–400 ft', 'Southern Puget Sound basins', 'Hood Canal (separate regulations)'],
    methods: ['Shrimp pots lowered to depth', 'Weighted traps with bait'],
    tips: 'Spot shrimp are the largest shrimp species in Puget Sound and exceptional eating. Apply for a spot shrimp permit through WDFW — the season is brief (sometimes just a few days) and strictly managed. Lower pots to 150–400 ft over soft bottom. Use bait like herring or commercial shrimp bait.',
    typicalSize: '5–10 inches, 0.25–0.5 lbs each',
    gear: 'Shrimp pots, 500+ ft of line, bait cages, depth sounder essential',
    statusNote: 'PERMIT REQUIRED',
  },
  {
    id: 'flounder',
    commonName: 'Flounder & Sole (Multiple Species)',
    latinName: 'Platichthys stellatus and others',
    category: 'flatfish',
    season: 'Year-round for most species — verify current regulations',
    sizeLimit: 'Varies by species — most have no size limit',
    bagLimit: 'Varies by species — check regulations',
    bestSpots: ['Sandy and muddy flats', 'Estuaries', 'Shallow bays 5–50 ft', 'Near eelgrass beds'],
    methods: ['Small hooks with sandworms', 'Clam pieces', 'Shrimp', 'Slow drift along bottom'],
    tips: 'Starry flounder, English sole, and rock sole are the most common species. Fish sandy or muddy bottom with light gear. Small hooks (size 4–8) with worms or clam pieces are effective. Flatfish are excellent table fare and generally abundant.',
    typicalSize: '0.5–5 lbs depending on species',
    gear: 'Light to medium spinning rod, size 4–8 hooks, small sinkers',
    statusNote: 'GENERALLY OPEN',
  },
];

const CATEGORY_COLORS: Record<FishCategory, string> = {
  salmon: 'var(--green)',
  bottomfish: 'var(--amber)',
  shellfish: 'var(--cyan)',
  flatfish: 'var(--purple)',
};

const CATEGORY_LABELS: Record<FishCategory, string> = {
  salmon: 'Salmon',
  bottomfish: 'Bottomfish',
  shellfish: 'Shellfish',
  flatfish: 'Flatfish',
};

const STATUS_COLORS: Record<string, string> = {
  'CHECK REGS': 'var(--amber)',
  'ODD YEARS ONLY': 'var(--purple)',
  'GENERALLY OPEN': 'var(--green)',
  'PERMIT REQUIRED': 'var(--cyan)',
  'CHECK REGS — SOME PROTECTED': 'var(--red)',
};

function SpeciesCard({ species }: { species: SpeciesInfo }) {
  const [expanded, setExpanded] = useState(false);
  const accentColor = CATEGORY_COLORS[species.category];
  const statusColor = STATUS_COLORS[species.statusNote] ?? 'var(--amber)';

  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 12,
      border: `1px solid ${accentColor}33`,
      overflow: 'hidden',
    }}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(e => !e)}
        onKeyDown={e => e.key === 'Enter' && setExpanded(v => !v)}
        style={{
          padding: '16px 20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text1)',
              letterSpacing: '0.02em',
            }}>
              {species.commonName}
            </span>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 4,
              background: `${statusColor}22`,
              color: statusColor,
              border: `1px solid ${statusColor}55`,
              letterSpacing: '0.05em',
            }}>
              {species.statusNote}
            </span>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 4,
              background: `${accentColor}22`,
              color: accentColor,
              border: `1px solid ${accentColor}44`,
            }}>
              {CATEGORY_LABELS[species.category]}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', fontStyle: 'italic' }}>
            {species.latinName}
          </div>
        </div>
        <div style={{ color: 'var(--text3)', flexShrink: 0, marginTop: 2 }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            marginBottom: 16,
          }}>
            {[
              { label: 'Season', value: species.season },
              { label: 'Size Limit', value: species.sizeLimit },
              { label: 'Bag Limit', value: species.bagLimit },
              { label: 'Typical Size', value: species.typicalSize },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: 'var(--surface2)',
                borderRadius: 8,
                padding: '10px 14px',
              }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {label}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text1)', lineHeight: 1.5 }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Best Spots
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {species.bestSpots.map(spot => (
                <span key={spot} style={{
                  fontSize: 12,
                  padding: '3px 10px',
                  background: 'var(--surface2)',
                  borderRadius: 20,
                  color: 'var(--text2)',
                  border: '1px solid var(--surface2)',
                }}>
                  {spot}
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Methods
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {species.methods.map(m => (
                <span key={m} style={{
                  fontSize: 12,
                  padding: '3px 10px',
                  background: `${accentColor}18`,
                  borderRadius: 20,
                  color: accentColor,
                  border: `1px solid ${accentColor}33`,
                }}>
                  {m}
                </span>
              ))}
            </div>
          </div>

          {species.gear && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Recommended Gear
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>{species.gear}</div>
            </div>
          )}

          <div style={{
            background: 'var(--surface2)',
            borderRadius: 8,
            padding: '12px 14px',
            marginBottom: 14,
          }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Methods and Tips
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>{species.tips}</div>
          </div>

          <a
            href="https://wdfw.wa.gov/fishing/regulations"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: 'var(--accent)',
              textDecoration: 'none',
            }}
          >
            <ExternalLink size={13} />
            Verify current regulations at wdfw.wa.gov
          </a>
        </div>
      )}
    </div>
  );
}

export default function FishingGuideContent() {
  const [activeCategory, setActiveCategory] = useState<FishCategory | 'all'>('all');

  const categories: Array<{ key: FishCategory | 'all'; label: string }> = [
    { key: 'all', label: 'All Species' },
    { key: 'salmon', label: 'Salmon' },
    { key: 'bottomfish', label: 'Bottomfish' },
    { key: 'shellfish', label: 'Shellfish' },
    { key: 'flatfish', label: 'Flatfish' },
  ];

  const filtered = activeCategory === 'all'
    ? SPECIES
    : SPECIES.filter(s => s.category === activeCategory);

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Disclaimer banner */}
      <div style={{
        background: '#f59e0b18',
        border: '1px solid #f59e0b44',
        borderRadius: 10,
        padding: '14px 18px',
        marginBottom: 24,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}>
        <AlertTriangle size={18} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--amber)', marginBottom: 4 }}>
            Regulation Disclaimer
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
            Always verify current regulations at{' '}
            <a href="https://wdfw.wa.gov/fishing/regulations" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
              wdfw.wa.gov
            </a>{' '}
            before fishing. Rules change seasonally and emergency closures can happen at any time. Information shown is a general guide only.
          </div>
        </div>
      </div>

      {/* Tide tip */}
      <div style={{
        background: '#4f7fff18',
        border: '1px solid #4f7fff33',
        borderRadius: 10,
        padding: '12px 18px',
        marginBottom: 24,
        display: 'flex',
        gap: 12,
        alignItems: 'center',
      }}>
        <Info size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>
          <strong style={{ color: 'var(--text1)' }}>Tide tip:</strong> Salmon bite best on incoming tides. Check the Tides tab for current tide status and upcoming tide windows.
        </div>
      </div>

      {/* WDFW quick links */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        {[
          { label: 'Regulation Checker', url: 'https://wdfw.wa.gov/fishing/regulations' },
          { label: 'Emergency Closures', url: 'https://wdfw.wa.gov/fishing/emergencyclosures' },
          { label: 'Buy a License', url: 'https://fishhunt.dfw.wa.gov' },
          { label: 'Halibut Info', url: 'https://wdfw.wa.gov/fishing/halibut' },
          { label: 'Shellfish Safety', url: 'https://fortress.wa.gov/doh/biotoxin' },
        ].map(link => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              padding: '6px 14px',
              borderRadius: 20,
              background: 'var(--surface)',
              color: 'var(--accent)',
              border: '1px solid #4f7fff44',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            <ExternalLink size={12} />
            {link.label}
          </a>
        ))}
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {categories.map(cat => {
          const active = activeCategory === cat.key;
          const color = cat.key === 'all' ? 'var(--text2)' : CATEGORY_COLORS[cat.key as FishCategory];
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                border: `1px solid ${active ? color : 'var(--surface2)'}`,
                background: active ? `${color}22` : 'var(--surface)',
                color: active ? color : 'var(--text3)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Species grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(species => (
          <SpeciesCard key={species.id} species={species} />
        ))}
      </div>

      {/* Footer links */}
      <div style={{
        marginTop: 32,
        padding: '16px 0',
        borderTop: '1px solid var(--surface2)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text3)', fontSize: 13 }}>
          <Fish size={14} />
          <span>Data sourced from WDFW public regulations. Always verify before fishing.</span>
        </div>
        <a
          href="https://wdfw.wa.gov"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}
        >
          <ExternalLink size={12} />
          wdfw.wa.gov
        </a>
      </div>
    </div>
  );
}
