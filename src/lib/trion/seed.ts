// TRION Akashic Index seeding — real protocol entities with realistic
// behavioral distributions. Deterministic (seeded PRNG) for reproducibility.

import { PrismaClient } from '@prisma/client'
import { CHAINS } from '@/lib/trion/chains'
import { computeBehavioralHash, beoIdFromAddress } from '@/lib/trion/behavioral-hash'
import { sha3_256 } from 'js-sha3'
import { EVENT_TYPES, type EventType, clamp01 } from '@/lib/trion/constants'

const db = new PrismaClient()

// Deterministic PRNG (mulberry32)
const rng = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const hex = (n: number, r: () => number) =>
  Array.from({ length: n }, () => Math.floor(r() * 256).toString(16).padStart(2, '0')).join('')

/** Real protocol archetypes with honest event distributions. */
const ENTITIES = [
  {
    label: 'Uniswap V3 Router', kind: 'PROTOCOL', address: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    archetype: 'HEALTHY_DEFI', chainIds: [1, 10, 42161, 8453, 137, 56, 43114],
    eventWeights: { SWAP: 0.52, TRANSFER: 0.20, LIQUIDITY: 0.12, FLASH_LOAN: 0.03, MEV_CAPTURE: 0.05, MINT: 0.04, BURN: 0.04 },
    bhCount: 220, depth: 18400, coherenceHint: 0.84,
  },
  {
    label: 'Aave V3 Pool', kind: 'PROTOCOL', address: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    archetype: 'HEALTHY_DEFI', chainIds: [1, 137, 43114, 10, 42161, 8453],
    eventWeights: { BORROW: 0.30, REPAY: 0.28, LIQUIDITY: 0.15, TRANSFER: 0.12, LIQUIDATE: 0.05, STAKE: 0.10 },
    bhCount: 180, depth: 15200, coherenceHint: 0.81,
  },
  {
    label: 'Lido StETH', kind: 'PROTOCOL', address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
    archetype: 'ORGANIC_GROWTH', chainIds: [1, 10, 42161],
    eventWeights: { STAKE: 0.45, TRANSFER: 0.25, MINT: 0.15, GOVERNANCE: 0.10, PROPOSAL: 0.05 },
    bhCount: 140, depth: 12800, coherenceHint: 0.79,
  },
  {
    label: 'Curve 3pool', kind: 'PROTOCOL', address: '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7',
    archetype: 'HEALTHY_DEFI', chainIds: [1, 137, 10, 42161, 56],
    eventWeights: { SWAP: 0.55, LIQUIDITY: 0.20, TRANSFER: 0.15, FLASH_LOAN: 0.05, GOVERNANCE: 0.05 },
    bhCount: 160, depth: 13100, coherenceHint: 0.77,
  },
  {
    label: 'Arbitrum Sequencer', kind: 'PROTOCOL', address: '0x0000000000000000000000000000000000000001',
    archetype: 'INFRASTRUCTURE', chainIds: [42161],
    eventWeights: { TRANSFER: 0.60, DEPLOY: 0.10, BRIDGE: 0.20, ORACLE_UPDATE: 0.10 },
    bhCount: 90, depth: 9800, coherenceHint: 0.72,
  },
  {
    label: 'Whale 0x742d (Machi Big Brother)', kind: 'WALLET', address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    archetype: 'ACCUMULATION', chainIds: [1, 42161, 10, 8453, 137],
    eventWeights: { TRANSFER: 0.40, SWAP: 0.30, GOVERNANCE: 0.10, AIRDROP: 0.05, CLAIM: 0.05, STAKE: 0.10 },
    bhCount: 120, depth: 8200, coherenceHint: 0.68,
  },
  {
    label: 'MEV Bot 0x0001', kind: 'AGENT', address: '0x0000000000007F150Bd6f54c40A34d7C3d5e9f56',
    archetype: 'BOT_SWARM', chainIds: [1, 42161, 8453],
    eventWeights: { MEV_CAPTURE: 0.50, SWAP: 0.35, FLASH_LOAN: 0.10, TRANSFER: 0.05 },
    bhCount: 200, depth: 6100, coherenceHint: 0.41,
  },
  {
    label: 'Wash Trading Cluster (detected)', kind: 'WALLET', address: '0xdead00000000000000000000000000000000c0de',
    archetype: 'WASH_TRADING', chainIds: [56, 137],
    eventWeights: { SWAP: 0.80, TRANSFER: 0.18, LIQUIDITY: 0.02 },
    bhCount: 150, depth: 2400, coherenceHint: 0.18,
  },
  {
    label: 'Ponzi Structure (Eisenberg-style)', kind: 'WALLET', address: '0x6666666666666666666666666666666666666666',
    archetype: 'PONZI_STRUCTURE', chainIds: [1, 42161],
    eventWeights: { BORROW: 0.45, FLASH_LOAN: 0.25, SWAP: 0.20, REPAY: 0.10 },
    bhCount: 80, depth: 1500, coherenceHint: 0.22,
  },
  {
    label: 'Solana Jupiter Aggregator', kind: 'PROTOCOL', address: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
    archetype: 'HEALTHY_DEFI', chainIds: [900],
    eventWeights: { SWAP: 0.65, TRANSFER: 0.20, LIQUIDITY: 0.10, GOVERNANCE: 0.05 },
    bhCount: 130, depth: 11400, coherenceHint: 0.78,
  },
  {
    label: 'Osmosis GAMM', kind: 'PROTOCOL', address: 'osmo1mw0dc6y9wzex9fz4e2g3y4a5r7p8f6a',
    archetype: 'HEALTHY_DEFI', chainIds: [4001],
    eventWeights: { SWAP: 0.50, LIQUIDITY: 0.25, STAKE: 0.15, GOVERNANCE: 0.10 },
    bhCount: 70, depth: 5600, coherenceHint: 0.70,
  },
  {
    label: 'Bitcoin Whales (BEO cluster)', kind: 'WALLET', address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    archetype: 'DORMANT_ACCUMULATION', chainIds: [21000],
    eventWeights: { TRANSFER: 0.85, STAKE: 0.05, MINT: 0.10 },
    bhCount: 60, depth: 21000, coherenceHint: 0.65,
  },
]

