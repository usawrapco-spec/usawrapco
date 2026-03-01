'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Heart, MessageCircle, ExternalLink, BookOpen } from 'lucide-react';

interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

interface Chapter {
  id: string;
  number: number;
  title: string;
  dateBadge: string;
  content: string[];
  sources: string[];
  photoCredit?: string;
}

const CHAPTERS: Chapter[] = [
  {
    id: 'puyallup',
    number: 1,
    title: 'The Puyallup People',
    dateBadge: 'Before European Contact',
    content: [
      'The Puyallup Tribe, whose name in the Lushootseed language is "spuyaləpabš," meaning "people of the generous and welcoming behavior toward all people," have lived along the shores of Puget Sound for thousands of years. Gig Harbor sat within traditional Puyallup and Nisqually territory, a region they knew intimately through generations of living, fishing, and gathering.',
      'The sheltered harbor provided rich salmon fishing grounds central to Puyallup culture and subsistence. Traditional fishing methods included weir construction across stream mouths, spearing from platforms, and sophisticated net-fishing techniques passed down through generations. The harbor served as a seasonal encampment during the critical salmon runs that sustained the community.',
      'The Puyallup referred to the area as part of their broader coastal territory of "Spuyalepabsh." It was an important gathering place where families came together during productive seasons. The tribe maintained extensive trade networks with other Coast Salish peoples throughout the Puget Sound region, exchanging goods, resources, and cultural practices.',
      'The 1854 Medicine Creek Treaty, signed by Territorial Governor Isaac Stevens and leaders of the Puyallup, Nisqually, and Squaxin Island tribes, forced the Puyallup onto a reservation in exchange for ceding approximately 2.5 million acres of their ancestral lands. The treaty guaranteed fishing rights — a provision that became the subject of legal battles for over a century, culminating in the landmark 1974 Boldt Decision affirming tribal treaty fishing rights.',
    ],
    sources: [
      'Puyallup Tribe of Indians — official tribal history (puyalluptribe.com)',
      'Medicine Creek Treaty, December 26, 1854',
      'United States v. Washington, 384 F. Supp. 312 (W.D. Wash. 1974) — the Boldt Decision',
    ],
    photoCredit: 'Historical photographs of Puyallup people and fishing practices available at the Washington State Historical Society and Harbor History Museum.',
  },
  {
    id: 'gig-naming',
    number: 2,
    title: 'The Gig Boat Naming',
    dateBadge: '1841',
    content: [
      'The United States Exploring Expedition, officially known as the Ex. Ex., was a major scientific and naval voyage led by Lieutenant Charles Wilkes of the U.S. Navy. Launched in 1838 and returning in 1842, the expedition circumnavigated the globe and conducted extensive surveys of the Pacific Ocean and its coastlines. In the spring of 1841, the expedition arrived in Puget Sound with the mission of producing the first accurate charts of these waters for American navigation.',
      'On or around May 26, 1841, a survey party from the expedition vessels USS Vincennes and USS Peacock rowed into the small, sheltered harbor aboard a ship\'s "gig" — a light, narrow rowboat traditionally used by officers for shore expeditions and reconnaissance. The party explored the harbor and recorded observations about its characteristics, noting its excellent natural protection and potential as an anchorage.',
      'When Lieutenant Charles Wilkes compiled his charts of Puget Sound, he named the inlet "Gig Harbor" — a simple and straightforward commemoration of the vessel that had been used in the survey. The Wilkes Expedition charts and reports, published between 1844 and 1874, were among the first accurate and detailed surveys of Puget Sound available to American navigators and settlers.',
      'The expedition\'s naming conventions across Puget Sound remain in use today. Wilkes gave his own name to the Wilkes Land in Antarctica and numerous geographic features across the Pacific. His Puget Sound charts helped open the region to American settlement in the decades that followed.',
    ],
    sources: [
      'Wilkes, Charles. Narrative of the United States Exploring Expedition. Philadelphia: Lea and Blanchard, 1845.',
      'Stanton, William. The Great United States Exploring Expedition of 1838–1842. Berkeley: University of California Press, 1975.',
      'Harbor History Museum, Gig Harbor — founding history collections.',
    ],
  },
  {
    id: 'settlement',
    number: 3,
    title: 'Settlement Era',
    dateBadge: '1867–1900',
    content: [
      'In 1867, Samuel Jerisich arrived from Croatia — then part of the Austro-Hungarian Empire — becoming one of the earliest European settlers to establish a presence at the harbor. Jerisich and the Croatian fishermen who followed were primarily from the Dalmatian coast, a region with a deep maritime culture and tradition of Adriatic fishing. They recognized in Gig Harbor\'s sheltered waters and abundant salmon stocks a remarkable opportunity.',
      'Over the following decades, additional Croatian families arrived, along with Norwegian, Scandinavian, and American settlers drawn by the fishing opportunities. The Rander family are credited as among the first American settler families in the area in the late 1860s. This mix of Croatian, Scandinavian, and American families gave the early settlement its distinctive multicultural character — a blend that shaped Gig Harbor\'s identity for generations.',
      'The protected harbor was ideal for fishing operations. By the 1880s, a small but growing community had established net sheds for drying and mending fishing nets, boat building and repair facilities, modest homes on the hillsides above the harbor, and basic commercial services. The Croatian community maintained strong cultural ties, establishing St. Nicholas Catholic Church and holding onto their language and traditions for generations.',
      'The economic foundation was salmon. Purse seining — a method using large nets drawn into a purse shape to encircle schools of fish — was the dominant technique, and Croatian fishermen excelled at it. By the turn of the century, Gig Harbor was becoming known as a significant fishing community within Puget Sound.',
    ],
    sources: [
      'Harbor History Museum — Croatian Heritage Collection.',
      'Gig Harbor Peninsula Historical Society records.',
      'Jerisich family history documentation, Harbor History Museum.',
    ],
    photoCredit: 'Early settlement photographs and Jerisich family records held at Harbor History Museum, 4218 Harborview Dr, Gig Harbor.',
  },
  {
    id: 'fishing-fleet',
    number: 4,
    title: 'The Fishing Fleet Era',
    dateBadge: '1880s–1950s',
    content: [
      'At its peak, Gig Harbor was home to one of the largest purse seiner fleets in Puget Sound. Croatian families dominated the industry — family names like Jerisich, Skansie, Ostlund, and Donaldson became synonymous with the harbor and its fishing heritage. Boats were built, maintained, and crewed by men who had learned their trade on the Adriatic and adapted their techniques to the productive but different waters of Puget Sound.',
      'The Skansie Brothers Boatyard, established in 1907 by brothers Matt and Peter Skansie, became the heart of the boat-building industry. The yard constructed many of the fishing vessels that worked Puget Sound waters and the Alaska fisheries. The Skansie boats were known for their quality craftsmanship. The net sheds that lined the harbor shore were a defining feature of the waterfront — long, open structures where nets were hung to dry and repaired by hand between fishing seasons.',
      'During the salmon canning era, Gig Harbor boats would load up with crew and gear in the spring and make the journey north to Alaskan canneries for the summer season. This annual migration to Alaska was a cornerstone of the local economy, with entire families involved in the enterprise. At the peak of the industry, several hundred fishermen called Gig Harbor home.',
      'The fishing industry began its long decline after World War II. Overfishing, changing salmon run dynamics, dam construction on major spawning rivers, and competition from larger, more industrialized operations combined to reduce the economic viability of the small-boat purse seining fleet. By the 1950s and 1960s, the fleet that had defined the harbor for nearly a century was a shadow of its former size.',
      'The Skansie Net Sheds on the south shore of the harbor survived and were later preserved as a historic landmark. Today they are part of Skansie Brothers Park, maintained by the City of Gig Harbor as a reminder of the fishing heritage that built the community.',
    ],
    sources: [
      'Mattson, Arthur P. Images of America: Gig Harbor. Arcadia Publishing, 2010.',
      'Harbor History Museum — Fishing Fleet Collection.',
      'Skansie Brothers Park historical interpretive materials, City of Gig Harbor.',
    ],
    photoCredit: 'Extensive fishing fleet photography and oral history recordings at Harbor History Museum (harborhistorymuseum.org). Museum open Thursday–Sunday.',
  },
  {
    id: 'galloping-gertie',
    number: 5,
    title: 'Galloping Gertie: The Tacoma Narrows Bridge',
    dateBadge: '1940',
    content: [
      'On July 1, 1940, the first Tacoma Narrows Bridge opened to traffic, connecting Gig Harbor and the Key Peninsula to Tacoma across the quarter-mile-wide Narrows strait. At the time it was completed, it was the third-longest suspension bridge in the world, with a main span of 2,800 feet. Engineers admired its slender, elegant design. However, from virtually the first day of operation, the bridge began oscillating in the wind in ways that alarmed observers.',
      'The undulating motion — a rolling, rhythmic twisting and heaving of the deck in moderate winds — quickly earned the bridge the nickname "Galloping Gertie" from local residents. Engineers debated whether the motions were structurally dangerous or merely a visual novelty. Some drivers found the ride thrilling; others found it terrifying. The bridge became a regional attraction.',
      'On the morning of November 7, 1940, a 40-mile-per-hour wind set the bridge into increasingly violent oscillations. The twisting grew more extreme over several hours. Shortly after 10:00 a.m., after just 4 months and 7 days of operation, the main span failed catastrophically and fell into the Narrows below. The only fatality was Tubby, a black cocker spaniel belonging to a newspaper reporter named Leonard Coatsworth, who had abandoned his car on the bridge and fled on foot when the motion became too severe to control the vehicle. Coatsworth attempted to go back for the dog but was unable to reach it.',
      'The collapse was captured on film by Barney Elliott of The Camera Shop in Tacoma, creating footage that has become one of the most viewed engineering failure recordings in history. The collapse fundamentally changed the field of bridge engineering, leading to new understanding of aeroelastic flutter and the importance of wind tunnel testing in bridge design.',
      'For the next 10 years — from 1940 to 1950 — Gig Harbor and the Key Peninsula were accessible from Tacoma only by ferry. The ferry service, which had existed before the bridge, resumed and served the community during this decade of isolation. Many residents credit this period of being "cut off" as reinforcing Gig Harbor\'s strong sense of independent community identity.',
      'The second Tacoma Narrows Bridge opened in October 1950 and served the community for over fifty years. A second parallel span — the tolled westbound bridge — opened on July 15, 2007, accommodating the dramatic growth of the Gig Harbor peninsula region.',
    ],
    sources: [
      'Petroski, Henry. Engineers of Dreams: Great Bridge Builders and the Spanning of America. New York: Knopf, 1995.',
      'Washington State Department of Transportation — Tacoma Narrows Bridge historical records.',
      'Scott, Richard. In the Wake of Tacoma: Suspension Bridges and the Quest for Aerodynamic Stability. ASCE Press, 2001.',
    ],
    photoCredit: 'Film footage of the 1940 collapse is in the public domain and widely available. Photographs and Narrows Bridge history at the Washington State Historical Society and tacomanarrowsbridge.com.',
  },
  {
    id: 'modern',
    number: 6,
    title: 'Modern Gig Harbor',
    dateBadge: '1950s–Present',
    content: [
      'After the second Tacoma Narrows Bridge opened in 1950, Gig Harbor gradually began a long transition from a working fishing village to a mixed residential, commercial, and tourist destination. The bridge made the peninsula accessible to Tacoma commuters, and suburban development slowly expanded outward from the historic waterfront core.',
      'Through the 1970s and 1990s, as the fishing fleet declined, galleries and boutique shops began to occupy the waterfront buildings that had once served the maritime industry. Artists were drawn by the picturesque harbor, the Victorian-era buildings, and the quiet character of the town. Gig Harbor developed a reputation as an arts community, with numerous galleries, studios, and annual arts events.',
      'Today Gig Harbor is often called the "Gateway to the Key Peninsula" and is consistently ranked among the most picturesque towns in Western Washington. The harbor remains the focal point of community life. Recreational boating has replaced commercial fishing as the primary maritime activity, with pleasure boats, kayaks, paddleboards, and tour vessels sharing the waters where purse seiners once loaded for Alaska.',
      'The Harbor History Museum, located at 4218 Harborview Dr, preserves and presents the fishing heritage with exhibits on the Croatian fishermen, traditional boat building, the Skansie boatyard, the Tacoma Narrows Bridge collapse, and Gig Harbor\'s maritime past. The museum is typically open Thursday through Sunday — check harborhistorymuseum.org for current hours and admission.',
      'Annual events celebrate both the heritage and contemporary character of the community: the Gig Harbor Film Festival, the Summer Streetfair, and Harbor Holidays draw visitors from throughout the region. The city population has grown from approximately 1,000 residents in 1950 to over 11,000 within the city limits today, with the greater Gig Harbor Peninsula area home to more than 80,000 residents.',
    ],
    sources: [
      'City of Gig Harbor — official history (cityofgigharbor.net).',
      'U.S. Census Bureau — population data.',
      'Harbor History Museum — contemporary collections.',
    ],
  },
];

