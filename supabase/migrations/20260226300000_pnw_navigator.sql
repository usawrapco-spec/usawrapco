-- ═══════════════════════════════════════════════════════════════════════════════
-- PNW NAVIGATOR — FISHING & BOATING APP
-- Migration: 20260226300000
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Fish species master database ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fish_species (
  id text PRIMARY KEY,
  common_name text NOT NULL,
  scientific_name text,
  category text NOT NULL,
  subcategory text,
  state_record_weight_lbs numeric,
  state_record_year int,
  state_record_location text,
  description text,
  identification_notes text,
  habitat text,
  diet text,
  typical_size_lbs_min numeric,
  typical_size_lbs_max numeric,
  typical_size_inches_min numeric,
  typical_size_inches_max numeric,
  best_season text[],
  best_tides text,
  preferred_depth_ft_min int,
  preferred_depth_ft_max int,
  image_url text,
  trophy_weight_lbs numeric,
  igfa_record_lbs numeric,
  created_at timestamptz DEFAULT now()
);

-- ── Fishing spots ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fishing_spots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  region text NOT NULL,
  water_type text NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  description text,
  access_type text,
  access_notes text,
  parking_available boolean DEFAULT true,
  restrooms boolean DEFAULT false,
  difficulty text DEFAULT 'intermediate',
  species_present jsonb DEFAULT '[]'::jsonb,
  best_techniques jsonb DEFAULT '[]'::jsonb,
  best_tides text,
  best_time_of_day text,
  depth_range_ft text,
  structure_type text,
  hazards text,
  regulations_notes text,
  verified boolean DEFAULT true,
  contributor_id uuid,
  photos jsonb DEFAULT '[]'::jsonb,
  gps_waypoints jsonb DEFAULT '[]'::jsonb,
  view_count int DEFAULT 0,
  save_count int DEFAULT 0,
  report_count int DEFAULT 0,
  avg_rating numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── Fishing reports ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fishing_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  spot_id uuid REFERENCES fishing_spots(id),
  custom_location_name text,
  custom_lat numeric,
  custom_lng numeric,
  report_date date NOT NULL,
  time_of_day text,
  species_caught jsonb DEFAULT '[]'::jsonb,
  species_targeted text,
  success_level int,
  technique_used text[],
  bait_lure jsonb DEFAULT '[]'::jsonb,
  depth_fished_ft int,
  water_temp_f numeric,
  water_clarity text,
  weather text,
  wind_mph int,
  tide_stage text,
  boat_type text,
  notes text,
  photos jsonb DEFAULT '[]'::jsonb,
  is_public boolean DEFAULT true,
  likes int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ── User catch log / fish journal ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS catch_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  species_id text REFERENCES fish_species(id),
  species_name text,
  weight_lbs numeric,
  length_inches numeric,
  girth_inches numeric,
  catch_date date NOT NULL,
  catch_time time,
  lat numeric,
  lng numeric,
  location_name text,
  spot_id uuid REFERENCES fishing_spots(id),
  technique text,
  bait_lure text,
  depth_ft int,
  was_released boolean DEFAULT false,
  photo_url text,
  notes text,
  is_personal_best boolean DEFAULT false,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ── WA fishing regulations ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fishing_regulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species_id text REFERENCES fish_species(id),
  region text NOT NULL,
  water_type text,
  season_open date,
  season_close date,
  season_notes text,
  daily_limit int,
  size_limit_inches_min numeric,
  size_limit_notes text,
  gear_restrictions text[],
  closed_areas text,
  hatchery_only boolean DEFAULT false,
  adipose_fin_clipped_only boolean DEFAULT false,
  license_required text[],
  source_url text,
  last_verified date,
  created_at timestamptz DEFAULT now()
);

-- ── Tide predictions cache ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tide_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id text NOT NULL,
  station_name text NOT NULL,
  lat numeric,
  lng numeric,
  prediction_date date NOT NULL,
  predictions jsonb NOT NULL,
  fetched_at timestamptz DEFAULT now(),
  UNIQUE(station_id, prediction_date)
);

-- ── Marina database ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  region text NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  address text,
  city text,
  state text DEFAULT 'WA',
  phone text,
  vhf_channel text DEFAULT '16',
  website text,
  description text,
  has_launch_ramp boolean DEFAULT false,
  launch_fee numeric,
  has_fuel_dock boolean DEFAULT false,
  fuel_types text[],
  has_pump_out boolean DEFAULT false,
  has_transient_moorage boolean DEFAULT false,
  transient_rate_per_ft_per_night numeric,
  has_guest_moorage boolean DEFAULT false,
  has_repair_yard boolean DEFAULT false,
  has_travel_lift boolean DEFAULT false,
  max_vessel_length_ft int,
  has_dry_storage boolean DEFAULT false,
  has_rv_parking boolean DEFAULT false,
  has_restrooms boolean DEFAULT false,
  has_showers boolean DEFAULT false,
  has_laundry boolean DEFAULT false,
  has_wifi boolean DEFAULT false,
  has_power_30amp boolean DEFAULT false,
  has_power_50amp boolean DEFAULT false,
  has_power_100amp boolean DEFAULT false,
  restaurants_nearby text[],
  hours_fuel text,
  hours_office text,
  wrap_company_nearby text,
  usa_wrapco_authorized boolean DEFAULT false,
  is_operational boolean DEFAULT true,
  user_rating numeric DEFAULT 0,
  review_count int DEFAULT 0,
  photos jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── Speed zones and restricted areas ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS boating_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  zone_type text NOT NULL,
  description text,
  speed_limit_mph int,
  enforcement_agency text,
  polygon_coords jsonb,
  center_lat numeric,
  center_lng numeric,
  seasonal boolean DEFAULT false,
  season_start date,
  season_end date,
  season_notes text,
  penalty_notes text,
  source_regulation text,
  created_at timestamptz DEFAULT now()
);

-- ── Boating regulations ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS boating_regulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  title text NOT NULL,
  rule_text text NOT NULL,
  vessel_size_applies text,
  jurisdiction text DEFAULT 'wa_state',
  effective_date date,
  last_updated date,
  source_url text,
  penalty_amount text,
  exception_notes text
);

-- ── VHF channels ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vhf_channels (
  channel text PRIMARY KEY,
  name text NOT NULL,
  use_category text NOT NULL,
  frequency_rx text,
  frequency_tx text,
  description text,
  international_use boolean DEFAULT true,
  us_use boolean DEFAULT true,
  notes text
);

-- ── User waypoints ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_waypoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  waypoint_type text DEFAULT 'custom',
  notes text,
  is_private boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ── User routes ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  waypoints jsonb NOT NULL,
  total_distance_nm numeric,
  estimated_time_hours numeric,
  fuel_estimate_gallons numeric,
  is_private boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ── RLS Policies ──────────────────────────────────────────────────────────────
ALTER TABLE fish_species ENABLE ROW LEVEL SECURITY;
ALTER TABLE fishing_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE fishing_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE catch_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE fishing_regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tide_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE boating_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE boating_regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vhf_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_waypoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_routes ENABLE ROW LEVEL SECURITY;

-- Public read access for reference data
CREATE POLICY "Public read fish_species" ON fish_species FOR SELECT USING (true);
CREATE POLICY "Public read fishing_spots" ON fishing_spots FOR SELECT USING (true);
CREATE POLICY "Public read fishing_reports" ON fishing_reports FOR SELECT USING (is_public = true);
CREATE POLICY "Public read fishing_regulations" ON fishing_regulations FOR SELECT USING (true);
CREATE POLICY "Public read tide_predictions" ON tide_predictions FOR SELECT USING (true);
CREATE POLICY "Public read marinas" ON marinas FOR SELECT USING (true);
CREATE POLICY "Public read boating_zones" ON boating_zones FOR SELECT USING (true);
CREATE POLICY "Public read boating_regulations" ON boating_regulations FOR SELECT USING (true);
CREATE POLICY "Public read vhf_channels" ON vhf_channels FOR SELECT USING (true);

