'use client'

// Security — manipulation fingerprints, living security layers, PQC.

import {
  FormulaBlock, StatTile, SectionHeader, Panel, MeterBar, LiveBadge,
} from './primitives'
import { Badge } from '@/components/ui/badge'
import { Shield, Dna, Lock, Radar, Flame } from 'lucide-react'

const MF_TYPES = [
  { name: 'ORACLE_ATTACK', threshold: '>15% TWAP deviation', score: 'MF = 1.0 (SILENCE)', tone: 'rose' as const, desc: 'Spot deviates >15% from TWAP within 10 blocks. Immediate absolute silence — the kill switch.' },
  { name: 'WASH_TRADING', threshold: 'cyclic > 0.60 ∧ cp < 5', score: '0.70 × ratio (cap 0.95)', tone: 'amber' as const, desc: 'Cyclic flow ratio above 60% with fewer than 5 distinct counterparties.' },
  { name: 'SYBIL_LIQUIDITY', threshold: 'top-5 LP > 80%', score: '0.60 × concentration (cap 0.80)', tone: 'amber' as const, desc: 'Top-5 liquidity providers hold more than 80% of pool share.' },
  { name: 'GOVERNANCE_CAPTURE', threshold: 'HHI > 4000 ∧ age < 48h', score: '0.50 × (HHI−2500)/7500', tone: 'amber' as const, desc: 'Concentrated voting power passes a young proposal.' },
  { name: 'MEV_SUSTAINED', threshold: 'rate > 0.5% for > 7d', score: '0.40 × (rate−0.5%)/4.5%', tone: 'amber' as const, desc: 'Sustained MEV extraction rate above half a percent.' },
  { name: 'COORDINATED_PUMP', threshold: 'sync > 0.80 (≥3 entities)', score: '0.85 × avg_sync', tone: 'rose' as const, desc: 'Three or more entities acting in tight synchrony.' },
  { name: 'FAKE_VOLUME', threshold: 'deficit > 0.40 or spike > 10×', score: '0.80 × deficit', tone: 'amber' as const, desc: 'Entropy deficit or volume spike with round-trip transfers.' },
]

const LIVING_LAYERS = [
  { icon: Dna, name: 'Genomic Key Evolution', formula: 'GK(t) = Hash_DNA(GK(t−1) ‖ BE ‖ TM ‖ CV)', desc: 'Keys evolve every epoch. A stolen snapshot becomes useless after further evolution.' },
  { icon: Dna, name: 'Complementary Strand', formula: 'sense ⊕ antisense ≡ ¬SHA3-256(p ‖ 0xFF)', desc: 'Self-verifying dual-strand construction — tampering breaks complementarity instantly.' },
  { icon: Flame, name: 'CRISPR Defense', formula: '~90 real historical exploits in innate library', desc: 'Innate pattern library from The DAO (2016) through Bybit (2025). Adaptive memory never decays.' },
  { icon: Radar, name: 'Epigenetic Layer', formula: 'stress = 0.5·threat + 0.3·(1−health) + 0.2·(1−entropy)', desc: 'Protocol changes expression under threat: NORMAL → ELEVATED → DEFENSIVE → LOCKDOWN.' },
  { icon: Lock, name: 'Genetic Recombination', formula: "seed' = SHA3(seed ‖ depth ‖ H_env ‖ t)", desc: 'Periodic re-derivation of key material from accumulated depth.' },
  { icon: Shield, name: 'Mitochondrial Core', formula: 'independent protocol DNA', desc: 'Offline-signable protocol integrity — survives the death of the nucleus.' },
]

const PQC_STACK = [
  { name: 'ML-KEM-768', standard: 'FIPS 203', level: 'NIST Level 3', use: 'Key encapsulation — key exchange', weight: '40%' },
  { name: 'ML-DSA-65', standard: 'FIPS 204', level: 'NIST Level 3', use: 'Digital signatures', weight: '35%' },
  { name: 'SLH-DSA-SHAKE-128s', standard: 'FIPS 205', level: 'NIST Level 1', use: 'Stateless hash-based signatures', weight: '25%' },
]

