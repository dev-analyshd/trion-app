import { db } from '@/lib/db'
import { verifyBehavioralHash } from '@/lib/trion/behavioral-hash'

export const dynamic = 'force-dynamic'

/**
 * GET — Server-Sent Events stream of live behavioral hashes.
 * Emits: `bh` events (new hashes from the Akashic ledger, deduped by id),
 * plus heartbeat `ping` every poll to keep the connection alive.
 */
export async function GET(req: Request) {
  const encoder = new TextEncoder()
  let lastId = Number(new URL(req.url).searchParams.get('lastId') ?? 0)

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      const send = (event: string, data: unknown) => {
        if (closed) return
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          )
        } catch {
          closed = true
        }
      }

      send('hello', { ok: true, lastId, ts: Date.now() })

      const poll = async () => {
        if (closed) return
        try {
          const hashes = await db.behavioralHash.findMany({
            where: { id: { gt: lastId } },
            orderBy: { id: 'asc' },
            take: 20,
            include: { entity: { select: { label: true, beoId: true } } },
          })
          for (const h of hashes) {
            lastId = h.id
            send('bh', {
              id: h.id,
              entity: h.entity.label,
              beoId: h.entity.beoId,
              eventType: h.eventTypeName,
              magnitudeNorm: h.magnitudeNorm,
              chainId: h.chainId,
              timestamp: h.timestamp,
              sense: h.senseHex.slice(0, 16),
              antisense: h.antisenseHex.slice(0, 16),
              invariant: verifyBehavioralHash(h.payloadHex, h.senseHex, h.antisenseHex),
            })
          }
          send('ping', { lastId, ts: Date.now() })
        } catch {
          send('error', { message: 'stream poll failed' })
        }
      }

      const interval = setInterval(poll, 4000)
      req.signal.addEventListener('abort', () => {
        closed = true
        clearInterval(interval)
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
