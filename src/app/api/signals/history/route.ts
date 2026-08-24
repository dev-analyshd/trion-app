import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET — signal publication history for sparklines + SILENCE log.
 * Query params: entityId (beoId), limit (default 100)
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const beoId = url.searchParams.get('entityId')
  const limit = Math.min(500, Number(url.searchParams.get('limit') ?? 100))

  const entity = beoId
    ? await db.entity.findUnique({ where: { beoId } })
    : null

  const signals = await db.signal.findMany({
    where: entity ? { entityId: entity.id } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { entity: { select: { label: true, beoId: true } } },
  })

  const silenceCount = signals.filter(s => s.status === 'SILENCE').length
  const emittedCount = signals.filter(s => s.emitted).length

  return NextResponse.json({
    total: signals.length,
    emitted: emittedCount,
    silenced: silenceCount,
    silenceRate: signals.length > 0 ? silenceCount / signals.length : 0,
    signals: signals.reverse().map(s => ({
      id: s.id,
      entity: s.entity.label,
      beoId: s.entity.beoId,
      type: s.type,
      status: s.status,
      coherence: s.coherence,
      threshold: s.threshold,
      margin: s.margin,
      tValue: s.tValue,
      moat: s.moat,
      limitingPlane: s.limitingPlane,
      volatility: s.volatility,
      emitted: s.emitted,
      createdAt: s.createdAt,
    })),
  })
}