const VALIDATORS = [
  { name: 'Anatolia Node', region: 'TR', continent: 'Asia', stake: 420000, diversityWeight: 0.72, uptime: 0.998 },
  { name: 'Alpine Witness', region: 'CH', continent: 'Europe', stake: 380000, diversityWeight: 0.81, uptime: 0.997 },
  { name: 'Andes Consensus', region: 'AR', continent: 'South America', stake: 290000, diversityWeight: 0.66, uptime: 0.995 },
  { name: 'Great Lakes Validator', region: 'US', continent: 'North America', stake: 510000, diversityWeight: 0.59, uptime: 0.999 },
  { name: 'Sahara Observer', region: 'NG', continent: 'Africa', stake: 240000, diversityWeight: 0.88, uptime: 0.993 },
  { name: 'Kalahari Node', region: 'ZA', continent: 'Africa', stake: 210000, diversityWeight: 0.76, uptime: 0.991 },
  { name: 'Pacific Rim Witness', region: 'SG', continent: 'Asia', stake: 460000, diversityWeight: 0.63, uptime: 0.998 },
  { name: 'Nordic Truth Layer', region: 'NO', continent: 'Europe', stake: 330000, diversityWeight: 0.83, uptime: 0.996 },
  { name: 'Outback Observer', region: 'AU', continent: 'Oceania', stake: 195000, diversityWeight: 0.70, uptime: 0.994 },
  { name: 'Andes Annotator', region: 'CL', continent: 'South America', stake: 175000, diversityWeight: 0.77, uptime: 0.992 },
  { name: 'Great Plains Node', region: 'CA', continent: 'North America', stake: 275000, diversityWeight: 0.68, uptime: 0.997 },
  { name: 'Balkan Witness', region: 'GR', continent: 'Europe', stake: 160000, diversityWeight: 0.74, uptime: 0.99 },
]

const ANNOTATORS = ['elder_kemi', 'annotator_aiko', 'elder_mateo', 'conscious_lw', 'elder_fatima']

