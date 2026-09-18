# Acceptance coverage

The backend acceptance tests use the real FastAPI routes, service, repository,
Alembic-managed PostgreSQL table, and WebSocket connection manager. The browser
tests exercise the public `useIncidentFeed` result with only the WebSocket
transport mocked; fake timers make backoff deterministic.

| Criterion | Automated verification |
| --- | --- |
| AC1: REST publish reaches another connected client | `test_rest_publish_reaches_another_live_client_in_the_same_room` connects two sockets to one room, publishes through the real REST route, and compares both envelopes with the committed POST response. |
| AC2: interruption is visible | `moves through connecting, connected, and reconnecting after an unexpected close`; retry exhaustion and browser offline tests also assert `disconnected`. |
| AC3: cursor-gap recovery returns every missed update | `test_disconnect_gap_and_reconnect_replays_every_missed_update` records a live cursor, disconnects, commits three REST updates, reconnects with that cursor, and receives all three in ascending order. |
| AC4: overlapping delivery produces one logical update | `deduplicates replay and live overlap after reconnecting` sends duplicate recovered envelopes and asserts one ID-keyed, sorted domain result. |
| AC5: deterministic ascending order | The AC3 test asserts replay order; `test_initial_history_ordering_and_paging`, `test_ordering_cursor_and_room_isolation`, and both hook merge tests independently assert sequence ordering. |

Additional focused coverage includes strict cursor boundaries, reconnect URLs,
room isolation, subscriber cleanup, slow-subscriber eviction, bounded retries,
delayed backoff, online/offline behavior, timer cleanup, input validation, and
database constraints.

## Manual browser demonstration

A physical network failure is not emulated by the in-process test transports.
Its observable behavior is split into real server disconnect/replay tests and a
mocked browser `close` event with retry timers. To demonstrate the complete user
flow manually:

1. Start PostgreSQL, migrate, then start FastAPI and Vite as documented in `README.md`.
2. Open two tabs in `incident-001` and confirm a publish in tab A appears in tab B.
3. In tab B, select **Simulate outage** and note the `disconnected` state.
4. Publish several updates from tab A while tab B remains paused.
5. Select **Resume connection** in tab B. It reconnects with its stored cursor,
   merges replay by update ID, and renders the missed updates by ascending sequence.

Unexpected closure uses automatic backoff; the demo outage is intentionally
paused so this recovery sequence can be observed without racing a retry timer.

## Final verification

Backend, using the isolated PostgreSQL 17 database:

```powershell
$env:TEST_DATABASE_URL = 'postgresql+asyncpg://incident_feed:incident_feed@localhost:5433/incident_feed_test'
$env:DATABASE_URL = $env:TEST_DATABASE_URL
$env:RUN_DB_TESTS = '1'
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic check
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m ruff format --check .
.\.venv\Scripts\python.exe -m mypy
```

Result: **49 tests passed**. Alembic found no pending upgrade or model drift;
Ruff and strict mypy passed. The only warnings are two upstream deprecation
warnings from Starlette's current WebSocket test-client compatibility layer.

Frontend:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Result: **10 tests passed** across two files. TypeScript, ESLint, and the Vite
production build passed.
