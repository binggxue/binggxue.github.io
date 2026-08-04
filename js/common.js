/**
 * 课程表与个人主页共享的逻辑：数据规范化、时间轴渲染、课程详情弹窗、日期与工具函数。
 */

export const DAY_NAMES = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
export const COURSE_TONES = ["teal", "coral", "gold", "blue", "ink"];

export const DATA_URL = "data/courses.json";
export const NOTES_URL = "data/notes.json";

/* ---------------- 数据规范化 ---------------- */

export function normalizeSchedule(data) {
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

export function normalizeCourse(course, index, periods, totalWeeks) {
  const range = Array.isArray(course.periods) ? course.periods : [];
  const startValue = course.startPeriod ?? course.start ?? range[0];
  const endValue = course.endPeriod ?? course.end ?? range[range.length - 1] ?? startValue;
  const startPeriodIndex = resolvePeriodIndex(startValue, periods, 0);
  const endPeriodIndex = resolvePeriodIndex(endValue, periods, startPeriodIndex);
  const firstPeriodIndex = Math.min(startPeriodIndex, endPeriodIndex);
  const lastPeriodIndex = Math.max(startPeriodIndex, endPeriodIndex);
  const dayOfWeek = Number(course.dayOfWeek);
  const weeks = expandWeeks(course.weeks).filter((week) => week >= 1 && week <= totalWeeks);

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

/* ---------------- 今日课程时间轴 ---------------- */

/**
 * 渲染今日课程时间轴，并追加到 container。
 * @param {Array} courses 今日课程数组
 * @param {Object} schedule 课表对象（含 periods）
 * @param {HTMLElement} container 追加目标
 */
export function renderTodayTimeline(courses, schedule, container) {
  const timeline = document.createElement("div");
  timeline.className = "today-timeline";
  timeline.setAttribute("aria-label", "今日课程时间轴");

  const axis = document.createElement("div");
  axis.className = "today-axis";
  const track = document.createElement("span");
  track.className = "today-axis-track";
  axis.append(track);

  const bounds = getTimelineBounds(courses, schedule);
  const nodeTimes = new Set();

  courses.forEach((course, courseIndex) => {
    const period = getCoursePeriodBounds(course, schedule);
    const startMinutes = getTimeMinutes(period.startTime);
    const endPosition = getTimelinePosition(getTimeMinutes(period.endTime), bounds);
    const startPosition = getTimelinePosition(startMinutes, bounds);
    void endPosition; // 暂未使用 endPosition 绘制区间，保留接口
    void courseIndex;

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
  container.append(timeline);
}

export function getTimelineBounds(courses, schedule) {
  const startTimes = courses
    .map((course) => getTimeMinutes(getCoursePeriodBounds(course, schedule).startTime))
    .filter((time) => time !== null);
  const endTimes = courses
    .map((course) => getTimeMinutes(getCoursePeriodBounds(course, schedule).endTime))
    .filter((time) => time !== null);

  const start = startTimes.length > 0 ? Math.min(...startTimes) : 0;
  let end = endTimes.length > 0 ? Math.max(...endTimes) : start + 60;
  if (end <= start) {
    end = start + 60;
  }

  return { start, end };
}

export function getTimelinePosition(time, bounds) {
  if (time === null) {
    return 0;
  }
  return ((time - bounds.start) / (bounds.end - bounds.start)) * 100;
}

export function getTimeMinutes(value) {
  const match = String(value).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60 ? hours * 60 + minutes : null;
}

export function appendTodayEmpty(message, container) {
  const empty = document.createElement("div");
  empty.className = "today-empty";
  empty.textContent = message;
  container.append(empty);
}

/* ---------------- 课程详情弹窗 ---------------- */

/**
 * 打开课程详情弹窗。
 * @param {Object} course 课程对象
 * @param {number} week 当前周次
 * @param {Object} schedule 课表对象
 * @param {Object<string, HTMLElement>} dialog 弹窗相关 DOM 节点
 */
export function openCourseDialog(course, week, schedule, dialog) {
  dialog.kicker.textContent = "COURSE DETAIL";
  dialog.title.textContent = course.courseName;
  dialog.content.innerHTML = "";

  const details = [
    ["上课日期", `${DAY_NAMES[course.dayOfWeek - 1]} · 第 ${week} 周`],
    ["上课时间", getCoursePeriodText(course, schedule)],
    ["节次", getCourseLabelText(course, schedule)],
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

  dialog.content.append(detailList);
  showDialog(dialog.element);
}

export function closeCourseDialog(dialogElement) {
  if (typeof dialogElement.close === "function") {
    dialogElement.close();
  } else {
    dialogElement.removeAttribute("open");
  }
}

export function showDialog(dialogElement) {
  if (typeof dialogElement.showModal === "function") {
    dialogElement.showModal();
  } else {
    dialogElement.setAttribute("open", "");
  }
}

/* ---------------- 学期与节次信息 ---------------- */

export function getCurrentWeek(semester) {
  const today = new Date();
  const difference = startOfDay(today).getTime() - semester.startDate.getTime();
  const week = Math.floor(difference / (7 * 24 * 60 * 60 * 1000)) + 1;
  return clamp(week, 1, semester.totalWeeks);
}

export function getSemesterDateContext(date, semester) {
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

export function getWeekStart(startDate, week) {
  return addDays(startDate, (week - 1) * 7);
}

export function getCoursePeriodText(course, schedule) {
  return getCoursePeriodBounds(course, schedule).text;
}

export function getCoursePeriodBounds(course, schedule) {
  const { periods } = schedule;
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

export function getCourseLabelText(course, schedule) {
  const { periods } = schedule;
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

export function resolvePeriodIndex(value, periods, fallback) {
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

/* ---------------- 周次解析与格式化 ---------------- */

export function expandWeeks(input) {
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

export function formatWeeks(weeks) {
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

/* ---------------- 日期工具 ---------------- */

export function parseDate(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
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

/* ---------------- 通用工具 ---------------- */

export function clamp(value, minimum, maximum) {
  if (!Number.isFinite(value)) {
    return minimum;
  }
  return Math.min(Math.max(value, minimum), maximum);
}
