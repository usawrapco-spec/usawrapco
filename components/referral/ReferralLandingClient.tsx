'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Paintbrush, Printer, Wrench, ShieldCheck, Star, Clock, Award, Phone, Mail, MapPin, ChevronRight } from 'lucide-react'

interface ReferralLandingClientProps {
  code: string
  referrerName?: string
}

export default function ReferralLandingClient({ code, referrerName }: ReferralLandingClientProps) {
  const router = useRouter()
  const displayName = referrerName || 'a happy customer'

  // Store referral code in cookie so it survives the redirect to /onboard
  useEffect(() => {
    document.cookie = `ref_code=${code}; max-age=604800; path=/; SameSite=Lax`
  }, [code])

  const services = [
    {
      icon: Paintbrush,
      title: 'Design',
      description: 'Custom designs crafted by our in-house team. Full-color mockups on your exact vehicle before we print.',
    },
    {
      icon: Printer,
      title: 'Print',
      description: 'Large-format printing on premium 3M and Avery cast vinyl. Laminated for UV and scratch protection.',
    },
    {
      icon: Wrench,
      title: 'Install',
      description: 'Certified installers with 5+ years experience. Clean room environment, meticulous edge work.',
    },
    {
      icon: ShieldCheck,
      title: 'Quality',
      description: 'Post-install QC inspection on every vehicle. 1-year workmanship warranty on all installations.',
    },
  ]

  const trustStats = [
    { icon: Star, value: '200+', label: 'Vehicles Wrapped' },
    { icon: Clock, value: '5+', label: 'Years Experience' },
    { icon: Award, value: '100%', label: 'Satisfaction Rate' },
  ]

  const galleryPlaceholders = Array.from({ length: 6 }, (_, i) => i)

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d0f14',
      color: '#e8eaed',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(79, 127, 255, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <h1 style={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontSize: '24px',
          fontWeight: 700,
          letterSpacing: '3px',
          textTransform: 'uppercase',
          color: '#4f7fff',
          margin: 0,
        }}>
          USA WRAP CO
        </h1>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '0 20px 60px',
      }}>
        {/* Hero Section */}
        <section style={{
          textAlign: 'center',
          padding: '60px 0 40px',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(34, 192, 122, 0.12)',
            border: '1px solid rgba(34, 192, 122, 0.25)',
            borderRadius: '24px',
            padding: '8px 20px',
            marginBottom: '24px',
            fontSize: '14px',
            color: '#22c07a',
            fontWeight: 500,
          }}>
            <Star size={14} />
            Referred Customer
          </div>

          <h2 style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontSize: 'clamp(28px, 6vw, 42px)',
            fontWeight: 700,
            lineHeight: 1.2,
            margin: '0 0 16px',
            color: '#e8eaed',
          }}>
            You&apos;ve been referred by{' '}
            <span style={{ color: '#4f7fff' }}>{displayName}</span>!
          </h2>

          <p style={{
            fontSize: '17px',
            color: '#9299b5',
            lineHeight: 1.6,
            maxWidth: '560px',
            margin: '0 auto 32px',
          }}>
            Premium vehicle wraps, paint protection film, and commercial graphics.
            Your vehicle deserves the best.
          </p>

          <button
            onClick={() => router.push(`/onboard/new?ref=${code}`)}
            style={{
              background: '#4f7fff',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '16px 40px',
              fontSize: '17px',
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 600,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#3d6be6'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#4f7fff'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Get Your Free Wrap Design
            <ChevronRight size={18} />
          </button>
        </section>

        {/* Trust Signals */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          marginBottom: '48px',
        }}>
          {trustStats.map((stat) => (
            <div key={stat.label} style={{
              background: '#161920',
              border: '1px solid rgba(79, 127, 255, 0.1)',
              borderRadius: '12px',
              padding: '24px 16px',
              textAlign: 'center',
            }}>
              <stat.icon size={22} style={{ color: '#4f7fff', marginBottom: '8px' }} />
              <div style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: '28px',
                fontWeight: 700,
                color: '#e8eaed',
                marginBottom: '4px',
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: '13px',
                color: '#9299b5',
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </section>

        {/* What We Do */}
        <section style={{ marginBottom: '48px' }}>
          <h3 style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontSize: '26px',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '32px',
            color: '#e8eaed',
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}>
            What We Do
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '16px',
          }}>
            {services.map((service) => (
              <div key={service.title} style={{
                background: '#161920',
                border: '1px solid rgba(79, 127, 255, 0.1)',
                borderRadius: '12px',
                padding: '28px 20px',
                textAlign: 'center',
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(79, 127, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <service.icon size={22} style={{ color: '#4f7fff' }} />
                </div>
                <h4 style={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontSize: '18px',
                  fontWeight: 600,
                  margin: '0 0 8px',
                  color: '#e8eaed',
                }}>
                  {service.title}
                </h4>
                <p style={{
                  fontSize: '13px',
                  color: '#9299b5',
                  lineHeight: 1.5,
                  margin: 0,
                }}>
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Special Offer Banner */}
        <section style={{
          background: 'linear-gradient(135deg, rgba(79, 127, 255, 0.12), rgba(34, 192, 122, 0.08))',
          border: '1px solid rgba(79, 127, 255, 0.2)',
          borderRadius: '14px',
          padding: '32px 28px',
          textAlign: 'center',
          marginBottom: '48px',
        }}>
          <Award size={28} style={{ color: '#22c07a', marginBottom: '12px' }} />
          <h3 style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontSize: '22px',
            fontWeight: 700,
            margin: '0 0 8px',
            color: '#22c07a',
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}>
            Referred Customer Perk
          </h3>
          <p style={{
            fontSize: '16px',
            color: '#e8eaed',
            margin: '0 0 20px',
            lineHeight: 1.5,
          }}>
            Referred customers get <strong>priority scheduling</strong> and move to the front of our production queue.
          </p>
          <button
            onClick={() => router.push(`/onboard/new?ref=${code}`)}
            style={{
              background: '#22c07a',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 32px',
              fontSize: '15px',
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 600,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#1daa6c' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#22c07a' }}
          >
            Claim Your Spot
          </button>
        </section>

        {/* Gallery Placeholder */}
        <section style={{ marginBottom: '48px' }}>
          <h3 style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontSize: '26px',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '32px',
            color: '#e8eaed',
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}>
            See Our Work
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
          }}>
            {galleryPlaceholders.map((i) => (
              <div key={i} style={{
                background: '#161920',
                border: '1px solid rgba(79, 127, 255, 0.08)',
                borderRadius: '10px',
                aspectRatio: '4/3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Paintbrush size={24} style={{ color: '#5a6080' }} />
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section style={{
          textAlign: 'center',
          padding: '40px 0',
          borderTop: '1px solid rgba(79, 127, 255, 0.1)',
          marginBottom: '32px',
        }}>
          <h3 style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontSize: '28px',
            fontWeight: 700,
            margin: '0 0 12px',
            color: '#e8eaed',
          }}>
            Ready to Transform Your Vehicle?
          </h3>
          <p style={{
            fontSize: '15px',
            color: '#9299b5',
            margin: '0 0 24px',
          }}>
            Get a free quote in under 5 minutes.
          </p>
          <button
            onClick={() => router.push(`/onboard/new?ref=${code}`)}
            style={{
              background: '#4f7fff',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '16px 48px',
              fontSize: '17px',
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 600,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#3d6be6'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#4f7fff'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Get Your Free Quote
            <ChevronRight size={18} />
          </button>
        </section>

        {/* Contact Info */}
        <footer style={{
          borderTop: '1px solid rgba(79, 127, 255, 0.1)',
          paddingTop: '32px',
          textAlign: 'center',
        }}>
          <h4 style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontSize: '18px',
            fontWeight: 600,
            color: '#e8eaed',
            marginBottom: '20px',
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}>
            Contact Us
          </h4>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#9299b5' }}>
              <Phone size={16} style={{ color: '#4f7fff' }} />
              (817) 555-WRAP
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#9299b5' }}>
              <Mail size={16} style={{ color: '#4f7fff' }} />
              info@usawrapco.com
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#9299b5' }}>
              <MapPin size={16} style={{ color: '#4f7fff' }} />
              DFW Metroplex, Texas
            </div>
          </div>

          <div style={{
            marginTop: '32px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(79, 127, 255, 0.06)',
            fontSize: '12px',
            color: '#5a6080',
          }}>
            USA WRAP CO. All rights reserved.
          </div>
        </footer>
      </main>
    </div>
  )
}