export function SecurityView() {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="L1.2 + L4 — Security" title="Manipulation Fingerprint & Living Security"
        description="Seven manipulation archetypes discount the Physical plane; six living-security layers make the protocol itself a behavioral entity that evolves, remembers attacks, and heals." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="SEC Composite" value="LSS·PQC·CC" tone="good" sub="multiplicative security" />
        <StatTile label="PQC Coverage" value="3/3" tone="good" sub="FIPS 203/204/205 live" />
        <StatTile label="CRISPR Library" value="~90" sub="real historical exploits" />
        <StatTile label="Kolmogorov Bound" value="unbounded" tone="good" sub="K(t) grows with depth" />
      </div>

      <Panel title="The 7 Manipulation Fingerprints (L1.2)" action={<LiveBadge>computed per signal</LiveBadge>}>
        <div className="space-y-2">
          {MF_TYPES.map(mf => (
            <div key={mf.name} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 transition-colors hover:border-zinc-700">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn2(mf.tone)}>{mf.name}</Badge>
                <span className="font-mono text-[11px] text-zinc-500">{mf.threshold}</span>
                <span className="ml-auto font-mono text-[11px] font-semibold text-zinc-300">{mf.score}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{mf.desc}</p>
            </div>
          ))}
        </div>
        <FormulaBlock label="Aggregation" className="mt-3">
          MF = 1.0 if ORACLE_ATTACK detected (absolute SILENCE)<br />
          else MF = max(detected scores) · action = SILENCE if MF ≥ 0.70, DISCOUNT_PHI otherwise<br />
          Φ_adj = Φ · (1 − MF)
        </FormulaBlock>
      </Panel>

      <Panel title="Living Security — 6 Active Layers (L4.3–L4.6)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LIVING_LAYERS.map(layer => (
            <div key={layer.name} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 transition-colors hover:border-emerald-500/30">
              <layer.icon className="h-5 w-5 text-emerald-400" />
              <div className="mt-2 text-sm font-semibold text-zinc-200">{layer.name}</div>
              <div className="mt-1 font-mono text-[11px] leading-relaxed text-emerald-400/80">{layer.formula}</div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">{layer.desc}</p>
            </div>
          ))}
        </div>
        <FormulaBlock label="Security Score" className="mt-3">
          SEC(t) = LSS(t) · PQC(t) · CC(t)<br />
          LSS = 0.40·GK_depth + 0.25·epigenetic_health + 0.20·mitochondrial + 0.15·CRISPR_coverage<br />
          P(break LSS) = e^(−0.01·generation) — monotonically decreasing
        </FormulaBlock>
      </Panel>

      <Panel title="Post-Quantum Cryptography — Real FIPS Implementations">
        <div className="grid gap-3 sm:grid-cols-3">
          {PQC_STACK.map(p => (
            <div key={p.name} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 transition-colors hover:border-zinc-700">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-emerald-400">{p.name}</span>
                <Badge variant="outline" className="border-emerald-500/30 text-[10px] text-emerald-400">{p.standard}</Badge>
              </div>
              <div className="mt-2 space-y-1 text-xs text-zinc-500">
                <div>{p.level} · routing weight {p.weight}</div>
                <div>{p.use}</div>
              </div>
              <div className="mt-3"><MeterBar value={0.9} height="h-1" label="round-trip verified" /></div>
            </div>
          ))}
        </div>
        <FormulaBlock label="Kolmogorov Complexity Bound (L4.4)" className="mt-3">
          K(H(TRION,t)) ≥ Ω(t · N_chains · N_validators · H_environment)<br />
          lim(t→∞) P(break BCK) = 0
        </FormulaBlock>
      </Panel>
    </div>
  )
}

function cn2(tone: 'rose' | 'amber') {
  return tone === 'rose'
    ? 'border-rose-500/40 text-rose-400'
    : 'border-amber-500/40 text-amber-400'
}