-- Catch log: users see only their own
CREATE POLICY "Users read own catch_log" ON catch_log FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users insert catch_log" ON catch_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update catch_log" ON catch_log FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete catch_log" ON catch_log FOR DELETE USING (auth.uid() = user_id);

-- Waypoints: private per user
CREATE POLICY "Users manage waypoints" ON user_waypoints FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage routes" ON user_routes FOR ALL USING (auth.uid() = user_id);

-- Fishing reports: users own their reports
CREATE POLICY "Users insert reports" ON fishing_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update reports" ON fishing_reports FOR UPDATE USING (auth.uid() = user_id);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS fishing_spots_region_idx ON fishing_spots(region);
CREATE INDEX IF NOT EXISTS fishing_spots_water_type_idx ON fishing_spots(water_type);
CREATE INDEX IF NOT EXISTS fishing_reports_spot_idx ON fishing_reports(spot_id);
CREATE INDEX IF NOT EXISTS fishing_reports_date_idx ON fishing_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS catch_log_user_idx ON catch_log(user_id);
CREATE INDEX IF NOT EXISTS catch_log_date_idx ON catch_log(catch_date DESC);
CREATE INDEX IF NOT EXISTS marinas_region_idx ON marinas(region);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── VHF Channels ─────────────────────────────────────────────────────────────
INSERT INTO vhf_channels VALUES
('16', 'International Distress, Safety & Calling', 'calling', '156.800', '156.800',
 'MANDATORY MONITORING on all vessels. Distress calls, ship-to-shore, coast guard. Listen on 16 always.',
 true, true, 'Never use for routine comms — call on 16, switch to working channel'),
('9', 'Boater Calling Channel', 'calling', '156.450', '156.450',
 'Recreational boater to boater calling. Hailing only — switch to working channel for conversation.',
 false, true, 'US recreational calling channel'),
('22A', 'Coast Guard Liaison', 'coast_guard', '157.100', '157.100',
 'US Coast Guard working channel. After contacting USCG on 16, switch to 22A.',
 false, true, 'US only — different frequency than international 22'),
('WX1', 'NOAA Weather Primary', 'weather', '162.400', null,
 'NOAA Weather Radio primary — continuous forecasts and alerts for Puget Sound.',
 false, true, 'Northwest WA / Seattle area primary'),
('WX2', 'NOAA Weather Alternate', 'weather', '162.425', null,
 'NOAA Weather Radio alternate. May cover different areas.',
 false, true, null),
('WX3', 'NOAA Weather', 'weather', '162.475', null,
 'NOAA Weather Radio channel 3.',
 false, true, null),
('68', 'Non-Commercial Working', 'working', '156.425', '156.425',
 'Most popular recreational working channel in Puget Sound.',
 true, true, 'Very common in Puget Sound'),
('69', 'Non-Commercial Working', 'working', '156.475', '156.475',
 'Recreational working channel.',
 true, true, null),
('72', 'Non-Commercial Working', 'working', '156.625', '156.625',
 'Ship-to-ship only in USA. Popular offshore.',
 true, true, 'No coast station contact'),
('78A', 'Non-Commercial Working', 'working', '156.925', '156.925',
 'US working channel.',
 false, true, null),
('6', 'Safety / SAR', 'coast_guard', '156.300', '156.300',
 'Intership safety. Used by USCG during search and rescue coordination.',
 true, true, 'Used during SAR operations'),
('13', 'Bridge-to-Bridge / Navigation', 'bridge_to_bridge', '156.650', '156.650',
 'Ships talking to bridges, locks, vessel traffic. Monitor in shipping lanes.',
 true, true, 'REQUIRED for large vessels — listen for traffic'),
('14', 'Vessel Traffic — Seattle', 'port', '156.700', '156.700',
 'Seattle VTS. Monitor in main Sound channels and shipping lanes.',
 false, true, 'REQUIRED in designated VTS area'),
('67', 'Bridge-to-Bridge Commercial', 'bridge_to_bridge', '156.375', '156.375',
 'Commercial vessel bridge-to-bridge.',
 true, true, null),
('66A', 'Port Operations', 'port', '156.325', '156.325',
 'Port operations — commonly used at Friday Harbor and Port Angeles.',
 false, true, null)
ON CONFLICT (channel) DO NOTHING;

-- ── Fish Species ──────────────────────────────────────────────────────────────
INSERT INTO fish_species (id, common_name, scientific_name, category, subcategory,
  state_record_weight_lbs, state_record_year, state_record_location,
  description, identification_notes, habitat, diet,
  typical_size_lbs_min, typical_size_lbs_max,
  typical_size_inches_min, typical_size_inches_max,
  best_season, best_tides, preferred_depth_ft_min, preferred_depth_ft_max,
  trophy_weight_lbs, igfa_record_lbs) VALUES

('chinook_salmon','Chinook Salmon','Oncorhynchus tshawytscha','salmon','pacific_salmon',
 70.0,1986,'Sekiu River',
 'The king of Pacific salmon. Most prized species in the PNW. Largest Pacific salmon species — fish over 50 lbs are caught regularly in WA.',
 'Large black spots on back AND entire tail. Black gums (lower jaw). Dark coloring during spawn. Silver-bright in saltwater.',
 'Deep cold water near structure, thermoclines, canyon edges','Herring, sand lance, squid, anchovy, candlefish',
 5,80,24,60,ARRAY['spring','summer','fall'],'incoming',40,400,40.0,97.5),

('coho_salmon','Coho Salmon','Oncorhynchus kisutch','salmon','pacific_salmon',
 33.4,1989,'Cowlitz River',
 'Silver salmon. Incredibly aggressive striker. Most popular sport salmon for fly fishing, casting, and trolling near the surface.',
 'White gums, white spots on tail fin ONLY (not back). Red slash on cheek during spawn. Bright silver in saltwater.',
 'Near surface in kelp beds, current edges, structure','Herring, needlefish, anchovies, small fish',
 2,25,18,38,ARRAY['summer','fall'],'any',10,150,15.0,33.4),

('pink_salmon','Pink Salmon','Oncorhynchus gorbuscha','salmon','pacific_salmon',
 14.5,2001,'Puget Sound',
 'Humpback salmon. Even-year runs ONLY in most PNW waters. Huge numbers — limits are common. Best eating when fresh-caught.',
 'Large oval black spots on back AND entire tail. Males develop large hump during spawn. Smallest Pacific salmon.',
 'Near surface in bays and inlets','Shrimp, small fish, zooplankton',
 1,12,18,28,ARRAY['summer'],'any',5,80,8.0,14.5),

('sockeye_salmon','Sockeye Salmon','Oncorhynchus nerka','salmon','pacific_salmon',
 15.3,1987,'Baker Lake',
 'Red salmon. Kokanee is the landlocked form. Considered the best-eating of all salmon. Baker Lake and Lake Ozette runs.',
 'No spots on body (unique). Turns brilliant red with green head during spawn. Hooked jaw on males.',
 'Open water, deep lakes, near zooplankton concentrations','Zooplankton, small crustaceans',
 1,15,14,28,ARRAY['summer'],'any',20,150,8.0,15.3),

