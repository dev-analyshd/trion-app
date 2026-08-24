import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CHAINS, chainCount, VM_FAMILIES, bridgePairsEliminated } from '@/lib/trion/chains'

export const dynamic = 'force-dynamic'

/** Probe a sample of live public RPCs for real chain liveness. */
async function probeChain(rpc: string, vm: string): Promise<{ online: boolean; latencyMs: number }> {
  const t0 = Date.now()
  try {
    let online = false
    if (vm === 'EVM') {
      const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
        signal: AbortSignal.timeout(6000),
      })
      const j = await res.json()
      online = typeof j?.result === 'string' && j.result.startsWith('0x')
    } else if (vm === 'SVM') {
      const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'getSlot', params: [], id: 1 }),
        signal: AbortSignal.timeout(6000),
      })
      const j = await res.json()
      online = typeof j?.result === 'number'
    } else if (vm === 'UTXO' && rpc.includes('blockstream')) {
      const res = await fetch(`${rpc}/blocks/tip/height`, { signal: AbortSignal.timeout(6000) })
      online = res.ok && !isNaN(Number(await res.text()))
    } else {
      const res = await fetch(rpc, { signal: AbortSignal.timeout(6000), headers: { 'User-Agent': 'TRION/1.0' } })
      online = res.ok || res.status === 405
    }
    return { online, latencyMs: Date.now() - t0 }
  } catch {
    return { online: false, latencyMs: Date.now() - t0 }
  }
}

export async function GET() {
  const [entityCount, bhCount, signalCount, validatorCount, escrowCount, routeCount] = await Promise.all([
    db.entity.count(),
    db.behavioralHash.count(),
    db.signal.count(),
    db.validator.count(),
    db.btcpEscrow.count(),
    db.btcpRoute.count(),
  ])

  const sample = [
    CHAINS.find(c => c.name === 'Ethereum')!,
    CHAINS.find(c => c.name === 'Solana')!,
    CHAINS.find(c => c.name === 'Bitcoin')!,
    CHAINS.find(c => c.name === 'Arbitrum One')!,
    CHAINS.find(c => c.name === 'Base')!,
    CHAINS.find(c => c.name === 'Cosmos Hub')!,
  ]
  const probes = await Promise.all(sample.map(async c => ({
    chain: c.name, vm: c.vm, ...(await probeChain(c.rpcs[0], c.vm)),
  })))

  return NextResponse.json({
    status: 'ok',
    service: 'TRION Protocol — Behavioral Truth Infrastructure',
    version: '3.0.0',
    engine: {
      masterEquation: 'T(t) = [C(t) >= Θ(t)] · S(t) · e^(M_moat)',
      coherence: 'C(t) = α·Φ_adj + β·M_adj + γ·Σ + δ·K + ε·A',
      weights: { alpha: 0.25, beta: 0.30, gamma: 0.25, delta: 0.10, epsilon: 0.10 },
      theta: { min: 0.55, max: 0.92 },
      behavioralHash: '93-byte canonical dual-strand SHA3-256 (cross-language golden vectors verified)',
    },
    akashicIndex: {
      entities: entityCount,
      behavioralHashes: bhCount,
      signals: signalCount,
      validators: validatorCount,
      btcpRoutes: routeCount,
      btcpEscrows: escrowCount,
    },
    network: {
      chains: chainCount,
      vmFamilies: VM_FAMILIES.length,
      bridgePairsEliminated: bridgePairsEliminated(chainCount),
      zeroBridgeInvariant: 'assets never leave native chains — only behavioral facts cross',
    },
    liveRpcProbes: probes,
    uptimeSec: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  })
}
