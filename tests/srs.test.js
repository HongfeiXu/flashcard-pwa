// tests/srs.test.js - SRS 间隔重复算法测试用例
// TDD：先写测试，再实现 js/lib/srs.js

import { describe, it, expect, beforeEach } from 'vitest';
import {
  INTERVALS,
  STREAK_TO_LEVEL_UP,
  MAX_LEVEL,
  addDays,
  selectTodayWords,
  processAnswer,
} from '../js/lib/srs.js';

// --- 辅助函数 ---
function makeCard(word, overrides = {}) {
  return {
    word,
    level: 0,
    correctStreak: 0,
    nextReviewDate: null,  // null = 新词
    totalReviews: 0,
    mastered: false,
    createdAt: Date.now(),
    lastReviewedAt: null,
    ...overrides,
  };
}

// ============================
// 一、常量验证
// ============================
describe('SRS 常量', () => {
  it('间隔为 [1, 3, 7, 30]', () => {
    expect(INTERVALS).toEqual([1, 3, 7, 30]);
  });

  it('升级需要连续答对 2 次', () => {
    expect(STREAK_TO_LEVEL_UP).toBe(2);
  });

  it('最高等级为 3', () => {
    expect(MAX_LEVEL).toBe(3);
  });
});

// ============================
// 二、日期工具
// ============================
describe('addDays', () => {
  it('加 1 天', () => {
    expect(addDays('2026-02-14', 1)).toBe('2026-02-15');
  });

  it('跨月', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('加 30 天', () => {
    expect(addDays('2026-01-01', 30)).toBe('2026-01-31');
  });

  it('加 0 天', () => {
    expect(addDays('2026-02-14', 0)).toBe('2026-02-14');
  });
});

// ============================
// 三、每日选词算法
// ============================
describe('selectTodayWords', () => {
  const today = '2026-02-14';

  it('空词库返回空数组', () => {
    expect(selectTodayWords([], 10, today)).toEqual([]);
  });

  it('全部已掌握返回空数组', () => {
    const cards = [makeCard('a', { mastered: true }), makeCard('b', { mastered: true })];
    expect(selectTodayWords(cards, 10, today)).toEqual([]);
  });

  it('到期旧词优先于新词', () => {
    const cards = [
      makeCard('new1'),  // 新词
      makeCard('new2'),  // 新词
      makeCard('due', { level: 1, nextReviewDate: '2026-02-13' }),  // 已到期
    ];
    const result = selectTodayWords(cards, 2, today);
    expect(result).toContain('due');
    expect(result).toHaveLength(2);
  });

  it('全是新词时填满配额', () => {
    const cards = Array.from({ length: 10 }, (_, i) => makeCard(`new${i}`));
    const result = selectTodayWords(cards, 4, today);
    expect(result).toHaveLength(4);
  });

  it('到期旧词不足配额时用新词补充填满', () => {
    const cards = [
      makeCard('due1', { level: 0, nextReviewDate: '2026-02-14' }),  // 今天到期
      makeCard('new1'),
      makeCard('new2'),
      makeCard('new3'),
    ];
    // 配额4，到期1个，新词3个，总共4个填满配额
    const result = selectTodayWords(cards, 4, today);
    expect(result).toContain('due1');
    expect(result).toHaveLength(4);
  });

  it('未到期的词不会被选中', () => {
    const cards = [
      makeCard('future', { level: 1, nextReviewDate: '2026-02-20' }),  // 未到期
    ];
    const result = selectTodayWords(cards, 10, today);
    expect(result).toEqual([]);
  });

  it('到期旧词按 level 升序排列（低 level 优先）', () => {
    const cards = [
      makeCard('lv2', { level: 2, nextReviewDate: '2026-02-13' }),
      makeCard('lv0', { level: 0, nextReviewDate: '2026-02-13' }),
      makeCard('lv1', { level: 1, nextReviewDate: '2026-02-13' }),
    ];
    // 配额2，应该选 lv0 和 lv1（level 最低的优先）
    const result = selectTodayWords(cards, 2, today);
    expect(result).toContain('lv0');
    expect(result).toContain('lv1');
    expect(result).not.toContain('lv2');
  });

  it('超过配额时截取', () => {
    const cards = Array.from({ length: 20 }, (_, i) =>
      makeCard(`due${i}`, { level: 0, nextReviewDate: '2026-02-10' })
    );
    const result = selectTodayWords(cards, 10, today);
    expect(result).toHaveLength(10);
  });

  it('返回的是 word 字符串数组', () => {
    const cards = [makeCard('hello', { nextReviewDate: '2026-02-14' })];
    const result = selectTodayWords(cards, 10, today);
    expect(result).toEqual(['hello']);
    expect(typeof result[0]).toBe('string');
  });
});

// ============================
// 四、答题逻辑 - 首次答对
// ============================
describe('processAnswer - 答对', () => {
  const today = '2026-02-14';

  it('答对增加 correctStreak', () => {
    const card = makeCard('test', { level: 0, correctStreak: 0 });
    const result = processAnswer(card, true, today);
    expect(result.correctStreak).toBe(1);
  });

  it('答对增加 totalReviews', () => {
    const card = makeCard('test', { totalReviews: 3 });
    const result = processAnswer(card, true, today);
    expect(result.totalReviews).toBe(4);
  });

  it('答对更新 lastReviewedAt', () => {
    const card = makeCard('test');
    const result = processAnswer(card, true, today);
    expect(result.lastReviewedAt).toBeGreaterThan(0);
  });

  it('答对设置 nextReviewDate（level 0 → 1天后）', () => {
    const card = makeCard('test', { level: 0, correctStreak: 0 });
    const result = processAnswer(card, true, today);
    expect(result.nextReviewDate).toBe('2026-02-15');  // +1天
  });

  it('连续答对 2 次升级 level', () => {
    const card = makeCard('test', { level: 0, correctStreak: 1 });
    const result = processAnswer(card, true, today);
    expect(result.level).toBe(1);
    expect(result.correctStreak).toBe(0);  // 升级后重置
  });

  it('升级后 nextReviewDate 用新 level 的间隔', () => {
    // level 0 → 1，升级后用 level 1 的间隔（3天）
    const card = makeCard('test', { level: 0, correctStreak: 1 });
    const result = processAnswer(card, true, today);
    expect(result.level).toBe(1);
    expect(result.nextReviewDate).toBe('2026-02-17');  // +3天
  });

  it('level 1 → 2 升级后间隔 7 天', () => {
    const card = makeCard('test', { level: 1, correctStreak: 1 });
    const result = processAnswer(card, true, today);
    expect(result.level).toBe(2);
    expect(result.nextReviewDate).toBe('2026-02-21');  // +7天
  });

  it('level 2 → 3 升级后间隔 30 天', () => {
    const card = makeCard('test', { level: 2, correctStreak: 1 });
    const result = processAnswer(card, true, today);
    expect(result.level).toBe(3);
    expect(result.nextReviewDate).toBe('2026-03-16');  // +30天
  });

  it('level 3 连续答对 2 次 → mastered', () => {
    const card = makeCard('test', { level: 3, correctStreak: 1 });
    const result = processAnswer(card, true, today);
    expect(result.mastered).toBe(true);
    expect(result.nextReviewDate).toBeNull();
  });

  it('未达到升级条件不升级', () => {
    const card = makeCard('test', { level: 1, correctStreak: 0 });
    const result = processAnswer(card, true, today);
    expect(result.level).toBe(1);
    expect(result.correctStreak).toBe(1);
  });
});

// ============================
// 五、答题逻辑 - 首次答错
// ============================
describe('processAnswer - 答错', () => {
  const today = '2026-02-14';

  it('答错重置 correctStreak 为 0', () => {
    const card = makeCard('test', { level: 1, correctStreak: 1 });
    const result = processAnswer(card, false, today);
    expect(result.correctStreak).toBe(0);
  });

  it('答错不降级 level', () => {
    const card = makeCard('test', { level: 2, correctStreak: 1 });
    const result = processAnswer(card, false, today);
    expect(result.level).toBe(2);  // 保持不变
  });

  it('答错设置 nextReviewDate 为明天', () => {
    const card = makeCard('test', { level: 2 });
    const result = processAnswer(card, false, today);
    expect(result.nextReviewDate).toBe('2026-02-15');  // 明天
  });

  it('答错增加 totalReviews', () => {
    const card = makeCard('test', { totalReviews: 5 });
    const result = processAnswer(card, false, today);
    expect(result.totalReviews).toBe(6);
  });

  it('答错更新 lastReviewedAt', () => {
    const card = makeCard('test');
    const result = processAnswer(card, false, today);
    expect(result.lastReviewedAt).toBeGreaterThan(0);
  });
});

// ============================
// 六、完整升级路径
// ============================
describe('完整升级路径', () => {
  it('从新词到掌握需要 8 次答对', () => {
    let card = makeCard('test');
    let day = '2026-01-01';
    let totalCorrect = 0;

    // Level 0 → 1：答对 2 次
    for (let i = 0; i < 2; i++) {
      day = card.nextReviewDate || day;
      card = processAnswer(card, true, day);
      totalCorrect++;
    }
    expect(card.level).toBe(1);

    // Level 1 → 2：答对 2 次
    for (let i = 0; i < 2; i++) {
      day = card.nextReviewDate || day;
      card = processAnswer(card, true, day);
      totalCorrect++;
    }
    expect(card.level).toBe(2);

    // Level 2 → 3：答对 2 次
    for (let i = 0; i < 2; i++) {
      day = card.nextReviewDate || day;
      card = processAnswer(card, true, day);
      totalCorrect++;
    }
    expect(card.level).toBe(3);

    // Level 3 → mastered：答对 2 次
    for (let i = 0; i < 2; i++) {
      day = card.nextReviewDate || day;
      card = processAnswer(card, true, day);
      totalCorrect++;
    }
    expect(card.mastered).toBe(true);
    expect(totalCorrect).toBe(8);
  });

  it('答错后重置 streak 但不降级', () => {
    let card = makeCard('test', { level: 1, correctStreak: 1 });
    // 本来再答对一次就升级，但答错了
    card = processAnswer(card, false, '2026-02-14');
    expect(card.level).toBe(1);      // 不降级
    expect(card.correctStreak).toBe(0); // streak 归零
    // 需要重新连续答对 2 次才能升级
    card = processAnswer(card, true, '2026-02-15');
    expect(card.level).toBe(1);
    expect(card.correctStreak).toBe(1);
    card = processAnswer(card, true, '2026-02-16');
    expect(card.level).toBe(2);      // 终于升级
  });
});

// ============================
// 七、processAnswer 不修改原对象
// ============================
describe('processAnswer 纯函数', () => {
  it('返回新对象，不修改原卡片', () => {
    const card = makeCard('test', { level: 0, correctStreak: 0 });
    const original = { ...card };
    const result = processAnswer(card, true, '2026-02-14');
    expect(card).toEqual(original);  // 原对象未变
    expect(result).not.toBe(card);   // 是新对象
  });
});
