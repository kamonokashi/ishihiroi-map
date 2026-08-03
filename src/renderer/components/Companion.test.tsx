import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Companion } from './Companion';

test('renders state label and button', () => {
  render(
    <Companion
      state={{
        activeSession: { status: 'idle', totalWorkSeconds: 0, totalBreakSeconds: 0 },
        availableActions: ['startWork']
      }}
      onStartWork={() => undefined}
      onStartBreak={() => undefined}
      onEndSession={() => undefined}
      onOpenDetail={() => undefined}
    />
  );
  expect(screen.getByText('状態')).not.toBeNull();
  expect(screen.getByText('idle')).not.toBeNull();
  expect(screen.getByRole('button', { name: /作業をはじめる/i })).not.toBeNull();
});
