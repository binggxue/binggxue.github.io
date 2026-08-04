import {
  DAY_NAMES,
  COURSE_TONES,
  DATA_URL,
  NOTES_URL,
  normalizeSchedule,
  renderTodayTimeline,
  appendTodayEmpty,
  openCourseDialog,
  closeCourseDialog,
  getSemesterDateContext,
  getCoursePeriodBounds,
  getCourseLabelText,
  startOfDay,
  formatDate,
  formatNoteDate,
  formatLastModified,
} from "./common.js";

const state = {
  schedule: null,
};

const elements = {
  todayDate: document.getElementById("todayDate"),
  todayCourseCount: document.getElementById("todayCourseCount"),
  todayCourseList: document.getElementById("todayCourseList"),
  homeTodayCount: document.getElementById("homeTodayCount"),
  homeWeekLabel: document.getElementById("homeWeekLabel"),
  noteCount: document.getElementById("noteCount"),
  noteCountLabel: document.getElementById("noteCountLabel"),
  notesList: document.getElementById("notesList"),
  homeUpdated: document.getElementById("homeUpdated"),
  hitokoto: document.getElementById("hitokoto"),
  courseDialog: document.getElementById("courseDialog"),
  closeDialogButton: document.getElementById("closeDialogButton"),
  dialogKicker: document.getElementById("dialogKicker"),
  dialogTitle: document.getElementById("dialogTitle"),
  dialogContent: document.getElementById("dialogContent"),
};

const dialogParts = {
  element: elements.courseDialog,
  kicker: elements.dialogKicker,
  title: elements.dialogTitle,
  content: elements.dialogContent,
};

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  elements.homeUpdated.textContent = `最近一次更新：${formatLastModified()}`;
  loadHome();
  loadHitokoto();
});

function bindEvents() {
  elements.closeDialogButton.addEventListener("click", () =>
    closeCourseDialog(elements.courseDialog),
  );
  elements.courseDialog.addEventListener("click", (event) => {
    if (event.target === elements.courseDialog) {
      closeCourseDialog(elements.courseDialog);
    }
  });
}

async function loadHome() {
  await Promise.all([loadSchedule(), loadNotes()]);
  elements.homeUpdated.textContent = `最近一次更新：${formatLastModified()}`;
}

async function loadSchedule() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error(`课程数据读取失败：${response.status}`);
    }

    state.schedule = normalizeSchedule(await response.json());
    renderTodayCourses();
  } catch (error) {
    console.error(error);
    state.schedule = null;
    elements.todayDate.textContent = "--";
    elements.todayCourseCount.textContent = "课程数据读取失败";
    elements.homeTodayCount.textContent = "--";
    elements.homeWeekLabel.textContent = "--";
    elements.todayCourseList.innerHTML = "";
    appendTodayEmpty("今日课程暂时不可用，请检查课程数据", elements.todayCourseList);
  }
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
    elements.hitokoto.textContent = `${data.content} —— ${data.author}《${data.origin}》`;
  } catch (error) {
    console.error("加载失败：", error);
    elements.hitokoto.textContent = "（加载失败）";
  }
}

function renderTodayCourses() {
  if (!state.schedule) {
    return;
  }

  const today = startOfDay(new Date());
  const context = getSemesterDateContext(today, state.schedule.semester);
  const dayName = DAY_NAMES[context.dayOfWeek - 1];

  elements.todayDate.textContent = `${formatDate(today, true)} · ${dayName}`;
  elements.todayCourseList.innerHTML = "";

  if (!context.inSemester) {
    elements.todayCourseCount.textContent = "当前日期不在学期范围内";
    elements.homeTodayCount.textContent = "0";
    elements.homeWeekLabel.textContent = "--";
    appendTodayEmpty("今天不在当前学期的日期范围内", elements.todayCourseList);
    return;
  }

  const todayCourses = state.schedule.courses
    .filter(
      (course) =>
        course.dayOfWeek === context.dayOfWeek && course.weeks.includes(context.week),
    )
    .sort((courseA, courseB) => courseA.startPeriodIndex - courseB.startPeriodIndex);

  elements.todayCourseCount.textContent = `第 ${context.week} 周 · ${todayCourses.length} 门课程`;
  elements.homeTodayCount.textContent = String(todayCourses.length);
  elements.homeWeekLabel.textContent = `第 ${context.week} 周`;

  if (todayCourses.length === 0) {
    appendTodayEmpty("今日无课，自由支配你的时间吧", elements.todayCourseList);
    return;
  }

  renderTodayTimeline(todayCourses, state.schedule, elements.todayCourseList);

  todayCourses.forEach((course, courseIndex) => {
    const card = document.createElement("button");
    const tone = COURSE_TONES[courseIndex % COURSE_TONES.length];
    const period = getCoursePeriodBounds(course, state.schedule);

    card.type = "button";
    card.className = `today-course tone-${tone}`;
    card.setAttribute("aria-label", `${course.courseName}，${period.text}，点击查看详情`);
    card.addEventListener("click", () =>
      openCourseDialog(course, context.week, state.schedule, dialogParts),
    );

    const time = document.createElement("span");
    time.className = "today-time";
    const start = document.createElement("strong");
    start.textContent = period.startTime;
    const end = document.createElement("span");
    end.textContent = period.endTime;
    time.append(start, end);

    const copy = document.createElement("span");
    copy.className = "today-course-copy";
    const name = document.createElement("strong");
    name.textContent = course.courseName;
    const location = document.createElement("span");
    location.textContent = `${course.room} · ${course.teacher}`;
    const slot = document.createElement("span");
    slot.textContent = `${getCourseLabelText(course, state.schedule)} · ${course.credits} 学分`;
    copy.append(name, location, slot);
    card.append(time, copy);
    elements.todayCourseList.append(card);
  });
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
    meta.textContent = `${String(note.category || "学习笔记")} · ${formatNoteDate(note.date)}`;
    copy.append(heading, summary, meta);

    const arrow = document.createElement("span");
    arrow.className = "note-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "\u2197";
    link.append(fileMark, copy, arrow);
    elements.notesList.append(link);
  });
}

function appendNotesEmpty(message) {
  const empty = document.createElement("div");
  empty.className = "home-empty";
  empty.textContent = message;
  elements.notesList.append(empty);
}
