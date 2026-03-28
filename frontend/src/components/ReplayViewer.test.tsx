// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReplayViewer } from './ReplayViewer';

const replayEvents = [
  {
    sequence: 1,
    timestamp: '2024-01-01T00:00:01.000Z',
    type: 'roomCreated',
    playerId: 'p1'
  },
  {
    sequence: 2,
    timestamp: '2024-01-01T00:00:02.000Z',
    type: 'diceRolled',
    playerId: 'p2'
  }
];

describe('ReplayViewer', () => {
  it('filters events and supports stepping controls', async () => {
    render(
      <ReplayViewer
        replayRoomId="room-1"
        replayEvents={replayEvents}
        loadingReplay={false}
        roomInput=""
        currentRoomId="room-1"
        onRoomInputChange={() => undefined}
        onLoadReplay={vi.fn(async () => undefined)}
      />
    );

    const initialCount = screen.getByText(
      (_, node) =>
        node?.tagName === 'P' && (node.textContent ?? '').includes('2 / 2 events')
    );
    expect(initialCount).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search replay events'), {
      target: { value: 'dice' }
    });
    const filteredCount = screen.getByText(
      (_, node) =>
        node?.tagName === 'P' && (node.textContent ?? '').includes('1 / 2 events')
    );
    expect(filteredCount).toBeInTheDocument();
    expect(screen.queryByText(/roomCreated/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(/Step 1:/)).toBeInTheDocument();
    expect(screen.getAllByText(/diceRolled/).length).toBeGreaterThan(0);
  });
});
