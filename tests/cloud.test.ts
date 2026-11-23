import test from 'node:test'
import assert from 'node:assert/strict'
import { BankClock } from '../src/game/clock'
import { CloudSync, type Row, type SyncState, type Repository } from '../src/cloud/sync'
const drain = () => new Promise<void>(done => setTimeout(done,5))
function fixture() {
  let row: Row | null = null
  const repo: Repository = {
    async read() { return structuredClone(row) },
    async write(state, revision) {
      if (revision !== (row?.revision ?? 0)) return null
      row = { state:structuredClone(state),revision:revision + 1 }
      return row.revision
    },
  }
  const clock = new BankClock(undefined,() => 0)
  let status: SyncState | undefined
  const sync = new CloudSync(clock,repo,s => { status = s })
  return { clock,repo,sync,get status() { return status },get row() { return row },set row(v) { row = v } }
}
test('guest progress uploads, local decisions sync, timer ticks do not upload', async () => {
  const f = fixture()
  await f.sync.connect()
  assert.equal(f.row?.revision,1)
  f.clock.tick()
  assert.equal(f.row?.revision,1)
  f.clock.next(); await drain()
  assert.equal(f.row?.state.game.day,2)
  f.sync.close()
})
test('differing saves require an explicit choice, either selection is retained', async () => {
  for (const choice of ['local','cloud'] as const) {
    const f = fixture()
    const other = new BankClock(undefined,() => 0)
    other.next(); other.next()
    f.row = { state:other.save(),revision:5 }
    await f.sync.connect()
    assert.equal(f.status?.status,'conflict')
    assert.equal(f.row.revision,5)
    assert.equal(f.clock.get().game.day,1)
    await f.sync.choose(choice)
    assert.equal(f.clock.get().game.day,choice === 'cloud' ? 3 : 1)
    assert.equal(f.row.state.game.day,f.clock.get().game.day)
    f.sync.close()
  }
})
test('a stale device detects revision conflict instead of overwriting the other device', async () => {
  const f = fixture(); await f.sync.connect()
  const other = new BankClock(f.row!.state,() => 0)
  other.next(); other.next()
  f.row = { state:other.save(),revision:2 }
  f.clock.next(); await drain()
  assert.equal(f.status?.status,'conflict')
  assert.equal(f.row.state.game.day,3)
  assert.equal(f.clock.get().game.day,2)
  f.sync.close()
})
test('network failure preserves local progress and exposes retryable sync status', async () => {
  const f = fixture()
  f.repo.write = async () => { throw new Error('Offline') }
  await f.sync.connect()
  f.clock.next()
  assert.equal(f.status?.status,'error')
  assert.equal(f.clock.save().game.day,2)
  f.sync.close()
})
