import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeBehavioralHash, verifyBehavioralHash } from '@/lib/trion/behavioral-hash'
import { EVENT_TYPES, type EventType } from '@/lib/trion/constants'

export const dynamic = 'force-dynamic'

// GET — recent behavioral hashes from the Akashic ledger
export async function GET(req: Request) {
  const url = new URL(req.url)
  const limit = Math.min(200, Number(url.searchParams.get('limit') ?? 50))
  const entityId = url.searchParams.get('entityId')
  const chainId = url.searchParams.get('chainId')

  const hashes = await db.behavioralHash.findMany({
    where: {
      ...(entityId ? { entity: { beoId: entityId } } : {}),
      ...(chainId ? { chainId: Number(chainId) } : {}),
    },
    orderBy: { timestamp: 'desc' },
    take: limit,
    include: { entity: { select: { label: true, beoId: true } } },
  })

  const stats = await db.behavioralHash.groupBy({
    by: ['chainId'],
    _count: { _all: true },
  })
  const total = await db.behavioralHash.count()

  return NextResponse.json({
    total,
    hashes: hashes.map(h => ({
      id: h.id,
      entity: h.entity.label,
      beoId: h.entity.beoId,
      eventType: h.eventTypeName,
      eventTypeCode: h.eventType,
      magnitudeNorm: h.magnitudeNorm,
      chainId: h.chainId,
      blockNumber: h.blockNumber,
      timestamp: h.timestamp,
      sense: h.senseHex,
      antisense: h.antisenseHex,
      complement: h.complementHex,
      payload: h.payloadHex,
      verified: h.valid,
      invariant: verifyBehavioralHash(h.payloadHex, h.senseHex, h.antisenseHex),
    })),
    chainDistribution: stats.map(s => ({ chainId: s.chainId, count: s._count._all })),
    eventTypes: EVENT_TYPES,
  })
}

// POST — compute a behavioral hash on the fly (live BH minting)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { entityId, eventType, magnitudeNorm, context, timestamp, chainId, blockHash } = body
    if (!entityId || !eventType || !chainId || !blockHash) {
      return NextResponse.json(
        { error: 'Required: entityId, eventType, chainId, blockHash' },
        { status: 400 },
      )
    }
    if (!EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        { error: `eventType must be one of: ${EVENT_TYPES.join(', ')}` },
        { status: 400 },
      )
    }
    const bh = computeBehavioralHash({
      entityId,
      eventType: eventType as EventType,
      magnitudeNorm: Number(magnitudeNorm ?? 0.5),
      context: Number(context ?? 0),
      timestamp: Number(timestamp ?? Math.floor(Date.now() / 1000)),
      chainId: Number(chainId),
      blockHash,
    })
    return NextResponse.json({
      ...bh,
      payloadLayout: {
        entityId: 'bytes 0–31 (32B)',
        eventType: 'byte 32 (1B)',
        magnitudeNano: 'bytes 33–40 (8B, magnitude_norm × 1e9)',
        context: 'bytes 41–48 (8B)',
        timestamp: 'bytes 49–56 (8B unix seconds)',
        chainId: 'bytes 57–60 (4B)',
        blockHash: 'bytes 61–92 (32B)',
      },
      construction: {
        sense: 'SHA3-256(payload || 0x00)',
        antisense: 'SHA3-256(payload || 0xFF) XOR NOT(sense)',
        invariant: 'sense XOR antisense == NOT(SHA3-256(payload || 0xFF))',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
