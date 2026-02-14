import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { getAllCards, getCard, addCard, putCard, deleteCard, clearAll, bulkImport } from '../js/db.js';

beforeEach(async () => {
  await clearAll();
});

const makeCard = (word) => ({
  word,
  phonetic: '/test/',
  pos: 'n.',
  definition: 'test definition',
  example: 'test example',
  example_cn: '测试例句',
  mastered: false,
  createdAt: Date.now(),
  reviewCount: 0,
  correctCount: 0,
  lastReviewedAt: null,
});

describe('addCard / getCard', () => {
  it('adds and retrieves a card', async () => {
    await addCard(makeCard('hello'));
    const card = await getCard('hello');
    expect(card).toBeTruthy();
    expect(card.word).toBe('hello');
    expect(card.definition).toBe('test definition');
  });

  it('throws on duplicate add', async () => {
    await addCard(makeCard('hello'));
    await expect(addCard(makeCard('hello'))).rejects.toThrow();
  });
});

describe('putCard', () => {
  it('updates an existing card', async () => {
    await addCard(makeCard('hello'));
    const updated = { ...makeCard('hello'), mastered: true };
    await putCard(updated);
    const card = await getCard('hello');
    expect(card.mastered).toBe(true);
  });

  it('creates card if not exists (upsert)', async () => {
    await putCard(makeCard('new'));
    const card = await getCard('new');
    expect(card.word).toBe('new');
  });
});

describe('deleteCard', () => {
  it('deletes a card', async () => {
    await addCard(makeCard('hello'));
    await deleteCard('hello');
    const card = await getCard('hello');
    expect(card).toBeUndefined();
  });
});

describe('getAllCards', () => {
  it('returns empty array for empty db', async () => {
    const all = await getAllCards();
    expect(all).toEqual([]);
  });

  it('returns all cards', async () => {
    await addCard(makeCard('a'));
    await addCard(makeCard('b'));
    await addCard(makeCard('c'));
    const all = await getAllCards();
    expect(all.length).toBe(3);
  });
});

describe('clearAll', () => {
  it('clears all cards', async () => {
    await addCard(makeCard('a'));
    await addCard(makeCard('b'));
    await clearAll();
    const all = await getAllCards();
    expect(all).toEqual([]);
  });
});

describe('bulkImport', () => {
  it('imports multiple cards', async () => {
    await bulkImport([makeCard('x'), makeCard('y'), makeCard('z')]);
    const all = await getAllCards();
    expect(all.length).toBe(3);
  });

  it('overwrites existing cards (put semantics)', async () => {
    await addCard(makeCard('x'));
    await bulkImport([{ ...makeCard('x'), mastered: true }]);
    const card = await getCard('x');
    expect(card.mastered).toBe(true);
  });
});
