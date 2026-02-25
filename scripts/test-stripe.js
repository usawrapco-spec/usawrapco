/**
 * Stripe Payment End-to-End Test Script
 * Run: node scripts/test-stripe.js
 *
 * Tests:
 * 1. Key validity
 * 2. Checkout session creation for test invoice
 * 3. Webhook endpoint registration
 */

require('dotenv').config({ path: '.env.local' })
const Stripe = require('stripe')

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'
const TEST_INVOICE_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  STRIPE PAYMENT TEST — USA WRAP CO')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (!STRIPE_KEY || STRIPE_KEY.includes('PLACEHOLDER')) {
    console.error('❌ STRIPE_SECRET_KEY not set in .env.local')
    process.exit(1)
  }

  console.log(`Key prefix: ${STRIPE_KEY.substring(0, 12)}...`)
  console.log(`Key length: ${STRIPE_KEY.length} chars`)
  console.log(`Mode:       ${STRIPE_KEY.startsWith('sk_test_') ? 'TEST ✅' : 'LIVE ⚠️'}\n`)

  const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2025-01-27.acacia' })

  // ── Step 1: Validate key ─────────────────────────────────────────────────
  console.log('STEP 1 — Validating API key...')
  try {
    const balance = await stripe.balance.retrieve()
    const avail = balance.available.map(b => `${b.currency.toUpperCase()}: $${(b.amount / 100).toFixed(2)}`).join(', ')
    console.log(`✅ Key valid. Balance: ${avail || '(empty — test mode)'}`)
  } catch (e) {
    console.error(`❌ Key invalid: ${e.message}`)
    process.exit(1)
  }

  // ── Step 2: Create checkout session ─────────────────────────────────────
  console.log('\nSTEP 2 — Creating Stripe checkout session...')
  let session
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: 'test@usawrapco.com',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Invoice TEST-STRIPE-001',
            description: 'Full Vehicle Wrap — Ford Transit · USA WRAP CO',
          },
          unit_amount: 9900, // $99.00
        },
        quantity: 1,
      }],
      metadata: {
        invoice_id: TEST_INVOICE_ID,
        invoice_number: 'TEST-STRIPE-001',
        org_id: 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
        customer_name: 'Test Customer',
      },
      success_url: `${APP_URL}/pay/${TEST_INVOICE_ID}?success=true`,
      cancel_url: `${APP_URL}/pay/${TEST_INVOICE_ID}?cancelled=true`,
    })
    console.log(`✅ Session created: ${session.id}`)
    console.log(`\n🔗 PAYMENT LINK (open in browser to test):\n   ${session.url}\n`)
    console.log('   Use test card: 4242 4242 4242 4242 | Exp: 12/26 | CVC: 123 | ZIP: 12345')
  } catch (e) {
    console.error(`❌ Checkout session failed: ${e.message}`)
    process.exit(1)
  }

  // ── Step 3: Register/verify webhook endpoint ─────────────────────────────
  console.log('\nSTEP 3 — Checking webhook endpoint...')
  const webhookUrl = `${APP_URL}/api/payments/webhook`
  try {
    const endpoints = await stripe.webhookEndpoints.list({ limit: 20 })
    const existing = endpoints.data.find(ep => ep.url === webhookUrl)

    if (existing) {
      console.log(`✅ Webhook already registered: ${existing.id}`)
      console.log(`   Status: ${existing.status}`)
      console.log(`   Events: ${existing.enabled_events.join(', ')}`)
      console.log(`\n⚠️  Webhook secret is shown ONCE at creation time.`)
      console.log(`   If you need it again, delete and re-create this endpoint.`)
    } else {
      console.log(`   Not found. Creating webhook for ${webhookUrl}...`)
      const webhook = await stripe.webhookEndpoints.create({
        url: webhookUrl,
        enabled_events: [
          'checkout.session.completed',
          'payment_intent.payment_failed',
        ],
        description: 'USA Wrap Co — invoice & deposit payments',
      })
      console.log(`✅ Webhook created: ${webhook.id}`)
      console.log(`\n🔑 WEBHOOK SIGNING SECRET (save this NOW):`)
      console.log(`   ${webhook.secret}`)
      console.log(`\n   Add to .env.local:  STRIPE_WEBHOOK_SECRET=${webhook.secret}`)
      console.log(`   Add to Vercel env:  STRIPE_WEBHOOK_SECRET=${webhook.secret}\n`)
    }
  } catch (e) {
    console.error(`❌ Webhook setup failed: ${e.message}`)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  TEST COMPLETE')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`\nNext: open the payment link above, use test card 4242...`)
  console.log(`Then check Supabase: SELECT * FROM payments WHERE invoice_id = '${TEST_INVOICE_ID}';`)
}

main().catch(e => { console.error(e); process.exit(1) })
