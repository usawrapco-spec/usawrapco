#!/usr/bin/env node
/**
 * Generate vehicles.json from PVO Square Footage data + USA Wrap Co pricing tiers.
 *
 * Source: PVO (Paint & Vinyl Overlay) Square Footage List 2026
 * Maps every year/make/model to sqft and the appropriate pricing tier.
 *
 * Pricing tiers from WRAPSHOP_PRO_MASTER.md:
 *   Small Car    → $500 / 14 hrs / ~180-220 sqft
 *   Med Car      → $550 / 16 hrs / ~220-260 sqft
 *   Full Car     → $600 / 17 hrs / ~260-300 sqft
 *   Sm Truck     → $525 / 15 hrs / ~200-240 sqft
 *   Med Truck    → $565 / 16 hrs / ~240-280 sqft
 *   Full Truck   → $600 / 17 hrs / ~280-320 sqft
 *   Med Van      → $525 / 15 hrs / ~220-260 sqft
 *   Large Van    → $600 / 17 hrs / ~260-340 sqft
 *   XL Van       → $625 / 18 hrs / ~340-400 sqft
 */

const fs = require('fs')
const path = require('path')

// PVO-based vehicle data: year ranges, makes, models, sqft measurements
// This is the standard industry reference for wrap shops
const VEHICLE_DATABASE = [
  // ═══ CARS ═══
  // Sedans - Small
  { make: 'Honda', model: 'Civic Sedan', sqft: 195, years: [2016,2026] },
  { make: 'Honda', model: 'Civic Coupe', sqft: 180, years: [2016,2024] },
  { make: 'Honda', model: 'Civic Hatchback', sqft: 200, years: [2017,2026] },
  { make: 'Toyota', model: 'Corolla', sqft: 200, years: [2014,2026] },
  { make: 'Toyota', model: 'Corolla Hatchback', sqft: 195, years: [2019,2026] },
  { make: 'Hyundai', model: 'Elantra', sqft: 195, years: [2017,2026] },
  { make: 'Hyundai', model: 'Elantra N', sqft: 195, years: [2022,2026] },
  { make: 'Kia', model: 'Forte', sqft: 195, years: [2019,2026] },
  { make: 'Mazda', model: 'Mazda3 Sedan', sqft: 195, years: [2019,2026] },
  { make: 'Mazda', model: 'Mazda3 Hatchback', sqft: 190, years: [2019,2026] },
  { make: 'Nissan', model: 'Sentra', sqft: 200, years: [2020,2026] },
  { make: 'Nissan', model: 'Versa', sqft: 180, years: [2020,2026] },
  { make: 'Subaru', model: 'Impreza', sqft: 195, years: [2017,2026] },
  { make: 'Volkswagen', model: 'Jetta', sqft: 200, years: [2019,2026] },
  { make: 'Volkswagen', model: 'Golf', sqft: 190, years: [2015,2026] },
  { make: 'Volkswagen', model: 'Golf GTI', sqft: 190, years: [2015,2026] },
  { make: 'Chevrolet', model: 'Cruze', sqft: 195, years: [2016,2019] },
  { make: 'Chevrolet', model: 'Malibu', sqft: 225, years: [2016,2025] },

  // Sedans - Medium
  { make: 'Toyota', model: 'Camry', sqft: 230, years: [2018,2026] },
  { make: 'Honda', model: 'Accord', sqft: 235, years: [2018,2026] },
  { make: 'Hyundai', model: 'Sonata', sqft: 230, years: [2020,2026] },
  { make: 'Kia', model: 'K5', sqft: 230, years: [2021,2026] },
  { make: 'Nissan', model: 'Altima', sqft: 230, years: [2019,2026] },
  { make: 'Nissan', model: 'Maxima', sqft: 240, years: [2016,2023] },
  { make: 'Mazda', model: 'Mazda6', sqft: 235, years: [2018,2021] },
  { make: 'Subaru', model: 'Legacy', sqft: 230, years: [2020,2026] },
  { make: 'Volkswagen', model: 'Passat', sqft: 235, years: [2016,2022] },

  // Sedans - Full
  { make: 'Toyota', model: 'Avalon', sqft: 260, years: [2019,2022] },
  { make: 'Chrysler', model: '300', sqft: 275, years: [2015,2023] },
  { make: 'Dodge', model: 'Charger', sqft: 280, years: [2015,2026] },
  { make: 'Dodge', model: 'Challenger', sqft: 265, years: [2015,2026] },
  { make: 'Chevrolet', model: 'Camaro', sqft: 230, years: [2016,2024] },
  { make: 'Ford', model: 'Mustang', sqft: 225, years: [2015,2026] },
  { make: 'Ford', model: 'Mustang Mach-E', sqft: 260, years: [2021,2026] },

  // Luxury Sedans
  { make: 'BMW', model: '3 Series', sqft: 225, years: [2019,2026] },
  { make: 'BMW', model: '5 Series', sqft: 255, years: [2017,2026] },
  { make: 'BMW', model: '7 Series', sqft: 280, years: [2023,2026] },
  { make: 'Mercedes-Benz', model: 'C-Class', sqft: 225, years: [2015,2026] },
  { make: 'Mercedes-Benz', model: 'E-Class', sqft: 260, years: [2017,2026] },
  { make: 'Mercedes-Benz', model: 'S-Class', sqft: 290, years: [2021,2026] },
  { make: 'Mercedes-Benz', model: 'CLA', sqft: 210, years: [2020,2026] },
  { make: 'Audi', model: 'A3', sqft: 210, years: [2015,2026] },
  { make: 'Audi', model: 'A4', sqft: 230, years: [2017,2026] },
  { make: 'Audi', model: 'A6', sqft: 260, years: [2019,2026] },
  { make: 'Audi', model: 'A7', sqft: 265, years: [2019,2026] },
  { make: 'Lexus', model: 'IS', sqft: 220, years: [2021,2026] },
  { make: 'Lexus', model: 'ES', sqft: 240, years: [2019,2026] },
  { make: 'Lexus', model: 'LS', sqft: 280, years: [2018,2026] },
  { make: 'Genesis', model: 'G70', sqft: 225, years: [2019,2026] },
  { make: 'Genesis', model: 'G80', sqft: 260, years: [2021,2026] },
  { make: 'Genesis', model: 'G90', sqft: 285, years: [2023,2026] },
  { make: 'Infiniti', model: 'Q50', sqft: 230, years: [2014,2026] },
  { make: 'Acura', model: 'Integra', sqft: 210, years: [2023,2026] },
  { make: 'Acura', model: 'TLX', sqft: 235, years: [2021,2026] },
  { make: 'Volvo', model: 'S60', sqft: 230, years: [2019,2026] },
  { make: 'Volvo', model: 'S90', sqft: 260, years: [2017,2026] },

  // Sports / Performance
  { make: 'Porsche', model: '911', sqft: 195, years: [2020,2026] },
  { make: 'Porsche', model: '718 Cayman', sqft: 180, years: [2017,2026] },
  { make: 'Porsche', model: '718 Boxster', sqft: 180, years: [2017,2026] },
  { make: 'Chevrolet', model: 'Corvette', sqft: 210, years: [2020,2026] },
  { make: 'Nissan', model: 'Z', sqft: 200, years: [2023,2026] },
  { make: 'Toyota', model: 'GR86', sqft: 185, years: [2022,2026] },
  { make: 'Subaru', model: 'BRZ', sqft: 185, years: [2022,2026] },
  { make: 'Toyota', model: 'Supra', sqft: 195, years: [2020,2026] },

  // Electric Cars
  { make: 'Tesla', model: 'Model 3', sqft: 210, years: [2018,2026] },
  { make: 'Tesla', model: 'Model Y', sqft: 245, years: [2020,2026] },
  { make: 'Tesla', model: 'Model S', sqft: 260, years: [2016,2026] },
  { make: 'Tesla', model: 'Model X', sqft: 300, years: [2016,2026] },
  { make: 'Tesla', model: 'Cybertruck', sqft: 310, years: [2024,2026] },
  { make: 'Rivian', model: 'R1T', sqft: 300, years: [2022,2026] },
  { make: 'Rivian', model: 'R1S', sqft: 295, years: [2022,2026] },
  { make: 'Lucid', model: 'Air', sqft: 265, years: [2022,2026] },
  { make: 'Polestar', model: '2', sqft: 225, years: [2021,2026] },
  { make: 'BMW', model: 'iX', sqft: 290, years: [2022,2026] },
  { make: 'BMW', model: 'i4', sqft: 235, years: [2022,2026] },
  { make: 'Mercedes-Benz', model: 'EQS', sqft: 290, years: [2022,2026] },
  { make: 'Mercedes-Benz', model: 'EQE', sqft: 265, years: [2023,2026] },
  { make: 'Hyundai', model: 'Ioniq 5', sqft: 250, years: [2022,2026] },
  { make: 'Hyundai', model: 'Ioniq 6', sqft: 235, years: [2023,2026] },
  { make: 'Kia', model: 'EV6', sqft: 245, years: [2022,2026] },
  { make: 'Kia', model: 'EV9', sqft: 305, years: [2024,2026] },

  // ═══ SUVs ═══
  // Compact SUV (maps to Med Car / Full Car)
  { make: 'Toyota', model: 'RAV4', sqft: 250, years: [2019,2026] },
  { make: 'Honda', model: 'CR-V', sqft: 245, years: [2017,2026] },
  { make: 'Honda', model: 'HR-V', sqft: 220, years: [2023,2026] },
  { make: 'Hyundai', model: 'Tucson', sqft: 245, years: [2022,2026] },
  { make: 'Hyundai', model: 'Kona', sqft: 215, years: [2018,2026] },
  { make: 'Kia', model: 'Sportage', sqft: 245, years: [2023,2026] },
  { make: 'Kia', model: 'Seltos', sqft: 220, years: [2021,2026] },
  { make: 'Mazda', model: 'CX-5', sqft: 240, years: [2017,2026] },
  { make: 'Mazda', model: 'CX-30', sqft: 215, years: [2020,2026] },
  { make: 'Mazda', model: 'CX-50', sqft: 250, years: [2023,2026] },
  { make: 'Subaru', model: 'Forester', sqft: 240, years: [2019,2026] },
  { make: 'Subaru', model: 'Crosstrek', sqft: 225, years: [2018,2026] },
  { make: 'Subaru', model: 'Outback', sqft: 255, years: [2020,2026] },
  { make: 'Nissan', model: 'Rogue', sqft: 245, years: [2021,2026] },
  { make: 'Nissan', model: 'Kicks', sqft: 210, years: [2018,2026] },
  { make: 'Ford', model: 'Escape', sqft: 240, years: [2020,2026] },
  { make: 'Ford', model: 'Bronco Sport', sqft: 235, years: [2021,2026] },
  { make: 'Chevrolet', model: 'Equinox', sqft: 245, years: [2018,2026] },
  { make: 'Chevrolet', model: 'Trax', sqft: 210, years: [2024,2026] },
  { make: 'Jeep', model: 'Cherokee', sqft: 240, years: [2019,2023] },
  { make: 'Jeep', model: 'Compass', sqft: 230, years: [2017,2026] },
  { make: 'Jeep', model: 'Renegade', sqft: 210, years: [2015,2023] },
  { make: 'Volkswagen', model: 'Tiguan', sqft: 245, years: [2018,2026] },
  { make: 'Volkswagen', model: 'Taos', sqft: 225, years: [2022,2026] },
  { make: 'Volkswagen', model: 'ID.4', sqft: 250, years: [2021,2026] },

  // Mid-size SUV (maps to Full Car / Sm Truck)
  { make: 'Toyota', model: 'Highlander', sqft: 280, years: [2020,2026] },
  { make: 'Toyota', model: '4Runner', sqft: 285, years: [2010,2026] },
  { make: 'Toyota', model: 'Grand Highlander', sqft: 300, years: [2024,2026] },
  { make: 'Honda', model: 'Pilot', sqft: 285, years: [2023,2026] },
  { make: 'Honda', model: 'Passport', sqft: 270, years: [2019,2026] },
  { make: 'Hyundai', model: 'Palisade', sqft: 295, years: [2020,2026] },
  { make: 'Hyundai', model: 'Santa Fe', sqft: 260, years: [2021,2026] },
  { make: 'Kia', model: 'Telluride', sqft: 295, years: [2020,2026] },
  { make: 'Kia', model: 'Sorento', sqft: 265, years: [2021,2026] },
  { make: 'Ford', model: 'Explorer', sqft: 290, years: [2020,2026] },
  { make: 'Ford', model: 'Bronco', sqft: 270, years: [2021,2026] },
  { make: 'Ford', model: 'Edge', sqft: 255, years: [2015,2024] },
  { make: 'Chevrolet', model: 'Blazer', sqft: 260, years: [2019,2026] },
  { make: 'Chevrolet', model: 'Traverse', sqft: 300, years: [2018,2026] },
  { make: 'Dodge', model: 'Durango', sqft: 295, years: [2014,2026] },
  { make: 'Jeep', model: 'Grand Cherokee', sqft: 280, years: [2022,2026] },
  { make: 'Jeep', model: 'Grand Cherokee L', sqft: 305, years: [2021,2026] },
  { make: 'Jeep', model: 'Wrangler 2-Door', sqft: 220, years: [2018,2026] },
  { make: 'Jeep', model: 'Wrangler 4-Door', sqft: 260, years: [2018,2026] },
  { make: 'Nissan', model: 'Pathfinder', sqft: 285, years: [2022,2026] },
  { make: 'Nissan', model: 'Murano', sqft: 260, years: [2015,2026] },
  { make: 'Volkswagen', model: 'Atlas', sqft: 300, years: [2018,2026] },
  { make: 'Mazda', model: 'CX-90', sqft: 290, years: [2024,2026] },
  { make: 'Mazda', model: 'CX-70', sqft: 270, years: [2025,2026] },
  { make: 'Subaru', model: 'Ascent', sqft: 280, years: [2019,2026] },

  // Full-size SUV (maps to Large Van / XL Van tier)
  { make: 'Chevrolet', model: 'Tahoe', sqft: 330, years: [2021,2026] },
  { make: 'Chevrolet', model: 'Suburban', sqft: 370, years: [2021,2026] },
  { make: 'GMC', model: 'Yukon', sqft: 330, years: [2021,2026] },
  { make: 'GMC', model: 'Yukon XL', sqft: 370, years: [2021,2026] },
  { make: 'Ford', model: 'Expedition', sqft: 340, years: [2018,2026] },
  { make: 'Ford', model: 'Expedition MAX', sqft: 375, years: [2018,2026] },
  { make: 'Toyota', model: 'Sequoia', sqft: 340, years: [2023,2026] },
  { make: 'Toyota', model: 'Land Cruiser', sqft: 310, years: [2024,2026] },
  { make: 'Nissan', model: 'Armada', sqft: 330, years: [2017,2026] },
  { make: 'Jeep', model: 'Wagoneer', sqft: 340, years: [2022,2026] },
  { make: 'Jeep', model: 'Grand Wagoneer', sqft: 350, years: [2022,2026] },

  // Luxury SUV
  { make: 'Lexus', model: 'NX', sqft: 240, years: [2022,2026] },
  { make: 'Lexus', model: 'RX', sqft: 265, years: [2023,2026] },
  { make: 'Lexus', model: 'GX', sqft: 290, years: [2024,2026] },
  { make: 'Lexus', model: 'TX', sqft: 300, years: [2024,2026] },
  { make: 'Lexus', model: 'LX', sqft: 330, years: [2022,2026] },
  { make: 'BMW', model: 'X3', sqft: 245, years: [2018,2026] },
  { make: 'BMW', model: 'X5', sqft: 280, years: [2019,2026] },
  { make: 'BMW', model: 'X7', sqft: 320, years: [2019,2026] },
  { make: 'Mercedes-Benz', model: 'GLC', sqft: 245, years: [2023,2026] },
  { make: 'Mercedes-Benz', model: 'GLE', sqft: 280, years: [2020,2026] },
  { make: 'Mercedes-Benz', model: 'GLS', sqft: 320, years: [2020,2026] },
  { make: 'Mercedes-Benz', model: 'G-Class', sqft: 270, years: [2019,2026] },
  { make: 'Audi', model: 'Q3', sqft: 225, years: [2019,2026] },
  { make: 'Audi', model: 'Q5', sqft: 250, years: [2018,2026] },
  { make: 'Audi', model: 'Q7', sqft: 290, years: [2017,2026] },
  { make: 'Audi', model: 'Q8', sqft: 280, years: [2019,2026] },
  { make: 'Volvo', model: 'XC40', sqft: 225, years: [2019,2026] },
  { make: 'Volvo', model: 'XC60', sqft: 255, years: [2018,2026] },
  { make: 'Volvo', model: 'XC90', sqft: 290, years: [2016,2026] },
  { make: 'Acura', model: 'RDX', sqft: 250, years: [2019,2026] },
  { make: 'Acura', model: 'MDX', sqft: 285, years: [2022,2026] },
  { make: 'Genesis', model: 'GV70', sqft: 250, years: [2022,2026] },
  { make: 'Genesis', model: 'GV80', sqft: 285, years: [2021,2026] },
  { make: 'Infiniti', model: 'QX50', sqft: 245, years: [2019,2026] },
  { make: 'Infiniti', model: 'QX60', sqft: 280, years: [2022,2026] },
  { make: 'Infiniti', model: 'QX80', sqft: 330, years: [2018,2026] },
  { make: 'Porsche', model: 'Cayenne', sqft: 275, years: [2019,2026] },
  { make: 'Porsche', model: 'Macan', sqft: 240, years: [2019,2026] },
  { make: 'Land Rover', model: 'Range Rover', sqft: 310, years: [2022,2026] },
  { make: 'Land Rover', model: 'Range Rover Sport', sqft: 285, years: [2023,2026] },
  { make: 'Land Rover', model: 'Defender 90', sqft: 245, years: [2020,2026] },
  { make: 'Land Rover', model: 'Defender 110', sqft: 285, years: [2020,2026] },
  { make: 'Land Rover', model: 'Discovery', sqft: 290, years: [2017,2026] },
  { make: 'Lincoln', model: 'Corsair', sqft: 245, years: [2020,2026] },
  { make: 'Lincoln', model: 'Aviator', sqft: 285, years: [2020,2026] },
  { make: 'Lincoln', model: 'Navigator', sqft: 345, years: [2018,2026] },
  { make: 'Lincoln', model: 'Navigator L', sqft: 380, years: [2018,2026] },
  { make: 'Cadillac', model: 'XT4', sqft: 240, years: [2019,2026] },
  { make: 'Cadillac', model: 'XT5', sqft: 260, years: [2017,2026] },
  { make: 'Cadillac', model: 'XT6', sqft: 285, years: [2020,2026] },
  { make: 'Cadillac', model: 'Escalade', sqft: 340, years: [2021,2026] },
  { make: 'Cadillac', model: 'Escalade ESV', sqft: 380, years: [2021,2026] },

  // ═══ TRUCKS ═══
  // Mid-size Trucks
  { make: 'Toyota', model: 'Tacoma', sqft: 255, years: [2016,2026] },
  { make: 'Ford', model: 'Ranger', sqft: 250, years: [2019,2026] },
  { make: 'Chevrolet', model: 'Colorado', sqft: 255, years: [2015,2026] },
  { make: 'GMC', model: 'Canyon', sqft: 255, years: [2015,2026] },
  { make: 'Nissan', model: 'Frontier', sqft: 255, years: [2022,2026] },
  { make: 'Honda', model: 'Ridgeline', sqft: 260, years: [2017,2026] },
  { make: 'Hyundai', model: 'Santa Cruz', sqft: 235, years: [2022,2026] },
  { make: 'Ford', model: 'Maverick', sqft: 230, years: [2022,2026] },

  // Full-size Trucks
  { make: 'Ford', model: 'F-150', sqft: 290, years: [2015,2026] },
  { make: 'Ford', model: 'F-150 Lightning', sqft: 290, years: [2022,2026] },
  { make: 'Ford', model: 'F-250', sqft: 310, years: [2017,2026] },
  { make: 'Ford', model: 'F-350', sqft: 320, years: [2017,2026] },
  { make: 'Ford', model: 'F-450', sqft: 335, years: [2017,2026] },
  { make: 'Chevrolet', model: 'Silverado 1500', sqft: 290, years: [2019,2026] },
  { make: 'Chevrolet', model: 'Silverado 2500HD', sqft: 310, years: [2020,2026] },
  { make: 'Chevrolet', model: 'Silverado 3500HD', sqft: 320, years: [2020,2026] },
  { make: 'GMC', model: 'Sierra 1500', sqft: 290, years: [2019,2026] },
  { make: 'GMC', model: 'Sierra 2500HD', sqft: 310, years: [2020,2026] },
  { make: 'GMC', model: 'Sierra 3500HD', sqft: 320, years: [2020,2026] },
  { make: 'Ram', model: '1500', sqft: 290, years: [2019,2026] },
  { make: 'Ram', model: '2500', sqft: 310, years: [2019,2026] },
  { make: 'Ram', model: '3500', sqft: 320, years: [2019,2026] },
  { make: 'Toyota', model: 'Tundra', sqft: 300, years: [2022,2026] },
  { make: 'Nissan', model: 'Titan', sqft: 295, years: [2017,2026] },
  { make: 'Nissan', model: 'Titan XD', sqft: 310, years: [2017,2026] },

  // ═══ VANS ═══
  // Cargo / Commercial Vans
  { make: 'Ford', model: 'Transit 150', sqft: 310, years: [2015,2026] },
  { make: 'Ford', model: 'Transit 250', sqft: 330, years: [2015,2026] },
  { make: 'Ford', model: 'Transit 350', sqft: 350, years: [2015,2026] },
  { make: 'Ford', model: 'Transit 350 HD', sqft: 370, years: [2015,2026] },
  { make: 'Ford', model: 'Transit Connect', sqft: 240, years: [2014,2026] },
  { make: 'Ford', model: 'E-Transit', sqft: 340, years: [2022,2026] },
  { make: 'Mercedes-Benz', model: 'Sprinter 2500', sqft: 360, years: [2019,2026] },
  { make: 'Mercedes-Benz', model: 'Sprinter 3500', sqft: 380, years: [2019,2026] },
  { make: 'Mercedes-Benz', model: 'Sprinter 3500XD', sqft: 400, years: [2019,2026] },
  { make: 'Mercedes-Benz', model: 'Metris', sqft: 270, years: [2016,2023] },
  { make: 'Ram', model: 'ProMaster 1500', sqft: 320, years: [2014,2026] },
  { make: 'Ram', model: 'ProMaster 2500', sqft: 350, years: [2014,2026] },
  { make: 'Ram', model: 'ProMaster 3500', sqft: 380, years: [2014,2026] },
  { make: 'Ram', model: 'ProMaster City', sqft: 230, years: [2015,2022] },
  { make: 'Chevrolet', model: 'Express 2500', sqft: 320, years: [2003,2026] },
  { make: 'Chevrolet', model: 'Express 3500', sqft: 340, years: [2003,2026] },
  { make: 'GMC', model: 'Savana 2500', sqft: 320, years: [2003,2026] },
  { make: 'GMC', model: 'Savana 3500', sqft: 340, years: [2003,2026] },
  { make: 'Nissan', model: 'NV200', sqft: 220, years: [2013,2021] },
  { make: 'Nissan', model: 'NV1500', sqft: 300, years: [2012,2021] },
  { make: 'Nissan', model: 'NV2500', sqft: 320, years: [2012,2021] },
  { make: 'Nissan', model: 'NV3500', sqft: 340, years: [2012,2021] },

  // Minivans / Passenger Vans
  { make: 'Toyota', model: 'Sienna', sqft: 275, years: [2021,2026] },
  { make: 'Honda', model: 'Odyssey', sqft: 275, years: [2018,2026] },
  { make: 'Chrysler', model: 'Pacifica', sqft: 280, years: [2017,2026] },
  { make: 'Kia', model: 'Carnival', sqft: 285, years: [2022,2026] },

  // ═══ BOX TRUCKS ═══
  { make: 'Ford', model: 'E-350 Box', sqft: 0, years: [2010,2026] },
  { make: 'Ford', model: 'E-450 Box', sqft: 0, years: [2010,2026] },
  { make: 'Ford', model: 'F-550 Box', sqft: 0, years: [2017,2026] },
  { make: 'Ford', model: 'F-650 Box', sqft: 0, years: [2017,2026] },
  { make: 'Chevrolet', model: 'Express Cutaway', sqft: 0, years: [2003,2026] },
  { make: 'Chevrolet', model: 'Low Cab Forward 4500', sqft: 0, years: [2018,2026] },
  { make: 'Chevrolet', model: 'Low Cab Forward 5500', sqft: 0, years: [2018,2026] },
  { make: 'Freightliner', model: 'M2 106', sqft: 0, years: [2015,2026] },
  { make: 'Freightliner', model: 'MT45', sqft: 0, years: [2010,2026] },
  { make: 'Freightliner', model: 'MT55', sqft: 0, years: [2010,2026] },
  { make: 'Isuzu', model: 'NPR', sqft: 0, years: [2016,2026] },
  { make: 'Isuzu', model: 'NPR-HD', sqft: 0, years: [2016,2026] },
  { make: 'Isuzu', model: 'NRR', sqft: 0, years: [2016,2026] },
  { make: 'Isuzu', model: 'FTR', sqft: 0, years: [2018,2026] },
  { make: 'Hino', model: '155', sqft: 0, years: [2012,2026] },
  { make: 'Hino', model: '195', sqft: 0, years: [2012,2026] },
  { make: 'Hino', model: '258', sqft: 0, years: [2012,2026] },
  { make: 'International', model: 'MV', sqft: 0, years: [2018,2026] },
  { make: 'International', model: 'CV', sqft: 0, years: [2018,2026] },
]

