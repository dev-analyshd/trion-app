import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fetchGithubSignals } from '@/lib/trion/anima'

export const dynamic = 'force-dynamic'

const REPOS = [
  'ethereum/go-ethereum',
  'solana-labs/solana',
  'Uniswap/v3-core',
  'aave/aave-v3-core',
  'curvefi/curve-contract',
  'lido-dao/lido-dao',
  'cosmos/cosmos-sdk',
  'aptos-labs/aptos-core',
  'MystenLabs/sui',
  'paritytech/polkadot-sdk',
  'dev-analyshd/trion-core',
]

/** GET — live GitHub dev-activity signals → ANIMA dev stream. */
export async function GET() {
  try {
    const signals = await fetchGithubSignals(REPOS)

    for (const s of signals) {
      await db.animaGithub.upsert({
        where: { repo: s.repo },
        create: {
          repo: s.repo, stars: s.stars, forks: s.forks, openIssues: s.openIssues,
          sentiment: s.sentiment, updatedAt: s.updatedAt,
        },
        update: {
          stars: s.stars, forks: s.forks, openIssues: s.openIssues,
          sentiment: s.sentiment, updatedAt: s.updatedAt,
        },
      })
    }

    if (signals.length > 0) {
      const avgSentiment = signals.reduce((a, s) => a + s.sentiment, 0) / signals.length
      return NextResponse.json({
        stream: 'ANIMA dev-signal — GitHub public API (real-time fetch)',
        fetched: signals.length,
        repos: signals.sort((a, b) => b.stars - a.stars),
        ecosystemDevHealth: avgSentiment,
        formula: 'dev-health = 0.35·recency(90d) + 0.30·popularity(log10 stars) + 0.30·base − 0.15·issue-pressure',
        note: 'Live GitHub REST API — commit recency, stars, forks, issue pressure',
      })
    }

    // Live fetch returned nothing (rate limit) — fall back to cached REAL data
    const cached = await db.animaGithub.findMany({ orderBy: { stars: 'desc' } })
    const avg = cached.length ? cached.reduce((a, s) => a + s.sentiment, 0) / cached.length : 0.5
    return NextResponse.json({
      stream: 'ANIMA dev-signal — GitHub (cached real data)',
      fetched: cached.length,
      repos: cached,
      ecosystemDevHealth: avg,
      formula: 'dev-health = 0.35·recency(90d) + 0.30·popularity(log10 stars) + 0.30·base − 0.15·issue-pressure',
      degraded: true,
      note: 'GitHub API rate-limited — serving cached real data (never invented)',
    })
  } catch {
    const cached = await db.animaGithub.findMany({ orderBy: { stars: 'desc' } })
    return NextResponse.json({
      stream: 'ANIMA dev-signal',
      fetched: cached.length, repos: cached,
      ecosystemDevHealth: cached.length ? cached.reduce((a, s) => a + s.sentiment, 0) / cached.length : 0.5,
      degraded: true,
      note: 'GitHub API temporarily unreachable — cached real data',
    })
  }
}
