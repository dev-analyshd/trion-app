# TRION Protocol — Behavioral Truth Infrastructure (App)

The live TRION application: a full-stack implementation of the TRION whitepaper's
behavioral coherence oracle and BTCP zero-bridge exchange.

> **T(t) = [C(t) ≥ Θ(t)] · S(t) · e^(M_moat·t)** — Truth emits only when all five
> planes of reality are coherent. When any plane fails: silence. The silence is information.

## What This Is

- **L0.1 Behavioral Hash engine** — the 93-byte canonical dual-strand SHA3-256
  construction (`sense = SHA3-256(p‖0x00)`, `antisense = SHA3-256(p‖0xFF) ⊕ ¬sense`),
  cross-language golden-vector verified against the Python/Rust/Go implementations
  in [trion-core](https://github.com/dev-analyshd/trion-core).
- **Five-plane coherence** — `C(t) = α·Φ_adj + β·M_adj + γ·Σ + δ·K + ε·A` with 11
  whitepaper weight profiles + per-entity custom profiles (server-validated).
- **BTCP zero-bridge exchange** — intent → route → escrow lifecycle across
  **101 chains / 16 VM families** (5,050 bridge pairs eliminated). Assets never
  leave native chains; only behavioral facts cross.
- **DW-BFT validator mesh** — diversity weights `d_j = 1 − corr(M_j, M̄)`;
  coordination collapse demonstrated live (50% nominal → 0% effective).
- **ANIMA live intelligence** — real external streams: crypto news RSS (lexicon
  sentiment), GitHub dev signals, SEC EDGAR filings. Honest degradation, never
  invented data.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui ·
Prisma (SQLite) · TanStack Query · js-sha3

## Run

```bash
bun install
bun run db:push                                            # create SQLite schema
bun run src/lib/trion/seed.ts                              # seed 1,600 BHs + history
bun run dev                                                # http://localhost:3000
```

Optional env: `GITHUB_TOKEN` (raises ANIMA dev-signal rate limit).

## Views (keyboard 0–9)

| Key | View | Highlights |
|-----|------|-----------|
| 1 | Overview | Master equation hero, live stats, SSE hash stream, one-click zero-bridge flow, BRT clock, signal donut + click-through filter, SILENCE log, RPC heartbeat sparklines |
| 2 | Coherence Engine | Five-plane gauges, weighted contributions, profile editor (α–ε sliders), publication history |
| 3 | Behavioral Hash | 93-byte payload explorer, live minting with XOR-invariant verification |
| 4 | BTCP Zero-Bridge | Route simulator (7-type priority ladder), intent lifecycle, 101-chain registry, route analytics + escrow timelines |
| 5 | NL Explorer | LD·LO·LC·LS per chain, DO_NOT_ROUTE alerts, chain drill-downs |
| 6 | Validators | Σ(t), HHI enforcement, coordination-collapse attack simulation |
| 7 | ANIMA | Live news/GitHub/SEC streams with credibility weighting |
| 8 | Security | 7 manipulation fingerprints, living security, PQC (FIPS 203/204/205) |
| 9 | Architecture | 10-layer stack, formula index, falsifiability registry, 12-language matrix |
| 0 | Archetypes | Pattern distribution, event signatures, 48h activity sparklines |

## Canonical Formula Index

```
C(t)   = α·Φ_adj + β·M_adj + γ·Σ + δ·K + ε·A
Θ(t)   = 0.55 + 0.37·V(t)
T(t)   = [C ≥ Θ] · S · e^M
M_moat = D·Q·R·X·F·N
NL     = LD·LO·LC·LS
BTCP   = [0.25·NL + 0.20·gas + 0.20·finality + 0.15·CC + 0.20·BEO]·(1−MF)
```

## Related

- **[trion-core](https://github.com/dev-analyshd/trion-core)** — the multi-language
  protocol implementation (Python, Rust, Go, Solidity, Move, Cairo, FunC, ink!,
  Vyper, CosmWasm, Haskell, Julia) with the full whitepaper, specs, ZK circuits,
  and 23,600+ lines of tests.

## License

CC0 1.0 — This knowledge belongs to everyone.
