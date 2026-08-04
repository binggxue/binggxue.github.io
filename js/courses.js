import {
  DAY_NAMES,
  COURSE_TONES,
  DATA_URL,
  normalizeSchedule,
  renderTodayTimeline,
  appendTodayEmpty,
  openCourseDialog,
  closeCourseDialog,
  showDialog,
  getCurrentWeek,
  getSemesterDateContext,
  getWeekStart,
  getCoursePeriodText,
  getCoursePeriodBounds,
  getCourseLabelText,
  expandWeeks,
  formatWeeks,
  startOfDay,
  addDays,
  isToday,
  formatDate,
  formatLastModified,
  clamp,
} from "./common.js";

const state = {
  schedule: null,
  selectedWeek: 1,
  currentWeek: 1,
};

const elements = {
  semesterName: document.getElementById("semesterName"),
  semesterDateRange: document.getElementById("semesterDateRange"),
  semesterStart: document.getElementById("semesterStart"),
  totalWeeks: document.getElementById("totalWeeks"),
  currentWeekMetric: document.getElementById("currentWeekMetric"),
  previousWeekButton: document.getElementById("previousWeekButton"),
  nextWeekButton: document.getElementById("nextWeekButton"),
  currentWeekButton: document.getElementById("currentWeekButton"),
  weekSelect: document.getElementById("weekSelect"),
  loadStatus: document.getElementById("loadStatus"),
  statusIndicator: document.getElementById("statusIndicator"),
  todayDate: document.getElementById("todayDate"),
  todayCourseCount: document.getElementById("todayCourseCount"),
  todayCourseList: document.getElementById("todayCourseList"),
  selectedWeekLabel: document.getElementById("selectedWeekLabel"),
  selectedWeekRange: document.getElementById("selectedWeekRange"),
  scheduleGrid: document.getElementById("scheduleGrid"),
  lastUpdated: document.getElementById("lastUpdated"),
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
  elements.lastUpdated.textContent = `最近一次更新：${formatLastModified()}`;
  loadSchedule();
});

function bindEvents() {
  elements.previousWeekButton.addEventListener("click", () => changeWeek(-1));
  elements.nextWeekButton.addEventListener("click", () => changeWeek(1));
  elements.currentWeekButton.addEventListener("click", () => selectWeek(state.currentWeek));
  elements.weekSelect.addEventListener("change", (event) => {
    selectWeek(Number(event.target.value));
  });
  elements.closeDialogButton.addEventListener("click", () => closeCourseDialog(elements.courseDialog));
  elements.courseDialog.addEventListener("click", (event) => {
    if (event.target === elements.courseDialog) {
      closeCourseDialog(elements.courseDialog);
    }
  });
}

async function loadSchedule() {
  setStatus("正在读取课程数据", "loading");

  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error(`课程数据读取失败：${response.status}`);
    }

    const rawData = await response.json();
    state.schedule = normalizeSchedule(rawData);
    state.currentWeek = getCurrentWeek(state.schedule.semester);
    state.selectedWeek = state.currentWeek;

    renderSemesterInfo();
    renderWeekOptions();
    renderWeek();
    renderTodayCourses();
    setStatus(`已加载 ${state.schedule.courses.length} 门课程`, "success");
    elements.lastUpdated.textContent = `最近一次更新：${formatLastModified()}`;
  } catch (error) {
    console.error(error);
    state.schedule = null;
    setStatus("课程数据读取失败，请检查 JSON 文件", "error");
    renderLoadError();
  }
}

function renderSemesterInfo() {
  const { semester } = state.schedule;
  const semesterEnd = addDays(semester.startDate, semester.totalWeeks * 7 - 1);

  elements.semesterName.textContent = semester.name;
  elements.semesterStart.textContent = formatDate(semester.startDate, true);
  elements.totalWeeks.textContent = semester.totalWeeks;
  elements.currentWeekMetric.textContent = state.currentWeek;
  elements.semesterDateRange.textContent = `${formatDate(semester.startDate, true)} - ${formatDate(
    semesterEnd,
    true,
  )}`;
}

