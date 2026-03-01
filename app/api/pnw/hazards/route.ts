import { NextResponse } from 'next/server'

export const runtime = 'edge'

const HAZARDS = [
  {
    id: 'narrows-current',
    name: 'Tacoma Narrows — Strong Currents',
    hazard_type: 'current',
    lat: 47.272,
    lng: -122.549,
    description: 'Strong tidal currents up to 5 knots through the Narrows. Currents run north-south alternating with tides. Exercise extreme caution in small craft, especially on ebb tide.',
    severity: 'high',
  },
  {
    id: 'commencement-bay-shoals',
    name: 'Commencement Bay Shoals',
    hazard_type: 'shoal',
    lat: 47.285,
    lng: -122.42,
    description: 'Shallow shoal areas on the southeast end of Commencement Bay near the Puyallup River delta. Water depths as low as 3ft at MLLW. Marked by buoys.',
    severity: 'medium',
  },
  {
    id: 'gig-harbor-entrance',
    name: 'Gig Harbor Entrance — Rocks',
    hazard_type: 'rock',
    lat: 47.324,
    lng: -122.577,
    description: 'Submerged rocks at the south entrance to Gig Harbor. Stay in marked channel. Use extreme caution at low tide.',
    severity: 'high',
  },
  {
    id: 'henderson-bay-shoal',
    name: 'Henderson Bay Shoal',
    hazard_type: 'shoal',
    lat: 47.368,
    lng: -122.631,
    description: 'Large shallow area in Henderson Bay. Much of the bay is less than 6ft at MLLW. Know your draft and consult current charts before entering.',
    severity: 'medium',
  },
  {
    id: 'vashon-south-rocks',
    name: 'Vashon Island South Rocks',
    hazard_type: 'rock',
    lat: 47.273,
    lng: -122.463,
    description: 'Scattered rocky outcrops off the south end of Vashon Island. Avoid close approach during low tide.',
    severity: 'medium',
  },
  {
    id: 'brown-point-shoal',
    name: 'Browns Point Shoal',
    hazard_type: 'shoal',
    lat: 47.306,
    lng: -122.445,
    description: 'Shoal water extending south from Browns Point. Maintain distance from the point, especially in lower tidal conditions.',
    severity: 'low',
  },
  {
    id: 'kopachuck-reef',
    name: 'Kopachuck State Park Reef',
    hazard_type: 'rock',
    lat: 47.322,
    lng: -122.626,
    description: 'Submerged reef south of Kopachuck dock. Exposed at low tide. Used as a dive site by experienced divers.',
    severity: 'medium',
  },
  {
    id: 'dalco-passage-traffic',
    name: 'Dalco Passage — Ferry Traffic',
    hazard_type: 'other',
    lat: 47.255,
    lng: -122.46,
    description: 'Washington State Ferry route crosses Dalco Passage between Steilacoom and Anderson Island. Ferries have right of way — maintain clear passage.',
    severity: 'high',
  },
  {
    id: 'pt-defiance-kelp',
    name: 'Point Defiance Kelp Beds',
    hazard_type: 'other',
    lat: 47.317,
    lng: -122.551,
    description: 'Extensive kelp beds off Point Defiance can foul propellers. Use caution when anchoring or motoring near shore.',
    severity: 'low',
  },
  {
    id: 'anderson-island-north',
    name: 'Anderson Island — North Shoal',
    hazard_type: 'shoal',
    lat: 47.176,
    lng: -122.685,
    description: 'Shallow water extends north from Anderson Island. Stay in deep water channel when passing between Anderson Island and Ketron Island.',
    severity: 'medium',
  },
]

export async function GET() {
  return NextResponse.json({ hazards: HAZARDS, count: HAZARDS.length })
}
