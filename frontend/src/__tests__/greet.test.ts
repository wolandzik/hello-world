import { describe, expect, it } from 'vitest';
import { greet } from '../lib/greet';

describe('greet', () => {
  it('returns a friendly message', () => {
    expect(greet('Tester')).toBe('Welcome, Tester!');
  });
});
