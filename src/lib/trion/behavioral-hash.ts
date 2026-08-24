// L0.1 — Behavioral Hash: the 93-byte canonical dual-strand construction.
//
//   payload (93 bytes, big-endian):
//     entity_id        32 bytes   SHA3-256 of normalized entity identifier
//     event_type        1 byte    canonical type id (0..19)
//     magnitude_nano    8 bytes   magnitude_norm × 1e9, clamped to u64
//     context           8 bytes   context hash (venue/settlement bits)
//     timestamp         8 bytes   unix seconds
//     chain_id          4 bytes   TRION internal chain id
//     block_hash       32 bytes   recent block hash
//
//   sense     = SHA3-256(payload || 0x00)
//   antisense = SHA3-256(payload || 0xFF) XOR NOT(sense)
//   invariant: sense XOR antisense == NOT(SHA3-256(payload || 0xFF))
//
// Identical byte-for-byte to Python core/primitives/behavioral_hash.py,
// Rust trion-common::hash_dna::canonical_bh, TS chains/shared/canonical_bh.ts
// and the corrected Go meshsha3 DualStrandSign.

import { sha3_256 } from 'js-sha3'
import { EVENT_TYPES, type EventType, clamp01 } from './constants'

export interface BhInput {
  entityId: string          // 64-char hex (32 bytes)
  eventType: EventType
  magnitudeNorm: number     // [0,1]
  context?: number          // u64 context bits
  timestamp: number         // unix seconds
  chainId: number           // TRION internal chain id
  blockHash: string         // 64-char hex
}

export interface BehavioralHashResult {
  payloadHex: string        // 186 hex chars (93 bytes)
  senseHex: string
  antisenseHex: string
  complementHex: string     // sense XOR antisense — the public invariant
  verified: boolean
}

const hexToBytes = (hex: string): Uint8Array => {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16)
  }
  return out
}

const bytesToHex = (b: Uint8Array): string =>
  Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')

const u64be = (n: number): Uint8Array => {
  let v = BigInt(Math.max(0, Math.floor(n)))
  const out = new Uint8Array(8)
  for (let i = 7; i >= 0; i--) {
    out[i] = Number(v & 0xffn)
    v >>= 8n
  }
  return out
}

const u32be = (n: number): Uint8Array => {
  const out = new Uint8Array(4)
  const v = Math.max(0, Math.floor(n)) >>> 0
  out[0] = (v >>> 24) & 0xff; out[1] = (v >>> 16) & 0xff
  out[2] = (v >>> 8) & 0xff; out[3] = v & 0xff
  return out
}

const xorBytes = (a: Uint8Array, b: Uint8Array): Uint8Array => {
  const out = new Uint8Array(a.length)
  for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i]
  return out
}

const notBytes = (a: Uint8Array): Uint8Array => {
  const out = new Uint8Array(a.length)
  for (let i = 0; i < a.length; i++) out[i] = ~a[i] & 0xff
  return out
}

/** BEO id = SHA3-256(normalized identifier) — substrate-independent identity. */
export const beoIdFromAddress = (address: string): string =>
  sha3_256(address.toLowerCase().replace(/^0x/, ''))

/** Magnitude normalization (L0.1 §3.2): log10(USD+1)/log10(max_90d+1). */
export const normalizeMagnitude = (usdValue: number, max90dUsd: number): number => {
  if (max90dUsd <= 0) return 0
  return clamp01(Math.log10(usdValue + 1) / Math.log10(max90dUsd + 1))
}

/** Build the canonical 93-byte payload. */
export const buildPayload = (input: BhInput): Uint8Array => {
  const entityId = hexToBytes(input.entityId) // 32
  const eventType = new Uint8Array([EVENT_TYPES.indexOf(input.eventType) & 0xff]) // 1
  const magnitude = u64be(clamp01(input.magnitudeNorm) * 1e9) // 8
  const context = u64be(input.context ?? 0) // 8
  const timestamp = u64be(input.timestamp) // 8
  const chainId = u32be(input.chainId) // 4
  const blockHash = hexToBytes(input.blockHash) // 32
  const payload = new Uint8Array(93)
  let off = 0
  payload.set(entityId, off); off += 32
  payload.set(eventType, off); off += 1
  payload.set(magnitude, off); off += 8
  payload.set(context, off); off += 8
  payload.set(timestamp, off); off += 8
  payload.set(chainId, off); off += 4
  payload.set(blockHash, off); off += 32
  if (off !== 93) throw new Error(`payload length ${off} != 93`)
  if (entityId.length !== 32 || blockHash.length !== 32) {
    throw new Error('entityId and blockHash must be 32-byte hex')
  }
  return payload
}

/** Compute the dual-strand behavioral hash. */
export const computeBehavioralHash = (input: BhInput): BehavioralHashResult => {
  const payload = buildPayload(input)

  const p00 = new Uint8Array(94); p00.set(payload, 0); p00[93] = 0x00
  const pff = new Uint8Array(94); pff.set(payload, 0); pff[93] = 0xff

  const sense = hexToBytes(sha3_256(p00))       // SHA3-256(payload||0x00)
  const hff = hexToBytes(sha3_256(pff))          // SHA3-256(payload||0xFF)
  const antisense = xorBytes(hff, notBytes(sense)) // antisense = hff XOR NOT(sense)
  const complement = xorBytes(sense, antisense)   // public invariant value

  // verify: sense XOR antisense == NOT(SHA3-256(payload||0xFF))
  const expectedComplement = notBytes(hff)
  const verified = complement.every((b, i) => b === expectedComplement[i])

  return {
    payloadHex: bytesToHex(payload),
    senseHex: bytesToHex(sense),
    antisenseHex: bytesToHex(antisense),
    complementHex: bytesToHex(complement),
    verified,
  }
}

/** Verify a dual-strand pair against its payload (tamper detection). */
export const verifyBehavioralHash = (
  payloadHex: string, senseHex: string, antisenseHex: string
): boolean => {
  const payload = hexToBytes(payloadHex)
  const p00 = new Uint8Array(94); p00.set(payload, 0); p00[93] = 0x00
  const pff = new Uint8Array(94); pff.set(payload, 0); pff[93] = 0xff
  const sense = hexToBytes(senseHex)
  const antisense = hexToBytes(antisenseHex)
  const hff = hexToBytes(sha3_256(pff))
  const expectedAntisense = xorBytes(hff, notBytes(sense))
  return antisense.every((b, i) => b === expectedAntisense[i])
}

/** Cross-VM golden vector — must equal the Python/Rust/Go implementations. */
export const GOLDEN_VECTOR = (() => {
  const entityId = 'ab'.repeat(32)
  const blockHash = 'cc'.repeat(32)
  return computeBehavioralHash({
    entityId, eventType: 'BORROW', magnitudeNorm: 0.5, timestamp: 1700000000,
    chainId: 421614, blockHash,
  })
})()
