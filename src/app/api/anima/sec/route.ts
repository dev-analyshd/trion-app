import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fetchSecFilings } from '@/lib/trion/anima'

export const dynamic = 'force-dynamic'

/** GET — live SEC EDGAR filings → ANIMA Stream 2 (structured regulatory). */
export async function GET() {
  try {
    const filings = await fetchSecFilings()

    let stored = 0
    for (const f of filings) {
      const exists = await db.animaSec.findUnique({ where: { url: f.url } })
      if (!exists) {
        await db.animaSec.create({
          data: {
            company: f.company, cik: f.cik, form: f.form,
            filedAt: f.filedAt, url: f.url, sentiment: f.sentiment,
            summary: f.summary,
          },
        })
        stored++
      }
    }

    return NextResponse.json({
      stream: 'ANIMA Stream 2 — structured off-chain (SEC EDGAR, real-time fetch)',
      fetched: filings.length,
      newlyStored: stored,
      filings: filings,
      monitored: ['Coinbase Global (CIK 1679788)', 'MicroStrategy (CIK 1050446)', 'Block Inc (CIK 1512673)', 'Riot Platforms (CIK 1167419)', 'Marathon Digital (CIK 1507605)'],
      credibility: 0.92,
      note: 'Live data.sec.gov submissions API — 10-K/10-Q/8-K filings for crypto-exposed public companies',
    })
  } catch {
    return NextResponse.json({
      stream: 'ANIMA Stream 2 — structured',
      fetched: 0, filings: [],
      degraded: true,
      note: 'SEC EDGAR temporarily unreachable — honest fallback',
    })
  }
}
