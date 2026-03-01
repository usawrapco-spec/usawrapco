'use client';

import { useState, useEffect } from 'react';
import { MapPin, Clock, Fuel, Navigation, ChevronRight, Anchor, AlertTriangle, Info } from 'lucide-react';

type Port =
  | 'Gig Harbor'
  | 'Commencement Bay'
  | 'Olympia'
  | 'Vashon Island (Quartermaster Harbor)'
  | 'Anderson Island (Oro Bay)'
  | 'Port Orchard'
  | 'Bremerton';

const PORTS: Port[] = [
  'Gig Harbor',
  'Commencement Bay',
  'Olympia',
  'Vashon Island (Quartermaster Harbor)',
  'Anderson Island (Oro Bay)',
  'Port Orchard',
  'Bremerton',
];

// Nautical miles between ports (approximate, hardcoded)
// Symmetric matrix — distances are approximate estimates for trip planning purposes
const DISTANCES: Record<string, Record<string, number>> = {
  'Gig Harbor': {
    'Commencement Bay': 6,
    'Olympia': 40,
    'Vashon Island (Quartermaster Harbor)': 12,
    'Anderson Island (Oro Bay)': 18,
    'Port Orchard': 15,
    'Bremerton': 18,
  },
  'Commencement Bay': {
    'Gig Harbor': 6,
    'Olympia': 36,
    'Vashon Island (Quartermaster Harbor)': 14,
    'Anderson Island (Oro Bay)': 22,
    'Port Orchard': 18,
    'Bremerton': 21,
  },
  'Olympia': {
    'Gig Harbor': 40,
    'Commencement Bay': 36,
    'Vashon Island (Quartermaster Harbor)': 46,
    'Anderson Island (Oro Bay)': 28,
    'Port Orchard': 48,
    'Bremerton': 52,
  },
  'Vashon Island (Quartermaster Harbor)': {
    'Gig Harbor': 12,
    'Commencement Bay': 14,
    'Olympia': 46,
    'Anderson Island (Oro Bay)': 22,
    'Port Orchard': 14,
    'Bremerton': 18,
  },
  'Anderson Island (Oro Bay)': {
    'Gig Harbor': 18,
    'Commencement Bay': 22,
    'Olympia': 28,
    'Vashon Island (Quartermaster Harbor)': 22,
    'Port Orchard': 30,
    'Bremerton': 34,
  },
  'Port Orchard': {
    'Gig Harbor': 15,
    'Commencement Bay': 18,
    'Olympia': 48,
    'Vashon Island (Quartermaster Harbor)': 14,
    'Anderson Island (Oro Bay)': 30,
    'Bremerton': 5,
  },
  'Bremerton': {
    'Gig Harbor': 18,
    'Commencement Bay': 21,
    'Olympia': 52,
    'Vashon Island (Quartermaster Harbor)': 18,
    'Anderson Island (Oro Bay)': 34,
    'Port Orchard': 5,
  },
};

const OVERNIGHT_SPOTS: Record<string, Array<{ name: string; type: string; cost: string }>> = {
  'Gig Harbor': [
    { name: 'Arabella\'s Landing Marina', type: 'Marina', cost: '$2–3/ft/night' },
    { name: 'Gig Harbor Yacht Club (reciprocal)', type: 'Yacht Club', cost: 'Varies' },
  ],
  'Vashon Island (Quartermaster Harbor)': [
    { name: 'Quartermaster Harbor Anchorage', type: 'Free Anchorage', cost: 'Free' },
    { name: 'Burton Waterfront', type: 'Anchorage', cost: 'Free' },
  ],
  'Anderson Island (Oro Bay)': [
    { name: 'Oro Bay State Parks Buoys', type: 'Mooring Buoy', cost: '$12/night' },
  ],
  'Port Orchard': [
    { name: 'Port of Bremerton Marina (Port Orchard side)', type: 'Marina', cost: '$1.50–2/ft/night' },
    { name: 'Port Orchard Marina', type: 'Marina', cost: 'Call ahead' },
  ],
  'Bremerton': [
    { name: 'Port of Bremerton Marina', type: 'Marina', cost: '$1.50–2/ft/night' },
  ],
  'Commencement Bay': [
    { name: 'Dock Street Marina', type: 'Marina', cost: '$2–3/ft/night' },
    { name: 'Commencement Bay Anchorage', type: 'Anchorage', cost: 'Free (check regulations)' },
  ],
  'Olympia': [
    { name: 'Percival Landing (free public dock)', type: 'Public Dock', cost: 'Free short-term / $15+/night' },
    { name: 'West Bay Marina', type: 'Marina', cost: 'Call ahead' },
  ],
};

interface TripPlan {
  departDate: string;
  returnDate: string;
  homePort: Port;
  destination: Port;
  stops: Port[];
  fuelBurnGph: number;
  cruiseSpeedKnots: number;
}

interface RouteStats {
  totalNm: number;
  hoursUnderway: number;
  fuelGallons: number;
  legs: Array<{ from: Port; to: Port; nm: number; hours: number }>;
}