('chum_salmon','Chum Salmon','Oncorhynchus keta','salmon','pacific_salmon',
 35.0,1985,'Puget Sound',
 'Dog salmon. Underrated eating when caught fresh-bright. Hood Canal chum run draws anglers from around the world each fall.',
 'Purple/green tiger stripes on males during spawn. Canine teeth prominent. Calico pattern near spawning.',
 'Lower rivers, intertidal areas, Hood Canal','Shrimp, squid, small fish',
 3,25,20,40,ARRAY['fall'],'incoming',5,60,12.0,35.0),

('steelhead','Steelhead','Oncorhynchus mykiss','salmon','trout',
 42.2,1976,'Olympic Peninsula',
 'Sea-run rainbow trout. The ultimate freshwater gamefish. Known for spectacular aerial leaps and long runs. Two distinct runs: winter (Dec-Mar) and summer (Jun-Sep).',
 'Iridescent sides with pink lateral stripe. Heavily spotted. Sea-run fish are bright silver. Distinguished from rainbow by sea-run behavior.',
 'Rivers with gravel beds, pools, estuaries','Eggs, nymphs, small fish',
 2,30,22,45,ARRAY['winter','summer'],'any',2,20,20.0,42.2),

('halibut','Pacific Halibut','Hippoglossus stenolepis','bottomfish','flatfish',
 459.0,1996,'Glacier Bay AK',
 'The ultimate trophy bottomfish. Firm white flesh considered finest of any Pacific fish. Annual IPHC quota means season is closely managed — check current regs.',
 'Dark brown topside with lighter spots, pure white underside. Both eyes migrate to top of head. Concave tail distinguishes from other flatfish.',
 'Sandy/muddy bottom from nearshore to deep offshore (60-600ft)','Fish, crab, shrimp, squid, octopus',
 5,400,30,96,ARRAY['spring','summer'],'incoming',60,600,50.0,459.0),

('lingcod','Lingcod','Ophiodon elongatus','bottomfish','greenling',
 84.0,1997,'Puget Sound',
 'Aggressive apex predator with powerful crushing jaws. Blue-green flesh turns white when cooked — perfectly edible. Known to grab hooked fish on the way up.',
 'Large broad head, mottled brown/green/grey, white belly. No scales. Can have unusual blue-green flesh inside.',
 'Rocky reef, kelp beds, areas with strong current','Fish, squid, octopus, anything that moves',
 5,60,20,60,ARRAY['winter','spring','summer'],'any',30,300,30.0,84.0),

('black_rockfish','Black Rockfish','Sebastes melanops','bottomfish','rockfish',
 10.7,2013,'Oregon Coast',
 'School fish that aggressively attacks surface baits near kelp beds. Great light tackle target. Excellent table fare. Widely distributed along WA coast.',
 'Black/dark brown above, lighter below. Yellow-orange inside mouth. Long spiny dorsal fin.',
 'Kelp beds, rocky reefs, nearshore to 200ft','Herring, sand lance, small fish',
 1,10,12,24,ARRAY['year_round'],'any',10,100,6.0,10.7),

('cabezon','Cabezon','Scorpaenichthys marmoratus','bottomfish','sculpin',
 25.0,1990,'WA',
 'World''s largest sculpin. Masters of camouflage — blends perfectly with rocky substrate. NOTE: eggs are toxic — do not eat.',
 'Large broad head, smooth scaleless skin, highly variable mottled colors matching surroundings. Wide pectoral fins.',
 'Rocky intertidal and subtidal zones, kelp beds','Crustaceans, mollusks, small fish',
 2,20,15,40,ARRAY['year_round'],'any',0,100,10.0,25.0),

('quillback_rockfish','Quillback Rockfish','Sebastes maliger','bottomfish','rockfish',
 7.0,null,'WA',
 'Deep-bodied, long-lived rockfish. Can exceed 90 years old. Treat as precious resource — slow recovery if overfished.',
 'Yellow-orange patches on dark brown background. Very long sharp dorsal spines. Deep body profile.',
 'Rocky reefs at 60-900ft depth','Small fish, shrimp, squid',
 0.5,7,10,24,ARRAY['year_round'],'any',60,400,3.0,7.0),

('dungeness_crab','Dungeness Crab','Metacarcinus magister','shellfish','crab',
 null,null,null,
 'The PNW''s most iconic shellfish. Sweet, delicate meat. Legal size 6.25" across shell. Pot fishing and hoop netting from shore or boat. Season and areas vary — always check regs.',
 'Wide oval carapace, purple-brown above, 5 pairs of walking legs. Fan-shaped tail.',
 'Sandy/muddy bottom 0-300ft, eelgrass beds','Clams, worms, small fish',
 0.5,4,null,null,ARRAY['year_round'],'incoming',0,100,2.0,null),

('spot_shrimp','Spot Shrimp','Pandalus platyceros','shellfish','shrimp',
 null,null,null,
 'Pacific''s largest shrimp. Hood Canal May opener is legendary — anglers line up at midnight. Melt-in-your-mouth sweet flavor. Limited season, check WDFW for current opener.',
 'Transparent to pinkish with distinctive white spots near head. Long rostrum (spike). Largest Pacific shrimp species.',
 'Deep rocky areas 150-1500ft — come to shallower water at night','Algae, detritus, small invertebrates',
 0.1,0.5,null,null,ARRAY['spring'],'any',150,600,0.3,null),

('smallmouth_bass','Smallmouth Bass','Micropterus dolomieu','freshwater','bass',
 11.5,1969,'WA',
 'Lake Washington has one of the strongest smallmouth populations in the entire Pacific Northwest. Excellent sport fish — aggressive and acrobatic.',
 'Bronze-brown sides with dark vertical bands. Red eyes. Small mouth extends only to middle of eye.',
 'Rocky points, submerged structure, gravel beds','Crayfish, small fish, insects',
 0.5,7,10,22,ARRAY['spring','summer','fall'],'any',5,30,4.0,11.5),

('rainbow_trout','Rainbow Trout','Oncorhynchus mykiss','freshwater','trout',
 37.0,1975,'Lake Chelan',
 'Most stocked trout in Washington. Wild fish in rivers have vivid colors. Excellent table fare and sport fish.',
 'Pink lateral stripe. Heavily spotted on back, sides, fins. Silver-sided in large lakes (sea-run = steelhead).',
 'Clear cold streams and lakes with high oxygen','Insects, small fish, eggs',
 0.5,20,7,36,ARRAY['year_round'],'any',0,100,5.0,37.0),

('lake_trout','Lake Trout','Salvelinus namaycush','freshwater','char',
 102.0,1995,'Lake Chelan',
 'Mackinaw. Lake Chelan is famous for trophy lakers reaching 40+ lbs. Extremely deep water fish, slow-growing and long-lived.',
 'Light irregular spots on dark background. Deeply forked tail. No pink stripe (unlike rainbow).',
 'Very deep cold water 60-400ft','Fish (especially kokanee), crustaceans',
 2,50,18,50,ARRAY['year_round'],'any',60,400,15.0,102.0),

('albacore_tuna','Albacore Tuna','Thunnus alalunga','saltwater','pelagic',
 88.0,1977,'Pacific Ocean',
 'Summer offshore species. Schools migrate into PNW waters July-September following 55-65°F water. Best canned tuna on earth when home-canned.',
 'Very long pectoral fins (distinctive — extends past anal fin). Silver-blue above, white below.',
 'Open ocean in warm water masses','Squid, anchovies, small fish',
 5,80,28,48,ARRAY['summer'],'any',0,200,30.0,88.0),

('cutthroat_trout','Coastal Cutthroat Trout','Oncorhynchus clarkii clarki','freshwater','trout',
 10.0,null,'WA',
 'Resident in Puget Sound beaches — can fish from shore! Also in rivers. Named for red slash marks under jaw.',
 'Red or orange slash marks under jaw. Black spots concentrated toward tail. Greenish back.',
 'Shallow saltwater beaches, streams, lakes','Small fish, invertebrates, insects',
 0.5,5,8,20,ARRAY['year_round'],'incoming',0,20,3.0,10.0),

