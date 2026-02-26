-- ═══════════════════════════════════════════════════════════════════════════════
-- PNW NAVIGATOR — MORE SPECIES AND SPOTS (Session 3)
-- Migration: 20260226310000
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Additional fish species ────────────────────────────────────────────────────
INSERT INTO fish_species VALUES
('cutthroat_trout','Cutthroat Trout','Oncorhynchus clarkii','freshwater','trout',13.5,1964,'Snohomish County',
 'PNW native trout named for the red slash marks under the jaw. Sea-run (coastal cutthroat) migrate to saltwater and return. One of the most beautiful trout.',
 'Red or orange slash marks under jaw. Heavy spotting throughout body. Sea-run fish are bright silver.',
 'Small streams, estuaries, coastal salt water','Insects, small fish, eggs',
 0.25,8,8,24,ARRAY['fall','winter','spring'],'any',0,30,null,3.0,13.5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fish_species VALUES
('dolly_varden','Dolly Varden Char','Salvelinus malma','freshwater','char',8.6,1982,'Puget Sound',
 'Brilliantly colored arctic char. Sea-run fish return to rivers in fall. Often confused with bull trout.',
 'Pink/red spots on olive-green body. White-edged lower fins. No black spots (key: bull trout has no red spots).',
 'Cold, clear rivers and streams','Insects, small fish, eggs',
 0.5,5,10,24,ARRAY['fall','spring'],'any',0,60,null,3.0,8.6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fish_species VALUES
('bull_trout','Bull Trout','Salvelinus confluentus','freshwater','char',32.0,null,'WA',
 'Threatened species. Largest native char in the Columbia basin. Release all bull trout immediately.',
 'Pale yellow and red spots on olive background. No black spots. Square tail.',
 'Cold, clean headwater streams and deep lakes','Small fish, insects, crayfish',
 1,15,12,30,ARRAY['year_round'],'any',0,100,null,8.0,32.0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fish_species VALUES
('kokanee','Kokanee','Oncorhynchus nerka','freshwater','salmon',9.0,1980,'Lake Chelan',
 'Land-locked sockeye salmon. Thrives in deep, cold lakes. Lake Chelan and Cle Elum Lake have excellent populations.',
 'Similar to sockeye — silver, no spots. Turns red during fall spawn in lake inlet streams.',
 'Deep, cold lakes, 40-200ft in summer','Zooplankton, small crustaceans',
 0.25,4,10,18,ARRAY['year_round'],'any',40,200,null,2.0,9.0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fish_species VALUES
('brown_trout','Brown Trout','Salmo trutta','freshwater','trout',32.0,1965,'WA',
 'Introduced European species. Difficult to catch, highly prized. Large specimens lurk in big rivers.',
 'Brown/golden sides with black AND red spots. Red spots often have pale halos.',
 'Rivers, lakes, cold clear water','Fish, crayfish, large insects',
 0.5,12,10,30,ARRAY['year_round'],'any',0,40,null,6.0,32.0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fish_species VALUES
('yellow_perch','Yellow Perch','Perca flavescens','freshwater','perch',2.4,null,'WA',
 'Popular panfish. Lake Washington has strong populations. Great eating — mild sweet white flesh.',
 'Bright yellow-green with dark vertical bars. Orange-red lower fins.',
 'Weed edges, piers, shallow structure','Insects, small fish, crayfish',
 0.1,1.5,5,14,ARRAY['year_round'],'any',5,30,null,1.0,2.4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fish_species VALUES
('black_crappie','Black Crappie','Pomoxis nigromaculatus','freshwater','panfish',3.0,null,'WA',
 'Popular panfish found in warmer lakes. Eastern WA lakes especially productive.',
 'Silvery with scattered black spots and blotches. Large dorsal fin.',
 'Vegetated coves, docks, slow water','Insects, small fish',
 0.1,1.5,5,14,ARRAY['spring','summer'],'any',5,20,null,1.0,3.0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fish_species VALUES
('largemouth_bass','Largemouth Bass','Micropterus salmoides','freshwater','bass',12.0,2005,'WA',
 'Introduced warm-water species. Lake Washington and eastern WA lakes have big fish. Voracious predator.',
 'Dark lateral line. Upper jaw extends past eye (vs smallmouth). Greenish-brown sides.',
 'Warm lakes, ponds, slow rivers','Fish, crayfish, frogs',
 0.5,10,10,25,ARRAY['spring','summer'],'any',2,20,null,5.0,12.0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fish_species VALUES
('walleye','Walleye','Sander vitreus','freshwater','perch',12.0,1985,'Columbia River',
 'Prized freshwater fish. Banks Lake and Lake Roosevelt in eastern WA have trophy walleye.',
 'Glassy eyes reflect light — a key ID feature. Olive-gold sides. Pointed dorsal spines.',
 'Deep, clear lakes and rivers','Fish, especially perch',
 0.5,10,14,30,ARRAY['spring','fall'],'any',10,60,null,5.0,12.0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fish_species VALUES
('striped_bass','Striped Bass','Morone saxatilis','saltwater','bass',67.5,1989,'Columbia River',
 'Popular Columbia River and coastal sport fish. Strong runs in spring below Bonneville Dam.',
 'Silvery with 7-8 dark horizontal stripes. Large, heavy-bodied fish.',
 'Large rivers, coastal bays','Fish, crustaceans',
 2,50,18,50,ARRAY['spring','fall'],'incoming',5,60,null,20.0,67.5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fish_species VALUES
('copper_rockfish','Copper Rockfish','Sebastes caurinus','bottomfish','rockfish',6.0,null,'WA',
 'Beautiful gold and copper mottled rockfish. Common in rocky nearshore areas. Excellent eating.',
 'Copper-gold coloring with darker mottling. Pale stripe along lateral line.',
 'Rocky reefs and kelp, 30-200ft','Small fish, shrimp',
 0.5,5,10,22,ARRAY['year_round'],'any',30,200,null,3.0,6.0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fish_species VALUES
('yelloweye_rockfish','Yelloweye Rockfish','Sebastes ruberrimus','bottomfish','rockfish',35.0,null,'WA',
 'Bright yellow eyes and orange-red body. Deep-water fish. Can live 100+ years — treat as trophy, consider C&R.',
 'Brilliant orange-red body. Large yellow eyes. White stripe along lateral line in young fish.',
 'Deep rocky reefs, 100-1,400ft','Small fish, octopus, shrimp',
 2,20,15,36,ARRAY['year_round'],'any',100,600,null,10.0,35.0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fish_species VALUES
('canary_rockfish','Canary Rockfish','Sebastes pinniger','bottomfish','rockfish',10.0,null,'WA',
 'Bright orange-yellow with grey mottling. Overfished historically — now rebuilding. Check current limits.',
 'Bright orange with 3 orange stripes across head. Grey mottled pattern.',
 'Rocky reefs, 100-900ft','Small fish, squid, krill',
 0.5,8,10,30,ARRAY['year_round'],'any',80,600,null,4.0,10.0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fish_species VALUES
('sablefish','Sablefish (Black Cod)','Anoplopoma fimbria','bottomfish','deep_water',80.0,null,'WA',
 'Black cod — among the richest, most prized eating fish in the world. Deep water, annual quota.',
 'Black to dark grey. Smooth skin. Distinctive deeply forked tail.',
 'Deep water, 1,000-3,000ft','Squid, herring, crustaceans',
 3,40,18,50,ARRAY['year_round'],'any',300,1000,null,15.0,80.0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fish_species VALUES
('pacific_cod','Pacific Cod','Gadus macrocephalus','bottomfish','cod',33.0,null,'WA',
 'Traditional cod. Good eating fish. Found in outer coast and Strait of Juan de Fuca.',
 'Brown-grey with paler belly. Three dorsal fins. Chin barbel.',
 'Sandy-muddy bottom, 100-900ft','Shrimp, crab, small fish',
 1,15,15,36,ARRAY['year_round'],'any',80,500,null,6.0,33.0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fish_species VALUES
('english_sole','English Sole','Parophrys vetulus','bottomfish','flatfish',2.5,null,'WA',
 'Common flatfish. Right-eyed. Bottom trawled commercially. Great light-tackle sport fish on sandy bottom.',
 'Right-eyed, smooth, uniformly brown. Very oval shape.',
 'Sandy and muddy bottom, 0-300ft','Worms, small crustaceans, clams',
 0.25,2,8,20,ARRAY['year_round'],'any',0,300,null,1.0,2.5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fish_species VALUES
('starry_flounder','Starry Flounder','Platichthys stellatus','bottomfish','flatfish',20.0,null,'WA',
 'Distinctive alternating orange-and-dark stripes on fins. Can be right OR left eyed (unusual for flatfish).',
 'Striking orange-black striped fins. Rough, spiny skin. Can face either way.',
 'Sandy-muddy bottom, bays and estuaries','Worms, clams, crustaceans, small fish',
 0.5,10,12,28,ARRAY['year_round'],'any',0,100,null,4.0,20.0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fish_species VALUES
('spiny_dogfish','Spiny Dogfish','Squalus suckleyi','bottomfish','shark',20.0,null,'WA',
 'Small shark that ruins many fishing trips by eating your bait. But they are edible and valuable commercially.',
 'Grey with white spots. Spine in front of each dorsal fin (careful — mildly venomous).',
 'Schools over sandy bottom, mid-water','Fish, squid, shrimp, crab',
 1,15,24,48,ARRAY['year_round'],'any',0,400,null,8.0,20.0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fish_species VALUES
('giant_pacific_octopus','Giant Pacific Octopus','Enteroctopus dofleini','shellfish','cephalopod',150.0,null,'WA',
 'World''s largest octopus. Usually encountered by divers. Extremely intelligent. Most states protect them.',
 'Reddish-brown, changes color instantly. 8 arms with suckers. Large round mantle.',
 'Rocky reefs and caves, intertidal to 330ft','Crab, clam, shrimp, fish',
 2,50,null,null,ARRAY['year_round'],'any',0,100,null,null,null)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fish_species VALUES
('geoduck','Geoduck','Panopea generosa','shellfish','clam',30.0,null,'WA',
 'World''s largest burrowing clam. Siphon can reach 3 feet long. Highly prized in Asian markets.',
 'Large shell with a protruding siphon that cannot retract. Cannot close shell.',
 'Sandy-muddy intertidal to 300ft','Filter feeder — plankton',
 1,10,null,null,ARRAY['year_round'],'any',0,300,null,5.0,null)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fish_species VALUES
('razor_clam','Razor Clam','Siliqua patula','shellfish','clam',null,null,null,
 'Pacific coast treasure. Spring and fall digs on WA beaches. Incredible eating. Digging license required.',
 'Elongated, smooth brown shell. Brittle and cuts like a razor.',
 'Sandy Pacific coast beaches, intertidal','Filter feeder',
 0.1,0.5,null,null,ARRAY['spring','fall'],'low_tide',0,20,null,0.3,null)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fish_species VALUES
('manila_clam','Manila Clam','Ruditapes philippinarum','shellfish','clam',null,null,null,
 'Introduced from Asia, now naturalized. Primary recreational clam in Puget Sound. Hardy and delicious.',
 'Small oval shell with fine radial and concentric ribs. Variable color.',
 'Sandy-gravel intertidal beaches, 0-5ft','Filter feeder',
 0.1,0.3,null,null,ARRAY['year_round'],'low_tide',0,5,null,0.2,null)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fish_species VALUES
('pacific_oyster','Pacific Oyster','Crassostrea gigas','shellfish','bivalve',null,null,null,
 'Farmed and wild throughout Puget Sound and Hood Canal. Rich briny flavor. Harvest from public tidelands.',
 'Deeply cupped shell with ruffled edges. Greyish-white. Variable shape.',
 'Intertidal rocky areas, 0-15ft','Filter feeder',
 0.1,1,null,null,ARRAY['year_round'],'low_tide',0,15,null,0.5,null)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fish_species VALUES
('dungeness_crab','Dungeness Crab','Metacarcinus magister','shellfish','crab',null,null,null,
 'The Pacific Northwest''s most iconic shellfish. Sweet, sweet meat. Pot fishing and hoop netting.',
 'Wide, oval shape. Purple-brown carapace. Must measure 6.25" across back.',
 'Sandy/muddy bottom, 0-300ft','Clams, worms, small fish',
 0.5,4,null,null,ARRAY['year_round'],'incoming',0,100,null,2.0,null)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fish_species VALUES
('red_sea_urchin','Red Sea Urchin','Strongylocentrotus franciscanus','shellfish','echinoderm',null,null,null,
 'Largest sea urchin in the world. Prized uni (roe) harvested commercially. Recreational harvest allowed.',
 'Red to purple spines, up to 7 inches across. Green urchin is smaller, more common intertidally.',
 'Rocky reefs, 0-300ft','Kelp and algae',
 0.5,2,null,null,ARRAY['year_round'],'low_tide',0,150,null,null,null)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fish_species VALUES
('channel_catfish','Channel Catfish','Ictalurus punctatus','freshwater','catfish',58.0,2000,'WA',
 'Popular warm-water fish in eastern WA irrigation canals, ponds, and Columbia River backwaters.',
 'Deeply forked tail. Long whiskers (barbels). Olive-grey with scattered spots when young.',
 'Warm, slow rivers, ponds, canals','Anything — bottom feeder',
 0.5,20,10,30,ARRAY['summer'],'any',0,20,null,8.0,58.0)
ON CONFLICT (id) DO NOTHING;

-- ── Additional fishing spots ───────────────────────────────────────────────────
INSERT INTO fishing_spots (name,slug,region,water_type,lat,lng,description,access_type,species_present,best_techniques,best_tides,depth_range_ft,difficulty) VALUES

-- PUGET SOUND NORTH (10 more)
('Deception Pass','deception-pass','puget_sound_north','saltwater',48.4072,-122.6427,
 'Dramatic canyon between Whidbey and Fidalgo Islands. Violent tidal rips create incredible lingcod and rockfish habitat. Expert level — dangerous currents.',
 'both','[{"species_id":"lingcod","rating":5},{"species_id":"black_rockfish","rating":5},{"species_id":"cabezon","rating":4}]',
 '["jigging","drop_shot","crabbing"]','slack','20-200','expert'),

('Admiralty Inlet','admiralty-inlet','puget_sound_north','saltwater',47.9300,-122.6800,
 'Deep passage connecting the Strait to Puget Sound. Major salmon migration corridor. Strong tidal rips. Halibut opportunity in season.',
 'boat_only','[{"species_id":"chinook_salmon","rating":5},{"species_id":"halibut","rating":3},{"species_id":"lingcod","rating":4}]',
 '["trolling","mooching"]','incoming','80-400','intermediate'),

('Sinclair Island','sinclair-island','puget_sound_north','saltwater',48.6144,-122.6783,
 'Small island north of Anacortes. Excellent coho trolling in season. Lingcod and rockfish year-round on the rocky south end.',
 'boat_only','[{"species_id":"coho_salmon","rating":4},{"species_id":"lingcod","rating":4},{"species_id":"black_rockfish","rating":4}]',
 '["trolling","jigging"]','outgoing','40-150','intermediate'),

('Penn Cove - Whidbey Island','penn-cove','puget_sound_north','saltwater',48.2200,-122.7200,
 'Famous for Penn Cove mussels. Recreational crabbing and clam digging on the tideflats. Scenic cove with good coho trolling at the mouth.',
 'both','[{"species_id":"dungeness_crab","rating":4},{"species_id":"manila_clam","rating":5},{"species_id":"coho_salmon","rating":3}]',
 '["crabbing","shellfish_harvest","trolling"]','low_tide','0-60','beginner'),

('Mutiny Bay - Whidbey','mutiny-bay','puget_sound_north','saltwater',47.9480,-122.5350,
 'Sheltered bay on the southwest side of Whidbey Island. Coho and pink salmon fishing in season. Good bottomfish on the outer reefs.',
 'both','[{"species_id":"coho_salmon","rating":4},{"species_id":"pink_salmon","rating":4},{"species_id":"cabezon","rating":3}]',
 '["trolling","casting"]','any','20-80','beginner'),

('Saratoga Passage','saratoga-passage','puget_sound_north','saltwater',48.2000,-122.5000,
 'Long passage between Whidbey and Camano Islands. Excellent coho and pink salmon trolling. School of pinks can be massive in odd years.',
 'boat_only','[{"species_id":"coho_salmon","rating":4},{"species_id":"pink_salmon","rating":5,"seasons":["odd_years"]},{"species_id":"chinook_salmon","rating":3}]',
 '["trolling"]','incoming','30-100','beginner'),

('Snohomish River Estuary','snohomish-estuary','snohomish_river','saltwater',47.9200,-122.2200,
 'Where the Snohomish River meets the Sound. Major chinook and coho salmon holding area in summer and fall. Also good for sea-run cutthroat.',
 'both','[{"species_id":"chinook_salmon","rating":4},{"species_id":"coho_salmon","rating":4},{"species_id":"cutthroat_trout","rating":4}]',
 '["drift_fishing","plunking","fly_fishing"]','incoming','4-30','beginner'),

('Possession Point','possession-point','puget_sound_north','saltwater',47.9000,-122.3700,
 'Southern tip of Whidbey Island. Outstanding chinook salmon spot — similar to Possession Bar but the point itself. Rocky structure holds bottomfish.',
 'boat_only','[{"species_id":"chinook_salmon","rating":5},{"species_id":"lingcod","rating":3},{"species_id":"coho_salmon","rating":4}]',
 '["trolling","mooching"]','incoming','60-150','intermediate'),

('Camano Island - Elger Bay','camano-elger-bay','puget_sound_north','saltwater',48.1850,-122.4900,
 'South Camano Island. Protected bay with good crabbing and clam digging at low tide. Salmon trolling outside the bay entrance.',
 'both','[{"species_id":"dungeness_crab","rating":4},{"species_id":"manila_clam","rating":4},{"species_id":"coho_salmon","rating":3}]',
 '["crabbing","shellfish_harvest"]','low_tide','0-60','beginner'),

('Everett Jetty','everett-jetty','puget_sound_north','saltwater',47.9800,-122.2600,
 'North and South jetties at Port of Everett. Shore-accessible salmon fishing during runs. Perch and greenling year-round from rocks.',
 'shore','[{"species_id":"coho_salmon","rating":3},{"species_id":"pink_salmon","rating":4},{"species_id":"black_rockfish","rating":4}]',
 '["casting","drift_fishing"]','incoming','10-40','beginner'),

-- PUGET SOUND CENTRAL (10 more)
('Blake Island','blake-island','puget_sound_central','saltwater',47.5350,-122.4880,
 'State park island in the middle of the Sound. No cars, boat-only access. Excellent crabbing in the surrounding shallows. Coho staging area.',
 'boat_only','[{"species_id":"dungeness_crab","rating":4},{"species_id":"coho_salmon","rating":4},{"species_id":"lingcod","rating":3}]',
 '["crabbing","trolling"]','incoming','20-100','beginner'),

('Pickering Passage','pickering-passage','puget_sound_central','saltwater',47.3700,-122.9400,
 'Narrow passage through the South Sound islands. Spot shrimp in season, Dungeness crab, and oyster harvest at low tide.',
 'boat_only','[{"species_id":"spot_shrimp","rating":4,"seasons":["spring"]},{"species_id":"dungeness_crab","rating":4},{"species_id":"pacific_oyster","rating":5}]',
 '["shrimp_pots","crabbing","shellfish_harvest"]','any','10-60','beginner'),

('Anderson Island','anderson-island','puget_sound_central','saltwater',47.1600,-122.6800,
 'Remote south Sound island. Excellent crabbing in the passes on either side. Coho and chum salmon in fall.',
 'boat_only','[{"species_id":"dungeness_crab","rating":5},{"species_id":"chum_salmon","rating":4},{"species_id":"coho_salmon","rating":3}]',
 '["crabbing","trolling"]','incoming','20-80','beginner'),

('Case Inlet','case-inlet','puget_sound_central','saltwater',47.2500,-122.8500,
 'Long inlet in South Sound. Excellent oyster harvest on public tidelands. Dungeness crab. Coho salmon in season.',
 'both','[{"species_id":"pacific_oyster","rating":5},{"species_id":"dungeness_crab","rating":4},{"species_id":"coho_salmon","rating":3}]',
 '["shellfish_harvest","crabbing"]','low_tide','0-60','beginner'),

('Carr Inlet','carr-inlet','puget_sound_central','saltwater',47.2900,-122.7400,
 'Sheltered inlet with good bottomfish. Nearshore rockfish are accessible from kayak or small boat. Dungeness crab throughout.',
 'both','[{"species_id":"copper_rockfish","rating":4},{"species_id":"black_rockfish","rating":4},{"species_id":"dungeness_crab","rating":4}]',
 '["jigging","crabbing"]','any','20-100','beginner'),

('Hale Passage','hale-passage','puget_sound_central','saltwater',47.2000,-122.6200,
 'Between Fox Island and the Key Peninsula. Good coho and chinook salmon trolling. Strong current creates good feeding conditions.',
 'boat_only','[{"species_id":"coho_salmon","rating":4},{"species_id":"chinook_salmon","rating":3},{"species_id":"lingcod","rating":3}]',
 '["trolling"]','incoming','30-100','intermediate'),

('Browns Point','browns-point','puget_sound_central','saltwater',47.3070,-122.4445,
 'Northeast Tacoma. Shore-accessible crabbing off the point. Coho and pink salmon pass nearby during migrations.',
 'both','[{"species_id":"dungeness_crab","rating":3},{"species_id":"coho_salmon","rating":3},{"species_id":"pink_salmon","rating":4}]',
 '["crabbing","casting"]','incoming','10-60','beginner'),

('Tacoma Narrows South','tacoma-narrows-south','puget_sound_central','saltwater',47.2400,-122.5400,
 'The deep, fast southern portion of the Narrows. Incredible lingcod habitat in rocky bottom. Expert-only current management.',
 'boat_only','[{"species_id":"lingcod","rating":5},{"species_id":"cabezon","rating":4},{"species_id":"halibut","rating":3}]',
 '["jigging","drift_fishing"]','slack','100-400','expert'),

('Henderson Inlet','henderson-inlet','puget_sound_south','saltwater',47.0800,-122.8200,
 'South Sound inlet near Olympia. Excellent flounder and sole on the sandy bottom. Crab and clam on the tideflats.',
 'both','[{"species_id":"starry_flounder","rating":4},{"species_id":"english_sole","rating":4},{"species_id":"dungeness_crab","rating":3}]',
 '["bottom_fishing","crabbing","shellfish_harvest"]','low_tide','0-40','beginner'),

('Dana Passage','dana-passage','puget_sound_south','saltwater',47.1200,-122.9000,
 'South Sound passage between Harstine Island and the mainland. Good crab and shrimp area. Coho in season.',
 'boat_only','[{"species_id":"dungeness_crab","rating":4},{"species_id":"spot_shrimp","rating":3},{"species_id":"coho_salmon","rating":3}]',
 '["crabbing","shrimp_pots","trolling"]','any','30-100','beginner'),

-- HOOD CANAL (5 more)
('Hood Canal Floating Bridge','hc-floating-bridge','hood_canal','saltwater',47.8100,-122.9200,
 'The Hood Canal Bridge creates current breaks that concentrate baitfish and salmon. One of the most accessible hood canal salmon spots.',
 'both','[{"species_id":"coho_salmon","rating":4},{"species_id":"chinook_salmon","rating":3},{"species_id":"yellow_perch","rating":4}]',
 '["casting","trolling","jigging"]','incoming','20-80','beginner'),

('Dabob Bay','dabob-bay','hood_canal','saltwater',47.7300,-122.8500,
 'Large bay in north Hood Canal. Excellent oyster tideflats, Dungeness crabbing, and spot shrimp. Navy restricted zone nearby.',
 'boat_only','[{"species_id":"pacific_oyster","rating":5},{"species_id":"dungeness_crab","rating":5},{"species_id":"spot_shrimp","rating":4,"seasons":["spring"]}]',
 '["shellfish_harvest","crabbing","shrimp_pots"]','low_tide','0-100','beginner'),

('Seabeck Bay','seabeck-bay','hood_canal','saltwater',47.6400,-122.8300,
 'Picturesque bay with launch ramp. Good coho salmon fishing in fall. Year-round crabbing.',
 'both','[{"species_id":"coho_salmon","rating":4},{"species_id":"dungeness_crab","rating":4},{"species_id":"chum_salmon","rating":4,"seasons":["fall"]}]',
 '["trolling","crabbing"]','any','20-80','beginner'),

('Union River Hood Canal','union-river-hc','hood_canal','freshwater',47.4200,-122.9900,
 'Small river flowing into south Hood Canal. Chum salmon run every fall. Good from shore at the estuary.',
 'shore','[{"species_id":"chum_salmon","rating":5,"seasons":["fall"]},{"species_id":"coho_salmon","rating":3}]',
 '["drift_fishing","plunking"]','incoming','4-15','beginner'),

('Annas Bay','annas-bay','hood_canal','saltwater',47.3600,-123.0500,
 'Southern-most Hood Canal bay. Flounder and sole on sandy bottom. Clam digging at low tide. Very sheltered water.',
 'both','[{"species_id":"starry_flounder","rating":3},{"species_id":"manila_clam","rating":4},{"species_id":"dungeness_crab","rating":3}]',
 '["bottom_fishing","shellfish_harvest"]','low_tide','0-30','beginner'),

-- SAN JUAN ISLANDS (8 more)
('Shark Reef - Lopez Island','shark-reef-lopez','san_juan_islands','saltwater',48.4600,-123.0100,
 'Marine sanctuary. Stunning kelp forest. Rockfish, lingcod, and abundant marine life. Great for snorkeling and diving too.',
 'boat_only','[{"species_id":"lingcod","rating":5},{"species_id":"copper_rockfish","rating":5},{"species_id":"black_rockfish","rating":5}]',
 '["jigging","fly_fishing"]','slack','20-150','intermediate'),

('Spieden Island','spieden-island-sji','san_juan_islands','saltwater',48.6200,-123.0800,
 'Private island surrounded by excellent fishing. Chinook and coho trolling on the north side. Halibut in the deeper water east of the island.',
 'boat_only','[{"species_id":"chinook_salmon","rating":4},{"species_id":"coho_salmon","rating":4},{"species_id":"halibut","rating":3}]',
 '["trolling","mooching"]','any','60-200','intermediate'),

('Haro Strait','haro-strait-sji','san_juan_islands','saltwater',48.5000,-123.1700,
 'Deep international strait between San Juan Island and Vancouver Island. Major orca feeding area. Trophy chinook — whale watching regulations strictly enforced.',
 'boat_only','[{"species_id":"chinook_salmon","rating":5},{"species_id":"halibut","rating":4},{"species_id":"lingcod","rating":3}]',
 '["trolling","mooching"]','any','100-600','intermediate'),

('Boundary Pass','boundary-pass-sji','san_juan_islands','saltwater',48.7500,-123.2000,
 'International waters on the US-Canada border. Massive currents. Expert boaters only. Some of the biggest chinook in the world pass through here.',
 'boat_only','[{"species_id":"chinook_salmon","rating":5},{"species_id":"coho_salmon","rating":4}]',
 '["trolling"]','slack','100-500','expert'),

('President Channel - Orcas','president-channel','san_juan_islands','saltwater',48.5800,-123.0000,
 'Wide channel between Orcas Island and the mainland. Good coho and pink salmon trolling. Bottomfish on the rocky east sides.',
 'boat_only','[{"species_id":"coho_salmon","rating":4},{"species_id":"pink_salmon","rating":4},{"species_id":"lingcod","rating":3}]',
 '["trolling","jigging"]','incoming','40-200','intermediate'),

('East Sound - Orcas Island','east-sound-orcas','san_juan_islands','saltwater',48.6500,-122.9000,
 'Large bay on Orcas Island. Calm water, good crabbing. Coho in season. Easton Sound is the hub for Orcas Island boating.',
 'both','[{"species_id":"dungeness_crab","rating":4},{"species_id":"coho_salmon","rating":3},{"species_id":"cutthroat_trout","rating":3}]',
 '["crabbing","trolling"]','any','10-80','beginner'),

('Waldron Island','waldron-island-sji','san_juan_islands','saltwater',48.7000,-122.9800,
 'Remote, private island. Circumnavigating the island reveals excellent bottom structure. Trophy lingcod and some of the best blackmouth (resident chinook) in the islands.',
 'boat_only','[{"species_id":"chinook_salmon","rating":5},{"species_id":"lingcod","rating":5},{"species_id":"yelloweye_rockfish","rating":3}]',
 '["trolling","jigging"]','outgoing','60-300','expert'),

('MacKaye Harbor - Lopez','mackaye-harbor-lopez','san_juan_islands','saltwater',48.4200,-122.8900,
 'South Lopez Island. Clamming at the sand flats. Crabbing in the bay. Shore fishing for rockfish from the rocky points.',
 'both','[{"species_id":"manila_clam","rating":4},{"species_id":"dungeness_crab","rating":4},{"species_id":"black_rockfish","rating":3}]',
 '["shellfish_harvest","crabbing","casting"]','low_tide','0-60','beginner'),

-- STRAIT OF JUAN DE FUCA (5 more)
('Pillar Point','pillar-point-strait','strait_of_juan_de_fuca','saltwater',48.2200,-124.0300,
 'Rocky headland on the south side of the Strait. Lingcod, rockfish, and halibut in the deep water nearby. Exposed to westerly swells.',
 'boat_only','[{"species_id":"lingcod","rating":4},{"species_id":"black_rockfish","rating":4},{"species_id":"halibut","rating":3}]',
 '["jigging","bottom_fishing"]','slack','60-300','expert'),

('Freshwater Bay','freshwater-bay-strait','strait_of_juan_de_fuca','saltwater',48.1600,-123.7200,
 'Bay on the south side of the Strait west of Port Angeles. Good coho and chinook trolling in season. More sheltered than the open Strait.',
 'both','[{"species_id":"coho_salmon","rating":4},{"species_id":"chinook_salmon","rating":4},{"species_id":"halibut","rating":3}]',
 '["trolling","mooching"]','any','40-200','intermediate'),

('Dungeness Spit','dungeness-spit','strait_of_juan_de_fuca','saltwater',48.1800,-123.2000,
 'Longest natural spit in the US. Protected lagoon inside. Famous Dungeness crab habitat (and the crab is named after this location). Shore fishing at the base.',
 'shore','[{"species_id":"dungeness_crab","rating":5},{"species_id":"coho_salmon","rating":3},{"species_id":"cutthroat_trout","rating":3}]',
 '["crabbing","casting"]','incoming','0-60','beginner'),

('Protection Island','protection-island','strait_of_juan_de_fuca','saltwater',48.1250,-122.9200,
 'Ecological reserve island. Cannot land but can fish the surrounding water. Rockfish school on the rocky south end. Reserve protects nesting seabirds.',
 'boat_only','[{"species_id":"black_rockfish","rating":4},{"species_id":"lingcod","rating":4},{"species_id":"coho_salmon","rating":3}]',
 '["jigging","trolling"]','any','30-150','intermediate'),

('Discovery Bay','discovery-bay','strait_of_juan_de_fuca','saltwater',48.0000,-122.9000,
 'Large bay at the entrance to Quilcene and Port Townsend. Flounder and sole on sandy bottom. Dungeness crab in the shallows.',
 'both','[{"species_id":"starry_flounder","rating":4},{"species_id":"english_sole","rating":3},{"species_id":"dungeness_crab","rating":3}]',
 '["bottom_fishing","crabbing"]','low_tide','10-100','beginner'),

-- PACIFIC COAST (5 more)
('Ozette Lake','ozette-lake','pacific_coast','freshwater',48.1300,-124.6700,
 'Remote wilderness lake on the Olympic Peninsula near the coast. Sea-run cutthroat and steelhead enter via the Ozette River. 10-mile hike or floatplane access.',
 'both','[{"species_id":"cutthroat_trout","rating":5},{"species_id":"steelhead","rating":4},{"species_id":"coho_salmon","rating":3}]',
 '["fly_fishing","casting"]','any','0-150','expert'),

('Bogachiel River','bogachiel-river','pacific_coast','freshwater',47.8900,-124.3000,
 'Wild and scenic river in the Olympic National Park area. Winter steelhead fishery, summer run returning. Wild fish must be released in many sections.',
 'both','[{"species_id":"steelhead","rating":5},{"species_id":"coho_salmon","rating":4}]',
 '["drift_fishing","fly_fishing","side_drifting"]','outgoing','4-18','intermediate'),

('Hoh River','hoh-river','pacific_coast','freshwater',47.8600,-124.3900,
 'Glacier-fed river flowing through old-growth rainforest. Wild steelhead, coho, chinook, and chum. Permit required for some sections.',
 'both','[{"species_id":"steelhead","rating":5},{"species_id":"chinook_salmon","rating":5},{"species_id":"coho_salmon","rating":4}]',
 '["drift_fishing","fly_fishing"]','outgoing','4-20','intermediate'),

('Westport South Jetty','westport-south-jetty','pacific_coast','saltwater',46.8900,-124.1100,
 'Shore-accessible rockfish, perch, and greenling from the jetty rocks. Walk the jetty for access. During salmon season, cast plugs for chinook.',
 'shore','[{"species_id":"black_rockfish","rating":4},{"species_id":"chinook_salmon","rating":3},{"species_id":"cabezon","rating":4}]',
 '["casting","jigging"]','incoming','10-40','beginner'),

('Ocean Shores Jetty','ocean-shores-jetty','pacific_coast','saltwater',47.0000,-124.1600,
 'North jetty at the Grays Harbor entrance. Shore fishing for perch, surfperch, and rockfish. Salmon jig casting during runs.',
 'shore','[{"species_id":"black_rockfish","rating":3},{"species_id":"coho_salmon","rating":3},{"species_id":"english_sole","rating":3}]',
 '["casting"]','incoming','10-40','beginner'),

-- FRESHWATER (15 more)
('Lake Washington - Warren Ave Bridge','lk-washington-warren','lake_washington','freshwater',47.6200,-122.2200,
 'Shore-accessible bass and perch fishing under the bridge structure. Best smallmouth spot in Lake Washington accessible without a boat.',
 'shore','[{"species_id":"smallmouth_bass","rating":5},{"species_id":"yellow_perch","rating":4},{"species_id":"cutthroat_trout","rating":3}]',
 '["casting","jigging"]','any','10-40','beginner'),

('Sammamish River Trail','sammamish-river','snohomish_river','freshwater',47.6800,-122.1200,
 'Urban river trail. Coho and chinook salmon visible in fall runs — catch-and-release only in many sections. Great for beginner fly fishing.',
 'shore','[{"species_id":"coho_salmon","rating":3},{"species_id":"chinook_salmon","rating":3},{"species_id":"cutthroat_trout","rating":4}]',
 '["fly_fishing","casting"]','any','3-12','beginner'),

('Cedar River - Renton','cedar-river-renton','freshwater','freshwater',47.4800,-122.2200,
 'Urban salmon stream. Chinook salmon visible from Renton city parks in fall. Sea-run cutthroat year-round.',
 'shore','[{"species_id":"chinook_salmon","rating":4},{"species_id":"coho_salmon","rating":3},{"species_id":"cutthroat_trout","rating":4}]',
 '["drift_fishing","fly_fishing"]','any','3-15','beginner'),

('Puyallup River - Sumner','puyallup-river-sumner','freshwater','freshwater',47.2200,-122.3800,
 'Lower Puyallup River. Chinook and coho in fall. Winter steelhead. Bank access at multiple Sumner area parks.',
 'shore','[{"species_id":"chinook_salmon","rating":4},{"species_id":"coho_salmon","rating":4},{"species_id":"steelhead","rating":4}]',
 '["plunking","drift_fishing"]','any','5-20','beginner'),

('Nisqually River','nisqually-river','freshwater','freshwater',46.9000,-122.6800,
 'Clear river flowing from Rainier to Nisqually Reach. Spring chinook, coho, steelhead. Much of the lower river is in the National Wildlife Refuge.',
 'both','[{"species_id":"chinook_salmon","rating":3},{"species_id":"coho_salmon","rating":4},{"species_id":"steelhead","rating":3}]',
 '["drift_fishing","fly_fishing"]','any','4-18','intermediate'),

('Quinault Lake','quinault-lake','freshwater','freshwater',47.4500,-123.8700,
 'Deep rainforest lake on the Olympic Peninsula. Sockeye and coho salmon. Excellent wild cutthroat and rainbow trout.',
 'both','[{"species_id":"sockeye_salmon","rating":4},{"species_id":"coho_salmon","rating":3},{"species_id":"cutthroat_trout","rating":4}]',
 '["trolling","fly_fishing","casting"]','any','0-300','beginner'),

('Lake Crescent','lake-crescent','freshwater','freshwater',48.0800,-123.8000,
 'Stunning deep blue lake in Olympic National Park. The Beardslee trout (unique cutthroat subspecies) found nowhere else. No fishing license needed — NPS rules apply.',
 'both','[{"species_id":"cutthroat_trout","rating":5},{"species_id":"lake_trout","rating":4},{"species_id":"rainbow_trout","rating":3}]',
 '["trolling","fly_fishing","casting"]','any','0,600','intermediate'),

('Moses Lake','moses-lake-wa','freshwater','freshwater',47.1300,-119.3000,
 'Large eastern WA lake. Warm-water species including walleye, largemouth, smallmouth, crappie, and perch. Great family fishing destination.',
 'both','[{"species_id":"walleye","rating":4},{"species_id":"largemouth_bass","rating":4},{"species_id":"black_crappie","rating":4}]',
 '["casting","trolling","jigging"]','any','10-40','beginner'),

('Banks Lake','banks-lake','freshwater','freshwater',47.9000,-119.1000,
 'Trophy walleye lake in eastern WA. Impoundment from Grand Coulee Dam. Great for all warm-water species. Massive walleye population.',
 'both','[{"species_id":"walleye","rating":5},{"species_id":"largemouth_bass","rating":4},{"species_id":"smallmouth_bass","rating":4}]',
 '["trolling","jigging","casting"]','any','10-100','beginner'),

('Lake Roosevelt - Grand Coulee','lake-roosevelt','freshwater','freshwater',48.5000,-118.5000,
 'Long reservoir behind Grand Coulee Dam. Walleye, rainbow trout, smallmouth bass, burbot. Campgrounds along the shore. Remote and scenic.',
 'both','[{"species_id":"walleye","rating":5},{"species_id":"rainbow_trout","rating":4},{"species_id":"smallmouth_bass","rating":4}]',
 '["trolling","jigging","casting"]','any','10-400','beginner'),

('Cle Elum Lake','cle-elum-lake','freshwater','freshwater',47.2000,-121.0500,
 'Alpine reservoir in the Cascades. Rainbow trout and kokanee fishing. Popular summer destination. Kokanee trolling mid-summer.',
 'both','[{"species_id":"kokanee","rating":4},{"species_id":"rainbow_trout","rating":4}]',
 '["trolling","casting","jigging"]','any','10-150','beginner'),

('American River - Naches','american-river-naches','freshwater','freshwater',46.9500,-121.2000,
 'Clear mountain river with wild trout. Rainbow and cutthroat. Catch-and-release fly fishing section. Beautiful canyon scenery.',
 'both','[{"species_id":"rainbow_trout","rating":4},{"species_id":"cutthroat_trout","rating":4},{"species_id":"dolly_varden","rating":3}]',
 '["fly_fishing","casting"]','any','2-10','intermediate'),

('Klickitat River','klickitat-river','freshwater','freshwater',45.8200,-121.3000,
 'Wild and scenic river in south WA. Summer steelhead fishery. Coho and chinook in fall. Excellent fly fishing canyon water.',
 'both','[{"species_id":"steelhead","rating":5},{"species_id":"chinook_salmon","rating":4},{"species_id":"coho_salmon","rating":3}]',
 '["fly_fishing","drift_fishing","side_drifting"]','any','4-20','intermediate'),

('Duwamish River - Tukwila','duwamish-river','freshwater','freshwater',47.5000,-122.3200,
 'Urban river south of Seattle. King salmon (chinook) run in summer and fall. Surprising fishery in an industrial setting. Good from shore.',
 'shore','[{"species_id":"chinook_salmon","rating":4},{"species_id":"coho_salmon","rating":3},{"species_id":"cutthroat_trout","rating":3}]',
 '["plunking","drift_fishing"]','incoming','5-20','beginner'),

('Keechelus Lake','keechelus-lake','freshwater','freshwater',47.3300,-121.4000,
 'I-90 corridor lake east of Snoqualmie Pass. Rainbow and cutthroat trout. Easily accessed from Seattle for a quick fishing trip.',
 'both','[{"species_id":"rainbow_trout","rating":4},{"species_id":"cutthroat_trout","rating":3}]',
 '["trolling","casting","fly_fishing"]','any','10-100','beginner');
