import { isSave, type BankClock, type Save } from '../game/clock'

export type Row = { revision: number; state: Save }
export type Repository = { read(): Promise<Row | null>; write(state: Save, revision: number): Promise<number | null> }
export type SyncState = { status: 'connecting' | 'synced' | 'saving' | 'error' | 'conflict'; remote?: Row; error?: string }
// Serialize writes and compare revisions so two devices cannot silently overwrite progress.
export class CloudSync {
  private revision = 0
  private ready = false
  private disposed = false
  private writing = false
  private pending = false
  private remote: Row | null = null
  private off: () => void
  constructor(private clock: BankClock, private repo: Repository, private notify: (state: SyncState) => void) {
    this.off = clock.onSave(() => { this.pending = true; void this.flush() })
  }
  close() { this.disposed = true; this.off() }
  private status(state: SyncState) { if (!this.disposed) this.notify(state) }
  async connect() {
    if (this.disposed) return
    this.ready = false
    this.status({ status: 'connecting' })
    try {
      const row = await this.repo.read()
      if (this.disposed) return
      if (row && !isSave(row.state)) throw new Error('The cloud save could not be read.')
      this.revision = row?.revision ?? 0
      // Postgres jsonb does not preserve key order.
      if (row && canonical(row.state) !== canonical(this.clock.save())) {
        this.clock.setSpeed(0)
        this.remote = row
        this.status({ status: 'conflict', remote: row })
        return
      }
      this.remote = null
      this.ready = true
      this.pending = !row
      if (this.pending) await this.flush()
      else this.status({ status: 'synced' })
    } catch (e) { this.fail(e) }
  }
  async choose(source: 'local' | 'cloud') {
    if (!this.remote || this.disposed) return
    if (source === 'cloud') this.clock.restore(this.remote.state)
    this.remote = null
    this.ready = true
    this.pending = source === 'local'
    if (this.pending) await this.flush()
    else this.status({ status: 'synced' })
  }
  private fail(error: unknown) {
    this.ready = false
    this.status({ status: 'error', error: error instanceof Error ? error.message : 'Cloud request failed.' })
  }
  private async flush() {
    if (!this.ready || this.disposed || this.writing || !this.pending) return
    this.writing = true
    this.status({ status: 'saving' })
    let conflict = false
    try {
      while (this.pending && !this.disposed) {
        this.pending = false
        const revision = await this.repo.write(this.clock.save(), this.revision)
        if (revision === null) { conflict = true; this.ready = false; break }
        this.revision = revision
      }
      if (!conflict) this.status({ status: 'synced' })
    } catch (e) { this.fail(e) }
    finally { this.writing = false }
    if (conflict && !this.disposed) await this.connect()
  }
}
function canonical(v: unknown): string {
  return JSON.stringify(v, (_, value) => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map(k => [k, value[k]])) : value)
}