('perch','Yellow Perch','Perca flavescens','freshwater','perch',
 2.0,null,'WA',
 'Abundant in many Puget Sound-area lakes and piers. Great beginner fish and excellent eating.',
 'Yellow-olive sides with 6-8 dark vertical bars. Orange-red lower fins.',
 'Weedy bays, docks, piers','Insects, small fish, worms',
 0.2,2,6,15,ARRAY['year_round'],'any',5,30,1.0,4.2),

('pink_shrimp','Pink Shrimp','Pandalus jordani','shellfish','shrimp',
 null,null,null,
 'Smaller than spot shrimp. Commercial trawl fishery offshore. Abundant in deeper waters.',
 'Pinkish transparent. Smaller than spot shrimp. No distinctive white spots.',
 'Sandy/muddy bottom 60-300ft','Plankton, detritus',
 0.05,0.2,null,null,ARRAY['year_round'],'any',60,300,null,null),

('razor_clam','Pacific Razor Clam','Siliqua patula','shellfish','clam',
 null,null,null,
 'Beach digging during special WDFW openers on WA ocean beaches. Lightning-fast diggers. Incredible eating — extremely popular.',
 'Long oval shell, razor-sharp edges, smooth brown/olive periostracum.',
 'Ocean beaches in wet sand above low tide','Filter feeder',
 null,null,null,null,ARRAY['year_round'],'outgoing',0,1,null,null),

('geoduck','Geoduck','Panopea generosa','shellfish','clam',
 null,null,null,
 'World''s largest burrowing clam. Can weigh 15 lbs. Highly prized in Asian markets. Very limited recreational take — check regs.',
 'Huge siphon (neck) extends far beyond shell. Large oblong shell. Burrows 3+ feet deep in mud.',
 'Intertidal to 300ft on sand/mud substrate','Filter feeder',
 null,null,null,null,ARRAY['year_round'],'any',0,100,5.0,null)

ON CONFLICT (id) DO NOTHING;

-- ── Fishing Spots ─────────────────────────────────────────────────────────────
INSERT INTO fishing_spots (name, slug, region, water_type, lat, lng, description, access_type, difficulty,
  species_present, best_techniques, best_tides, depth_range_ft, hazards, regulations_notes) VALUES

('Point No Point', 'point-no-point', 'puget_sound_north', 'saltwater', 47.9126, -122.5266,
 'Legendary salmon and bottomfish spot at the tip of Kitsap Peninsula. Strong tidal currents attract massive baitfish schools and everything that eats them. Some of the most consistent chinook fishing in all of Puget Sound.',
 'both', 'intermediate',
 '[{"species_id":"chinook_salmon","rating":5,"seasons":["spring","fall"],"notes":"Best on incoming tide"},{"species_id":"coho_salmon","rating":4,"seasons":["summer","fall"]},{"species_id":"lingcod","rating":4,"seasons":["winter","spring"]}]',
 '["trolling","jigging","mooching"]', 'incoming', '40-200',
 'Strong currents — anchor carefully. Ferry traffic. Submerged rocks on east side.',
 'Check current salmon regs for Puget Sound. SRKW closures possible.'),

('Possession Bar', 'possession-bar', 'puget_sound_north', 'saltwater', 47.9233, -122.3742,
 'Underwater bar between Whidbey Island and the mainland. Creates massive current breaks that stack chinook salmon. Electric fishing during summer chinook season — limits are common.',
 'boat_only', 'intermediate',
 '[{"species_id":"chinook_salmon","rating":5,"seasons":["summer"],"notes":"Best at bar edge in 60-100ft"},{"species_id":"coho_salmon","rating":4,"seasons":["summer","fall"]},{"species_id":"pink_salmon","rating":5,"seasons":["summer"],"notes":"Even years only"}]',
 '["trolling","mooching"]', 'incoming', '60-120',
 'Heavy boat traffic during salmon season. Ferry lanes nearby. Unpredictable currents.',
 'North Puget Sound salmon regs apply. Check WDFW for current season.'),

('Bush Point', 'bush-point', 'puget_sound_north', 'saltwater', 48.0295, -122.6082,
 'Southwest tip of Whidbey Island. Consistent chinook producer in spring and fall. Rocky bottom holds excellent lingcod and cabezon. Shore access from Bush Point Road.',
 'both', 'intermediate',
 '[{"species_id":"chinook_salmon","rating":4},{"species_id":"lingcod","rating":4},{"species_id":"cabezon","rating":3}]',
 '["trolling","jigging"]', 'outgoing', '60-150',
 'Kelp on south side. Rocks at low tide near shore.',
 'Check bottomfish regs — lingcod season varies.'),

('Hat Island (Gedney)', 'hat-island', 'puget_sound_north', 'saltwater', 47.9712, -122.3227,
 'Small private island in north Sound with excellent deep water on all sides. Great for coho and pink salmon in season. Bottomfish year-round.',
 'boat_only', 'beginner',
 '[{"species_id":"coho_salmon","rating":4},{"species_id":"pink_salmon","rating":5,"seasons":["summer"],"notes":"Even years only"},{"species_id":"black_rockfish","rating":4}]',
 '["trolling","jigging","jig_plastics"]', 'any', '60-200',
 'No landing on island — private property.',
 'Check current salmon and bottomfish regulations.'),

('Mutiny Bay', 'mutiny-bay', 'puget_sound_north', 'saltwater', 48.0145, -122.5834,
 'West Whidbey Island. Excellent salmon trolling ground. Less crowded than Possession Bar. Good halibut fishing when open.',
 'boat_only', 'beginner',
 '[{"species_id":"chinook_salmon","rating":3},{"species_id":"coho_salmon","rating":4},{"species_id":"halibut","rating":3,"seasons":["spring","summer"]}]',
 '["trolling","mooching"]', 'incoming', '40-100',
 'Open to west winds — can get rough. Watch weather.',
 'Halibut season and quota — check IPHC/WDFW current season.'),

('The Narrows', 'the-narrows', 'puget_sound_central', 'saltwater', 47.2674, -122.5535,
 'Fastest tidal current in Puget Sound — up to 5 knots. Extremely dangerous but incredibly productive. Dogfish, sand lance pushed through creates feeding frenzy. Expert boaters only — people have died here.',
 'boat_only', 'expert',
 '[{"species_id":"chinook_salmon","rating":4},{"species_id":"lingcod","rating":5},{"species_id":"halibut","rating":3}]',
 '["jigging","mooching"]', 'slack', '100-400',
 'EXTREMELY dangerous currents. Only fish slack tide. 5-knot rips can capsize small boats. Shipping channel — tugs and barges.',
 'Fishing prohibited during strong current. Bottomfish regulations apply.'),

('Dalco Passage', 'dalco-passage', 'puget_sound_central', 'saltwater', 47.2991, -122.4178,
 'Deep passage between Vashon Island and Tacoma. Year-round chinook resident fishery — fish stay in the passage all winter. Consistent bottomfish.',
 'boat_only', 'intermediate',
 '[{"species_id":"chinook_salmon","rating":4,"notes":"Year-round resident fish"},{"species_id":"lingcod","rating":3},{"species_id":"halibut","rating":2}]',
 '["trolling","mooching"]', 'any', '100-300',
 'Shipping lane on east side. Ferry traffic.',
 'South Sound chinook regulations — can differ from north Sound.'),

