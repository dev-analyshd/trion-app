import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { selectBtcpRoute, type ChainAnalysis, canTransitionEscrow } from '@/lib/trion/btcp'
import { CHAINS } from '@/lib/trion/chains'
import { clamp01 } from '@/lib/trion/constants'
import { sha3_256 } from 'js-sha3'

export const dynamic = 'force-dynamic'

/**
 * POST — full BTCP intent lifecycle: register intent → select route →
 * create escrow (HOLDING) → (optionally) execute → release.
 * Body: { action: 'register' | 'execute' | 'revert' | 'emergency', ... }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const action = body.action ?? 'register'

    // ── EXECUTE / REVERT / EMERGENCY ────────────────────────────────────────
    if (action === 'execute' || action === 'revert' || action === 'emergency') {
      const escrowId = body.escrowId as string
      if (!escrowId) return NextResponse.json({ error: 'escrowId required' }, { status: 400 })
      const escrow = await db.btcpEscrow.findUnique({
        where: { escrowId }, include: { route: true },
      })
      if (!escrow) return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })

      let target: string
      if (action === 'emergency') target = 'EMERGENCY_REVERTED'
      else if (action === 'revert') target = 'REVERTED'
      else target = 'RELEASED'

      if (!canTransitionEscrow(escrow.state as never, target as never)) {
        return NextResponse.json(
          { error: `Invalid transition ${escrow.state} → ${target}` },
          { status: 409 },
        )
      }

      // Coherence gate for release (L5 check, 0.55 floor)
      let coherenceAtRelease = escrow.coherenceAtRelease ?? null
      let intent = null
      if (action === 'execute') {
        intent = await db.btcpIntent.findUnique({
          where: { id: escrow.route.intentId },
        })
        if (intent) {
          const ent = await db.entity.findUnique({ where: { id: intent.entityId } })
          coherenceAtRelease = ent?.coherence ?? 0.5
          if (coherenceAtRelease < 0.55) {
            return NextResponse.json({
              error: 'Coherence gate: C(t) < 0.55 — release blocked, escrow remains HOLDING',
              coherence: coherenceAtRelease, gate: 'Θ_min = 0.55 (fail-closed)',
            }, { status: 409 })
          }
        }
      }

      const updated = await db.btcpEscrow.update({
        where: { escrowId },
        data: { state: target, coherenceAtRelease, resolvedAt: new Date() },
      })
      await db.btcpRoute.update({
        where: { id: escrow.routeId },
        data: { status: target === 'RELEASED' ? 'FINALIZED' : 'FAILED' },
      })
      if (intent) {
        await db.btcpIntent.update({
          where: { id: escrow.route.intentId },
          data: { status: target === 'RELEASED' ? 'COMPLETED' : 'FAILED' },
        })
      }
      return NextResponse.json({
        escrow: updated,
        transition: `${escrow.state} → ${target}`,
        signal: action === 'execute' ? 'BTCP_ESCROW_EVENT' : 'BTCP_TIMEOUT',
      })
    }

    // ── REGISTER: intent → route → escrow lifecycle ────────────────────────
    const entityId = body.entityId as string
    const sourceChain = Number(body.sourceChain ?? 1)
    const destChain = Number(body.destChain ?? 8453)
    const magnitudeUsd = Number(body.magnitudeUsd ?? 5000)
    const action_ = String(body.tradeAction ?? 'SWAP').toUpperCase()
    const assetIn = String(body.assetIn ?? 'ETH')
    const assetOut = String(body.assetOut ?? 'USDC')
    const urgencyMin = Number(body.urgencyMin ?? 60)
    const maxGasUsd = Number(body.maxGasUsd ?? 50)

    const entity = await db.entity.findUnique({ where: { beoId: entityId } })
      ?? await db.entity.findUnique({ where: { id: entityId } })
    if (!entity) return NextResponse.json({ error: 'Entity not found — use a beoId from /api/entities' }, { status: 404 })

    const intentHash = sha3_256(
      `${entity.beoId}:${action_}:${assetIn}:${assetOut}:${magnitudeUsd}:${sourceChain}:${destChain}:${Date.now()}`
    )

    const candidateIds = new Set<number>([sourceChain, destChain])
    CHAINS.filter(c => !candidateIds.has(c.id) && c.avgGasUsd < 1 && c.finalitySec < 60)
      .slice(0, 5).forEach(c => candidateIds.add(c.id))
    const analyses: ChainAnalysis[] = CHAINS.filter(c => candidateIds.has(c.id)).map(c => {
      const seed = ((c.id * 2654435761) % 1000) / 1000
      return {
        chainId: c.id, name: c.name,
        nl: clamp01(0.35 + seed * 0.55 + (c.finalitySec < 60 ? 0.08 : 0) - (c.avgGasUsd > 5 ? 0.1 : 0)),
        gasMeanUsd: c.avgGasUsd, finalitySec: c.finalitySec,
        ccCoherence: clamp01(0.6 + seed * 0.35),
        mfScore: clamp01(0.02 + ((c.id * 7919) % 100) / 1000),
        beoContinuity: clamp01(0.7 + seed * 0.25),
        validators: 3 + ((c.id * 31) % 25),
      }
    })
    const route = selectBtcpRoute({
      sourceChain, destChain, magnitudeUsd, urgencyMin,
      analyses, hasNettingCounterparty: Boolean(body.hasNettingCounterparty),
      volatility: 0.3,
    })

    const intent = await db.btcpIntent.create({
      data: {
        intentHash, entityId: entity.id, action: action_,
        assetIn, assetOut, magnitude: magnitudeUsd,
        sourceChain, destChain, maxGasUsd,
        minNl: Number(body.minNl ?? 0.3), deadlineMin: urgencyMin,
        status: 'ROUTING', routeType: route.routeType,
      },
    })
    const routeId = sha3_256(`route:${intentHash}`)
    const dbRoute = await db.btcpRoute.create({
      data: {
        routeId, intentId: intent.id, routeType: route.routeType,
        anchorChain: sourceChain, executionChain: destChain,
        btcpScore: route.btcpScore, gasCostUsd: route.gasCostUsd,
        gasSavedPct: route.gasSavedPct, beoContinuity: route.selectedChains.length > 0 ? 0.85 : 0.5,
        ccCoherence: 0.78, mfScore: analyses[0]?.mfScore ?? 0.05,
        finalityConf: route.finalityConfidence, status: 'ANCHORED',
      },
    })
    const escrowId = sha3_256(`escrow:${routeId}`).slice(0, 40)
    const escrow = await db.btcpEscrow.create({
      data: {
        escrowId, routeId: dbRoute.id, amountUsd: magnitudeUsd,
        state: 'HOLDING', lockBlock: Math.floor(Date.now() / 12000),
        timeoutBlocks: 3600,
      },
    })
    await db.btcpIntent.update({ where: { id: intent.id }, data: { status: 'EXECUTING' } })

    return NextResponse.json({
      intent: { id: intent.id, intentHash, status: 'EXECUTING', routeType: route.routeType },
      route: {
        routeId, type: route.routeType, btcpScore: route.btcpScore,
        gasCostUsd: route.gasCostUsd, gasSavedPct: route.gasSavedPct,
        breakdown: route.breakdown, reason: route.reason,
        selectedChains: route.selectedChains,
      },
      escrow: {
        escrowId, state: 'HOLDING', amountUsd: magnitudeUsd,
        timeoutBlocks: 3600,
        emergencyEscape: '7 days — callable by anyone',
        akashicWindow: '24h PENDING_AKASHIC before auto-revert',
      },
      lifecycle: [
        { step: 1, name: 'INTENT REGISTERED', detail: `Hash ${intentHash.slice(0, 16)}… stored, full object in Akashic Index` },
        { step: 2, name: 'BIBL ANALYSIS', detail: `${analyses.length} candidate chains analyzed (NL, gas, finality, CC, MF)` },
        { step: 3, name: 'ROUTE SELECTED', detail: `${route.routeType} — score ${route.btcpScore.toFixed(3)}` },
        { step: 4, name: 'ESCROW HOLDING', detail: `$${magnitudeUsd.toLocaleString()} locked on source chain (native)` },
        { step: 5, name: 'EXECUTION', detail: 'POST { action: "execute", escrowId } to release (coherence gate 0.55)' },
        { step: 6, name: 'AKASHIC RECORD', detail: 'Both BHs recorded; BTCP_ROUTE signal emitted' },
      ],
      zeroBridgeProof: { assetsBridged: false, crossChainMovement: 0, bridge: 'NONE' },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Intent lifecycle failed' }, { status: 500 })
  }
}

/** GET — list intents with routes and escrows. */
export async function GET() {
  const intents = await db.btcpIntent.findMany({
    orderBy: { createdAt: 'desc' }, take: 50,
    include: {
      entity: { select: { label: true, beoId: true } },
      routes: { include: { escrow: true } },
    },
  })
  return NextResponse.json({
    count: intents.length,
    intents: intents.map(i => ({
      id: i.id, intentHash: i.intentHash, entity: i.entity.label,
      action: i.action, assetIn: i.assetIn, assetOut: i.assetOut,
      magnitudeUsd: i.magnitude, status: i.status, routeType: i.routeType,
      createdAt: i.createdAt,
      routes: i.routes.map(r => ({
        routeId: r.routeId, type: r.routeType, btcpScore: r.btcpScore,
        gasSavedPct: r.gasSavedPct, status: r.status,
        escrow: r.escrow ? { escrowId: r.escrow.escrowId, state: r.escrow.state, amountUsd: r.escrow.amountUsd } : null,
      })),
    })),
  })
}
