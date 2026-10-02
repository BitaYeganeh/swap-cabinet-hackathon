import { AI_TIMEOUT_MS, shouldUseAi } from './searchMode';

describe('shouldUseAi', () => {
  it('sends two or more words to the AI search', () => {
    expect(shouldUseAi('vintage jacket')).toBe(true);
    expect(shouldUseAi('something to keep me dry')).toBe(true);
    expect(shouldUseAi('  red\tdress \n')).toBe(true);
  });

  it('sends a single word to the keyword search', () => {
    expect(shouldUseAi('jacket')).toBe(false);
    expect(shouldUseAi('  jacket  ')).toBe(false);
  });

  it('treats empty input as not AI', () => {
    expect(shouldUseAi('')).toBe(false);
    expect(shouldUseAi('   ')).toBe(false);
    expect(shouldUseAi(undefined)).toBe(false);
  });

  it('times out after 30 seconds', () => {
    expect(AI_TIMEOUT_MS).toBe(30000);
  });
});
