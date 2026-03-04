import { readFileSync } from 'fs';
import { resolve } from 'path';

const d = JSON.parse(readFileSync(resolve('lib/data/vehicle-measurements.json'), 'utf-8'));
const miss = d.filter(v => v.driver_sqft === null || v.driver_sqft === undefined);
console.log('Missing driver_sqft:', miss.length);

const hasTotal = miss.filter(v => v.total_sqft !== null && v.total_sqft !== undefined);
console.log('Of those, have total_sqft:', hasTotal.length);

// Show all missing grouped by make
const byMake = {};
for (const v of miss) {
  byMake[v.make] = (byMake[v.make] || 0) + 1;
}
console.log('\nMissing by make:');
for (const [make, count] of Object.entries(byMake).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${make}: ${count}`);
}

console.log('\nSample missing vehicles:');
miss.slice(0, 20).forEach(v => {
  console.log(`  ${v.make} ${v.model} ${v.year_range} | total=${v.total_sqft} side=${v.side_sqft} hood=${v.hood_sqft} roof=${v.roof_sqft} back=${v.back_sqft}`);
});
