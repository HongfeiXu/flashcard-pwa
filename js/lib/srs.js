// lib/srs.js - SRS 间隔重复算法

import { shuffle } from './utils.js';

export const INTERVALS = [1, 3, 7, 30];
export const STREAK_TO_LEVEL_UP = 2;
export const MAX_LEVEL = 3;

export function getTodayDate() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
}

export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

export function selectTodayWords(allCards, quota, today) {
  const active = allCards.filter(w => !w.mastered);
  const dueOld = active.filter(w => w.nextReviewDate && w.nextReviewDate <= today);
  const newWords = active.filter(w => !w.nextReviewDate);

  dueOld.sort((a, b) => (a.level - b.level) || ((a.lastReviewedAt || 0) - (b.lastReviewedAt || 0)));
  shuffle(newWords);

  let todayList = [...dueOld];
  if (todayList.length < quota) {
    todayList.push(...newWords.slice(0, quota - todayList.length));
  }
  todayList = todayList.slice(0, quota);
  shuffle(todayList);

  return todayList.map(w => w.word);
}

export function processAnswer(card, isCorrect, today) {
  const result = { ...card };
  result.totalReviews = (result.totalReviews || 0) + 1;
  result.lastReviewedAt = Date.now();

  if (isCorrect) {
    result.correctStreak = (result.correctStreak || 0) + 1;
    if (result.correctStreak >= STREAK_TO_LEVEL_UP) {
      result.level = (result.level || 0) + 1;
      result.correctStreak = 0;
      if (result.level > MAX_LEVEL) {
        result.mastered = true;
        result.nextReviewDate = null;
      } else {
        result.nextReviewDate = addDays(today, INTERVALS[result.level]);
      }
    } else {
      result.nextReviewDate = addDays(today, INTERVALS[result.level || 0]);
    }
  } else {
    result.correctStreak = 0;
    result.nextReviewDate = addDays(today, 1);
  }

  return result;
}