function getDistanceNm(from: Port, to: Port): number {
  if (from === to) return 0;
  return DISTANCES[from]?.[to] ?? DISTANCES[to]?.[from] ?? 0;
}

function buildRoute(home: Port, stops: Port[], destination: Port): Port[] {
  const all: Port[] = [home, ...stops, destination];
  // Deduplicate consecutive duplicates
  return all.filter((p, i) => i === 0 || p !== all[i - 1]);
}

function calcRouteStats(route: Port[], speedKnots: number, fuelBurnGph: number): RouteStats {
  const legs: RouteStats['legs'] = [];
  let totalNm = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const nm = getDistanceNm(route[i], route[i + 1]);
    const hours = speedKnots > 0 ? nm / speedKnots : 0;
    legs.push({ from: route[i], to: route[i + 1], nm, hours });
    totalNm += nm;
  }
  const hoursUnderway = speedKnots > 0 ? totalNm / speedKnots : 0;
  const fuelGallons = hoursUnderway * fuelBurnGph;
  return { totalNm, hoursUnderway, fuelGallons, legs };
}

function formatHours(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

function tripDays(depart: string, ret: string): number {
  if (!depart || !ret) return 0;
  const d = new Date(depart).getTime();
  const r = new Date(ret).getTime();
  return Math.max(0, Math.round((r - d) / 86400000));
}

export default function TripPlannerTool() {
  const [plan, setPlan] = useState<TripPlan>({
    departDate: '',
    returnDate: '',
    homePort: 'Gig Harbor',
    destination: 'Vashon Island (Quartermaster Harbor)',
    stops: [],
    fuelBurnGph: 5,
    cruiseSpeedKnots: 10,
  });

  const [weather, setWeather] = useState<{ temp?: number; description?: string } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  useEffect(() => {
    if (!plan.departDate) return;
    setWeatherLoading(true);
    fetch('/api/pnw/weather')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setWeather(data);
      })
      .catch(() => null)
      .finally(() => setWeatherLoading(false));
  }, [plan.departDate]);

  function update<K extends keyof TripPlan>(key: K, value: TripPlan[K]) {
    setPlan(prev => ({ ...prev, [key]: value }));
  }

  const route = buildRoute(plan.homePort, plan.stops, plan.destination);
  const stats = calcRouteStats(route, plan.cruiseSpeedKnots, plan.fuelBurnGph);
  const days = tripDays(plan.departDate, plan.returnDate);
  const overnightPorts = route.slice(1, -1); // intermediate ports

  const availableStops = PORTS.filter(p => p !== plan.homePort && p !== plan.destination);

  function toggleStop(port: Port) {
    setPlan(prev => ({
      ...prev,
      stops: prev.stops.includes(port)
        ? prev.stops.filter(s => s !== port)
        : [...prev.stops, port],
    }));
  }

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{
        background: 'var(--surface)',
        borderRadius: 14,
        padding: '24px',
        marginBottom: 20,
      }}>
        {/* Trip dates */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--text2)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            Trip Dates
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { label: 'Departure Date', key: 'departDate' as const },
              { label: 'Return Date', key: 'returnDate' as const },
            ].map(({ label, key }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginBottom: 6, fontWeight: 600 }}>
                  {label}
                </label>
                <input
                  type="date"
                  value={plan[key] as string}
                  onChange={e => update(key, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--surface2)',
                    background: 'var(--surface2)',
                    color: 'var(--text1)',
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}
          </div>
          {days > 0 && (
            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--accent)' }}>
              {days}-day trip
            </div>
          )}
        </div>

        {/* Route planner */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--text2)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            Route
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginBottom: 6, fontWeight: 600 }}>
                Home Port
              </label>
              <select
                value={plan.homePort}
                onChange={e => update('homePort', e.target.value as Port)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--surface2)',
                  background: 'var(--surface2)',
                  color: 'var(--text1)',
                  fontSize: 14,
                }}
              >
                {PORTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginBottom: 6, fontWeight: 600 }}>
                Destination
              </label>
              <select
                value={plan.destination}
                onChange={e => update('destination', e.target.value as Port)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--surface2)',
                  background: 'var(--surface2)',
                  color: 'var(--text1)',
                  fontSize: 14,
                }}
              >
                {PORTS.filter(p => p !== plan.homePort).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {availableStops.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, marginBottom: 8 }}>
                Intermediate Stops (optional)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {availableStops.map(port => {
                  const active = plan.stops.includes(port);
                  return (
                    <button
                      key={port}
                      onClick={() => toggleStop(port)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 20,
                        border: `1px solid ${active ? 'var(--accent)' : 'var(--surface2)'}`,
                        background: active ? 'var(--accent)22' : 'var(--surface2)',
                        color: active ? 'var(--accent)' : 'var(--text3)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {port}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Vessel settings */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--text2)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            Vessel Settings
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginBottom: 6, fontWeight: 600 }}>
                Cruise Speed (knots)
              </label>
              <input
                type="number"
                min={1}
                max={40}
                value={plan.cruiseSpeedKnots}
                onChange={e => update('cruiseSpeedKnots', Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--surface2)',
                  background: 'var(--surface2)',
                  color: 'var(--text1)',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginBottom: 6, fontWeight: 600 }}>
                Fuel Burn (gal/hr at cruise)
              </label>
              <input
                type="number"
                min={0.5}
                max={100}
                step={0.5}
                value={plan.fuelBurnGph}
                onChange={e => update('fuelBurnGph', Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--surface2)',
                  background: 'var(--surface2)',
                  color: 'var(--text1)',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Route visual */}
      <div style={{
        background: 'var(--surface)',
        borderRadius: 14,
        padding: '20px 24px',
        marginBottom: 20,
      }}>
        <div style={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--text2)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}>
          Route Legs
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {stats.legs.map((leg, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flex: 1,
                background: 'var(--surface2)',
                borderRadius: 8,
                padding: '10px 14px',
              }}>
                <MapPin size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--text1)', flex: 1 }}>{leg.from}</span>
                <ChevronRight size={14} style={{ color: 'var(--text3)' }} />
                <MapPin size={14} style={{ color: i === stats.legs.length - 1 ? 'var(--green)' : 'var(--amber)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--text1)', flex: 1 }}>{leg.to}</span>
              </div>
              <div style={{ textAlign: 'right', minWidth: 80, flexShrink: 0 }}>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14, color: 'var(--accent)', fontWeight: 700 }}>
                  {leg.nm} nm
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{formatHours(leg.hours)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 12,
        marginBottom: 20,
      }}>
        {[
          {
            icon: Navigation,
            label: 'Total Distance',
            value: `${stats.totalNm} nm`,
            color: 'var(--accent)',
          },
          {
            icon: Clock,
            label: 'Est. Underway',
            value: formatHours(stats.hoursUnderway),
            color: 'var(--cyan)',
          },
          {
            icon: Fuel,
            label: 'Fuel Estimate',
            value: `${Math.ceil(stats.fuelGallons)} gal`,
            color: 'var(--amber)',
          },
          ...(days > 0 ? [{
            icon: Anchor,
            label: 'Trip Length',
            value: `${days} days`,
            color: 'var(--green)',
          }] : []),
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} style={{
              background: 'var(--surface)',
              borderRadius: 12,
              padding: '16px',
              textAlign: 'center',
              border: `1px solid ${stat.color}33`,
            }}>
              <Icon size={20} style={{ color: stat.color, margin: '0 auto 8px' }} />
              <div style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 22,
                fontWeight: 700,
                color: stat.color,
                marginBottom: 4,
              }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overnight stops */}
      {overnightPorts.length > 0 && (
        <div style={{
          background: 'var(--surface)',
          borderRadius: 14,
          padding: '20px 24px',
          marginBottom: 20,
        }}>
          <div style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--text2)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            Overnight Stop Options
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {overnightPorts.map(port => {
              const options = OVERNIGHT_SPOTS[port] ?? [];
              return (
                <div key={port} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 10 }}>
                    {port}
                  </div>
                  {options.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {options.map((opt, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: 13, color: 'var(--text1)' }}>{opt.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{opt.type}</div>
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--cyan)', fontWeight: 700 }}>{opt.cost}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--text3)' }}>Check local marinas and anchorage guides for options.</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weather preview */}
      <div style={{
        background: 'var(--surface)',
        borderRadius: 14,
        padding: '20px 24px',
        marginBottom: 20,
      }}>
        <div style={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--text2)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}>
          Weather Preview
        </div>
        {!plan.departDate ? (
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>Select a departure date to see current conditions.</div>
        ) : weatherLoading ? (
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>Loading weather data...</div>
        ) : weather ? (
          <div style={{ display: 'flex', gap: 20 }}>
            {weather.temp !== undefined && (
              <div>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 28, color: 'var(--cyan)', fontWeight: 700 }}>
                  {weather.temp}F
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Temperature</div>
              </div>
            )}
            {weather.description && (
              <div style={{ fontSize: 14, color: 'var(--text2)', alignSelf: 'center' }}>{weather.description}</div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>Current weather data unavailable. Check the Weather tab for live conditions.</div>
        )}
        <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertTriangle size={13} style={{ color: 'var(--amber)', flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            Always file a float plan and check NOAA marine forecast at{' '}
            <a href="https://marine.weather.gov" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
              marine.weather.gov
            </a>{' '}
            before departing.
          </div>
        </div>
      </div>

      <div style={{
        background: 'var(--surface)',
        borderRadius: 10,
        padding: '14px 18px',
        display: 'flex',
        gap: 10,
      }}>
        <Info size={14} style={{ color: 'var(--text3)', flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
          Distances are approximate estimates for trip planning. Actual travel time depends on sea conditions, wind, current, and your vessel. Fuel estimates assume steady cruise speed and do not account for rough water, idle time, or auxiliary loads.
        </div>
      </div>
    </div>
  );
}
