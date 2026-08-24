import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeSignalForEntity } from '@/lib/trion/signal-engine'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ entityId: string }> },
) {
  const { entityId } = await params
  const url = new URL(req.url)
  const profile = url.searchParams.get('profile') ?? undefined
  const volatility = url.searchParams.get('volatility')
    ? Number(url.searchParams.get('volatility'))
    : undefined

  try {
    const signal = await computeSignalForEntity(entityId, {
      profile, volatility: volatility ?? undefined,
    })
    if (!signal) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
    }

    // Persist signal publication in the ledger
    await db.signal.create({
      data: {
        entityId: signal.entityId,
        type: signal.signalType,
        status: signal.status,
        coherence: signal.coherence,
        threshold: signal.threshold,
        margin: signal.margin,
        tValue: signal.tValue,
        moat: signal.moat.moat,
        planes: JSON.stringify({
          physical: signal.planes.physical.adjusted,
          mental: signal.planes.mental.adjusted,
          spiritual: signal.planes.spiritual.sigma,
          conscious: signal.planes.conscious.k,
          anima: signal.planes.anima.value,
        }),
        planeWeights: JSON.stringify(signal.planeWeights),
        ci95: JSON.stringify(signal.ci95),
        limitingPlane: signal.limitingPlane,
        volatility: signal.volatility,
        emitted: signal.status !== 'SILENCE',
      },
    })

    await db.entity.update({
      where: { id: signal.entityId },
      data: { coherence: signal.coherence },
    })

    return NextResponse.json(signal)
  } catch (e) {
    console.error('signal computation error:', e)
    return NextResponse.json({ error: 'Signal computation failed' }, { status: 500 })
  }
}