('Commencement Bay', 'commencement-bay', 'puget_sound_central', 'saltwater', 47.2734, -122.4282,
 'Tacoma''s home water. Port of Tacoma industrial area nearby. Salmon in season, perch and greenling year-round from shore. Ruston Way waterfront has excellent pier fishing.',
 'both', 'beginner',
 '[{"species_id":"chinook_salmon","rating":3},{"species_id":"coho_salmon","rating":4,"seasons":["summer","fall"]},{"species_id":"perch","rating":4}]',
 '["trolling","casting","pier_fishing"]', 'incoming', '20-100',
 'Industrial shipping traffic. Some areas have contamination advisories — check before eating bottom species.',
 'Check EPA and WDFW consumption advisories for Commencement Bay.'),

('Point Defiance', 'point-defiance', 'puget_sound_central', 'saltwater', 47.3062, -122.5374,
 'Classic South Sound fishing spot. Shore access at famous Point Defiance pier. Deep water very close to shore makes this one of the best urban fishing spots in WA. Perch, greenling, and salmon.',
 'both', 'beginner',
 '[{"species_id":"coho_salmon","rating":4,"seasons":["summer","fall"]},{"species_id":"chinook_salmon","rating":3},{"species_id":"perch","rating":5}]',
 '["casting","jigging","drift_fishing"]', 'incoming', '20-80',
 'Busy public area. Watch other anglers. Moderate currents off the point.',
 'Urban salmon fishing regulations apply.'),

('Nisqually Reach', 'nisqually-reach', 'puget_sound_south', 'saltwater', 47.1067, -122.6785,
 'Southern-most productive salmon water in the Sound. Near Nisqually National Wildlife Refuge — exceptional habitat. Winter chinook fishery.',
 'boat_only', 'intermediate',
 '[{"species_id":"chinook_salmon","rating":4,"seasons":["winter","spring"]},{"species_id":"coho_salmon","rating":3}]',
 '["trolling"]', 'incoming', '40-120',
 'Shallow mudflats in spots. Check charts carefully.',
 'South Sound regs. Nisqually River mouth may have closures.'),

('Hood Canal - Hoodsport', 'hoodsport-hc', 'hood_canal', 'saltwater', 47.4048, -123.1345,
 'Hood Canal''s most famous spot. World-class chum salmon run arrives October-November right to the beach. Watching bears fish alongside you is common. Also outstanding crabbing and spot shrimp.',
 'both', 'beginner',
 '[{"species_id":"chum_salmon","rating":5,"seasons":["fall"],"notes":"Oct-Nov — bears on beach"},{"species_id":"dungeness_crab","rating":5},{"species_id":"spot_shrimp","rating":4,"seasons":["spring"]}]',
 '["casting","crabbing","shrimp_pots"]', 'any', '10-60',
 'Bears actively fishing in fall — give them space. Crab and shrimp pots require proper gear.',
 'Hood Canal chum — check for emergency closures. Crab/shrimp seasons vary.'),

('Hood Canal - Quilcene Bay', 'quilcene-bay', 'hood_canal', 'saltwater', 47.8189, -122.8745,
 'North Hood Canal. Excellent oyster and clam access at low tide. Spot shrimp during May opener. Coho salmon trolling in season. Quiet and beautiful.',
 'both', 'beginner',
 '[{"species_id":"spot_shrimp","rating":5,"seasons":["spring"]},{"species_id":"coho_salmon","rating":4,"seasons":["summer","fall"]}]',
 '["shrimp_pots","trolling","shellfish_harvest"]', 'any', '20-100',
 'Strong currents at narrows.',
 'Shellfish harvest — check for biotoxin closures before harvesting.'),

('Hood Canal - Skokomish', 'skokomish-delta', 'hood_canal', 'estuary', 47.3365, -123.1305,
 'Skokomish River delta at south Hood Canal. Excellent chum and coho runs in fall. Tribal reservation — know the boundaries.',
 'shore', 'beginner',
 '[{"species_id":"chum_salmon","rating":4,"seasons":["fall"]},{"species_id":"coho_salmon","rating":3,"seasons":["fall"]}]',
 '["casting","drift_fishing"]', 'incoming', '2-15',
 'Tribal reservation boundaries. Respect tribal fishing rights and closures.',
 'Skokomish Tribal waters have separate regulations — stay in public access areas.'),

('Salmon Bank', 'salmon-bank-sji', 'san_juan_islands', 'saltwater', 48.4285, -123.0156,
 'Underwater bank south of San Juan Island. World-class chinook fishing. Primary foraging area for Southern Resident Killer Whales — regulations change frequently based on SRKW presence.',
 'boat_only', 'intermediate',
 '[{"species_id":"chinook_salmon","rating":5},{"species_id":"coho_salmon","rating":4},{"species_id":"halibut","rating":3}]',
 '["trolling","mooching"]', 'any', '60-300',
 'ORCA BE WHALE WISE ZONE — 300-yard mandatory buffer from SRKWs. Monitor VHF 16.',
 'SRKW emergency closures possible — check NOAA regulations before fishing.'),

('Turn Point - Stuart Island', 'turn-point-stuart', 'san_juan_islands', 'saltwater', 48.6889, -123.2285,
 'Northwestern tip of Stuart Island. Extremely strong tidal currents. Where fish entering US from BC — first landfall for northbound chinook. Trophy fishery for those who make the run.',
 'boat_only', 'expert',
 '[{"species_id":"chinook_salmon","rating":5,"notes":"Trophy chinook in summer"},{"species_id":"coho_salmon","rating":4}]',
 '["trolling"]', 'slack', '80-400',
 'One of the strongest currents in the San Juans. Remote — plan carefully. Weather can trap you.',
 'San Juan Island regulations. International boundary nearby — Canadian regs if crossing.'),

('Cattle Point', 'cattle-point', 'san_juan_islands', 'saltwater', 48.4500, -122.9634,
 'Southeast tip of San Juan Island. Ripping tidal currents through the narrows create world-class lingcod habitat. Halibut in the deep holes when season is open. Incredible scenery.',
 'boat_only', 'expert',
 '[{"species_id":"lingcod","rating":5},{"species_id":"halibut","rating":4,"seasons":["spring","summer"]},{"species_id":"chinook_salmon","rating":4}]',
 '["jigging","trolling","live_bait"]', 'slack', '60-200',
 'Fast currents — dangerous in anything over 10-15 mph wind. International shipping lane.',
 'Bottomfish regs. Halibut season varies — check IPHC.'),

('False Bay', 'false-bay-sji', 'san_juan_islands', 'saltwater', 48.4756, -123.1234,
 'Shallow tidal flat on west San Juan Island. Outstanding Dungeness crab trapping. Shorebirds everywhere. Excellent beginning crabbing spot.',
 'shore', 'beginner',
 '[{"species_id":"dungeness_crab","rating":4},{"species_id":"perch","rating":3}]',
 '["crabbing","shore_casting"]', 'incoming', '5-30',
 'Very shallow — only accessible at higher tides. Wade carefully on flats.',
 'Check crab season and size limits. Biotoxin monitoring applies.'),

('Ediz Hook', 'ediz-hook', 'strait_of_juan_de_fuca', 'saltwater', 48.1266, -123.4281,
 'Port Angeles''s famous sand spit. Consistently one of the best shore-accessible salmon spots in the entire PNW. Pink salmon run here in even years brings thousands of anglers.',
 'both', 'beginner',
 '[{"species_id":"chinook_salmon","rating":4},{"species_id":"coho_salmon","rating":4},{"species_id":"pink_salmon","rating":5,"seasons":["summer"],"notes":"Even years — incredible run"}]',
 '["casting","trolling","mooching"]', 'incoming', '20-100',
 'End of spit gets exposed to Strait swells and wind. US Coast Guard station nearby.',
 'Strait of Juan de Fuca regs. Check WDFW for current opening.'),