function renderWeekOptions() {
  const { totalWeeks } = state.schedule.semester;
  elements.weekSelect.innerHTML = "";

  for (let week = 1; week <= totalWeeks; week += 1) {
    const option = document.createElement("option");
    option.value = String(week);
    option.textContent = `第 ${week} 周`;
    elements.weekSelect.append(option);
  }

  elements.weekSelect.value = String(state.selectedWeek);
}

function renderWeek() {
  if (!state.schedule) {
    return;
  }

  const { semester, periods, courses } = state.schedule;
  const weekStart = getWeekStart(semester.startDate, state.selectedWeek);
  const weekEnd = addDays(weekStart, 6);
  const weekCourses = courses.filter((course) => course.weeks.includes(state.selectedWeek));
  const conflictGroups = groupCoursesByTime(weekCourses);

  elements.selectedWeekLabel.textContent = state.selectedWeek;
  elements.selectedWeekRange.textContent = `${formatDate(weekStart, true)} - ${formatDate(
    weekEnd,
    true,
  )}`;
  elements.weekSelect.value = String(state.selectedWeek);
  elements.currentWeekButton.disabled = false;
  elements.previousWeekButton.disabled = state.selectedWeek <= 1;
  elements.nextWeekButton.disabled = state.selectedWeek >= semester.totalWeeks;

  elements.scheduleGrid.innerHTML = "";
  elements.scheduleGrid.style.setProperty("--period-count", periods.length);
  elements.scheduleGrid.setAttribute(
    "aria-label",
    `${semester.name}第${state.selectedWeek}周课程表，${formatDate(weekStart, true)}至${formatDate(
      weekEnd,
      true,
    )}`,
  );

  const corner = createGridCell("div", "corner-cell", "节次", 1, 1);
  corner.setAttribute("role", "columnheader");
  elements.scheduleGrid.append(corner);

  DAY_NAMES.forEach((dayName, dayIndex) => {
    const date = addDays(weekStart, dayIndex);
    const header = document.createElement("div");
    header.className = `day-header${isToday(date) ? " today" : ""}`;
    header.style.gridColumn = String(dayIndex + 2);
    header.style.gridRow = "1";
    header.setAttribute("role", "columnheader");
    header.setAttribute("aria-label", `${dayName} ${formatDate(date, true)}`);
    const nameSpan = document.createElement("span");
    nameSpan.className = "day-name";
    nameSpan.textContent = dayName;
    const dateSpan = document.createElement("span");
    dateSpan.className = "day-date";
    dateSpan.textContent = `${date.getMonth() + 1}/${date.getDate()}`;
    header.append(nameSpan, dateSpan);
    elements.scheduleGrid.append(header);
  });

  periods.forEach((period, periodIndex) => {
    const row = periodIndex + 2;
    const timeCell = createGridCell("div", "time-cell", "", 1, row);
    timeCell.setAttribute("role", "rowheader");

    const label = document.createElement("span");
    label.className = "period-label";
    label.textContent = period.label;
    const time = document.createElement("span");
    time.className = "period-time";
    time.textContent = `${period.startTime}-${period.endTime}`;
    timeCell.append(label, time);
    elements.scheduleGrid.append(timeCell);

    DAY_NAMES.forEach((dayName, dayIndex) => {
      const dayCell = createGridCell("div", "day-cell", "", dayIndex + 2, row);
      dayCell.setAttribute("role", "gridcell");
      dayCell.setAttribute("aria-label", `${dayName}${period.label}`);
      elements.scheduleGrid.append(dayCell);
    });
  });

  conflictGroups.forEach((group, groupIndex) => {
    const representative = group.courses[0];
    const startRow = Math.min(...group.courses.map((course) => course.startPeriodIndex));
    const endRow = Math.max(...group.courses.map((course) => course.endPeriodIndex));
    const span = Math.max(1, endRow - startRow + 1);
    const card = document.createElement("button");
    const tone = COURSE_TONES[groupIndex % COURSE_TONES.length];
    const periodText = getCoursePeriodText(representative, state.schedule);
    const hasConflict = group.courses.length > 1;

    card.type = "button";
    card.className = `course-card tone-${tone}${hasConflict ? " conflict-card" : ""}`;
    card.style.gridColumn = String(representative.dayOfWeek + 1);
    card.style.gridRow = `${startRow + 2} / span ${span}`;
    card.setAttribute("role", "gridcell");
    card.setAttribute(
      "aria-label",
      hasConflict
        ? `${representative.courseName}，${DAY_NAMES[representative.dayOfWeek - 1]}，${periodText}，与其他${
            group.courses.length - 1
          }门课程冲突，点击查看全部课程`
        : `${representative.courseName}，${DAY_NAMES[representative.dayOfWeek - 1]}，${periodText}`,
    );
    card.addEventListener("click", () => {
      if (hasConflict) {
        openConflictDialog(group.courses, state.selectedWeek);
      } else {
        openCourseDialog(representative, state.selectedWeek, state.schedule, dialogParts);
      }
    });

    if (hasConflict) {
      const conflictBadge = document.createElement("span");
      conflictBadge.className = "conflict-badge";
      conflictBadge.textContent = `冲突 ${group.courses.length} 门`;
      card.append(conflictBadge);
    }

    const name = document.createElement("span");
    name.className = "course-name";
    name.textContent = representative.courseName;
    const room = document.createElement("span");
    room.className = "course-room";
    room.textContent = representative.room;
    const teacher = document.createElement("span");
    teacher.className = "course-teacher";
    teacher.textContent = representative.teacher;
    const meta = document.createElement("span");
    meta.className = "course-meta";
    const metaTime = document.createElement("span");
    metaTime.textContent = periodText;
    const metaCredits = document.createElement("span");
    metaCredits.textContent = hasConflict
      ? `${group.courses.length} 门冲突`
      : `${representative.credits} 学分`;
    meta.append(metaTime, metaCredits);
    card.append(name, room, teacher, meta);
    elements.scheduleGrid.append(card);
  });

  if (conflictGroups.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.style.gridColumn = "2 / -1";
    emptyState.style.gridRow = `2 / span ${periods.length}`;
    emptyState.textContent = `第 ${state.selectedWeek} 周暂无课程安排`;
    elements.scheduleGrid.append(emptyState);
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

  if (todayCourses.length === 0) {
    appendTodayEmpty("今天暂无课程安排", elements.todayCourseList);
    return;
  }

  renderTodayTimeline(todayCourses, state.schedule, elements.todayCourseList);

  todayCourses.forEach((course, courseIndex) => {
    const card = document.createElement("button");
    const tone = COURSE_TONES[courseIndex % COURSE_TONES.length];
    const period = getCoursePeriodBounds(course, state.schedule);

    card.type = "button";
    card.className = `today-course tone-${tone}`;
    card.setAttribute("aria-label", `${course.courseName}，${period.text}`);
    card.addEventListener("click", () => openCourseDialog(course, context.week, state.schedule, dialogParts));

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

function groupCoursesByTime(courses) {
  const groups = [];
  const sortedCourses = [...courses].sort(
    (courseA, courseB) =>
      courseA.dayOfWeek - courseB.dayOfWeek ||
      courseA.startPeriodIndex - courseB.startPeriodIndex,
  );

  sortedCourses.forEach((course) => {
    const existingGroup = groups.find(
      (group) =>
        group.dayOfWeek === course.dayOfWeek &&
        group.courses.some((existingCourse) => coursesOverlap(existingCourse, course)),
    );

    if (existingGroup) {
      existingGroup.courses.push(course);
    } else {
      groups.push({ dayOfWeek: course.dayOfWeek, courses: [course] });
    }
  });

  return groups;
}

function coursesOverlap(courseA, courseB) {
  return (
    courseA.startPeriodIndex <= courseB.endPeriodIndex &&
    courseB.startPeriodIndex <= courseA.endPeriodIndex
  );
}

function openConflictDialog(courses, week) {
  const representative = courses[0];
  elements.dialogKicker.textContent = "COURSE CONFLICT";
  elements.dialogTitle.textContent = "课程时间冲突";
  elements.dialogContent.innerHTML = "";

  const summary = document.createElement("p");
  summary.className = "conflict-summary";
  summary.textContent = `${DAY_NAMES[representative.dayOfWeek - 1]} · 第 ${week} 周 · 同一时段有 ${
    courses.length
  } 门课程`;

  const list = document.createElement("div");
  list.className = "conflict-list";

  courses.forEach((course, index) => {
    const item = document.createElement("article");
    item.className = "conflict-item";

    const heading = document.createElement("div");
    heading.className = "conflict-item-heading";
    const name = document.createElement("strong");
    name.textContent = course.courseName;
    const indexLabel = document.createElement("span");
    indexLabel.textContent = `课程 ${index + 1}`;
    heading.append(name, indexLabel);

    const time = document.createElement("p");
    time.className = "conflict-item-time";
    time.textContent = `${getCoursePeriodText(course, state.schedule)} · ${getCourseLabelText(course, state.schedule)}`;

    const details = document.createElement("p");
    details.className = "conflict-item-details";
    details.textContent = `${course.teacher} · ${course.room} · ${course.credits} 学分`;

    const note = document.createElement("p");
    note.className = "conflict-item-note";
    note.textContent = course.note;

    item.append(heading, time, details, note);
    list.append(item);
  });

  elements.dialogContent.append(summary, list);
  showDialog(elements.courseDialog);
}

function renderLoadError() {
  elements.semesterName.textContent = "无法读取学期信息";
  elements.semesterDateRange.textContent = "请确认本地服务已启动，并检查 data/courses.json";
  elements.semesterStart.textContent = "--";
  elements.totalWeeks.textContent = "--";
  elements.currentWeekMetric.textContent = "--";
  elements.selectedWeekLabel.textContent = "--";
  elements.selectedWeekRange.textContent = "--";
  elements.todayDate.textContent = "--";
  elements.todayCourseCount.textContent = "等待数据加载";
  elements.todayCourseList.innerHTML = "";
  appendTodayEmpty("今日课程暂时不可用", elements.todayCourseList);
  elements.scheduleGrid.innerHTML = "";
  elements.scheduleGrid.style.removeProperty("--period-count");

  const emptyState = document.createElement("div");
  emptyState.className = "empty-state";
  emptyState.textContent = "课程数据暂时不可用";
  elements.scheduleGrid.append(emptyState);
  elements.lastUpdated.textContent = `最近一次更新：${formatLastModified()}`;
  elements.previousWeekButton.disabled = true;
  elements.nextWeekButton.disabled = true;
  elements.currentWeekButton.disabled = true;
  elements.weekSelect.innerHTML = "<option>暂无周数</option>";
}

function changeWeek(offset) {
  if (!state.schedule) {
    return;
  }

  selectWeek(state.selectedWeek + offset);
}

function selectWeek(week) {
  if (!state.schedule) {
    return;
  }

  state.selectedWeek = clamp(week, 1, state.schedule.semester.totalWeeks);
  renderWeek();
}

function createGridCell(tagName, className, text, column, row) {
  const cell = document.createElement(tagName);
  cell.className = className;
  cell.textContent = text;
  cell.style.gridColumn = String(column);
  cell.style.gridRow = String(row);
  return cell;
}

function setStatus(message, status) {
  elements.loadStatus.textContent = message;
  elements.statusIndicator.className = `status-indicator${status === "success" ? " success" : ""}${
    status === "error" ? " error" : ""
  }`;
}
