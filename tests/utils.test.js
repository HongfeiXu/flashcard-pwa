import { describe, it, expect } from 'vitest';
import { esc, safeStr, friendlyError, validateWord, shuffle } from '../js/lib/utils.js';

describe('esc', () => {
  it('returns empty string for null/undefined/empty', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
    expect(esc('')).toBe('');
  });

  it('escapes HTML special characters', () => {
    expect(esc('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(esc("it's & <done>")).toBe("it&#39;s &amp; &lt;done&gt;");
  });

  it('leaves normal text unchanged', () => {
    expect(esc('hello world')).toBe('hello world');
  });

  it('converts numbers to string', () => {
    expect(esc(123)).toBe('123');
  });
});

describe('safeStr', () => {
  it('returns empty string for null/undefined', () => {
    expect(safeStr(null, 10)).toBe('');
    expect(safeStr(undefined, 10)).toBe('');
  });

  it('truncates to maxLen', () => {
    expect(safeStr('abcdef', 3)).toBe('abc');
  });

  it('converts number to string', () => {
    expect(safeStr(42, 10)).toBe('42');
  });

  it('returns full string if shorter than maxLen', () => {
    expect(safeStr('hi', 10)).toBe('hi');
  });
});

describe('friendlyError', () => {
  it('returns default message for null', () => {
    expect(friendlyError(null)).toBe('操作失败，请稍后重试');
  });

  it('maps known error keys', () => {
    expect(friendlyError(new Error('DB_UNAVAILABLE'))).toContain('无法访问本地存储');
    expect(friendlyError(new Error('STORAGE_FULL'))).toContain('存储空间不足');
    expect(friendlyError(new Error('NETWORK'))).toContain('网络连接失败');
  });

  it('falls back to error message for unknown keys', () => {
    expect(friendlyError(new Error('something weird'))).toBe('something weird');
  });

  it('handles error with no message', () => {
    expect(friendlyError({})).toBe('操作失败，请稍后重试');
  });
});

describe('validateWord', () => {
  it('rejects empty input', () => {
    expect(validateWord('')).toEqual({ valid: false, msg: '请输入单词' });
    expect(validateWord('   ')).toEqual({ valid: false, msg: '请输入单词' });
  });

  it('rejects too long input', () => {
    const long = 'a'.repeat(51);
    expect(validateWord(long).valid).toBe(false);
  });

  it('rejects input with numbers', () => {
    expect(validateWord('abc123').valid).toBe(false);
  });

  it('rejects input starting with non-letter', () => {
    expect(validateWord('-hello').valid).toBe(false);
  });

  it('accepts normal words', () => {
    expect(validateWord('hello')).toEqual({ valid: true, word: 'hello' });
  });

  it('accepts words with hyphens and apostrophes', () => {
    expect(validateWord("don't")).toEqual({ valid: true, word: "don't" });
    expect(validateWord('well-known')).toEqual({ valid: true, word: 'well-known' });
  });

  it('lowercases the word', () => {
    expect(validateWord('Hello').word).toBe('hello');
  });
});

describe('shuffle', () => {
  it('returns same length array', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle([...arr]);
    expect(result.length).toBe(arr.length);
  });

  it('contains same elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle([...arr]);
    expect(result.sort()).toEqual(arr.sort());
  });

  it('handles empty array', () => {
    expect(shuffle([])).toEqual([]);
  });

  it('handles single element', () => {
    expect(shuffle([1])).toEqual([1]);
  });
});