('Swiftsure Bank', 'swiftsure-bank', 'strait_of_juan_de_fuca', 'saltwater', 48.5500, -124.9000,
 'International waters on the outer Strait. Remote and demanding but insane halibut and chinook fishing. Offshore run required — weather window dependent. Canadian border nearby.',
 'boat_only', 'expert',
 '[{"species_id":"halibut","rating":5},{"species_id":"chinook_salmon","rating":5},{"species_id":"albacore_tuna","rating":3,"seasons":["summer"]}]',
 '["trolling","bottom_fishing","jigging"]', 'any', '100-400',
 'International waters — extreme weather exposure. Long run from Port Angeles (28nm). File a float plan.',
 'International waters — both US NOAA and Canadian DFO regulations may apply.'),

('La Push Nearshore', 'la-push-nearshore', 'pacific_coast', 'saltwater', 47.9200, -124.6400,
 'Offshore from La Push Quileute tribal marina. Ocean salmon, halibut, tuna, and rockfish. Dramatic sea stacks and rugged coastline. Ocean conditions can be treacherous — experienced skippers only.',
 'boat_only', 'expert',
 '[{"species_id":"chinook_salmon","rating":5},{"species_id":"halibut","rating":5},{"species_id":"albacore_tuna","rating":4,"seasons":["summer"]},{"species_id":"black_rockfish","rating":5}]',
 '["trolling","jigging","bottom_fishing"]', 'any', '60-600',
 'OCEAN CAPABLE VESSELS ONLY. Exposed coast — no shelter. Bar crossing at La Push can be dangerous.',
 'Pacific Ocean salmon and bottomfish regs. NOAA manages separately from Sound. Check tribal rules near La Push.'),

('Westport Offshore', 'westport-offshore', 'pacific_coast', 'saltwater', 46.8800, -124.2000,
 'Grays Harbor famous charter fleet home. Best shore access to ocean halibut and salmon in WA. Huge fleet of charter boats makes it accessible. Flounder fishing in Grays Harbor itself year-round.',
 'both', 'intermediate',
 '[{"species_id":"halibut","rating":5},{"species_id":"chinook_salmon","rating":5},{"species_id":"black_rockfish","rating":5}]',
 '["trolling","bottom_fishing","jigging"]', 'any', '60-400',
 'Grays Harbor bar can be treacherous in bad weather. Check bar conditions.',
 'Pacific Coast salmon and halibut regs. Rockfish conservation areas — check NOAA.'),

('Lake Washington - South End', 'lake-washington-south', 'lake_washington', 'freshwater', 47.5101, -122.2624,
 'Seattle''s south Lake Washington. Strong smallmouth bass population. Sockeye salmon visible during Jun-Aug run (catch and release only). Good trout fishing near creek mouths in spring.',
 'both', 'beginner',
 '[{"species_id":"smallmouth_bass","rating":5},{"species_id":"sockeye_salmon","rating":3,"seasons":["summer"],"notes":"C&R only in lake — watch them spawn"},{"species_id":"rainbow_trout","rating":3}]',
 '["casting","jigging","fly_fishing"]', 'any', '10-100',
 'Heavy boat traffic in summer. Shipping traffic (canal).',
 'Sockeye catch and release only in Lake Washington. Bass slot size may apply.'),

('Sammamish River - Redmond', 'sammamish-river', 'lake_washington', 'freshwater', 47.6688, -122.1016,
 'Salmon spawning stream through Redmond. Coho in fall — amazing to watch. Fly fishing in upstream sections. Urban river but productive.',
 'shore', 'beginner',
 '[{"species_id":"coho_salmon","rating":3,"seasons":["fall"]},{"species_id":"cutthroat_trout","rating":4}]',
 '["fly_fishing","drift_fishing"]', 'any', '2-8',
 'Urban river — some crowding in fall.',
 'Salmon fishing may be restricted in some sections — check WDFW for specific river rules.'),

('Skykomish River - Gold Bar', 'skykomish-gold-bar', 'snohomish_river', 'freshwater', 47.8504, -121.6895,
 'Prime steelhead water through the Cascades. Summer AND winter steelhead runs. Wild fish must be released in many sections. Beautiful river with excellent fly fishing access.',
 'both', 'intermediate',
 '[{"species_id":"steelhead","rating":5,"notes":"Summer Jun-Sep, Winter Dec-Mar"},{"species_id":"coho_salmon","rating":4,"seasons":["fall"]},{"species_id":"chinook_salmon","rating":3,"seasons":["summer"]}]',
 '["fly_fishing","drift_fishing","side_drifting"]', 'outgoing', '4-20',
 'Swift current — wading can be dangerous. Flash floods possible in summer.',
 'Wild steelhead must be released. Check WDFW Skykomish rules — some sections have special regs.'),

('Snohomish River - Monroe', 'snohomish-river-monroe', 'snohomish_river', 'freshwater', 47.8551, -121.9712,
 'Lower Snohomish system. Multiple salmon species. Pink and chum in their respective years. Shore access at numerous county parks.',
 'both', 'beginner',
 '[{"species_id":"chinook_salmon","rating":4,"seasons":["summer"]},{"species_id":"coho_salmon","rating":4,"seasons":["fall"]},{"species_id":"chum_salmon","rating":4,"seasons":["fall"]},{"species_id":"pink_salmon","rating":4,"seasons":["summer"],"notes":"Even years"}]',
 '["drift_fishing","plunking","casting"]', 'any', '4-20',
 'Can be muddy with turbid water after rain. Flotsam hazard.',
 'Check emergency closures — Snohomish River regulations change frequently.'),

('Green River - Auburn', 'green-river-auburn', 'freshwater', 'freshwater', 47.3012, -122.2268,
 'Urban river surprisingly productive. Chinook, coho, and chum all run through. Access at multiple Auburn city parks. Chum run brings excellent spectacle.',
 'shore', 'beginner',
 '[{"species_id":"chinook_salmon","rating":4,"seasons":["summer"]},{"species_id":"coho_salmon","rating":4,"seasons":["fall"]},{"species_id":"chum_salmon","rating":5,"seasons":["fall"]}]',
 '["drift_fishing","plunking"]', 'any', '4-15',
 'Urban access — some areas may have restricted access.',
 'Green River salmon regulations — check WDFW for current season and closures.'),

('Lake Chelan - Upper', 'lake-chelan-upper', 'freshwater', 'freshwater', 47.9689, -120.1820,
 'Deepest lake in Washington (1,486 feet). World-class lake trout (mackinaw) in the depths. Kokanee in mid-depths. Take the Lady of the Lake ferry if you don''t have a trailerable boat.',
 'both', 'intermediate',
 '[{"species_id":"lake_trout","rating":5,"notes":"30-60ft in winter, 100-200ft in summer"},{"species_id":"rainbow_trout","rating":4},{"species_id":"kokanee","rating":5,"seasons":["spring","fall"]}]',
 '["trolling","jigging","vertical_jigging"]', 'any', '50-600',
 'Extreme depth — no anchor retrieval if broken. Afternoon winds can be strong.',
 'Lake Chelan special regulations — kokanee season varies, mackinaw slot size applies.'),

('Diablo Lake', 'diablo-lake', 'freshwater', 'freshwater', 48.7134, -121.1378,
 'Turquoise-green glacial lake in North Cascades. Stunning scenery. Wild rainbow and cutthroat trout. Remote but worth the drive.',
 'both', 'intermediate',
 '[{"species_id":"rainbow_trout","rating":4},{"species_id":"cutthroat_trout","rating":4}]',
 '["fly_fishing","casting"]', 'any', '10-200',
 'Remote location — plan accordingly. Cold water even in summer. Weather can change fast.',
 'National Park regulations may apply. Check for any closures.'),

