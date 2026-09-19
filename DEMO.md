# Interview demo

## Start the stack

Use the commands in `README.md` to start PostgreSQL, apply migrations, and run
FastAPI and Vite. If the default backend port is occupied, Vite supports an
alternate development target:

```powershell
$env:VITE_BACKEND_TARGET = 'http://127.0.0.1:8001'
npm.cmd run dev -- --host 127.0.0.1 --port 5174
```

The normal defaults remain ports 8001 and 5173.

## Two-client walkthrough

1. Open Client A at `/?room=incident-001&client=A`.
2. Select **Open Client B**. Arrange the two browser windows side by side.
3. Confirm both status panels show **Connected**, room `incident-001`, cursor 0
   (or the room's current last sequence), and reconnect attempt `0 / 8`.
4. Publish from Client A. Confirm Client B receives the same sequence immediately.
5. Select **Simulate outage** on Client B. Confirm it shows **Disconnected** and
   retains its last processed sequence.
6. Publish at least two updates from Client A. Client B remains unchanged.
7. Select **Resume connection** on Client B. It reconnects with its stored cursor,
   replays the missed updates, and shows one row per update in ascending sequence.

The walkthrough, diagnostics, and second-client launcher appear only in Vite's
development build. Production retains concise connection state and public error
messages without debug metadata or stack traces.

## Server observability

At INFO level, the server logs compact key-value events without message content:

```text
event=websocket_connected room_id=incident-001 after=143
event=websocket_replay_completed room_id=incident-001 after=143 replay_count=2
event=incident_update_accepted room_id=incident-001 sequence=145
event=websocket_disconnected room_id=incident-001
```

These show connection lifecycle, recovery cursor/count, and accepted sequence.
PostgreSQL remains the durable source of truth.

## Verified scenario

The walkthrough was exercised with two real Chrome clients against FastAPI,
PostgreSQL 17, and Vite. Client B received sequence 143 live, paused at cursor 143,
missed sequences 144 and 145, then resumed and displayed 143, 144, and 145 exactly
once in ascending order. No mocked demo data was used.
