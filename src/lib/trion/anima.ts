// L3 — ANIMA: cross-domain intelligence with REAL external data sources.
//
//   A(t) = PCR·HA·CA
//   PCR — pattern confidence (vs archetype centroids)
//   HA  — historical accuracy (verified predictions)
//   CA  — calibration/cross-source agreement
//
// External sources (live fetch, graceful degradation):
//   Stream 2 (structured): SEC EDGAR full-text + submissions
//   Stream 3 (NLP): crypto news RSS feeds with lexicon sentiment
//   Dev signals: GitHub public API (commit velocity, contributors)

import { clamp01 } from './constants'

// ── Sentiment lexicon (compact VADER-like positive/negative) ────────────────
const POSITIVE = new Set([
  'surge', 'rally', 'gain', 'gains', 'bullish', 'record', 'high', 'growth', 'adoption',
  'partnership', 'launch', 'upgrade', 'approve', 'approved', 'approval', 'institutional',
  'inflow', 'inflows', 'breakout', 'support', 'strong', 'stable', 'expand', 'expansion',
  'profit', 'success', 'milestone', 'achieve', 'win', 'boost', 'optimize', 'secure',
])
const NEGATIVE = new Set([
  'crash', 'plunge', 'drop', 'drops', 'loss', 'losses', 'bearish', 'hack', 'hacked',
  'exploit', 'breach', 'stolen', 'stole', 'rug', 'rugpull', 'ban', 'banned', 'lawsuit',
  'sec charges', 'fraud', 'manipulation', 'outflow', 'outflows', 'liquidation',
  'liquidations', 'fear', 'risk', 'warning', 'halt', 'halted', 'insolvency', 'bankrupt',
  'collapse', 'vulnerable', 'vulnerability', 'critical', 'attack',
])

export const lexiconSentiment = (text: string): number => {
  const words = text.toLowerCase().split(/[^a-z]+/).filter(Boolean)
  if (words.length === 0) return 0.5
  let pos = 0, neg = 0
  for (const w of words) {
    if (POSITIVE.has(w)) pos++
    if (NEGATIVE.has(w)) neg++
  }
  if (pos + neg === 0) return 0.5
  return pos / (pos + neg)
}

// ── Source credibility (L3.4) — CRED EMA ─────────────────────────────────────
export const SOURCE_CREDIBILITY: Record<string, number> = {
  'SEC EDGAR': 0.92, 'CoinDesk': 0.80, 'Cointelegraph': 0.72, 'Decrypt': 0.70,
  'The Block': 0.78, 'Bitcoin Magazine': 0.68, 'CryptoSlate': 0.62,
  'Blockworks': 0.76, 'GitHub': 0.80, 'DefiLlama': 0.85, 'NewsBTC': 0.60,
}

// ── News RSS fetchers ────────────────────────────────────────────────────────
export interface NewsItem {
  title: string
  source: string
  url: string
  sentiment: number
  credibility: number
  publishedAt: Date
}

const RSS_FEEDS: { source: string; url: string }[] = [
  { source: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { source: 'Cointelegraph', url: 'https://cointelegraph.com/rss' },
  { source: 'Decrypt', url: 'https://decrypt.co/feed' },
  { source: 'The Block', url: 'https://www.theblock.co/rss.xml' },
]

const parseRss = (xml: string, source: string): NewsItem[] => {
  const items: NewsItem[] = []
  const itemBlocks = xml.split('<item').slice(1, 13)
  for (const block of itemBlocks) {
    const title = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.trim()
    const link = block.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/)?.[1]?.trim()
    const pub = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim()
    if (!title || !link) continue
    const sentiment = lexiconSentiment(title)
    items.push({
      title: title.replace(/<[^>]+>/g, ''),
      source,
      url: link,
      sentiment,
      credibility: SOURCE_CREDIBILITY[source] ?? 0.6,
      publishedAt: pub ? new Date(pub) : new Date(),
    })
  }
  return items
}

export const fetchNews = async (): Promise<NewsItem[]> => {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(async ({ source, url }) => {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'TRION-ANIMA/1.0 (behavioral truth infrastructure)' },
      })
      if (!res.ok) throw new Error(`${source}: ${res.status}`)
      return parseRss(await res.text(), source)
    })
  )
  const items = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
  return items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
}

// ── GitHub dev-signal fetcher ────────────────────────────────────────────────
export interface GithubSignal {
  repo: string
  stars: number
  forks: number
  openIssues: number
  sentiment: number
  updatedAt: Date
}

