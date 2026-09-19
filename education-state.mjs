export const PROGRESS_KEY = 'duyue.ai.entry.progress.v2';

export function normalizeProgress(raw, validIds) {
  const result = { lastLessonId: '', lessons: {} };
  if (!raw || typeof raw !== 'object') return result;
  if (validIds.includes(raw.lastLessonId)) result.lastLessonId = raw.lastLessonId;
  for (const id of validIds) {
    const entry = raw.lessons?.[id];
    if (!entry || typeof entry !== 'object') continue;
    const time = Number(entry.time);
    const duration = Number(entry.duration);
    if (!Number.isFinite(time) || !Number.isFinite(duration) || time < 0 || duration <= 0) continue;
    result.lessons[id] = {time:Math.min(time, duration),duration,completed:entry.completed === true};
  }
  return result;
}

export function recordProgress(state, id, time, duration, ended = false) {
  if (!Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0 || time < 0) return state;
  const completed = Boolean(state.lessons[id]?.completed || ended || time / duration >= .95);
  return {...state,lastLessonId:id,lessons:{...state.lessons,[id]:{time:Math.min(time,duration),duration,completed}}};
}

export function adjacentLesson(ids, current, offset) {
  const index = ids.indexOf(current);
  return index < 0 ? null : ids[index + offset] ?? null;
}

export function safeMediaUrl(value, base) {
  if (!value || typeof value !== 'string') return null;
  try {
    const url = new URL(value, base);
    return ['https:','http:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}