const DEMO_COMMENTS: Record<string, Comment[]> = {
  puyallup: [
    {
      id: 'c1',
      author: 'HistoryBuff_PNW',
      text: 'The Boldt Decision in 1974 is such an important piece of this history. It took over 100 years from the Medicine Creek Treaty to get federal affirmation of those fishing rights.',
      timestamp: '3 days ago',
    },
  ],
  'galloping-gertie': [
    {
      id: 'c2',
      author: 'BridgeNerd',
      text: 'My grandfather was there the morning it fell. He used to describe the sound of the cables snapping. The engineering lessons from Galloping Gertie changed bridge design globally.',
      timestamp: '1 week ago',
    },
    {
      id: 'c3',
      author: 'TacomaNative',
      text: 'The film footage of the collapse is incredible. Hard to believe it was all captured on a home movie camera. Available on YouTube if you have not seen it.',
      timestamp: '5 days ago',
    },
  ],
};

function ChapterSection({ chapter }: { chapter: Chapter }) {
  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(Math.floor(Math.random() * 40) + 5);
  const [showComments, setShowComments] = useState(false);

  const comments = DEMO_COMMENTS[chapter.id] ?? [];

  function handleLike() {
    setLiked(l => {
      setLikeCount(c => l ? c - 1 : c + 1);
      return !l;
    });
  }

  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 14,
      border: '1px solid var(--surface2)',
      overflow: 'hidden',
      marginBottom: 12,
    }}>
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(e => !e)}
        onKeyDown={e => e.key === 'Enter' && setExpanded(v => !v)}
        style={{
          padding: '20px 24px',
          cursor: 'pointer',
          display: 'flex',
          gap: 16,
          alignItems: 'flex-start',
        }}
      >
        {/* Chapter number badge */}
        <div style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 15,
          fontWeight: 700,
          color: '#fff',
        }}>
          {chapter.number}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text1)',
              letterSpacing: '0.02em',
            }}>
              {chapter.title}
            </span>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 10px',
              borderRadius: 4,
              background: 'var(--accent)22',
              color: 'var(--accent)',
              border: '1px solid var(--accent)44',
              letterSpacing: '0.04em',
            }}>
              {chapter.dateBadge}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.5 }}>
            {chapter.content[0].substring(0, 120)}...
          </div>
        </div>

        <div style={{ color: 'var(--text3)', flexShrink: 0, marginTop: 6 }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '0 24px 20px' }}>
          <div style={{ borderTop: '1px solid var(--surface2)', paddingTop: 20, marginBottom: 20 }}>
            {chapter.content.map((para, i) => (
              <p key={i} style={{
                fontSize: 14,
                color: 'var(--text2)',
                lineHeight: 1.75,
                marginBottom: i < chapter.content.length - 1 ? 16 : 0,
                margin: i < chapter.content.length - 1 ? '0 0 16px 0' : '0',
              }}>
                {para}
              </p>
            ))}
          </div>

          {/* Sources */}
          <div style={{
            background: 'var(--surface2)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <BookOpen size={13} style={{ color: 'var(--text3)' }} />
              <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Sources
              </span>
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
              {chapter.sources.map((s, i) => (
                <li key={i} style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 2 }}>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Photo credit */}
          {chapter.photoCredit && (
            <div style={{
              fontSize: 12,
              color: 'var(--text3)',
              fontStyle: 'italic',
              marginBottom: 16,
              padding: '8px 0',
              borderTop: '1px solid var(--surface2)',
            }}>
              {chapter.photoCredit}
            </div>
          )}

          {/* Engagement row */}
          <div style={{ display: 'flex', gap: 12, paddingTop: 12, borderTop: '1px solid var(--surface2)' }}>
            <button
              onClick={handleLike}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 20,
                border: `1px solid ${liked ? 'var(--red)44' : 'var(--surface2)'}`,
                background: liked ? 'var(--red)18' : 'var(--surface2)',
                color: liked ? 'var(--red)' : 'var(--text3)',
                fontSize: 13,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <Heart size={14} fill={liked ? 'var(--red)' : 'none'} />
              {likeCount}
            </button>

            <button
              onClick={() => setShowComments(c => !c)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 20,
                border: '1px solid var(--surface2)',
                background: 'var(--surface2)',
                color: 'var(--text3)',
                fontSize: 13,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <MessageCircle size={14} />
              {comments.length} Comment{comments.length !== 1 ? 's' : ''}
            </button>

            <a
              href="https://harborhistorymuseum.org"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 14px',
                borderRadius: 20,
                border: '1px solid var(--cyan)33',
                background: 'var(--cyan)12',
                color: 'var(--cyan)',
                fontSize: 12,
                textDecoration: 'none',
                fontWeight: 600,
                marginLeft: 'auto',
              }}
            >
              <ExternalLink size={12} />
              Harbor History Museum
            </a>
          </div>

          {/* Comments section */}
          {showComments && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--surface2)' }}>
              {comments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
                  {comments.map(comment => (
                    <div key={comment.id} style={{
                      background: 'var(--surface2)',
                      borderRadius: 8,
                      padding: '10px 14px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{comment.author}</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{comment.timestamp}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{comment.text}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>No comments yet. Be the first to share your thoughts.</div>
              )}
              <div style={{
                background: 'var(--surface2)',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
                color: 'var(--text3)',
                textAlign: 'center',
              }}>
                Commenting requires an account. Sign in to join the conversation.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HeritageContent() {
  return (
    <div style={{ padding: '20px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--text1)',
          letterSpacing: '0.03em',
          marginBottom: 8,
        }}>
          Gig Harbor Heritage and History
        </div>
        <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.65, maxWidth: 680 }}>
          From the Puyallup people who called these shores home for thousands of years, through the Croatian fishing families who built a community, to the engineering marvel that fell into the Narrows — this is the story of Gig Harbor.
        </div>
      </div>

      {/* Museum link banner */}
      <div style={{
        background: 'var(--cyan)18',
        border: '1px solid var(--cyan)33',
        borderRadius: 10,
        padding: '12px 18px',
        marginBottom: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>
          <strong style={{ color: 'var(--text1)' }}>Harbor History Museum</strong> — 4218 Harborview Dr, Gig Harbor. Open Thursday–Sunday. Exhibits on the fishing fleet, Croatian heritage, boat building, and the Tacoma Narrows Bridge.
        </div>
        <a
          href="https://harborhistorymuseum.org"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            padding: '6px 14px',
            borderRadius: 20,
            background: 'var(--cyan)22',
            color: 'var(--cyan)',
            border: '1px solid var(--cyan)44',
            textDecoration: 'none',
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          <ExternalLink size={12} />
          harborhistorymuseum.org
        </a>
      </div>

      {/* Chapters */}
      <div>
        {CHAPTERS.map(chapter => (
          <ChapterSection key={chapter.id} chapter={chapter} />
        ))}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 20,
        padding: '16px 0',
        borderTop: '1px solid var(--surface2)',
        fontSize: 12,
        color: 'var(--text3)',
        lineHeight: 1.6,
      }}>
        Historical content compiled from published histories, official tribal records, WSDOT archives, and Harbor History Museum collections. Content is presented in good faith for educational purposes. Corrections and additions welcome — contact the Harbor History Museum.
      </div>
    </div>
  );
}
