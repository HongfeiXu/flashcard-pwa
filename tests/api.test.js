import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock location before importing api.js
vi.stubGlobal('location', { hostname: 'localhost' });

import { parseAIResponse, sanitizeWord, friendlyApiError, getCachedCard, setCachedCard, decryptVocab } from '../js/api.js';

describe('sanitizeWord', () => {
  it('returns cleaned lowercase word', () => {
    expect(sanitizeWord('Hello')).toBe('hello');
  });

  it('returns empty for non-string', () => {
    expect(sanitizeWord(123)).toBe('');
    expect(sanitizeWord(null)).toBe('');
  });

  it('returns empty for too long input', () => {
    expect(sanitizeWord('a'.repeat(51))).toBe('');
  });

  it('returns empty for input with numbers', () => {
    expect(sanitizeWord('abc123')).toBe('');
  });

  it('returns empty for empty string', () => {
    expect(sanitizeWord('')).toBe('');
    expect(sanitizeWord('   ')).toBe('');
  });

  it('accepts hyphens and apostrophes', () => {
    expect(sanitizeWord("don't")).toBe("don't");
    expect(sanitizeWord('well-known')).toBe('well-known');
  });
});

describe('friendlyApiError', () => {
  it('handles 401', () => {
    expect(friendlyApiError(401, '')).toContain('API Key 无效');
  });

  it('handles 402', () => {
    expect(friendlyApiError(402, '')).toContain('余额不足');
  });

  it('handles 429', () => {
    expect(friendlyApiError(429, '')).toContain('太频繁');
  });

  it('handles 500+', () => {
    expect(friendlyApiError(500, '')).toContain('暂时不可用');
    expect(friendlyApiError(503, '')).toContain('暂时不可用');
  });

  it('handles 403', () => {
    expect(friendlyApiError(403, '')).toContain('权限');
  });

  it('handles insufficient balance in body', () => {
    expect(friendlyApiError(400, 'insufficient balance')).toContain('余额不足');
  });

  it('handles unknown status', () => {
    expect(friendlyApiError(418, '')).toContain('418');
  });
});

describe('parseAIResponse', () => {
  it('parses normal JSON response', () => {
    const data = { content: [{ type: 'text', text: '{"word":"hello","definition":"你好"}' }] };
    const result = parseAIResponse(data);
    expect(result.word).toBe('hello');
  });

  it('handles ```json wrapped response', () => {
    const data = { content: [{ type: 'text', text: '```json\n{"word":"hello"}\n```' }] };
    expect(parseAIResponse(data).word).toBe('hello');
  });

  it('fixes trailing commas', () => {
    const data = { content: [{ type: 'text', text: '{"word":"hello",}' }] };
    expect(parseAIResponse(data).word).toBe('hello');
  });

  it('fixes Chinese quotes', () => {
    const data = { content: [{ type: 'text', text: '{\u201cword\u201d: \u201chello\u201d}' }] };
    expect(parseAIResponse(data).word).toBe('hello');
  });

  it('throws on no text block', () => {
    expect(() => parseAIResponse({ content: [{ type: 'image' }] })).toThrow();
  });

  it('throws on unparseable content', () => {
    expect(() => parseAIResponse({ content: [{ type: 'text', text: 'not json at all' }] })).toThrow();
  });

  it('strips <think> blocks', () => {
    const data = { content: [{ type: 'text', text: '<think>reasoning</think>{"word":"test"}' }] };
    expect(parseAIResponse(data).word).toBe('test');
  });
});

describe('LRU cache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null for cache miss', () => {
    expect(getCachedCard('nonexistent')).toBeNull();
  });

  it('returns cached data on hit', () => {
    setCachedCard('hello', { word: 'hello', definition: 'hi' });
    const result = getCachedCard('hello');
    expect(result.word).toBe('hello');
  });

  it('evicts oldest when exceeding 100', () => {
    for (let i = 0; i < 101; i++) {
      setCachedCard(`word${i}`, { word: `word${i}` });
    }
    // word0 should be evicted
    expect(getCachedCard('word0')).toBeNull();
    // word1 should still exist
    expect(getCachedCard('word1')).not.toBeNull();
  });

  it('promotes accessed item to end', () => {
    setCachedCard('a', { word: 'a' });
    setCachedCard('b', { word: 'b' });
    setCachedCard('c', { word: 'c' });
    // Access 'a' to promote it
    getCachedCard('a');
    // Now fill to 100
    for (let i = 0; i < 98; i++) {
      setCachedCard(`x${i}`, { word: `x${i}` });
    }
    // 'b' should be evicted first (oldest), 'a' should survive
    expect(getCachedCard('a')).not.toBeNull();
  });
});

describe('decryptVocab', () => {
  it('throws on corrupted data', async () => {
    await expect(decryptVocab('aW52YWxpZA==')).rejects.toThrow();
  });
});
