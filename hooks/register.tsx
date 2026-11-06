import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Row } from '../types'

const PANE = 'agent-tree'
const rows = atom({ plugin: 'agent-tree', key: 'rows' } as const, [], {
  shape: 'rows-1',
})

const LIVE = ['pending', 'running', 'waiting', 'idle']
const ICON: Record<string, string> = {
  pending: '…', running: '▶', waiting: '⏸', idle: '○',
  completed: '✔', failed: '✘', killed: '■',
}
const fmt = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'agent-tree',
      description: 'Ouvre le panneau des agents et sous-agents',
    })
    void $.ui.open({ id: PANE, title: 'Agents' })

    // Sync périodique avec $.agent.list() : statut, hiérarchie, durée.
    $.clock.every(1000, async () => {
      const list = await $.agent.list()
      const now = await $.clock.now()
      await update($, rows, prev => {
        const byId = new Map(prev.map(r => [r.id, r]))
        const seen = new Set<string>()
        const out: Row[] = list.map(a => {
          seen.add(a.id)
          const old = byId.get(a.id)
          const done = !LIVE.includes(a.status)
          return {
            id: a.id,
            parentId: a.parentId,
            name: a.name ?? a.teammateId ?? a.type,
            type: a.type,
            description: a.description,
            status: a.status,
            startedAt: old?.startedAt ?? now,
            endedAt: done ? (old?.endedAt ?? now) : undefined,
            tool: done ? undefined : old?.tool,
            tools: old?.tools ?? 0,
          }
        })
        // Garde les agents terminés disparus de la liste du moteur.
        for (const r of prev) {
          if (!seen.has(r.id)) {
            out.push(
              LIVE.includes(r.status)
                ? { ...r, status: 'completed', endedAt: now, tool: undefined }
                : r,
            )
          }
        }
        return out.slice(-100)
      })
    })

    return next(e)
  })

  on('command.run', { command: 'agent-tree' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Agents' })
    return { text: 'Panneau Agents ouvert.' }
  })

  // Outil en cours par agent (tâche courante).
  on('tool.call', async ($, e, next) => {
    const id = e.agentId
    if (id) {
      await update($, rows, list =>
        list.map(r => (r.id === id ? { ...r, tool: e.tool, tools: r.tools + 1 } : r)),
      )
    }
    const ran = await next(e)
    if (id) {
      await update($, rows, list =>
        list.map(r => (r.id === id ? { ...r, tool: undefined } : r)),
      )
    }
    return ran
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, rows)
    const now = await $.clock.now()
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 5)

    const ids = new Set(list.map(r => r.id))
    const kids = (pid?: string) =>
      list.filter(r => (pid === undefined ? !r.parentId || !ids.has(r.parentId) : r.parentId === pid))
    const lines: { r: Row; depth: number }[] = []
    const walk = (pid: string | undefined, depth: number) => {
      for (const r of kids(pid)) {
        lines.push({ r, depth })
        walk(r.id, depth + 1)
      }
    }
    walk(undefined, 0)

    const live = list.filter(r => LIVE.includes(r.status)).length
    return (
      <Box flexDirection="column">
        <Text bold>
          {live} actif(s) · {list.length} total
        </Text>
        {lines.length === 0 && <Text dimColor>Aucun agent lancé.</Text>}
        {lines.slice(-room).map(({ r, depth }) => {
          const done = !LIVE.includes(r.status)
          const dur = fmt((r.endedAt ?? now) - r.startedAt)
          return (
            <Box flexDirection="column">
              <Text dimColor={done}>
                {'  '.repeat(depth)}
                {ICON[r.status] ?? '?'} {r.name} <Text dimColor>[{r.type}] {dur}</Text>
              </Text>
              <Text dimColor>
                {'  '.repeat(depth)}  {r.description}
                {r.tool ? ` → ${r.tool}` : ''} ({r.tools} outils)
              </Text>
            </Box>
          )
        })}
      </Box>
    )
  })
}
