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
});
