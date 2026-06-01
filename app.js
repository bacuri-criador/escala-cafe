
const STORAGE_KEY = "escalaCafe";

let state = {
  year: 2026,
  month: 6,
  participants: ["Geovanna", "João Vitor", "Withallo", "Renata"],
  customHolidays: [],
  assignments: {},
  view: "calendar",
  signature: ""
};

let dragSourceDate = null;

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function pad(n) {
  return String(n).padStart(2, "0");
}

function dateISO(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function isValidDateISO(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseLines(value) {
  return value
    .split("\n")
    .map(v => v.trim())
    .filter(Boolean);
}

function easterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isoFromDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getBrazilHolidayMap(year) {
  const holidays = new Map([
    [`${year}-01-01`, "Confraternização Universal"],
    [`${year}-04-21`, "Tiradentes"],
    [`${year}-05-01`, "Dia do Trabalhador"],
    [`${year}-09-07`, "Independência do Brasil"],
    [`${year}-10-12`, "Nossa Senhora Aparecida"],
    [`${year}-11-02`, "Finados"],
    [`${year}-11-15`, "Proclamação da República"],
    [`${year}-11-20`, "Consciência Negra"],
    [`${year}-12-25`, "Natal"]
  ]);

  const easter = easterDate(year);
  const goodFriday = addDays(easter, -2);
  const carnivalMonday = addDays(easter, -48);
  const carnivalTuesday = addDays(easter, -47);

  holidays.set(isoFromDate(goodFriday), "Sexta-feira Santa");
  holidays.set(isoFromDate(carnivalMonday), "Carnaval");
  holidays.set(isoFromDate(carnivalTuesday), "Carnaval");

  return holidays;
}

function getHolidaySet(year, customList = []) {
  const map = getBrazilHolidayMap(year);
  customList.forEach(item => {
    if (isValidDateISO(item)) {
      map.set(item, "Feriado personalizado");
    }
  });
  return map;
}

function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function weekdayMondayFirst(date) {
  return (date.getDay() + 6) % 7;
}

function getParticipants() {
  return parseLines(document.getElementById("pessoas").value);
}

function getCustomHolidays() {
  return parseLines(document.getElementById("feriadosCustom").value).filter(isValidDateISO);
}

function buildSignature(year, month, participants, customHolidays) {
  return JSON.stringify({
    year,
    month,
    participants,
    customHolidays
  });
}

function getInputs() {
  return {
    year: Number(document.getElementById("ano").value),
    month: Number(document.getElementById("mes").value),
    participants: getParticipants(),
    customHolidays: getCustomHolidays()
  };
}

function generateAssignmentsFromScratch() {
  const { year, month, participants, customHolidays } = getInputs();

  if (!participants.length) {
    alert("Informe pelo menos uma pessoa.");
    return false;
  }

  const holidayMap = getHolidaySet(year, customHolidays);
  const assignments = {};
  let participantIndex = 0;
  const totalDays = lastDayOfMonth(year, month);

  for (let day = 1; day <= totalDays; day++) {
    const currentDate = new Date(year, month - 1, day);
    const iso = dateISO(year, month, day);
    const weekday = currentDate.getDay();
    const isWeekday = weekday >= 1 && weekday <= 5;
    const isHoliday = holidayMap.has(iso);

    if (isWeekday && !isHoliday) {
      assignments[iso] = participants[participantIndex % participants.length];
      participantIndex++;
    }
  }

  state.year = year;
  state.month = month;
  state.participants = participants;
  state.customHolidays = customHolidays;
  state.assignments = assignments;
  state.signature = buildSignature(year, month, participants, customHolidays);

  renderAll();
  saveState();
  return true;
}

function saveState() {
  const payload = {
    ...state,
    year: Number(document.getElementById("ano").value),
    month: Number(document.getElementById("mes").value),
    participants: getParticipants(),
    customHolidays: getCustomHolidays()
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;

  try {
    const data = JSON.parse(raw);

    document.getElementById("ano").value = data.year ?? state.year;
    document.getElementById("mes").value = data.month ?? state.month;
    document.getElementById("pessoas").value = (data.participants || []).join("\n");
    document.getElementById("feriadosCustom").value = (data.customHolidays || []).join("\n");

    state.year = Number(data.year ?? state.year);
    state.month = Number(data.month ?? state.month);
    state.participants = Array.isArray(data.participants) ? data.participants : state.participants;
    state.customHolidays = Array.isArray(data.customHolidays) ? data.customHolidays.filter(isValidDateISO) : [];
    state.assignments = data.assignments || {};
    state.view = data.view || "calendar";
    state.signature = data.signature || buildSignature(state.year, state.month, state.participants, state.customHolidays);

    return true;
  } catch (error) {
    console.error("Erro ao carregar estado:", error);
    return false;
  }
}

function gerarEscala() {
  return generateAssignmentsFromScratch();
}

function mudarVisao(view) {
  state.view = view;

  document.getElementById("btnCalendar").classList.toggle("active", view === "calendar");
  document.getElementById("btnTable").classList.toggle("active", view === "table");
  document.getElementById("calendarView").classList.toggle("active", view === "calendar");
  document.getElementById("tableView").classList.toggle("active", view === "table");

  saveState();
}

function getScheduleRows() {
  const { year, month, customHolidays } = getInputs();
  const holidayMap = getHolidaySet(year, customHolidays);
  const rows = [];
  const totalDays = lastDayOfMonth(year, month);

  for (let day = 1; day <= totalDays; day++) {
    const currentDate = new Date(year, month - 1, day);
    const iso = dateISO(year, month, day);
    const weekday = currentDate.getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const isHoliday = holidayMap.has(iso);
    const assigned = state.assignments[iso] || "";
    const holidayLabel = holidayMap.get(iso) || "";

    rows.push({
      iso,
      day,
      weekday,
      weekdayLabel: WEEKDAYS[weekday],
      isWeekend,
      isHoliday,
      holidayLabel,
      assigned
    });
  }

  return rows;
}

function renderSummary(rows) {
  const counts = {};
  state.participants.forEach(person => {
    counts[person] = 0;
  });

  rows.forEach(row => {
    if (row.assigned && counts[row.assigned] !== undefined) {
      counts[row.assigned] += 1;
    }
  });

  const totalWorkDays = rows.filter(r => !r.isWeekend && !r.isHoliday).length;
  const monthLabel = `${MONTHS[state.month - 1]} de ${state.year}`;

  document.getElementById("summary").innerHTML = `
    <h3>Resumo da escala</h3>
    <div class="month-title">
      <h3>${monthLabel}</h3>
      <div class="small">${totalWorkDays} dias úteis</div>
    </div>
    <div class="summary-grid">
      ${state.participants.map(name => `
        <div class="summary-item">
          <div class="summary-name">${name}</div>
          <div class="summary-count">${counts[name]} dia(s)</div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderCalendar(rows) {
  const { year, month } = state;
  const monthLabel = `${MONTHS[month - 1]} de ${year}`;
  const firstDay = new Date(year, month - 1, 1);
  const startOffset = weekdayMondayFirst(firstDay);
  const totalDays = lastDayOfMonth(year, month);
  const holidayMap = getHolidaySet(year, getCustomHolidays());

  const headers = WEEKDAYS.slice(1).concat(WEEKDAYS[0]).map(d => `<div class="calendar-head">${d}</div>`).join("");

  let cells = "";

  for (let i = 0; i < startOffset; i++) {
    cells += `<div class="day empty"></div>`;
  }

  for (let day = 1; day <= totalDays; day++) {
    const iso = dateISO(year, month, day);
    const currentDate = new Date(year, month - 1, day);
    const weekday = currentDate.getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const holidayLabel = holidayMap.get(iso) || "";
    const isHoliday = holidayMap.has(iso);
    const participant = state.assignments[iso] || "";

    let badgeClass = "weekend";
    let badgeLabel = "Fim de semana";
    let draggablePart = "";

    if (isHoliday) {
      badgeClass = "holiday";
      badgeLabel = holidayLabel;
    } else if (!isWeekend && participant) {
      badgeClass = "workday";
      badgeLabel = participant;
      draggablePart = `
        <div
          class="calendar-participant"
          draggable="true"
          data-date="${iso}"
          title="Arraste para outro dia útil ou clique para trocar"
        >${participant}</div>
      `;
    }

    const dayClass = [
      "day",
      isWeekend ? "weekend" : "",
      isHoliday ? "holiday" : "",
      !isWeekend && !isHoliday ? "workday" : ""
    ].filter(Boolean).join(" ");

    cells += `
      <div class="${dayClass} calendar-day" data-date="${iso}">
        <div class="day-number">${day}</div>
        <div class="day-weekday">${WEEKDAYS[weekday]}</div>
        ${isWeekend || isHoliday ? `<div class="day-badge ${badgeClass}">${badgeLabel}</div>` : draggablePart}
      </div>
    `;
  }

  const remainder = (7 - ((startOffset + totalDays) % 7)) % 7;
  for (let i = 0; i < remainder; i++) {
    cells += `<div class="day empty"></div>`;
  }

  document.getElementById("calendarView").innerHTML = `
    <div class="month-title">
      <h3>Calendário de ${monthLabel}</h3>
      <div class="small">Arraste um nome para outro dia útil ou clique para trocar</div>
    </div>
    <div class="calendar-wrap">
      <div class="calendar">
        ${headers}
        ${cells}
      </div>
    </div>
    <div class="legend">
      <span class="legend-item"><span class="dot workday"></span> Dia útil</span>
      <span class="legend-item"><span class="dot holiday"></span> Feriado</span>
      <span class="legend-item"><span class="dot weekend"></span> Fim de semana</span>
    </div>
    <div class="calendar-legend-note">
      Feriados automáticos do Brasil e feriados personalizados são removidos da escala.
    </div>
  `;

  wireCalendarEvents();
}

function renderTable(rows) {
  const businessRows = rows.filter(row => !row.isWeekend && !row.isHoliday);

  document.getElementById("tableView").innerHTML = `
    <div class="month-title">
      <h3>Tabela da escala</h3>
      <div class="small">Arraste uma linha para outra para trocar os responsáveis</div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Dia</th>
            <th>Responsável</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody id="tableBody">
          ${businessRows.map(row => `
            <tr class="table-row" draggable="true" data-date="${row.iso}">
              <td>${pad(row.day)}/${pad(state.month)}/${state.year}</td>
              <td>${row.weekdayLabel}</td>
              <td>
                <span class="participant-pill" data-date="${row.iso}" title="Clique para trocar para a próxima pessoa">${row.assigned}</span>
              </td>
              <td><span class="status ok">Dia útil</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    <div class="footer-note">
      Feriados e fins de semana não aparecem na tabela, mas continuam sendo considerados no cálculo do mês.
    </div>
  `;

  wireTableEvents();
}

function renderAll() {
  const rows = getScheduleRows();
  renderSummary(rows);
  renderCalendar(rows);
  renderTable(rows);
  mudarVisao(state.view || "calendar");
}

function swapAssignments(sourceDate, targetDate) {
  if (!sourceDate || !targetDate || sourceDate === targetDate) return false;
  if (!state.assignments[sourceDate] || !state.assignments[targetDate]) return false;

  const sourceParticipant = state.assignments[sourceDate];
  const targetParticipant = state.assignments[targetDate];

  state.assignments[sourceDate] = targetParticipant;
  state.assignments[targetDate] = sourceParticipant;

  renderAll();
  saveState();
  return true;
}

function nextParticipant(current) {
  const participants = getParticipants();
  if (!participants.length) return current;

  const index = participants.indexOf(current);
  return participants[(index + 1) % participants.length];
}

function cycleParticipant(date) {
  if (!state.assignments[date]) return;
  state.assignments[date] = nextParticipant(state.assignments[date]);
  renderAll();
  saveState();
}

function wireCalendarEvents() {
  document.querySelectorAll(".calendar-participant").forEach(pill => {
    pill.addEventListener("dragstart", event => {
      dragSourceDate = pill.dataset.date;
      pill.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", dragSourceDate);
    });

    pill.addEventListener("dragend", () => {
      pill.classList.remove("dragging");
    });

    pill.addEventListener("click", () => {
      cycleParticipant(pill.dataset.date);
    });
  });

  document.querySelectorAll(".calendar-day").forEach(day => {
    day.addEventListener("dragover", event => {
      event.preventDefault();
      day.classList.add("drag-over");
    });

    day.addEventListener("dragleave", () => {
      day.classList.remove("drag-over");
    });

    day.addEventListener("drop", event => {
      event.preventDefault();
      day.classList.remove("drag-over");

      const targetDate = day.dataset.date;
      const sourceDate = dragSourceDate || event.dataTransfer.getData("text/plain");

      if (!sourceDate || sourceDate === targetDate) return;
      swapAssignments(sourceDate, targetDate);
    });
  });
}

function wireTableEvents() {
  const rows = document.querySelectorAll("#tableBody tr");

  rows.forEach(row => {
    row.addEventListener("dragstart", event => {
      dragSourceDate = row.dataset.date;
      row.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", dragSourceDate);
    });

    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
    });

    row.addEventListener("dragover", event => {
      event.preventDefault();
      row.classList.add("drag-over");
    });

    row.addEventListener("dragleave", () => {
      row.classList.remove("drag-over");
    });

    row.addEventListener("drop", event => {
      event.preventDefault();
      row.classList.remove("drag-over");

      const targetDate = row.dataset.date;
      const sourceDate = dragSourceDate || event.dataTransfer.getData("text/plain");

      if (!sourceDate || sourceDate === targetDate) return;
      swapAssignments(sourceDate, targetDate);
    });
  });

  document.querySelectorAll(".participant-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      cycleParticipant(pill.dataset.date);
    });
  });
}

function exportarExcel() {
  const rows = getScheduleRows()
    .filter(row => !row.isWeekend && !row.isHoliday)
    .map(row => ({
      Data: `${pad(row.day)}/${pad(state.month)}/${state.year}`,
      Dia: row.weekdayLabel,
      Responsável: row.assigned
    }));

  if (!rows.length) {
    alert("Gere a escala primeiro.");
    return;
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Escala de Café");
  XLSX.writeFile(wb, "EscalaCafe.xlsx");
}

async function exportarPDF() {
  const rows = getScheduleRows()
    .filter(row => !row.isWeekend && !row.isHoliday)
    .map(row => [
      `${pad(row.day)}/${pad(state.month)}/${state.year}`,
      row.weekdayLabel,
      row.assigned
    ]);

  if (!rows.length) {
    alert("Gere a escala primeiro.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(`Escala de Café - ${MONTHS[state.month - 1]} de ${state.year}`, 14, 15);
  doc.setFontSize(10);
  doc.text("Feriados automáticos e personalizados são excluídos da escala.", 14, 22);

  doc.autoTable({
    head: [["Data", "Dia", "Responsável"]],
    body: rows,
    startY: 28,
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [13, 110, 253] }
  });

  doc.save("EscalaCafe.pdf");
}

function salvarEstado() {
  state.year = Number(document.getElementById("ano").value);
  state.month = Number(document.getElementById("mes").value);
  state.participants = getParticipants();
  state.customHolidays = getCustomHolidays();

  const payload = {
    ...state,
    signature: buildSignature(state.year, state.month, state.participants, state.customHolidays)
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function initDefaults() {
  document.getElementById("ano").value = state.year;
  document.getElementById("mes").value = state.month;
  document.getElementById("pessoas").value = state.participants.join("\n");
  document.getElementById("feriadosCustom").value = state.customHolidays.join("\n");
}

function setupAutoSave() {
  ["ano", "mes", "pessoas", "feriadosCustom"].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener("input", saveState);
    el.addEventListener("change", saveState);
  });
}

(function boot() {
  const loaded = loadState();
  if (!loaded) {
    initDefaults();
  }

  setupAutoSave();

  const inputs = getInputs();
  state.year = inputs.year;
  state.month = inputs.month;
  state.participants = inputs.participants;
  state.customHolidays = inputs.customHolidays;
  state.signature = buildSignature(state.year, state.month, state.participants, state.customHolidays);

  if (!state.assignments || !Object.keys(state.assignments).length) {
    generateAssignmentsFromScratch();
  } else {
    renderAll();
  }

  mudarVisao(state.view || "calendar");
})();
