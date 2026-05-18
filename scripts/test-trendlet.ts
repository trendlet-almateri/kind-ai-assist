/**
 * scripts/test-trendlet.ts
 * Quick smoke test for the Trendlet Support API connection.
 * Run with:  npx tsx scripts/test-trendlet.ts
 *
 * Requires .env.local with:
 *   TRENDLET_API_BASE=https://trendlet.vercel.app
 *   INTERNAL_AI_TOKEN=<token>
 */

export {}

/**
 * Run with env vars pre-set:
 *   $env:TRENDLET_API_BASE="https://trendlet.vercel.app"; $env:INTERNAL_AI_TOKEN="xxx"; npx tsx scripts/test-trendlet.ts 1209
 */
const { getOrderDetails, searchOrdersByEmail, getShipmentTracking } = await import('../server/ai/trendletClient.js')

const ORDER_NUMBER = process.argv[2] ?? '1209'
const TEST_EMAIL   = process.argv[3] ?? ''

console.log('\n── Trendlet API Smoke Test ─────────────────────────────')
console.log(`Order number: ${ORDER_NUMBER}`)
console.log(`API base:     ${process.env.TRENDLET_API_BASE ?? '(not set)'}`)
console.log(`Token set:    ${process.env.INTERNAL_AI_TOKEN ? 'yes' : 'NO — check .env.local'}`)
console.log('────────────────────────────────────────────────────────\n')

// Test 1: getOrderDetails
console.log('1. getOrderDetails →')
const orderResult = await getOrderDetails(ORDER_NUMBER)
if (orderResult.found) {
  const d = orderResult as Record<string, unknown>
  const subOrders = (d.subOrders as unknown[]) ?? []
  console.log(`   ✅ found=true | orderNumber=${d.orderNumber} | subOrders=${subOrders.length}`)
  console.log(`   summary:`, JSON.stringify(d.summary ?? {}, null, 4).replace(/\n/g, '\n   '))
} else {
  console.log(`   ❌ found=false | code=${orderResult.error.code} | ${orderResult.error.message}`)
}

// Test 2: getShipmentTracking
console.log('\n2. getShipmentTracking →')
const trackResult = await getShipmentTracking(ORDER_NUMBER)
if (trackResult.found) {
  const d = trackResult as Record<string, unknown>
  const shipments = (d.shipments as unknown[]) ?? []
  console.log(`   ✅ found=true | shipments=${shipments.length}`)
} else {
  console.log(`   ❌ found=false | code=${trackResult.error.code} | ${trackResult.error.message}`)
}

// Test 3: searchOrdersByEmail (only if email arg provided)
if (TEST_EMAIL) {
  console.log(`\n3. searchOrdersByEmail (${TEST_EMAIL}) →`)
  const emailResult = await searchOrdersByEmail(TEST_EMAIL)
  if (emailResult.found) {
    const d = emailResult as Record<string, unknown>
    const orders = (d.orders as unknown[]) ?? []
    console.log(`   ✅ found=true | orders=${orders.length}`)
  } else {
    console.log(`   ❌ found=false | code=${emailResult.error.code} | ${emailResult.error.message}`)
  }
} else {
  console.log('\n3. searchOrdersByEmail → skipped (pass email as 2nd arg to test)')
}

console.log('\n────────────────────────────────────────────────────────')
console.log('Done. If all tests show ✅, the integration is working.\n')
