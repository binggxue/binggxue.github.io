/**
 * 个人主页共享的日期与工具函数。
 */

export const NOTES_URL = "data/notes.json";

/* ---------------- 日期工具 ---------------- */

export function parseDate(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isToday(date) {
  return formatDateKey(date) === formatDateKey(new Date());
}

export function formatDate(date, includeYear = false) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: includeYear ? "numeric" : undefined,
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatNoteDate(value) {
  if (!value) {
    return "日期待补充";
  }
  const date = parseDate(value);
  return Number.isNaN(date.getTime()) ? String(value) : formatDate(date, true);
}

export function formatLastModified() {
  const lastModified = new Date(document.lastModified);
  if (Number.isNaN(lastModified.getTime())) {
    return "--";
  }

  const pad = (value) => String(value).padStart(2, "0");
  return `${lastModified.getFullYear()}/${pad(lastModified.getMonth() + 1)}/${pad(
    lastModified.getDate(),
  )} ${pad(lastModified.getHours())}:${pad(lastModified.getMinutes())}:${pad(
    lastModified.getSeconds(),
  )}`;
}
