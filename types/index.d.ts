export type Row = {
  id: string
  parentId?: string
  name: string
  type: string
  description: string
  status: string
  startedAt: number
  endedAt?: number
  tool?: string
  tools: number
}

declare module 'claude-code' {
  interface PluginState {
    'agent-tree': { rows: Shaped<Row[]> }
  }
}
