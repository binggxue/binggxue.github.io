import {
  NOTES_URL,
  startOfDay,
  isToday,
  formatDate,
  formatNoteDate,
  formatLastModified,
} from "./common.js";
import { SolarDay, SolarFestival } from "tyme4ts";

const state = {
  almacDate: null,
};

const elements = {
  noteCount: document.getElementById("noteCount"),
  noteCountLabel: document.getElementById("noteCountLabel"),
  notesList: document.getElementById("notesList"),
  homeUpdated: document.getElementById("homeUpdated"),
  hitokoto: document.getElementById("hitokoto"),
  hitokotoSource: document.getElementById("hitokotoSource"),
  almacCard: document.getElementById("almacCard"),
  almacDateLabel: document.getElementById("almacDateLabel"),
  almacLunar: document.getElementById("almacLunar"),
  almacYi: document.getElementById("almacYi"),
  almacJi: document.getElementById("almacJi"),
  almacFestival: document.getElementById("almacFestival"),
  previousDayButton: document.getElementById("previousDayButton"),
  nextDayButton: document.getElementById("nextDayButton"),
};

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  elements.homeUpdated.textContent = `最近一次更新：${formatLastModified()}`;
  state.almacDate = startOfDay(new Date());
  loadNotes();
  loadHitokoto();
  renderAlmanac(state.almacDate);
});

function bindEvents() {
  elements.previousDayButton.addEventListener("click", () => changeAlmanacDay(-1));
  elements.nextDayButton.addEventListener("click", () => changeAlmanacDay(1));
}

async function loadNotes() {
  try {
    const response = await fetch(NOTES_URL);
    if (!response.ok) {
      throw new Error(`笔记数据读取失败：${response.status}`);
    }

    const rawData = await response.json();
    const notes = Array.isArray(rawData) ? rawData : rawData.notes;
    if (!Array.isArray(notes)) {
      throw new Error("notes 必须是数组");
    }

    renderNotes(notes);
  } catch (error) {
    console.error(error);
    elements.noteCount.textContent = "--";
    elements.noteCountLabel.textContent = "--";
    elements.notesList.innerHTML = "";
    appendNotesEmpty("学习笔记暂时不可用，请检查 notes.json");
  }
}

async function loadHitokoto() {
  try {
    const response = await fetch("https://v1.jinrishici.com/all");
    const data = await response.json();
    elements.hitokoto.textContent = data.content;
    elements.hitokotoSource.textContent = `${data.author}《${data.origin}》`;
  } catch (error) {
    console.error("加载失败：", error);
    elements.hitokoto.textContent = "（加载失败）";
    elements.hitokotoSource.textContent = "";
  }
}

function renderAlmanac(date) {
  try {
    const target = startOfDay(date);
    const year = target.getFullYear();
    const month = target.getMonth() + 1;
    const day = target.getDate();
    const solarDay = SolarDay.fromYmd(year, month, day);
    const lunarDay = solarDay.getLunarDay();

    const yi = lunarDay.getRecommends().map((item) => item.getName());
    const ji = lunarDay.getAvoids().map((item) => item.getName());

    const festivalText = resolveFestivalText(
      solarDay.getLegalHoliday(),
      lunarDay.getFestival(),
      SolarFestival.fromYmd(year, month, day),
    );
    const termText = resolveTermText(solarDay, festivalText);

    elements.almacDateLabel.textContent = isToday(target)
      ? formatDate(target, true) + "(今天)"
      : formatDate(target, true);
    elements.almacLunar.textContent = lunarDay.toString();
    elements.almacYi.textContent = yi.length ? yi.join("、") : "—";
    elements.almacJi.textContent = ji.length ? ji.join("、") : "—";

    const label = [festivalText, termText].filter(Boolean).join(" · ");
    elements.almacFestival.textContent = label;
    elements.almacFestival.hidden = !label;
    elements.almacCard.hidden = false;
  } catch (error) {
    console.error("黄历加载失败：", error);
    elements.almacCard.hidden = true;
  }
}

function resolveFestivalText(legalHoliday, lunarFestival, solarFestival) {
  if (legalHoliday && !legalHoliday.isWork()) {
    const isFestivalDay = [lunarFestival, solarFestival].some(
      (festival) => festival && festival.getName() === legalHoliday.getName(),
    );
    return isFestivalDay ? legalHoliday.getName() : `${legalHoliday.getName()}假期`;
  }
  if (lunarFestival) {
    return lunarFestival.getName();
  }
  if (solarFestival) {
    return solarFestival.getName();
  }
  if (legalHoliday && legalHoliday.isWork()) {
    return `${legalHoliday.getName()}·调休`;
  }
  return "";
}

function resolveTermText(solarDay, festivalText) {
  const termDay = solarDay.getTermDay();
  if (termDay.getDayIndex() !== 0) {
    return "";
  }
  const termName = termDay.getSolarTerm().getName();
  if (festivalText === termName || festivalText === `${termName}节`) {
    return "";
  }
  return termName;
}

function changeAlmanacDay(offset) {
  const next = new Date(state.almacDate);
  next.setDate(next.getDate() + offset);
  state.almacDate = startOfDay(next);
  renderAlmanac(state.almacDate);
}

function renderNotes(notes) {
  elements.notesList.innerHTML = "";
  elements.noteCount.textContent = String(notes.length);
  elements.noteCountLabel.textContent = String(notes.length);

  if (notes.length === 0) {
    appendNotesEmpty("还没有学习笔记");
    return;
  }

  notes.forEach((note, index) => {
    const link = document.createElement("a");
    const title = String(note.title || `学习笔记 ${index + 1}`);
    const url = String(note.url || "#");
    link.className = "note-item";
    link.href = url;
    link.setAttribute("aria-label", `打开学习笔记：${title}`);
    if (url !== "#") {
      link.target = "_blank";
      link.rel = "noopener";
    }

    const fileMark = document.createElement("span");
    fileMark.className = "note-file-mark";
    fileMark.setAttribute("aria-hidden", "true");
    fileMark.textContent = String(note.type || "PDF");

    const copy = document.createElement("span");
    copy.className = "note-copy";
    const heading = document.createElement("strong");
    heading.textContent = title;
    const summary = document.createElement("span");
    summary.className = "note-summary";
    summary.textContent = String(note.summary || "打开 PDF 查看笔记内容");
    const meta = document.createElement("span");
    meta.className = "note-meta";
    meta.textContent = `${String(note.category || "学习笔记")}，${formatNoteDate(note.date)}`;
    copy.append(heading, summary);

    link.append(fileMark, copy, meta);
    elements.notesList.append(link);
  });
}

function appendNotesEmpty(message) {
  const empty = document.createElement("div");
  empty.className = "home-empty";
  empty.textContent = message;
  elements.notesList.append(empty);
}
