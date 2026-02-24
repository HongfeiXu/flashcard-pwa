import { describe, it, expect } from 'vitest';
import { renderMnemonicText } from '../js/lib/markdown.js';

describe('renderMnemonicText', () => {
  it('renders **bold** as <strong>', () => {
    const html = renderMnemonicText('**bold**');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('renders *italic* as <em>', () => {
    const html = renderMnemonicText('*italic*');
    expect(html).toContain('<em>italic</em>');
  });

  it('renders # heading as <h3>', () => {
    const html = renderMnemonicText('# heading');
    expect(html).toContain('<h3>');
    expect(html).toContain('heading');
  });

  it('renders --- as <hr>', () => {
    const html = renderMnemonicText('---');
    expect(html).toContain('<hr>');
  });

  it('renders > quote as <blockquote>', () => {
    const html = renderMnemonicText('> quote');
    expect(html).toContain('<blockquote');
    expect(html).toContain('quote');
  });

  it('renders > with leading spaces as <blockquote>', () => {
    const html = renderMnemonicText('  > indented quote');
    expect(html).toContain('<blockquote');
    expect(html).toContain('indented quote');
  });

  it('renders > **bold in quote** with strong inside blockquote', () => {
    const html = renderMnemonicText('> **bold in quote**');
    expect(html).toContain('<blockquote');
    expect(html).toContain('<strong>bold in quote</strong>');
  });

  it('renders - item as unordered list bullet', () => {
    const html = renderMnemonicText('- item');
    expect(html).toContain('•');
    expect(html).toContain('item');
  });

  it('renders ∙ item as unordered list bullet', () => {
    const html = renderMnemonicText('∙ item');
    expect(html).toContain('•');
    expect(html).toContain('item');
  });

  it('trims first line containing the word', () => {
    const html = renderMnemonicText('About the word hello\nactual content', 'hello');
    expect(html).not.toContain('About the word');
    expect(html).toContain('actual content');
  });

  it('keeps first line if it does not contain the word', () => {
    const html = renderMnemonicText('first line\nsecond line', 'banana');
    expect(html).toContain('first line');
    expect(html).toContain('second line');
  });

  it('returns empty string for empty text', () => {
    const html = renderMnemonicText('');
    // single empty line → <br>
    expect(html).toBe('<br>');
  });

  it('renders markdown table with header and data rows', () => {
    const input = '| 搭配 | 释义 |\n|---|---|\n| give up | 放弃 |';
    const html = renderMnemonicText(input);
    expect(html).toContain('<table');
    expect(html).toContain('<th');
    expect(html).toContain('搭配');
    expect(html).toContain('<td');
    expect(html).toContain('give up');
    expect(html).toContain('放弃');
  });

  it('renders table without separator row', () => {
    const input = '| col1 | col2 |\n| a | b |';
    const html = renderMnemonicText(input);
    expect(html).toContain('<table');
    expect(html).toContain('col1');
    expect(html).toContain('a');
  });

  it('renders bold inside table cell', () => {
    const input = '| **词根** | 含义 |\n|---|\n| pre- | 前 |';
    const html = renderMnemonicText(input);
    expect(html).toContain('<strong>词根</strong>');
  });
});