export async function seed() {
  console.log('🌿 Seeding TRION Akashic Index…')

  // 1 — Chains
  const chainCount = await db.chain.count()
  if (chainCount === 0) {
    await db.chain.createMany({
      data: CHAINS.map(c => ({
        id: c.id, name: c.name, nativeChainId: c.nativeChainId, vm: c.vm,
        category: c.category, rpcs: JSON.stringify(c.rpcs), explorer: c.explorer,
        nativeToken: c.nativeToken, finalitySec: c.finalitySec,
        avgGasUsd: c.avgGasUsd, blockTimeSec: c.blockTimeSec,
        integrated: true, status: 'ACTIVE',
        nlScore: clamp01(0.45 + (c.finalitySec < 60 ? 0.25 : 0.05) + (c.avgGasUsd < 0.5 ? 0.2 : 0.05)),
      })),
    })
    console.log(`  ✅ ${CHAINS.length} chains across 16 VM families`)
  }

  // 2 — Validators
  if (await db.validator.count() === 0) {
    await db.validator.createMany({
      data: VALIDATORS.map(v => ({ ...v, effectiveStake: v.stake * v.diversityWeight, status: 'ACTIVE' })),
    })
    console.log(`  ✅ ${VALIDATORS.length} DW-BFT validators across 6 continents`)
  }

  // 2.5 — Historical BTCP intents/routes/escrows (rich analytics on first boot)
  if (await db.btcpIntent.count() === 0) {
    const seedIntents = [
      { action: 'SWAP', assetIn: 'ETH', assetOut: 'USDC', magnitude: 10000, src: 1, dst: 8453, type: 'SINGLE_CHAIN', score: 0.813, gas: 0.05, saved: 99.5, status: 'COMPLETED', escState: 'RELEASED', ageH: 26 },
      { action: 'SWAP', assetIn: 'ETH', assetOut: 'SOL', magnitude: 25000, src: 42161, dst: 900, type: 'SPLIT', score: 0.742, gas: 0.35, saved: 97.1, status: 'COMPLETED', escState: 'RELEASED', ageH: 22 },
      { action: 'SWAP', assetIn: 'USDC', assetOut: 'ETH', magnitude: 50000, src: 8453, dst: 1, type: 'NETTING', score: 0.968, gas: 0.05, saved: 99.8, status: 'COMPLETED', escState: 'RELEASED', ageH: 18 },
      { action: 'TRANSFER', assetIn: 'USDC', assetOut: 'USDC', magnitude: 5000, src: 137, dst: 10, type: 'MULTI_HOP', score: 0.691, gas: 0.12, saved: 95.2, status: 'COMPLETED', escState: 'RELEASED', ageH: 12 },
      { action: 'SWAP', assetIn: 'BTC', assetOut: 'USDC', magnitude: 100000, src: 21000, dst: 42161, type: 'BITP', score: 0.587, gas: 0.02, saved: 99.9, status: 'COMPLETED', escState: 'RELEASED', ageH: 8 },
      { action: 'SWAP', assetIn: 'ETH', assetOut: 'USDT', magnitude: 15000, src: 1, dst: 56, type: 'SPLIT', score: 0.715, gas: 0.28, saved: 96.4, status: 'FAILED', escState: 'REVERTED', ageH: 5 },
      { action: 'SWAP', assetIn: 'SOL', assetOut: 'USDC', magnitude: 8000, src: 900, dst: 8453, type: 'DEFERRED', score: 0.763, gas: 0.08, saved: 78.0, status: 'EXECUTING', escState: 'HOLDING', ageH: 2 },
    ]
    const ents = await db.entity.findMany({ orderBy: { depth: 'desc' }, take: 7 })
    for (let i = 0; i < seedIntents.length; i++) {
      const it = seedIntents[i]
      const ent = ents[i % ents.length]
      const createdAt = new Date(Date.now() - it.ageH * 3600_000)
      const intentHash = sha3_256(`seed-intent:${i}:${ent.beoId}:${it.magnitude}`)
      const intent = await db.btcpIntent.create({
        data: {
          intentHash, entityId: ent.id, action: it.action,
          assetIn: it.assetIn, assetOut: it.assetOut, magnitude: it.magnitude,
          sourceChain: it.src, destChain: it.dst, maxGasUsd: 50,
          minNl: 0.3, deadlineMin: 60, status: it.status, routeType: it.type,
          createdAt,
        },
      })
      const routeId = sha3_256(`seed-route:${intentHash}`)
      const route = await db.btcpRoute.create({
        data: {
          routeId, intentId: intent.id, routeType: it.type,
          anchorChain: it.src, executionChain: it.dst,
          btcpScore: it.score, gasCostUsd: it.gas, gasSavedPct: it.saved,
          beoContinuity: 0.85, ccCoherence: 0.78, mfScore: 0.05,
          finalityConf: 0.88,
          status: it.status === 'COMPLETED' ? 'FINALIZED' : it.status,
          createdAt,
        },
      })
      const escrowId = sha3_256(`seed-escrow:${routeId}`).slice(0, 40)
      await db.btcpEscrow.create({
        data: {
          escrowId, routeId: route.id, amountUsd: it.magnitude,
          state: it.escState,
          lockBlock: Math.floor(createdAt.getTime() / 12000),
          timeoutBlocks: 3600,
          coherenceAtRelease: it.escState === 'RELEASED' ? 0.62 + (i % 3) * 0.08 : null,
          resolvedAt: it.escState !== 'HOLDING' ? new Date(createdAt.getTime() + 1800_000) : null,
          createdAt,
        },
      })
    }
    console.log(`  ✅ ${seedIntents.length} historical BTCP intents (routes + escrows)`)
  }

  // 3 — Entities + behavioral hashes
  const now = Date.now()
  for (const e of ENTITIES) {
    const beoId = beoIdFromAddress(e.address)
    let entity = await db.entity.findUnique({ where: { beoId } })
    if (!entity) {
      entity = await db.entity.create({
        data: {
          beoId, label: e.label, kind: e.kind, address: e.address,
          chains: JSON.stringify(e.chainIds), depth: e.depth,
          archetype: e.archetype, coherence: e.coherenceHint,
          trustTier: e.coherenceHint > 0.75 ? 'EXEMPLARY' : e.coherenceHint > 0.6 ? 'TRUSTED' : e.coherenceHint > 0.4 ? 'PROBATION' : 'UNTRUSTED',
          bhCount: e.bhCount,
          createdAt: new Date(now - 180 * 86400000),
        },
      })
    }
    const existingHashes = await db.behavioralHash.count({ where: { entityId: entity.id } })
    const existingSignals = await db.signal.count({ where: { entityId: entity.id } })
    if (existingHashes > 0 && existingSignals > 0) continue
    if (existingHashes > 0) {
      // hashes exist but signal history missing — seed only signals
      await seedSignalHistory(entity.id, e, now)
      continue
    }

    const r = rng(parseInt(beoId.slice(0, 8), 16))
    const types = Object.keys(e.eventWeights) as EventType[]
    const weights = types.map(t => e.eventWeights[t])
    const totalW = weights.reduce((a, b) => a + b, 0)

    const rows: Parameters<typeof db.behavioralHash.createMany>[0]['data'] = []
    for (let i = 0; i < e.bhCount; i++) {
      let draw = r() * totalW, eventType = types[0]
      for (let j = 0; j < types.length; j++) {
        draw -= weights[j]
        if (draw <= 0) { eventType = types[j]; break }
      }
      const chainId = e.chainIds[Math.floor(r() * e.chainIds.length)]
      const chain = CHAINS.find(c => c.id === chainId)!
      const ts = new Date(now - Math.floor(r() * 30 * 86400 * 1000))
      const magnitudeNorm = clamp01(0.1 + r() * 0.85)
      const bh = computeBehavioralHash({
        entityId: beoId, eventType, magnitudeNorm,
        context: Math.floor(r() * 4),
        timestamp: Math.floor(ts.getTime() / 1000),
        chainId, blockHash: hex(32, r),
      })
      const chainNativeBlock = Math.floor((now - ts.getTime()) / 1000 / chain.blockTimeSec)
      rows.push({
        entityId: entity.id,
        senseHex: bh.senseHex, antisenseHex: bh.antisenseHex,
        complementHex: bh.complementHex, payloadHex: bh.payloadHex,
        eventType: EVENT_TYPES.indexOf(eventType), eventTypeName: eventType,
        magnitudeNorm, chainId,
        blockNumber: Math.max(1, 2_000_000 + chainNativeBlock),
        blockHash: hex(32, r), txHash: hex(32, r),
        timestamp: ts, valid: bh.verified,
      })
    }
    await db.behavioralHash.createMany({ data: rows })

    // Conscious annotations for honest entities
    if (e.coherenceHint > 0.6) {
      await db.annotation.createMany({
        data: ANNOTATORS.slice(0, 3 + Math.floor(r() * 3)).map((a) => ({
          entityId: entity.id, annotator: a,
          kScore: clamp01(e.coherenceHint + (r() - 0.5) * 0.15),
          rationale: `${e.archetype} pattern consistent with organic behavior`,
        })),
      })
    }

    // Seed historical signal publications (24h of C(t) trajectory per entity)
    // — realistic: healthy entities mostly emit, manipulated ones SILENCE
    const signalRows: Parameters<typeof db.signal.createMany>[0]['data'] = []
    const points = 18 // ~one publication every 80 minutes
    for (let i = points; i >= 1; i--) {
      const ts = new Date(now - i * 80 * 60 * 1000)
      const vol = clamp01(0.2 + 0.35 * Math.abs(Math.sin(i * 1.7 + e.depth)))
      const theta = 0.55 + 0.37 * vol
      // coherence drifts around the hint with mild noise
      const coherence = clamp01(e.coherenceHint + (r() - 0.5) * 0.12)
      const passes = coherence >= theta
      const status = !passes ? 'SILENCE'
        : coherence - theta < 0.10 ? 'WARN' : 'NOMINAL'
      const moat = Math.log1p(0.25 * e.depth / 10_000)
      signalRows.push({
        entityId: entity.id,
        type: passes ? 'VALUATION' : 'SILENCE',
        status,
        coherence,
        threshold: theta,
        margin: coherence - theta,
        tValue: passes ? coherence * Math.exp(moat) : 0,
        moat,
        planes: JSON.stringify({
          physical: clamp01(coherence - 0.08 + r() * 0.06),
          mental: clamp01(coherence - 0.05 + r() * 0.05),
          spiritual: clamp01(coherence + 0.02 * r()),
          conscious: clamp01(coherence - 0.1 + r() * 0.08),
          anima: clamp01(coherence - 0.15 + r() * 0.1),
        }),
        planeWeights: JSON.stringify({ alpha: 0.25, beta: 0.30, gamma: 0.25, delta: 0.10, epsilon: 0.10 }),
        ci95: JSON.stringify([Math.max(0, coherence - 0.05), Math.min(1, coherence + 0.05)]),
        limitingPlane: ['anima', 'physical', 'conscious', 'mental'][i % 4],
        volatility: vol,
        emitted: passes,
        createdAt: ts,
      })
    }
    await db.signal.createMany({ data: signalRows })
    console.log(`  ✅ ${e.label}: ${e.bhCount} behavioral hashes + ${points} historical signals`)
  }

  console.log('🌱 Seed complete.')
}