('Puget Sound Beach - Lincoln Park', 'lincoln-park-beach', 'puget_sound_central', 'saltwater', 47.5089, -122.4024,
 'Seattle''s Lincoln Park waterfront. Shore fishing for coastal cutthroat, perch, and greenling. Beautiful urban beach with excellent public access.',
 'shore', 'beginner',
 '[{"species_id":"cutthroat_trout","rating":4},{"species_id":"perch","rating":4}]',
 '["casting"]', 'incoming', '5-30',
 'Public beach — crowded on weekends.',
 'Beach regulations — no clamming without checking biotoxin status.'),

('Willapa Bay', 'willapa-bay', 'pacific_coast', 'estuary', 46.6012, -123.9500,
 'One of the cleanest estuaries in North America. Incredible Dungeness crab, Pacific oysters, and clam harvesting. Sturgeon in the channels. Scenic and productive.',
 'both', 'intermediate',
 '[{"species_id":"dungeness_crab","rating":5},{"species_id":"razor_clam","rating":3}]',
 '["crabbing","clamming","bottom_fishing"]', 'incoming', '0-30',
 'Complex tidal channels — know your tides before venturing into flats. Occasional fog.',
 'Willapa Bay oyster and crab regs. Check biotoxin before harvesting shellfish.')

ON CONFLICT (slug) DO NOTHING;

-- ── Marinas ───────────────────────────────────────────────────────────────────
INSERT INTO marinas (name, slug, region, lat, lng, city, phone, vhf_channel,
  has_launch_ramp, has_fuel_dock, has_transient_moorage, has_pump_out,
  has_restrooms, has_showers, has_wifi, has_power_30amp, has_power_50amp,
  description, usa_wrapco_authorized, wrap_company_nearby,
  has_repair_yard, has_travel_lift, max_vessel_length_ft,
  hours_office, transient_rate_per_ft_per_night) VALUES

('Gig Harbor Marina & Boatyard', 'gig-harbor-marina', 'puget_sound_central',
 47.3331, -122.5786, 'Gig Harbor', '(253) 858-8338', '16/68',
 true, true, true, true, true, true, true, true, true,
 'Full-service marina and boatyard in the heart of charming Gig Harbor. Travel lift to 60 tons, complete repair services. USA Wrap Co authorized boat wrap and DekWave decking location.',
 true, 'USA Wrap Co — (253) 555-0100 | fleet@usawrapco.com',
 true, true, 200, 'Mon-Fri 8am-5pm, Sat 8am-4pm', 1.50),

('Narrows Marina', 'narrows-marina', 'puget_sound_central',
 47.2734, -122.5456, 'Tacoma', '(253) 564-4222', '16',
 true, true, false, true, true, false, false, true, false,
 'Launch ramp access to The Narrows — one of the most productive fishing areas in Puget Sound. Convenient Tacoma location.',
 false, null, false, false, 50, 'Daily 7am-6pm', null),

('Shilshole Bay Marina', 'shilshole-bay', 'puget_sound_north',
 47.6806, -122.4058, 'Seattle', '(206) 728-3006', '16/68',
 false, true, true, true, true, true, true, true, true,
 'Seattle''s largest public marina operated by Port of Seattle. 1,400 slips. Full amenities, excellent access to northern Puget Sound. Gateway to San Juan Islands.',
 false, null, true, false, 150, 'Daily 7am-10pm', 1.75),

('Westlake Marina', 'westlake-marina', 'lake_washington',
 47.6447, -122.3388, 'Seattle', '(206) 284-1977', 'N/A',
 false, true, true, true, true, true, true, true, false,
 'Lake Union marina close to downtown Seattle. Popular base for Lake Union and Lake Washington exploration. Portage Bay access.',
 false, null, false, false, 80, 'Daily 8am-6pm', 1.25),

('Anacortes Marina', 'anacortes-marina', 'san_juan_islands',
 48.5074, -122.6128, 'Anacortes', '(360) 293-0694', '16',
 true, true, true, true, true, true, true, true, true,
 'Gateway to the San Juan Islands. Large marina with full services. Major charter fleet base. Customs clearing available.',
 false, null, true, true, 200, 'Daily 7am-9pm', 1.60),

('Roche Harbor Resort', 'roche-harbor', 'san_juan_islands',
 48.6127, -123.1583, 'Friday Harbor', '(360) 378-2155', '16/68',
 false, true, true, true, true, true, true, true, true,
 'Iconic northwest destination marina on San Juan Island. Historic resort with restaurant and accommodations. Annual salmon derbies. Beautiful setting.',
 false, null, false, false, 200, 'Daily 7am-9pm', 2.25),

('Friday Harbor Marina', 'friday-harbor-marina', 'san_juan_islands',
 48.5359, -123.0155, 'Friday Harbor', '(360) 378-8500', '16/66A',
 false, true, true, true, true, true, true, true, true,
 'San Juan Island''s main port. WA State Ferries terminal. Customs port of entry from Canada. Vibrant town with restaurants and shops within walking distance.',
 false, null, false, false, 180, 'Daily 6am-10pm', 2.00),

('Port of Poulsbo', 'port-of-poulsbo', 'puget_sound_north',
 47.7334, -122.6470, 'Poulsbo', '(360) 779-3505', '16',
 true, true, true, true, true, true, true, true, false,
 'Charming "Little Norway on the Fjord." Excellent guest moorage in a beautiful Norwegian-themed waterfront town. Great crabbing in Liberty Bay nearby.',
 false, null, false, false, 100, 'Daily 8am-8pm', 1.20),

('Kingston Marina', 'kingston-marina', 'puget_sound_north',
 47.7970, -122.5145, 'Kingston', '(360) 297-3545', '16',
 true, false, true, true, true, false, false, true, false,
 'Quiet marina near Kingston ferry terminal. Good access to north Sound salmon fishing. Small, clean facility.',
 false, null, false, false, 60, 'Seasonal', null),

('Port Townsend Boat Haven', 'port-townsend-marina', 'strait_of_juan_de_fuca',
 48.1076, -122.7584, 'Port Townsend', '(360) 385-2355', '16/66A',
 true, true, true, true, true, true, true, true, true,
 'Victorian seaport marina. Gateway to Strait fishing and San Juans. Strong DIY boatyard culture. Annual Wooden Boat Festival venue.',
 false, null, true, true, 200, 'Daily 6am-10pm', 1.50),

('Port Angeles Boat Haven', 'port-angeles-marina', 'strait_of_juan_de_fuca',
 48.1222, -123.4456, 'Port Angeles', '(360) 457-4505', '16/66A',
 true, true, true, true, true, true, false, true, true,
 'Gateway to Strait of Juan de Fuca fishing — one of the best in WA. Customs port of entry from Canada. Near Olympic National Park. Ediz Hook fishing very close.',
 false, null, true, false, 180, 'Daily 7am-9pm', 1.40),

('La Push Small Boat Basin', 'la-push-marina', 'pacific_coast',
 47.9073, -124.6364, 'La Push', '(360) 374-5392', '16',
 true, true, false, false, true, false, false, false, false,
 'Quileute tribal marina. Gateway to offshore Pacific fishing. Dramatic coast with sea stacks. Ocean-capable vessels only — exposed coast with bar crossing.',
 false, null, false, false, 60, 'Seasonal', null),

('Westport Marina', 'westport-marina', 'pacific_coast',
 46.9045, -124.1067, 'Westport', '(360) 268-9665', '16',
 true, true, true, true, true, true, false, true, true,
 'Washington''s largest charter boat fleet. Annual salmon and halibut derby mecca. Full services. Fishermen''s Cove restaurant onsite. Seasonal halibut and salmon charters available.',
 false, null, true, false, 200, 'Daily 5am-9pm', 1.00),

