import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fetchNews, crossSourceAgreement, SOURCE_CREDIBILITY } from '@/lib/trion/anima'

export const dynamic = 'force-dynamic'

/** GET — live crypto news with lexicon sentiment → ANIMA Stream 3. */
export async function GET() {
  try {
    const news = await fetchNews()

    let stored = 0
    for (const item of news.slice(0, 40)) {
      const exists = await db.animaNews.findUnique({ where: { url: item.url } })
      if (!exists) {
        await db.animaNews.create({
          data: {
            title: item.title, source: item.source, url: item.url,
            sentiment: item.sentiment, credibility: item.credibility,
            publishedAt: item.publishedAt,
          },
        })
        stored++
      }
    }

    const sentiments = news.map(n => n.sentiment)
    const ca = crossSourceAgreement(sentiments)
    const credWeighted = news.length
      ? news.reduce((a, n) => a + n.sentiment * n.credibility, 0) /
        news.reduce((a, n) => a + n.credibility, 0)
      : 0.5

    return NextResponse.json({
      stream: 'ANIMA Stream 3 — NLP (news RSS, real-time fetch)',
      fetched: news.length,
      newlyStored: stored,
      live: news.slice(0, 30),
      calibration: {
        crossSourceAgreement: ca,
        credibilityWeightedSentiment: credWeighted,
        sources: [...new Set(news.map(n => n.source))],
        sourceCredibility: SOURCE_CREDIBILITY,
      },
      note: 'Real RSS fetch from CoinDesk, Cointelegraph, Decrypt, The Block. Sentiment = positive/(positive+negative) lexicon.',
    })
  } catch (e) {
    console.error('news fetch failed:', e)
    return NextResponse.json({
      stream: 'ANIMA Stream 3 — NLP',
      fetched: 0, live: [],
      degraded: true,
      note: 'External RSS temporarily unreachable — honest fallback (never invented data)',
    })
  }
}
