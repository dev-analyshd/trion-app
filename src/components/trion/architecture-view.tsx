'use client'

// Architecture — the 10-layer whitepaper stack + falsifiability registry.

import { FormulaBlock, SectionHeader, Panel } from './primitives'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle } from 'lucide-react'

const LAYERS = [
  { id: 'L0', name: 'Universal Primitives', status: 'implemented',
    items: ['L0.1 Behavioral Hash — 93-byte dual-strand', 'L0.2 BEO entity resolution', 'L0.3 Resonance communication', 'L0.4 Thermodynamic conservation', 'L0.5 Signal selection', 'L0.6 Evolutionary fitness'] },
  { id: 'L1', name: 'Physical Behavioral', status: 'implemented',
    items: ['L1.1 Nine Shannon-entropy features → Φ', 'L1.2 Seven manipulation fingerprints', 'L1.3 Temporal coherence', 'L1.4 Transduction integrity'] },
  { id: 'L2', name: 'Akashic Index', status: 'implemented',
    items: ['L2.1 Depth D(t) accumulation', 'L2.2 Genesis inference', 'L2.3 Fork resolution', 'L2.4 Dormancy & resurrection', 'L2.7 Trajectory anomaly (KL)'] },
  { id: 'L3', name: 'Mental / ANIMA', status: 'implemented',
    items: ['L3.1 ANIMA A = PCR·HA·CA', 'L3.2 Observer-effect correction', 'L3.3 Four data streams (live)', 'L3.4 Source credibility CRED'] },
  { id: 'L4', name: 'Spiritual Security', status: 'implemented',
    items: ['L4.1 DW-BFT d_j = 1−corr', 'L4.2 Conscious plane K + ACP×6', 'L4.3–4.6 Living security ×6', 'L4.8 HHI geographic enforcement', 'L4.9 Slashing ×7 types'] },
  { id: 'L5', name: 'TRION Master', status: 'implemented',
    items: ['L5.1 Θ(t) dynamic threshold', 'L5.2 Five-plane coherence', 'L5.3 Master equation + moat', 'L5.4 Degradation tiers'] },
  { id: 'L6', name: 'Biological Capital', status: 'implemented',
    items: ['L6.1 BC = Flow·Resilience·Uniqueness·Interdependence', 'L6.2 BRT four rhythms'] },
  { id: 'L7', name: 'Natural Liquidity', status: 'implemented',
    items: ['L7.1 NL = LD·LO·LC·LS', 'L7.2 EP = VC·PA·DC', 'LIQUIDITY_HEALTH at NL < 0.30'] },
  { id: 'L8', name: 'Sovereign Behavioral', status: 'implemented',
    items: ['L8.1 SBA per-nation scoring', 'SDP sovereign due-process'] },
  { id: 'L9', name: 'Cross-Species', status: 'implemented',
    items: ['L9.1 XSL ecological liquidity', 'L9.2 Information conservation law'] },
]

const FALSIFIABILITY = [
  { id: 'F1', claim: 'Manipulation resistance', condition: 'MF recall > 0.90 ∧ precision > 0.85', status: 'verified' },
  { id: 'F2', claim: 'No contradictory signals', condition: '10,000 rounds without contradiction', status: 'verified' },
  { id: 'F3', claim: 'CI calibration', condition: '±2% of 95% target', status: 'verified' },
  { id: 'F4', claim: 'LSS breach causality', condition: 'any breach with causality intact', status: 'monitored' },
  { id: 'F6', claim: 'Genesis convergence', condition: 'E[|T−V|] → H_irreducible', status: 'monitored' },
  { id: 'F7', claim: '24h degradation detection', condition: 'detection window', status: 'verified' },
  { id: 'F8', claim: 'HHI ≤ 2500 sustained', condition: '30-day window', status: 'monitored' },
  { id: 'F9', claim: '≥ 4 continents', condition: 'validator geography', status: 'verified' },
  { id: 'F11', claim: 'OE correction', condition: 'M_adj < M_base in 1,000 cases', status: 'verified' },
  { id: 'F12', claim: 'AWA freeze works', condition: 'governance capture blocked', status: 'verified' },
  { id: 'F13', claim: 'MF false-positive < 2%', condition: 'healthy pools', status: 'verified' },
  { id: 'F14', claim: 'BRT-gas correlation', condition: '90-day significance', status: 'conjecture' },
]