('Hoodsport Marina', 'hoodsport-marina', 'hood_canal',
 47.4048, -123.1339, 'Hoodsport', '(360) 877-9657', '16',
 true, true, false, false, true, false, false, false, false,
 'Right at the famous Hoodsport chum salmon run area each fall. Excellent crabbing and shrimp pot access. Bear sightings common in October.',
 false, null, false, false, 40, 'Seasonal', null),

('Hood Canal Marina - Union', 'hood-canal-union', 'hood_canal',
 47.3665, -123.1072, 'Union', '(360) 898-2252', '16',
 true, false, true, false, true, false, false, true, false,
 'Small marina in southern Hood Canal. Access to excellent Hood Canal crabbing and chum salmon runs. Nearby Hood Canal Floating Bridge.',
 false, null, false, false, 60, 'Seasonal', null)

ON CONFLICT (slug) DO NOTHING;

-- ── Boating Regulations ───────────────────────────────────────────────────────
INSERT INTO boating_regulations (category, title, rule_text, vessel_size_applies, jurisdiction, penalty_amount) VALUES

('life_jackets', 'Life Jackets Required for All Aboard',
 'Must have one US Coast Guard approved Type I, II, III, or V life jacket for every person on board. Children under 13 must wear a life jacket at all times while underway on vessels under 26 feet. Life jackets must be readily accessible — not buried in storage.',
 'all', 'federal', 'Up to $500'),

('life_jackets', 'Throwable Device Required',
 'Vessels 16 feet or longer must carry one Type IV throwable device (ring buoy or cushion) in addition to wearable PFDs. Must be immediately accessible on deck.',
 'over_16ft', 'federal', 'Up to $500'),

('orca_rules', 'Be Whale Wise — 300 Yard Rule (Federal)',
 'It is unlawful to approach within 300 yards of Southern Resident Killer Whales (SRKWs) from any direction. Do not position vessel in path of whale travel. If whales approach your stopped vessel, put engine in neutral. Reduce speed to under 7 knots within 400 yards.',
 'all', 'federal', 'Up to $11,000 fine'),

('orca_rules', 'Be Whale Wise — Vessel Behavior',
 'No vessel may approach within 400 yards of resting or feeding SRKWs. Turn off active sonar devices near whales. Do not use drones within 300 yards of whales without a federal permit. Monitor VHF 16 for exclusion zone announcements.',
 'all', 'federal', 'Up to $11,000 fine'),

('registration', 'WA Vessel Registration Required',
 'All motorized vessels operated on WA waters must be registered. Sailboats over 16 feet require registration regardless of motor. Non-motorized boats under 16 feet exempt. Registration numbers: 3-inch minimum height, block letters/numbers on both sides of bow. Current decal on starboard side of number.',
 'all', 'wa_state', 'Traffic infraction — $120 minimum'),

('alcohol', 'Boating Under the Influence (BUI)',
 'Operating a vessel while under influence of alcohol or drugs is illegal. BAC limit is 0.08% — same as driving. First offense: gross misdemeanor, up to $5,000 fine, 364 days jail, 1-year suspension of boating privileges. Prior DUI convictions may enhance penalties.',
 'all', 'wa_state', 'Up to $5,000 + jail time'),

('fire_extinguisher', 'Fire Extinguisher Requirements',
 'All vessels with an enclosed fuel/engine compartment, closed living space, or PFD storage area must carry at least one B-1 USCG approved fire extinguisher. Vessels 26-40 feet: two B-1 or one B-2. Over 40 feet: three B-1 or one B-2 plus one B-1. Must be charged and accessible.',
 'over_16ft', 'federal', 'Up to $500'),

('navigation_lights', 'Navigation Lights — Sunset to Sunrise',
 'All vessels operating between sunset and sunrise OR in restricted visibility must display proper USCG approved navigation lights. Recreational vessels under power: red port (left), green starboard (right), white stern, white masthead. Sailboats: red/green sidelights, white stern. Anchored: white all-round. No anchor light required under 7m in areas not used by other vessels.',
 'all', 'federal', 'Up to $500'),

('sound_signals', 'Sound Signaling Device Required',
 'Vessels under 12 meters: any sound-producing device (horn, whistle). Vessels 12-20 meters: must carry a horn AND bell. Over 65 feet: horn, bell, and gong required. One short blast = turning right. Two short = turning left. Five or more short = danger/unclear intentions.',
 'all', 'federal', 'Up to $500'),

('discharge', 'No Discharge of Sewage',
 'Federal law prohibits discharge of untreated sewage within 3 nautical miles of shore. Puget Sound, Hood Canal, Lake Washington, and all major WA marine waters are designated No-Discharge Zones — even treated sewage prohibited. Must use pump-out stations. Holding tank required on vessels with heads.',
 'all', 'federal', 'Up to $2,000 fine'),

('discharge', 'No Discharge of Oil',
 'Discharging oil or fuel causing visible sheen on water is prohibited. Keep bilges clean. Report spills immediately: National Response Center 1-800-424-8802. Use oil-absorbing bilge pads. Secure fuel caps and prevent overfill.',
 'all', 'federal', 'Up to $25,000 per day'),

('speed', 'No Wake Zones',
 'No Wake means slow enough that your vessel creates minimal or no wake — generally 5 mph or slower. All of Gig Harbor channel is No Wake. Strictly enforced near marinas, docks, swim beaches, and marked areas. Damage from your wake is your liability.',
 'all', 'wa_state', 'Traffic infraction'),

('speed', 'Speed Limits Near Swimmers and Divers',
 'Reduce speed to No Wake (5 mph or less) within 200 feet of any diver down flag, swimming area, or populated beach. Divers must display flag when in water.',
 'all', 'wa_state', 'Traffic infraction'),

('anchoring', 'Anchoring Rules',
 'May anchor for reasonable time in most areas. Cannot anchor in fairways, channels, or navigation lanes. Some areas have dedicated anchorages. Cannot anchor where prohibited by local ordinance. Must display anchor light (white all-round) from sunset to sunrise.',
 'all', 'federal', 'Varies'),

('canadian_customs', 'Entering Canada by Vessel',
 'Must report to Canada Border Services Agency (CBSA) immediately upon entering Canadian waters. Call CBSA: 1-888-226-7277. NEXUS members may use NEXUS phone reporting. Must land at designated port of entry FIRST. Declare all weapons, alcohol, and goods. Failure to report: fines up to $25,000 CDN.',
 'all', 'federal', 'Up to $25,000 CDN'),

('flares', 'Visual Distress Signals',
 'Vessels operating on coastal waters, Great Lakes, or tidal rivers: must carry USCG approved pyrotechnic visual distress signals. Minimum 3 day/night combination flares or combination of day (orange flag/smoke) and night (electric SOS light). Check expiration dates — pyrotechnics expire 42 months after manufacture.',
 'over_16ft', 'federal', 'Up to $500'),

('vhf_radio', 'VHF Radio Best Practices',
 'While not legally required for recreational vessels, VHF radio is essential for safety. Channel 16 is the international distress/calling channel — maintain watch when underway. In designated VTS areas (Puget Sound main channels), recreational boaters should monitor Channel 14. Always have a handheld backup.',
 'all', 'wa_state', 'N/A — safety recommendation'),

('towing', 'Waterskiing and Towing',
 'Must have at least two people aboard towing vessel when towing skier/wakeboarder (operator + spotter). Water-skier must wear approved life jacket. Prohibited at night. Must stay 100 feet from docks, swimmers, and shore in most areas.',
 'all', 'wa_state', 'Traffic infraction')

ON CONFLICT DO NOTHING;
