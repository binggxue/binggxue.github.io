const DATA_URL = "data/courses.json";
const NOTES_URL = "data/notes.json";

const DAY_NAMES = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const COURSE_TONES = ["teal", "coral", "gold", "blue", "ink"];

const WEATHER_EMOJI = {
  0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
  45: "🌫️", 48: "🌫️",
  51: "🌦️", 53: "🌦️", 55: "🌧️", 56: "🌧️", 57: "🌧️",
  61: "🌧️", 63: "🌧️", 65: "⛈️", 66: "⛈️", 67: "⛈️",
  71: "🌨️", 73: "🌨️", 75: "❄️", 77: "🌨️",
  80: "🌦️", 81: "🌧️", 82: "⛈️",
  85: "🌨️", 86: "❄️",
  95: "⛈️", 96: "⛈️", 99: "⛈️",
};
const WEATHER_FALLBACK = { lat: 31.2, lon: 121.5, city: "Shanghai" };

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
  weather: document.getElementById("weather"),
  hitokoto: document.getElementById("hitokoto"),
  courseDialog: document.getElementById("courseDialog"),
  closeDialogButton: document.getElementById("closeDialogButton"),
  dialogKicker: document.getElementById("dialogKicker"),
  dialogTitle: document.getElementById("dialogTitle"),
  dialogContent: document.getElementById("dialogContent"),
};

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  elements.homeUpdated.textContent = `最近一次更新：${formatLastModified()}`;
  loadHome();
  loadWeather();
  loadHitokoto();
});

function bindEvents() {
  elements.closeDialogButton.addEventListener("click", closeCourseDialog);
  elements.courseDialog.addEventListener("click", (event) => {
    if (event.target === elements.courseDialog) {
      closeCourseDialog();
    }
  });
}

async function loadHome() {
  await Promise.all([loadSchedule(), loadNotes()]);
  elements.homeUpdated.textContent = `最近一次更新：${formatLastModified()}`;
}

async function loadSchedule() {
  try {
    const response = await fetch(`${DATA_URL}?v=${Date.now()}`);
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
    appendTodayEmpty("今日课程暂时不可用，请检查课程数据");
  }
}

async function loadNotes() {
  try {
    const response = await fetch(`${NOTES_URL}?v=${Date.now()}`);
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

async function loadWeather() {
  let coords = WEATHER_FALLBACK;
  try {
    const response = await fetch("https://ipwho.is/");
    const data = await response.json();
    if (data && data.success) {
      coords = { lat: data.latitude, lon: data.longitude, city: data.city };
    }
  } catch (error) {
    console.error("IP 定位失败：", error);
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code&timezone=auto`;
    const response = await fetch(url);
    const data = await response.json();
    const temp = data.current.temperature_2m;
    const emoji = WEATHER_EMOJI[data.current.weather_code] || "🌡️";
    elements.weather.textContent = `${emoji} ${temp}°C ${coords.city}`;
  } catch (error) {
    console.error("获取天气失败：", error);
    elements.weather.textContent = "天气加载失败";
  }
}

async function loadHitokoto() {
  try {
    const response = await fetch("https://v1.jinrishici.com/all");
    const data = await response.json();
    elements.hitokoto.textContent = `${data.content} —— ${data.author}《${data.origin}》`;
  } catch (error) {
    console.error("一言加载失败：", error);
    elements.hitokoto.textContent = "（一言加载失败）";
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

  return {
    semester: {
      name: String(data.semester.name || "未命名学期"),
      startDate,
      totalWeeks,
    },
    periods,
    courses: Array.isArray(data.courses)
      ? data.courses.map((course, index) => normalizeCourse(course, index, periods, totalWeeks))
      : [],
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
  const weeks = expandWeeks(course.weeks).filter(
    (week) => week >= 1 && week <= totalWeeks,
  );

  return {
    id: String(course.id || `course-${index + 1}`),
    courseName: String(course.courseName || "未命名课程"),
    dayOfWeek: clamp(Number(course.dayOfWeek), 1, 7),
    startPeriod: periods[firstPeriodIndex].id,
    endPeriod: periods[lastPeriodIndex].id,
    startPeriodIndex: firstPeriodIndex,
    endPeriodIndex: lastPeriodIndex,
    weeks: [...new Set(weeks)].sort((weekA, weekB) => weekA - weekB),
    teacher: String(course.teacher || "未安排教师"),
    credits: course.credits === undefined || course.credits === "" ? "-" : String(course.credits),
    room: String(course.room || "未安排教室"),
    note: String(course.note || "暂无备注"),
  };
}

function renderTodayCourses() {
  const today = startOfDay(new Date());
  const context = getSemesterDateContext(today, state.schedule.semester);
  const dayName = DAY_NAMES[context.dayOfWeek - 1];

  elements.todayDate.textContent = `${formatDate(today, true)} · ${dayName}`;
  elements.todayCourseList.innerHTML = "";

  if (!context.inSemester) {
    elements.todayCourseCount.textContent = "当前日期不在学期范围内";
    elements.homeTodayCount.textContent = "0";
    elements.homeWeekLabel.textContent = "--";
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
  elements.homeTodayCount.textContent = String(todayCourses.length);
  elements.homeWeekLabel.textContent = `第 ${context.week} 周`;

  if (todayCourses.length === 0) {
    appendTodayEmpty("今日无课，自由支配你的时间吧");
    return;
  }

  renderTodayTimeline(todayCourses);

  todayCourses.forEach((course, courseIndex) => {
    const card = document.createElement("button");
    const tone = COURSE_TONES[courseIndex % COURSE_TONES.length];
    const period = getCoursePeriodBounds(course);

    card.type = "button";
    card.className = `today-course tone-${tone}`;
    card.setAttribute("aria-label", `${course.courseName}，${period.text}，点击查看详情`);
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

function openCourseDialog(course, week) {
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

function formatDate(date, includeYear = false) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: includeYear ? "numeric" : undefined,
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatNoteDate(value) {
  if (!value) {
    return "日期待补充";
  }
  const date = parseDate(value);
  return Number.isNaN(date.getTime()) ? String(value) : formatDate(date, true);
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
