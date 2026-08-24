# TRION App — Source Snapshot & Restore Guide

This snapshot contains the complete TRION Protocol frontend + backend application
(the Next.js app that runs on port 3000). Created for reset-resilience: if the
sandbox environment is wiped, restore from this archive.

## Contents
- `src/` — all application code:
  - `src/lib/trion/` — the TRION engine (12 modules: behavioral-hash, entropy,
    manipulation, dwbft, coherence, btcp, anima, chains, signal-engine, seed,
    constants, client)
  - `src/app/api/` — 14 API route groups (health, entities, signal, bh + bh/stream
    SSE, btcp/{route,chains,intent}, nl, validators, anima/{news,github,sec},
    signals/history, seed)
  - `src/app/page.tsx` + `src/components/trion/` — 17 view/component files
    (9 views: Overview, Coherence Engine, BH Explorer, BTCP, NL Explorer,
    Validators, ANIMA, Security, Architecture + quick-flow, entity-detail,
    signal-detail, nl-chain-detail, brt-clock, rpc-heartbeat, bh-live-stream,
    keyboard-help, theme-toggle, primitives)
- `prisma/schema.prisma` — 12-model schema (Akashic Index + BTCP ledger)
- `package.json`, `tsconfig.json`, `next.config.ts`, configs

## Restore procedure
```bash
cd /home/z/my-project
tar -xzf download/trion-app-source-*.tar.gz          # restore source
bun add js-sha3                                        # the one added dependency
grep -q DATABASE_URL .env || echo 'DATABASE_URL="file:/home/z/my-project/db/custom.db"' >> .env
bun run db:push                                        # create DB schema
DATABASE_URL="file:/home/z/my-project/db/custom.db" bun run src/lib/trion/seed.ts  # seed 1,600 BHs + history
# dev server auto-restarts; app live at :3000
```

## Key facts
- Golden BH vector matches cross-language spec (sense 7060238a… / antisense e7392048…)
- 101 chains / 16 VM families / 5,050 bridge pairs eliminated
- trion-core repo (the multi-language protocol implementation) is separate:
  https://github.com/dev-analyshd/trion-core @ c9bf7e4
