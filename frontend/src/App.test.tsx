import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import App from './App';

vi.mock('./useIncidentFeed', () => ({
  useIncidentFeed: () => ({
    updates: [],
    status: 'connected',
    retryAttempt: 0,
    maxRetries: 8,
    retriesExhausted: false,
    isPaused: false,
    lastSequence: 0,
    connectionError: null,
    simulateOutage: vi.fn(),
    resumeConnection: vi.fn(),
    retry: vi.fn(),
  }),
}));

test('renders the feed and labeled demo controls', () => {
  const openWindow = vi.spyOn(window, 'open').mockImplementation(() => null);
  render(<App />);
  expect(
    screen.getByRole('heading', {
      name: 'Reconnecting Real-Time Incident Feed',
    }),
  ).toBeInTheDocument();
  expect(screen.getByText('connected')).toBeInTheDocument();
  expect(screen.getAllByText('incident-001')).toHaveLength(2);
  expect(screen.getByText('Last sequence')).toBeInTheDocument();
  expect(screen.getByText('Reconnect attempt')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Open Client B' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Open Client B' }));
  expect(openWindow).toHaveBeenCalledWith(
    expect.objectContaining({
      search: expect.stringContaining('client=B'),
    }),
    'incident-feed-client-b',
    expect.stringContaining('width=760'),
  );
  expect(screen.getByRole('region', { name: 'Demo controls' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Simulate outage' })).toBeInTheDocument();
});
