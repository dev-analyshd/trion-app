import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { seed } from '@/lib/trion/seed'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** POST — (re)seed the Akashic Index if empty. */
export async function POST() {
  try {
    const count = await db.behavioralHash.count()
    if (count > 0) {
      return NextResponse.json({ alreadySeeded: true, behavioralHashes: count })
    }
    await seed()
    const [entities, hashes, chains, validators] = await Promise.all([
      db.entity.count(), db.behavioralHash.count(),
      db.chain.count(), db.validator.count(),
    ])
    return NextResponse.json({ seeded: true, entities, behavioralHashes: hashes, chains, validators })
  } catch (e) {
    console.error('seed failed:', e)
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 })
  }
}

export async function GET() {
  const [entities, hashes, chains, validators, signals, news, github, sec] = await Promise.all([
    db.entity.count(), db.behavioralHash.count(), db.chain.count(),
    db.validator.count(), db.signal.count(), db.animaNews.count(),
    db.animaGithub.count(), db.animaSec.count(),
  ])
  return NextResponse.json({
    akashicIndex: { entities, behavioralHashes: hashes, chains, validators, signals },
    anima: { news, github, secFilings: sec },
  })
}