// Pricing tier logic from master doc
function getTier(sqft, model) {
  const m = model.toLowerCase()
  // Box trucks use custom calculator (sqft=0)
  if (sqft === 0 || m.includes('box') || m.includes('cutaway') || m.includes('cab forward'))
    return { basePrice: 0, installHours: 0, tier: 'box_truck' }
  // Vans
  if (m.includes('transit') || m.includes('sprinter') || m.includes('promaster') || m.includes('express') || m.includes('savana') || m.includes('nv1500') || m.includes('nv2500') || m.includes('nv3500') || m.includes('e-transit')) {
    if (sqft >= 340) return { basePrice: 625, installHours: 18, tier: 'xl_van' }
    if (sqft >= 260) return { basePrice: 600, installHours: 17, tier: 'large_van' }
    return { basePrice: 525, installHours: 15, tier: 'med_van' }
  }
  // Trucks
  if (m.includes('f-150') || m.includes('f-250') || m.includes('f-350') || m.includes('f-450') || m.includes('silverado') || m.includes('sierra') || m.includes('ram') || m.includes('tundra') || m.includes('titan')) {
    if (sqft >= 280) return { basePrice: 600, installHours: 17, tier: 'full_truck' }
    if (sqft >= 240) return { basePrice: 565, installHours: 16, tier: 'med_truck' }
    return { basePrice: 525, installHours: 15, tier: 'sm_truck' }
  }
  // Mid-size trucks
  if (m.includes('tacoma') || m.includes('ranger') || m.includes('colorado') || m.includes('canyon') || m.includes('frontier') || m.includes('ridgeline') || m.includes('santa cruz') || m.includes('maverick'))
    return { basePrice: 525, installHours: 15, tier: 'sm_truck' }
  // SUVs and cars by sqft
  if (sqft >= 340) return { basePrice: 625, installHours: 18, tier: 'xl_van' }
  if (sqft >= 300) return { basePrice: 600, installHours: 17, tier: 'large_van' }
  if (sqft >= 260) return { basePrice: 600, installHours: 17, tier: 'full_car' }
  if (sqft >= 220) return { basePrice: 550, installHours: 16, tier: 'med_car' }
  return { basePrice: 500, installHours: 14, tier: 'small_car' }
}

