'use client'

// ANIMA — cross-domain intelligence: live news, GitHub dev signals, SEC EDGAR.

import { useQuery } from '@tanstack/react-query'
import {
  fetchJSON, sentimentColor,
  type AnimaNewsResponse, type AnimaGithubResponse, type AnimaSecResponse,
} from '@/lib/trion/client'
import {
  FormulaBlock, StatTile, SectionHeader, Panel, MeterBar, LiveBadge,
  SkeletonGrid,
} from './primitives'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExternalLink, Star, GitFork, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AnimaView() {
  const news = useQuery({
    queryKey: ['anima-news'],
    queryFn: () => fetchJSON<AnimaNewsResponse>('/api/anima/news', 25000),
    refetchInterval: 120000,
  })
  const github = useQuery({
    queryKey: ['anima-github'],
    queryFn: () => fetchJSON<AnimaGithubResponse>('/api/anima/github', 25000),
    refetchInterval: 180000,
  })
  const sec = useQuery({
    queryKey: ['anima-sec'],
    queryFn: () => fetchJSON<AnimaSecResponse>('/api/anima/sec', 25000),
    refetchInterval: 300000,
  })

  const streams = [news.data, github.data, sec.data]
  const activeStreams = streams.filter(s => s && s.fetched > 0).length
  const n = news.data

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="L3 — Mental / ANIMA" title="Cross-Domain Intelligence"
        description="A(t) = PCR·HA·CA. ANIMA reads four live external streams — on-chain behavior, structured regulatory filings, natural-language news, and developer signals. Real fetches from real sources; when a source is unreachable, it degrades honestly. Never invented data." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile live label="News Stream" value={n?.fetched ?? 0}
          sub={n?.degraded ? 'cached real data' : 'live RSS fetch'} tone="good" />
        <StatTile live label="Dev Signal (GitHub)" value={github.data?.fetched ?? 0}
          sub={github.data?.degraded ? 'cached real data' : 'live API'} />
        <StatTile live label="SEC EDGAR" value={sec.data?.fetched ?? 0}
          sub={sec.data?.degraded ? 'cached' : 'live data.sec.gov'} />
        <StatTile label="Active Streams" value={`${activeStreams}/3`}
          tone={activeStreams >= 2 ? 'good' : 'warn'} sub="stream completeness" />
      </div>

      {n && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Calibration (CA)" className="lg:col-span-1">
            <div className="space-y-3">
              <MeterBar value={n.calibration.crossSourceAgreement} label="Cross-source agreement" />
              <MeterBar value={n.calibration.credibilityWeightedSentiment} label="CRED-weighted sentiment" tone="amber" />
              <FormulaBlock label="ANIMA">
                A(t) = PCR · HA · CA<br />
                <span className="text-[11px] text-zinc-500">CA = Σ CRED(s)·agree(s) / Σ CRED(s)</span>
              </FormulaBlock>
              <div className="flex flex-wrap gap-1.5">
                {n.calibration.sources.map(s => (
                  <Badge key={s} variant="outline" className="border-zinc-700 text-[10px] text-zinc-400">{s}</Badge>
                ))}
              </div>
            </div>
          </Panel>
          <FormulaBlock label="Source Credibility (L3.4)" className="lg:col-span-2 !text-left">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-zinc-400 sm:grid-cols-3">
              <span>SEC EDGAR — 0.92</span><span>DefiLlama — 0.85</span><span>CoinDesk — 0.80</span>
              <span>GitHub — 0.80</span><span>The Block — 0.78</span><span>Blockworks — 0.76</span>
              <span>Cointelegraph — 0.72</span><span>Decrypt — 0.70</span><span>social — 0.15 (excluded)</span>
            </div>
            <div className="mt-2 text-[11px] text-zinc-500">
              CRED(s,t) = CRED(s,t−1)·0.99^days + event·Δ — flag &lt; 0.30, exclude &lt; 0.10
            </div>
          </FormulaBlock>
        </div>
      )}

      <Tabs defaultValue="news" className="space-y-4">
        <TabsList className="bg-zinc-900/60">
          <TabsTrigger value="news">News Stream</TabsTrigger>
          <TabsTrigger value="github">Dev Signals</TabsTrigger>
          <TabsTrigger value="sec">SEC Filings</TabsTrigger>
        </TabsList>

        <TabsContent value="news">
          <Panel title="Live Crypto News — Lexicon Sentiment Analysis"
            action={n?.degraded
              ? <Badge variant="outline" className="border-amber-500/30 text-amber-400"><AlertCircle className="mr-1 h-3 w-3" />degraded</Badge>
              : <LiveBadge>live RSS</LiveBadge>}>
            {!n ? (
              <SkeletonGrid count={5} className="grid-cols-1" />
            ) : (
              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {n.live.map((item, i) => (
                  <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                    className="group flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 transition-colors hover:border-emerald-500/30">
                    <div className="mt-0.5 flex w-14 shrink-0 flex-col items-center">
                      <div className={cn('tabular font-mono text-sm font-bold', sentimentColor(item.sentiment))}>
                        {item.sentiment.toFixed(2)}
                      </div>
                      <div className="mt-0.5 h-1 w-10 overflow-hidden rounded-full bg-zinc-800">
                        <div className={cn('h-full',
                          item.sentiment > 0.6 ? 'bg-emerald-500' : item.sentiment < 0.4 ? 'bg-rose-500' : 'bg-zinc-500')}
                          style={{ width: `${item.sentiment * 100}%` }} />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm leading-snug text-zinc-200 group-hover:text-emerald-300">
                        {item.title}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
                        <Badge variant="outline" className="border-zinc-700 text-[10px]">{item.source}</Badge>
                        <span>CRED {item.credibility.toFixed(2)}</span>
                        <span>{new Date(item.publishedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-zinc-600 group-hover:text-emerald-400" />
                  </a>
                ))}
              </div>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="github">
          <Panel title="Ecosystem Developer Health — Live GitHub Signals"
            action={github.data?.degraded
              ? <Badge variant="outline" className="border-amber-500/30 text-amber-400">cached real data</Badge>
              : <LiveBadge>live API</LiveBadge>}>
            {!github.data ? (
              <SkeletonGrid count={5} className="grid-cols-1" />
            ) : (
              <>
                <div className="mb-4">
                  <MeterBar value={github.data.ecosystemDevHealth} label="Ecosystem dev-health (weighted across monitored repos)" />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {github.data.repos.map(r => (
                    <div key={r.repo} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                      <div className="flex items-center justify-between">
                        <span className="truncate font-mono text-xs text-zinc-300">{r.repo}</span>
                        <span className={cn('tabular font-mono text-xs', sentimentColor(r.sentiment))}>
                          {r.sentiment.toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-[11px] text-zinc-500">
                        <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-400" />{r.stars.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><GitFork className="h-3 w-3 text-zinc-500" />{r.forks.toLocaleString()}</span>
                        <span>issues {r.openIssues.toLocaleString()}</span>
                      </div>
                      <div className="mt-2"><MeterBar value={r.sentiment} height="h-1" /></div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="sec">
          <Panel title="SEC EDGAR — Structured Regulatory Stream"
            action={sec.data?.degraded
              ? <Badge variant="outline" className="border-amber-500/30 text-amber-400">cached</Badge>
              : <LiveBadge>live data.sec.gov</LiveBadge>}>
            {!sec.data ? (
              <SkeletonGrid count={4} className="grid-cols-1" />
            ) : (
              <div className="space-y-2">
                {sec.data.filings.map((f, i) => (
                  <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 transition-colors hover:border-emerald-500/30">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="border-amber-500/30 text-[10px] text-amber-400">{f.form}</Badge>
                      <span className="text-sm text-zinc-200">{f.company}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                      <span>{new Date(f.filedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <ExternalLink className="h-3 w-3 group-hover:text-emerald-400" />
                    </div>
                  </a>
                ))}
                <p className="pt-2 text-[11px] leading-relaxed text-zinc-600">
                  CRED 0.92 — the highest-weighted structured source. Filings feed the REGULATORY_BEHAVIORAL
                  signal (L3.4) and the Chameleon protocol&apos;s regulatory adaptation state machine.
                </p>
              </div>
            )}
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  )
}
