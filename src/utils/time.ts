import { DateTime } from 'luxon';
import { env } from '../env';

export type Scope = 'day' | 'week' | 'month';

/** Current time in server timezone (env.tz). Use for all date/time logic. */
export function nowInTz(): DateTime {
  return DateTime.now().setZone(env.tz);
}

/** Default "now" in server TZ for helpers that accept optional now. */
function defaultNow() {
  return nowInTz();
}

// 判断当前时间是否在 上午 6 点到晚上 8 点之间，如果在，则允许统计运动数据。
export function isWithinValidCollectWindow(now = defaultNow()) {
  const h = now.hour;
  return h >= 6 && h < 20;
}

// 判断当前时间是否在 晚上 10 点到次日早上 6 点之间，如果在，则视为夜间休眠时间，不统计运动数据。
export function isNightQuiet(now = defaultNow()) {
  const h = now.hour;
  return h >= 22 || h < 6;
}

export function getRangeForScope(scope: Scope, startAt = defaultNow(), endAt = defaultNow()) {
    if (scope === 'day') {
      return { start: startAt.toJSDate(), end: endAt.toJSDate() };
    }

    if (scope === 'week') {
      // 以周一为一周开始（常见国内口径）
      const start = endAt.startOf('week');  // 周一 00:00:00
      const end = endAt.endOf('week');      // 周日 23:59:59
      return { start: start.toJSDate(), end: end.toJSDate() };
    }
    
    // month
    const start = startAt.startOf('month');
    const end = endAt.endOf('month');
    return { start: start.toJSDate(), end: end.toJSDate() };
}

export function startOfToday(): Date {
  return nowInTz().startOf('day').toJSDate();
}

export function sameYMD(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export function formatCnRange(s: Date, e: Date): string {
  const sTxt = `${s.getMonth()+1}月${s.getDate()}日`;
  const eTxt = `${e.getMonth()+1}月${e.getDate()}日`;
  return sameYMD(s, e) ? sTxt : `${sTxt}-${eTxt}`;
}