/** Seed 18 historical signal publications (24h trajectory) for one entity. */
async function seedSignalHistory(
  entityId: string,
  e: { label: string; depth: number; coherenceHint: number },
  now: number,
) {
  const r = rng(parseInt(entityId.slice(0, 8), 16) || 42)
  const signalRows: Parameters<typeof db.signal.createMany>[0]['data'] = []
  const points = 18
  for (let i = points; i >= 1; i--) {
    const ts = new Date(now - i * 80 * 60 * 1000)
    const vol = clamp01(0.2 + 0.35 * Math.abs(Math.sin(i * 1.7 + e.depth)))
    const theta = 0.55 + 0.37 * vol
    const coherence = clamp01(e.coherenceHint + (r() - 0.5) * 0.12)
    const passes = coherence >= theta
    const status = !passes ? 'SILENCE'
      : coherence - theta < 0.10 ? 'WARN' : 'NOMINAL'
    const moat = Math.log1p(0.25 * e.depth / 10_000)
    signalRows.push({
      entityId,
      type: passes ? 'VALUATION' : 'SILENCE',
      status,
      coherence,
      threshold: theta,
      margin: coherence - theta,
      tValue: passes ? coherence * Math.exp(moat) : 0,
      moat,
      planes: JSON.stringify({
        physical: clamp01(coherence - 0.08 + r() * 0.06),
        mental: clamp01(coherence - 0.05 + r() * 0.05),
        spiritual: clamp01(coherence + 0.02 * r()),
        conscious: clamp01(coherence - 0.1 + r() * 0.08),
        anima: clamp01(coherence - 0.15 + r() * 0.1),
      }),
      planeWeights: JSON.stringify({ alpha: 0.25, beta: 0.30, gamma: 0.25, delta: 0.10, epsilon: 0.10 }),
      ci95: JSON.stringify([Math.max(0, coherence - 0.05), Math.min(1, coherence + 0.05)]),
      limitingPlane: ['anima', 'physical', 'conscious', 'mental'][i % 4],
      volatility: vol,
      emitted: passes,
      createdAt: ts,
    })
  }
  await db.signal.createMany({ data: signalRows })
  console.log(`  ✅ ${e.label}: ${points} historical signals`)
}

// Allow direct execution: bun run src/lib/trion/seed.ts
if (process.argv[1]?.includes('seed')) {
  seed().then(() => db.$disconnect()).catch(e => { console.error(e); db.$disconnect(); process.exit(1) })
}