// Expand year ranges into individual entries
const vehicles = []
for (const v of VEHICLE_DATABASE) {
  const [startYear, endYear] = v.years
  for (let year = startYear; year <= endYear; year++) {
    const tier = getTier(v.sqft, v.model)
    vehicles.push({
      year,
      make: v.make,
      model: v.model,
      sqft: v.sqft,
      basePrice: tier.basePrice,
      installHours: tier.installHours,
      tier: tier.tier,
    })
  }
}

// Sort by make, model, year
vehicles.sort((a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model) || a.year - b.year)

// Write output
const outPath = path.join(__dirname, '..', 'lib', 'data', 'vehicles.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(vehicles, null, 2))

console.log(`Generated ${vehicles.length} vehicle entries`)
console.log(`Unique makes: ${[...new Set(vehicles.map(v => v.make))].length}`)
console.log(`Unique models: ${[...new Set(vehicles.map(v => v.make + ' ' + v.model))].length}`)
console.log('')
console.log('First 5 rows:')
vehicles.slice(0, 5).forEach((v, i) => console.log(`  ${i+1}. ${JSON.stringify(v)}`))
console.log('')
console.log('Sample Ford F-150:')
vehicles.filter(v => v.make === 'Ford' && v.model === 'F-150').slice(0, 3).forEach(v => console.log(`  ${JSON.stringify(v)}`))
console.log('')
console.log('Sample Mercedes Sprinter:')
vehicles.filter(v => v.model.includes('Sprinter')).slice(0, 3).forEach(v => console.log(`  ${JSON.stringify(v)}`))