export function ArchitectureView() {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Whitepaper Alignment" title="The 10-Layer Protocol Stack"
        description="Every layer implements normative whitepaper formulas. The implementation language spans TypeScript (this engine), Python, Rust, Go, Solidity, Move, Cairo, FunC, ink!, Vyper, Haskell, and Julia — cross-language consistency enforced by golden test vectors." />

      <div className="grid gap-3 lg:grid-cols-2">
        {LAYERS.map(layer => (
          <Panel key={layer.id} title={`${layer.id} — ${layer.name}`}
            action={
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                <CheckCircle2 className="mr-1 h-3 w-3" />{layer.status}
              </Badge>
            }>
            <ul className="space-y-1.5">
              {layer.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <span className="font-mono">{item}</span>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>

      <Panel title="Complete Formula Index">
        <div className="grid gap-3 md:grid-cols-2">
          <FormulaBlock label="Master Equation">
            T(t) = [C(t) ≥ Θ(t)] · S(t) · e^(M_moat·t)
          </FormulaBlock>
          <FormulaBlock label="Five-Plane Coherence">
            C(t) = α·Φ_adj + β·M_adj + γ·Σ + δ·K + ε·A
          </FormulaBlock>
          <FormulaBlock label="Dynamic Threshold">
            Θ(t) = 0.55 + 0.37·V(t)
          </FormulaBlock>
          <FormulaBlock label="Moat">
            M_moat = D · Q · R · X · F · N
          </FormulaBlock>
          <FormulaBlock label="BTCP Score">
            [0.25·NL + 0.20·gas + 0.20·finality + 0.15·CC + 0.20·BEO] × (1−MF)
          </FormulaBlock>
          <FormulaBlock label="Natural Liquidity">
            NL = LD · LO · LC · LS
          </FormulaBlock>
          <FormulaBlock label="Coordination Collapse">
            d_j = 1 − corr(M_j, M̄) → lim(coord→1) Σ s_j·d_j = 0
          </FormulaBlock>
          <FormulaBlock label="Behavioral Hash">
            sense = SHA3-256(p‖0x00) · antisense = SHA3-256(p‖0xFF) ⊕ ¬sense
          </FormulaBlock>
          <FormulaBlock label="ANIMA">
            A(t) = PCR · HA · CA
          </FormulaBlock>
          <FormulaBlock label="Network Effect">
            bridge_pairs_eliminated(N) = N(N−1)/2
          </FormulaBlock>
        </div>
      </Panel>

      <Panel title="Falsifiability Registry — Popper Conditions">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FALSIFIABILITY.map(f => (
            <div key={f.id} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 transition-colors hover:border-zinc-700">
              <div className="flex items-center gap-2">
                {f.status === 'verified'
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  : f.status === 'conjecture'
                    ? <Circle className="h-3.5 w-3.5 text-amber-400" />
                    : <Circle className="h-3.5 w-3.5 text-zinc-500" />}
                <span className="font-mono text-xs font-bold text-zinc-300">{f.id}</span>
                <span className="text-xs text-zinc-400">{f.claim}</span>
              </div>
              <div className="mt-1.5 pl-6 font-mono text-[11px] text-zinc-600">{f.condition}</div>
              <div className="mt-1 pl-6">
                <Badge variant="outline" className={
                  f.status === 'verified' ? 'border-emerald-500/30 text-[10px] text-emerald-400'
                    : f.status === 'conjecture' ? 'border-amber-500/30 text-[10px] text-amber-400'
                    : 'border-zinc-700 text-[10px] text-zinc-500'}>
                  {f.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
          A complete protocol does not claim no limits. It knows exactly where its limits are, and why
          those limits belong to reality rather than to the design. BRT-gas correlation (F14) remains a
          disclosed conjecture until 90-day statistical validation.
        </p>
      </Panel>

      <Panel title="Cross-Language Implementation Matrix">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {[
            { lang: 'TypeScript', role: 'This engine + SDK', verified: true },
            { lang: 'Python', role: 'Core oracle + FAISS', verified: true },
            { lang: 'Rust', role: 'Indexers + BTCP ref', verified: true },
            { lang: 'Go', role: 'Validator mesh', verified: true },
            { lang: 'Solidity', role: 'EVM contracts ×31', verified: true },
            { lang: 'Move', role: 'Aptos contracts', verified: true },
            { lang: 'Cairo', role: 'Starknet contracts', verified: true },
            { lang: 'FunC', role: 'TON contracts', verified: true },
            { lang: 'ink!', role: 'Polkadot contracts', verified: true },
            { lang: 'Vyper', role: 'Formal-verified token', verified: true },
            { lang: 'Haskell', role: '9 type-level theorems', verified: true },
            { lang: 'Julia', role: 'Math verification', verified: true },
          ].map(l => (
            <div key={l.lang} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-center transition-colors hover:border-zinc-700">
              <div className="font-mono text-xs font-bold text-emerald-400">{l.lang}</div>
              <div className="mt-1 text-[10px] text-zinc-500">{l.role}</div>
              {l.verified && <CheckCircle2 className="mx-auto mt-1.5 h-3 w-3 text-emerald-500" />}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
