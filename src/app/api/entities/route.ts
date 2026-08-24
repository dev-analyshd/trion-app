import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const entities = await db.entity.findMany({
    orderBy: { depth: 'desc' },
    select: {
      id: true, beoId: true, label: true, kind: true, address: true,
      chains: true, depth: true, archetype: true, coherence: true,
      trustTier: true, bhCount: true, createdAt: true,
    },
  })
  return NextResponse.json({
    count: entities.length,
    entities: entities.map(e => ({ ...e, chains: JSON.parse(e.chains) })),
  })
}
