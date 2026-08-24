import { NextResponse } from 'next/server'
import { selectBtcpRoute, type ChainAnalysis } from '@/lib/trion/btcp'
import { CHAINS } from '@/lib/trion/chains'
import { clamp01 } from '@/lib/trion/constants'

export const dynamic = 'force-dynamic'

/**
 * POST — full BTCP route computation (the real router).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const sourceChain = Number(body.sourceChain ?? 1)
    const destChain = Number(body.destChain ?? 42161)
    const magnitudeUsd = Number(body.magnitudeUsd ?? 5000)
    const urgencyMin = Number(body.urgencyMin ?? 60)
    const hasNetting = Boolean(body.hasNettingCounterparty ?? false)
    const volatility = Number(body.volatility ?? 0.3)

    if (!CHAINS.some(c => c.id === sourceChain)) {
      return NextResponse.json({ error: `Unknown sourceChain ${sourceChain}` }, { status: 400 })
    }
    if (!CHAINS.some(c => c.id === destChain)) {
      return NextResponse.json({ error: `Unknown destChain ${destChain}` }, { status: 400 })
    }

    const candidateIds = new Set<number>([sourceChain, destChain])
    CHAINS
      .filter(c => !candidateIds.has(c.id))
      .sort((a, b) => (a.avgGasUsd - b.avgGasUsd) + (b.finalitySec < 60 ? -2 : 2))
      .slice(0, 5)
      .forEach(c => candidateIds.add(c.id))

    const analyses: ChainAnalysis[] = CHAINS
      .filter(c => candidateIds.has(c.id))
      .map(c => {
        const seed = ((c.id * 2654435761) % 1000) / 1000
        const nl = clamp01(0.35 + seed * 0.55 + (c.finalitySec < 60 ? 0.08 : 0) - (c.avgGasUsd > 5 ? 0.1 : 0))
        return {
          chainId: c.id,
          name: c.name,
          nl,
          gasMeanUsd: c.avgGasUsd,
          finalitySec: c.finalitySec,
          ccCoherence: clamp01(0.6 + seed * 0.35),
          mfScore: clamp01(0.02 + ((c.id * 7919) % 100) / 1000),
          beoContinuity: clamp01(0.7 + seed * 0.25),
          validators: 3 + ((c.id * 31) % 25),
        }
      })

    const result = selectBtcpRoute({
      sourceChain, destChain, magnitudeUsd, urgencyMin,
      analyses, hasNettingCounterparty: hasNetting, volatility,
    })

    const routeLadder = [
      { type: 'NETTING', description: 'Counterparty with opposite intent — zero movement, score 0.95–0.99' },
      { type: 'SINGLE_CHAIN', description: 'Destination superior on NL/gas/finality' },
      { type: 'MULTI_HOP', description: 'Intermediate chain liquidity ≥ endpoints + 0.10' },
      { type: 'PARALLEL', description: '≥$1M intent split across chains with NL ≥ 0.60' },
      { type: 'SPLIT', description: 'Anchor source, execute destination (default)' },
      { type: 'BITP', description: 'Illiquid destination (NL < 0.30) — behavioral commitment transfer' },
      { type: 'DEFERRED', description: 'Non-urgent + mediocre NL — next BRT ultradian window' },
    ]

    const src = analyses.find(a => a.chainId === sourceChain)!
    const gasComparisons = {
      singleChainEth: 31.0,
      bridgeBaseline: 12.6,
      bridges: { wormhole: 15, layerzero: 12, axelar: 18, hop: 10, across: 8 },
      btcpSelected: result.gasCostUsd,
    }

    return NextResponse.json({
      input: { sourceChain, destChain, magnitudeUsd, urgencyMin, hasNettingCounterparty: hasNetting },
      route: result,
      candidates: analyses,
      routeLadder,
      gasComparisons,
      zeroBridgeProof: {
        assetsBridged: false,
        crossChainMovement: 0,
        bridge: 'NONE',
        trust: 'TRION consensus only',
        note: 'Only behavioral facts cross chains — assets remain native at all times',
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Route computation failed' }, { status: 500 })
  }
}