export const fetchGithubSignals = async (repos: string[]): Promise<GithubSignal[]> => {
  const results = await Promise.allSettled(
    repos.map(async (repo) => {
      const res = await fetch(`https://api.github.com/repos/${repo}`, {
        signal: AbortSignal.timeout(8000),
        headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'TRION-ANIMA/1.0' },
      })
      if (!res.ok) throw new Error(`${repo}: ${res.status}`)
      const j = await res.json()
      const stars: number = j.stargazers_count ?? 0
      const forks: number = j.forks_count ?? 0
      const issues: number = j.open_issues_count ?? 0
      const pushed = j.pushed_at ? new Date(j.pushed_at) : new Date()
      const daysSincePush = (Date.now() - pushed.getTime()) / 86400000
      const recency = clamp01(1 - daysSincePush / 90)
      const popularity = clamp01(Math.log10(stars + 1) / 6)
      const issuePressure = clamp01(issues / (stars + 1) * 50)
      const sentiment = clamp01(0.35 + 0.35 * recency + 0.30 * popularity - 0.15 * issuePressure)
      return { repo, stars, forks, openIssues: issues, sentiment, updatedAt: pushed }
    })
  )
  return results.flatMap(r => r.status === 'fulfilled' ? [r.value] : [])
}

// ── SEC EDGAR fetcher ────────────────────────────────────────────────────────
export interface SecFiling {
  company: string
  cik: string
  form: string
  filedAt: Date
  url: string
  sentiment: number
  summary: string
}

const SEC_CIKS: { company: string; cik: string }[] = [
  { company: 'Coinbase Global', cik: '0001679788' },
  { company: 'MicroStrategy', cik: '0001050446' },
  { company: 'Block Inc', cik: '0001512673' },
  { company: 'Riot Platforms', cik: '0001167419' },
  { company: 'Marathon Digital', cik: '0001507605' },
]

export const fetchSecFilings = async (): Promise<SecFiling[]> => {
  const results = await Promise.allSettled(
    SEC_CIKS.map(async ({ company, cik }) => {
      const res = await fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'TRION-ANIMA/1.0 contact:trionprotocol@gmail.com' },
      })
      if (!res.ok) throw new Error(`${company}: ${res.status}`)
      const j = await res.json()
      const recent = j.filings?.recent
      if (!recent) throw new Error(`${company}: no recent`)
      const forms: string[] = recent.form ?? []
      const dates: string[] = recent.filingDate ?? []
      const accessions: string[] = recent.accessionNumber ?? []
      const docs: string[] = recent.primaryDocument ?? []
      const out: SecFiling[] = []
      for (let i = 0; i < Math.min(8, forms.length); i++) {
        const form = forms[i]
        if (!['8-K', '10-K', '10-Q', 'S-1', '4'].includes(form)) continue
        const acc = accessions[i].replace(/-/g, '')
        const url = `https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/${acc}/${docs[i]}`
        const sentiment = form === '8-K' ? 0.5 : form === '10-K' ? 0.55 : 0.5
        out.push({
          company, cik, form,
          filedAt: new Date(dates[i]),
          url,
          sentiment,
          summary: `${company} filed ${form}`,
        })
        if (out.length >= 3) break
      }
      return out
    })
  )
  return results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
}

// ── CA: cross-source agreement ───────────────────────────────────────────────
export const crossSourceAgreement = (sentiments: number[]): number => {
  if (sentiments.length === 0) return 0.5
  const mean = sentiments.reduce((a, b) => a + b, 0) / sentiments.length
  const maxDev = 0.5
  const agreements = sentiments.map(s => Math.max(0, 1 - Math.abs(s - mean) / maxDev))
  return agreements.reduce((a, b) => a + b, 0) / agreements.length
}

// ── ANIMA composite ──────────────────────────────────────────────────────────
export interface AnimaInputs {
  patternConfidence: number
  historicalAccuracy: number
  calibration: number
}

export const computeAnimaScore = (i: AnimaInputs): {
  anima: number
  disabled: boolean
  note: string
} => {
  if (i.historicalAccuracy < 0.60) {
    return { anima: 0, disabled: true, note: `HA=${i.historicalAccuracy.toFixed(2)} < 0.60 → ANIMA disabled (honest disclosure)` }
  }
  if (i.historicalAccuracy < 0.70) {
    return { anima: 0, disabled: false, note: `HA=${i.historicalAccuracy.toFixed(2)} < 0.70 → flagged for review` }
  }
  return {
    anima: clamp01(i.patternConfidence * i.historicalAccuracy * i.calibration),
    disabled: false,
    note: `A = PCR(${i.patternConfidence.toFixed(2)})·HA(${i.historicalAccuracy.toFixed(2)})·CA(${i.calibration.toFixed(2)})`,
  }
}
