import { NextResponse } from 'next/server'

export const runtime = 'edge'

const LAUNCHES = [
  {
    id: 'wollochet-bay',
    name: 'Wollochet Bay Boat Launch',
    address: '3103 Wollochet Dr NW, Gig Harbor, WA 98335',
    lat: 47.3489,
    lng: -122.5786,
    parking_spaces: 20,
    trailer_spaces: 10,
    fee: 'Free',
    hours: 'Dawn to Dusk',
    depth_ft: 8,
    managed_by: 'Pierce County',
    phone: '(253) 798-4176',
  },
  {
    id: 'kopachuck',
    name: 'Kopachuck State Park',
    address: '11 Kopachuck Dr NW, Gig Harbor, WA 98335',
    lat: 47.3234,
    lng: -122.6234,
    parking_spaces: 40,
    trailer_spaces: 20,
    fee: 'Discover Pass',
    hours: '6:30am - Dusk',
    depth_ft: 10,
    managed_by: 'WA State Parks',
    phone: '(253) 265-3606',
  },
  {
    id: 'brown-point',
    name: 'Brown Point',
    address: 'Browns Point Blvd, Tacoma, WA 98422',
    lat: 47.3041,
    lng: -122.4486,
    parking_spaces: 15,
    trailer_spaces: 8,
    fee: 'Free',
    hours: 'Always open',
    depth_ft: 12,
    managed_by: 'Pierce County',
    phone: '',
  },
  {
    id: 'steilacoom',
    name: 'Steilacoom Boat Launch',
    address: '602 Wallace St, Steilacoom, WA 98388',
    lat: 47.1697,
    lng: -122.5928,
    parking_spaces: 50,
    trailer_spaces: 30,
    fee: '$10/day',
    hours: '5am - 10pm',
    depth_ft: 15,
    managed_by: 'Pierce County',
    phone: '(253) 798-4176',
  },
  {
    id: 'quartermaster',
    name: 'Quartermaster Harbor Launch (Burton)',
    address: '9215 SW Burton Dr, Vashon, WA 98070',
    lat: 47.3833,
    lng: -122.4583,
    parking_spaces: 25,
    trailer_spaces: 12,
    fee: 'Free',
    hours: 'Daylight hours',
    depth_ft: 6,
    managed_by: 'King County',
    phone: '(206) 296-4232',
  },
  {
    id: 'pt-defiance',
    name: 'Point Defiance Boat Launch',
    address: '5400 N Pearl St, Tacoma, WA 98407',
    lat: 47.3214,
    lng: -122.5467,
    parking_spaces: 120,
    trailer_spaces: 60,
    fee: '$8/day',
    hours: 'Dawn to Dusk',
    depth_ft: 18,
    managed_by: 'Metro Parks Tacoma',
    phone: '(253) 305-1000',
  },
  {
    id: 'joemma-beach',
    name: 'Joemma Beach State Park Launch',
    address: '290 Bay Rd KPS, Longbranch, WA 98351',
    lat: 47.1619,
    lng: -122.7275,
    parking_spaces: 30,
    trailer_spaces: 15,
    fee: 'Discover Pass',
    hours: '6:30am - 10pm',
    depth_ft: 8,
    managed_by: 'WA State Parks',
    phone: '(360) 275-0668',
  },
  {
    id: 'squalicum',
    name: 'Squalicum Harbor (Bellingham)',
    address: '722 Coho Way, Bellingham, WA 98225',
    lat: 48.7514,
    lng: -122.5025,
    parking_spaces: 200,
    trailer_spaces: 80,
    fee: '$15/day',
    hours: '24/7',
    depth_ft: 20,
    managed_by: 'Port of Bellingham',
    phone: '(360) 676-2500',
  },
]

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const region = searchParams.get('region')

  const results = region
    ? LAUNCHES.filter(l => l.managed_by.toLowerCase().includes(region.toLowerCase()))
    : LAUNCHES

  return NextResponse.json({ launches: results, count: results.length })
}
