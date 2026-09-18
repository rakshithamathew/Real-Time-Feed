import { FormEvent, useState } from 'react';
import { useIncidentFeed } from './useIncidentFeed';

const initialQuery = new URLSearchParams(window.location.search);

export default function App() {
  const [roomId, setRoomId] = useState(initialQuery.get('room') || 'incident-001');
  const [content, setContent] = useState('');
  const [publishError, setPublishError] = useState('');
  const feed = useIncidentFeed(roomId);
  const clientLabel = initialQuery.get('client') || 'A';
  const isDevelopment = import.meta.env.DEV;

  const openSecondClient = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    url.searchParams.set('client', 'B');
    window.open(
      url,
      'incident-feed-client-b',
      'popup=yes,width=760,height=900,left=780,top=40',
    );
  };

  const publish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPublishError('');
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error('Publish failed');
      setContent('');
    } catch {
      setPublishError('Could not publish the update.');
    }
  };

  return (
    <main>
      <header>
        <span className="eyebrow">Interview demonstration</span>
        <h1>Reconnecting Real-Time Incident Feed</h1>
        <p>Client {clientLabel} · durable replay from PostgreSQL</p>
      </header>

      {isDevelopment && (
        <section className="demo-guide" aria-labelledby="demo-guide-title">
          <div>
            <span className="eyebrow">Two-client walkthrough</span>
            <h2 id="demo-guide-title">Run the recovery scenario</h2>
          </div>
          <button type="button" onClick={openSecondClient}>Open Client B</button>
          <ol>
            <li>Keep both clients in <strong>incident-001</strong> and confirm Connected.</li>
            <li>Publish from Client A and watch the update appear in Client B.</li>
            <li>On Client B, select Simulate outage and confirm Disconnected.</li>
            <li>Publish at least two more updates from Client A.</li>
            <li>Resume Client B; missed updates arrive once, in sequence order.</li>
          </ol>
        </section>
      )}

      <section className="room-controls" aria-label="Room selection">
        <label>
          Current room
          <input value={roomId} onChange={(event) => setRoomId(event.target.value)} />
        </label>
      </section>

      <section className="connection" aria-label="Connection status" aria-live="polite">
        <div>
          <span className="metric-label">Connection</span>
          <strong className={`status status-${feed.status}`}>{feed.status}</strong>
        </div>
        {isDevelopment && (
          <>
            <div>
              <span className="metric-label">Room</span>
              <strong>{roomId}</strong>
            </div>
            <div>
              <span className="metric-label">Last sequence</span>
              <strong>{feed.lastSequence}</strong>
            </div>
            <div>
              <span className="metric-label">Reconnect attempt</span>
              <strong>{feed.retryAttempt} / {feed.maxRetries}</strong>
            </div>
          </>
        )}
        {feed.status === 'reconnecting' && (
          <span>Retry {feed.retryAttempt} of {feed.maxRetries}</span>
        )}
        {feed.retriesExhausted && <button onClick={feed.retry}>Retry</button>}
        {feed.connectionError && <p className="connection-error">{feed.connectionError}</p>}
      </section>

      <section className="demo-controls" aria-label="Demo controls">
        <strong>Demo controls</strong>
        <p>
          Pause this client, publish from a second tab, then resume to demonstrate replay.
        </p>
        {!feed.isPaused ? (
          <button type="button" onClick={feed.simulateOutage}>
            Simulate outage
          </button>
        ) : (
          <button type="button" onClick={feed.resumeConnection}>
            Resume connection
          </button>
        )}
      </section>

      <form onSubmit={publish}>
        <label>
          Update
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            required
          />
        </label>
        <button type="submit">Publish update</button>
        {publishError && <p role="alert">{publishError}</p>}
      </form>

      <ol aria-label="Incident updates">
        {feed.updates.length === 0 && <li className="empty">No updates yet.</li>}
        {feed.updates.map((update) => (
          <li key={update.updateId}>
            <span className="sequence">#{update.sequence}</span>
            <span>{update.content}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
