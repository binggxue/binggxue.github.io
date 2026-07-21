const DATA_URL = "data/courses.json";

const DAY_NAMES = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const COURSE_TONES = ["teal", "coral", "gold", "blue", "ink"];

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
  elements.closeDialogButton.addEventListener("click", closeCourseDialog);
  elements.courseDialog.addEventListener("click", (event) => {
    if (event.target === elements.courseDialog) {
      closeCourseDialog();
    }
  });
}

async function loadSchedule() {
  setStatus("正在读取课程数据", "loading");

  try {
    const response = await fetch(`${DATA_URL}?v=${Date.now()}`);
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

function normalizeSchedule(data) {
  if (!data || !data.semester || !data.semester.startDate) {
    throw new Error("缺少 semester.startDate");
  }

  const startDate = parseDate(data.semester.startDate);
  const totalWeeks = Number(data.semester.totalWeeks);
  const periods = Array.isArray(data.periods)
    ? data.periods.map((period, index) => ({
        id: Number(period.id) || index + 1,
        label: String(period.label || `第${index + 1}节`),
        startTime: String(period.startTime || "--:--"),
        endTime: String(period.endTime || "--:--"),
      }))
    : [];

  if (Number.isNaN(startDate.getTime()) || !Number.isInteger(totalWeeks) || totalWeeks < 1) {
    throw new Error("学期日期或总周数格式不正确");
  }

  if (periods.length === 0) {
    throw new Error("periods 必须至少包含一个节次");
  }

  const courses = Array.isArray(data.courses)
    ? data.courses.map((course, index) => normalizeCourse(course, index, periods, totalWeeks))
    : [];

  return {
    semester: {
      name: String(data.semester.name || "未命名学期"),
      startDate,
      totalWeeks,
    },
    periods,
    courses,
  };
}

function normalizeCourse(course, index, periods, totalWeeks) {
  const range = Array.isArray(course.periods) ? course.periods : [];
  const startValue = course.startPeriod ?? course.start ?? range[0];
  const endValue = course.endPeriod ?? course.end ?? range[range.length - 1] ?? startValue;
  const startPeriodIndex = resolvePeriodIndex(startValue, periods, 0);
  const endPeriodIndex = resolvePeriodIndex(endValue, periods, startPeriodIndex);
  const firstPeriodIndex = Math.min(startPeriodIndex, endPeriodIndex);
  const lastPeriodIndex = Math.max(startPeriodIndex, endPeriodIndex);
  const dayOfWeek = Number(course.dayOfWeek);
  const weeks = expandWeeks(course.weeks).filter(
    (week) => week >= 1 && week <= totalWeeks,
  );

  return {
    id: String(course.id || `course-${index + 1}`),
    courseName: String(course.courseName || "未命名课程"),
    dayOfWeek: clamp(dayOfWeek, 1, 7),
    startPeriod: periods[firstPeriodIndex].id,
    endPeriod: periods[lastPeriodIndex].id,
    startPeriodIndex: firstPeriodIndex,
    endPeriodIndex: lastPeriodIndex,
    weeks: [...new Set(weeks)].sort((a, b) => a - b),
    teacher: String(course.teacher || "未安排教师"),
    credits: course.credits === undefined || course.credits === "" ? "-" : String(course.credits),
    room: String(course.room || "未安排教室"),
    note: String(course.note || "暂无备注"),
  };
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
    header.innerHTML = `<span class="day-name">${dayName}</span><span class="day-date">${
      date.getMonth() + 1
    }/${date.getDate()}</span>`;
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
    const startRow = Math.min(
      ...group.courses.map((course) => course.startPeriodIndex),
    );
    const endRow = Math.max(
      ...group.courses.map((course) => course.endPeriodIndex),
    );
    const span = Math.max(1, endRow - startRow + 1);
    const card = document.createElement("button");
    const tone = COURSE_TONES[groupIndex % COURSE_TONES.length];
    const periodText = getCoursePeriodText(representative);
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
        openCourseDialog(representative);
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
    appendTodayEmpty("今天不在当前学期的日期范围内");
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
    appendTodayEmpty("今天暂无课程安排");
    return;
  }

  renderTodayTimeline(todayCourses);

  todayCourses.forEach((course, courseIndex) => {
    const card = document.createElement("button");
    const tone = COURSE_TONES[courseIndex % COURSE_TONES.length];
    const period = getCoursePeriodBounds(course);

    card.type = "button";
    card.className = `today-course tone-${tone}`;
    card.setAttribute("aria-label", `${course.courseName}，${period.text}`);
    card.addEventListener("click", () => openCourseDialog(course, context.week));

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
    slot.textContent = `${getCourseLabelText(course)} · ${course.credits} 学分`;
    copy.append(name, location, slot);
    card.append(time, copy);
    elements.todayCourseList.append(card);
  });
}

function renderTodayTimeline(courses) {
  const timeline = document.createElement("div");
  timeline.className = "today-timeline";
  timeline.setAttribute("aria-label", "今日课程时间轴");

  const axis = document.createElement("div");
  axis.className = "today-axis";
  const track = document.createElement("span");
  track.className = "today-axis-track";
  axis.append(track);

  const bounds = getTimelineBounds(courses);
  const nodeTimes = new Set();

  courses.forEach((course, courseIndex) => {
    const period = getCoursePeriodBounds(course);
    const startMinutes = getTimeMinutes(period.startTime);
    const endMinutes = getTimeMinutes(period.endTime);
    const startPosition = getTimelinePosition(startMinutes, bounds);
    const endPosition = getTimelinePosition(endMinutes, bounds);
    const tone = COURSE_TONES[courseIndex % COURSE_TONES.length];

    //const range = document.createElement("span");
    //range.className = `today-axis-range tone-${tone}`;
    //range.style.left = `${startPosition}%`;
    //range.style.width = `${Math.max(3, endPosition - startPosition)}%`;
    //range.title = `${course.courseName} ${period.text}`;
    //axis.append(range);

    if (startMinutes !== null && !nodeTimes.has(period.startTime)) {
      nodeTimes.add(period.startTime);
      const node = document.createElement("span");
      node.className = "today-axis-node";
      node.style.left = `${startPosition}%`;

      const dot = document.createElement("span");
      dot.className = "today-axis-dot";
      const label = document.createElement("strong");
      label.textContent = period.startTime;
      node.append(dot, label);
      axis.append(node);
    }
  });

  timeline.append(axis);
  elements.todayCourseList.append(timeline);
}

function getTimelineBounds(courses) {
  const startTimes = courses
    .map((course) => getTimeMinutes(getCoursePeriodBounds(course).startTime))
    .filter((time) => time !== null);
  const endTimes = courses
    .map((course) => getTimeMinutes(getCoursePeriodBounds(course).endTime))
    .filter((time) => time !== null);

  const start = startTimes.length > 0 ? Math.min(...startTimes) : 0;
  let end = endTimes.length > 0 ? Math.max(...endTimes) : start + 60;
  if (end <= start) {
    end = start + 60;
  }

  return { start, end };
}

function getTimelinePosition(time, bounds) {
  if (time === null) {
    return 0;
  }
  return ((time - bounds.start) / (bounds.end - bounds.start)) * 100;
}

function getTimeMinutes(value) {
  const match = String(value).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60
    ? hours * 60 + minutes
    : null;
}

function appendTodayEmpty(message) {
  const empty = document.createElement("div");
  empty.className = "today-empty";
  empty.textContent = message;
  elements.todayCourseList.append(empty);
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
    time.textContent = `${getCoursePeriodText(course)} · ${getCourseLabelText(course)}`;

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
  if (typeof elements.courseDialog.showModal === "function") {
    elements.courseDialog.showModal();
  } else {
    elements.courseDialog.setAttribute("open", "");
  }
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
  appendTodayEmpty("今日课程暂时不可用");
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

function openCourseDialog(course, week = state.selectedWeek) {
  elements.dialogKicker.textContent = "COURSE DETAIL";
  elements.dialogTitle.textContent = course.courseName;
  elements.dialogContent.innerHTML = "";

  const details = [
    ["上课日期", `${DAY_NAMES[course.dayOfWeek - 1]} · 第 ${week} 周`],
    ["上课时间", getCoursePeriodText(course)],
    ["节次", getCourseLabelText(course)],
    ["授课老师", course.teacher],
    ["上课地点", course.room],
    ["学分", course.credits],
    ["开课周次", formatWeeks(course.weeks)],
    ["备注", course.note],
  ];
  const detailList = document.createElement("dl");
  detailList.className = "detail-list";

  details.forEach(([label, value]) => {
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;
    detailList.append(term, description);
  });

  elements.dialogContent.append(detailList);
  if (typeof elements.courseDialog.showModal === "function") {
    elements.courseDialog.showModal();
  } else {
    elements.courseDialog.setAttribute("open", "");
  }
}

function closeCourseDialog() {
  if (typeof elements.courseDialog.close === "function") {
    elements.courseDialog.close();
  } else {
    elements.courseDialog.removeAttribute("open");
  }
}

function getCurrentWeek(semester) {
  const today = new Date();
  const difference = startOfDay(today).getTime() - semester.startDate.getTime();
  const week = Math.floor(difference / (7 * 24 * 60 * 60 * 1000)) + 1;
  return clamp(week, 1, semester.totalWeeks);
}

function getSemesterDateContext(date, semester) {
  const difference = Math.floor(
    (startOfDay(date).getTime() - semester.startDate.getTime()) / (24 * 60 * 60 * 1000),
  );
  const calendarDay = date.getDay();
  const dayOfWeek = calendarDay === 0 ? 7 : calendarDay;

  return {
    dayOfWeek,
    week: Math.floor(difference / 7) + 1,
    inSemester: difference >= 0 && difference < semester.totalWeeks * 7,
  };
}

function getWeekStart(startDate, week) {
  return addDays(startDate, (week - 1) * 7);
}

function getCoursePeriodText(course) {
  return getCoursePeriodBounds(course).text;
}

function getCoursePeriodBounds(course) {
  const { periods } = state.schedule;
  const start = periods[course.startPeriodIndex];
  const end = periods[course.endPeriodIndex];
  if (!start || !end) {
    return { startTime: "--:--", endTime: "--:--", text: "时间待定" };
  }
  return {
    startTime: start.startTime,
    endTime: end.endTime,
    text: `${start.startTime}-${end.endTime}`,
  };
}

function getCourseLabelText(course) {
  const { periods } = state.schedule;
  const start = course.startPeriodIndex;
  const end = course.endPeriodIndex;
  if (start === undefined || end === undefined || !periods[start] || !periods[end]) {
    return "节次待定";
  }
  if (start === end) {
    return periods[start].label;
  }
  return `${periods[start].label}至${periods[end].label}`;
}

function resolvePeriodIndex(value, periods, fallback) {
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    const idIndex = periods.findIndex((period) => period.id === numericValue);
    if (idIndex !== -1) {
      return idIndex;
    }

    if (Number.isInteger(numericValue) && numericValue >= 1 && numericValue <= periods.length) {
      return numericValue - 1;
    }
  }

  return clamp(fallback, 0, periods.length - 1);
}

function createGridCell(tagName, className, text, column, row) {
  const cell = document.createElement(tagName);
  cell.className = className;
  cell.textContent = text;
  cell.style.gridColumn = String(column);
  cell.style.gridRow = String(row);
  return cell;
}

function expandWeeks(input) {
  if (Array.isArray(input)) {
    return input.flatMap((item) => expandWeeks(item));
  }

  if (typeof input === "number" && Number.isInteger(input)) {
    return [input];
  }

  if (typeof input !== "string") {
    return [];
  }

  return input
    .split(/[，,、\s]+/)
    .filter(Boolean)
    .flatMap((part) => {
      const range = part.match(/^(\d+)\s*[-~至]\s*(\d+)$/);
      if (range) {
        const start = Number(range[1]);
        const end = Number(range[2]);
        const values = [];
        for (let week = Math.min(start, end); week <= Math.max(start, end); week += 1) {
          values.push(week);
        }
        return values;
      }
      const value = Number(part);
      return Number.isInteger(value) ? [value] : [];
    });
}

function formatWeeks(weeks) {
  if (!weeks || weeks.length === 0) {
    return "未设置";
  }

  const ranges = [];
  let start = weeks[0];
  let previous = weeks[0];

  for (let index = 1; index <= weeks.length; index += 1) {
    const current = weeks[index];
    if (current === previous + 1) {
      previous = current;
      continue;
    }
    ranges.push(start === previous ? `${start}` : `${start}-${previous}`);
    start = current;
    previous = current;
  }

  return ranges.map((range) => `第${range}周`).join("、");
}

function parseDate(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function isToday(date) {
  return formatDateKey(date) === formatDateKey(new Date());
}

function formatDate(date, includeYear = false) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: includeYear ? "numeric" : undefined,
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLastModified() {
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

function clamp(value, minimum, maximum) {
  if (!Number.isFinite(value)) {
    return minimum;
  }
  return Math.min(Math.max(value, minimum), maximum);
}

function setStatus(message, status) {
  elements.loadStatus.textContent = message;
  elements.statusIndicator.className = `status-indicator${status === "success" ? " success" : ""}${
    status === "error" ? " error" : ""
  }`;
}
