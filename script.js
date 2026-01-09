/******************** STORAGE ********************/
const STORAGE_KEY = "PT_TRACKER_DATA";

function saveData() {
  const data = {
    cadets,
    pushupOrder,
    situpOrder,
    runOrder,
    sprintOrder
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  const data = JSON.parse(raw);
  cadets = data.cadets || [];
  pushupOrder = data.pushupOrder || [];
  situpOrder = data.situpOrder || [];
  runOrder = data.runOrder || [];
  sprintOrder = data.sprintOrder || [];
}

/******************** DATA ********************/
let cadets = [];
let pushupOrder = [];
let situpOrder = [];
let runOrder = [];
let sprintOrder = [];

/******************** TIMERS ********************/
let pushupTime = 60000;
let situpTime = 60000;

let pushupInterval = null;
let situpInterval = null;

let runStart = null;
let runInterval = null;
let runActive = false;

let sprintStart = null;
let sprintInterval = null;
let sprintActive = false;

/******************** INIT ********************/
loadData();
window.onload = () => renderAll();

/******************** NAV ********************/
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s =>
    s.classList.remove('active')
  );
  document.getElementById(id).classList.add('active');
  renderAll();
}

/******************** CADETS ********************/
function addCadet() {
  const name = document.getElementById('newCadetName').value.trim();
  if (!name) return;

  cadets.push({
    name,
    pushups: "",
    situps: "",
    laps: 0,
    finishedRun: false,
    runTime: "",
    sprintSelected: false,
    sprintFinished: false,
    sprintTime: ""
  });

  const idx = cadets.length - 1;
  pushupOrder.push(idx);
  situpOrder.push(idx);
  runOrder.push(idx);
  sprintOrder.push(idx);

  document.getElementById('newCadetName').value = "";
  saveData();
  renderAll();
}

function deleteCadet(idx) {
  const name = cadets[idx].name;
  if (!confirm(`Remove ${name}? This cannot be undone.`)) return;

  cadets.splice(idx, 1);

  const rebuild = order =>
    order
      .filter(i => i !== idx)
      .map(i => (i > idx ? i - 1 : i));

  pushupOrder = rebuild(pushupOrder);
  situpOrder = rebuild(situpOrder);
  runOrder = rebuild(runOrder);
  sprintOrder = rebuild(sprintOrder);

  saveData();
  renderAll();
}

function renderCadets() {
  const list = document.getElementById("cadetList");
  list.innerHTML = "";

  cadets.forEach((c, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${c.name}
      <button onclick="deleteCadet(${idx})"
        style="margin-left:10px;color:red;">✖</button>
    `;
    list.appendChild(li);
  });

  const exportBtn = document.createElement("button");
  exportBtn.innerText = "Export to Excel (CSV)";
  exportBtn.onclick = exportToExcel;
  exportBtn.style.marginTop = "15px";
  list.appendChild(exportBtn);
}

/******************** TIME FORMAT ********************/
function formatTime(ms) {
  const totalSeconds = ms / 1000;
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const s = String(Math.floor(totalSeconds % 60)).padStart(2, "0");
  const h = String(Math.floor((totalSeconds % 1) * 100)).padStart(2, "0");
  return `${m}:${s}.${h}`;
}

/******************** PUSHUPS ********************/
function startPushups() {
  clearInterval(pushupInterval);
  pushupTime = 60000;
  updatePushupTimer();

  pushupInterval = setInterval(() => {
    pushupTime -= 10;
    updatePushupTimer();
    if (pushupTime <= 0) clearInterval(pushupInterval);
  }, 10);
}

function resetPushups() {
  clearInterval(pushupInterval);
  pushupTime = 60000;
  updatePushupTimer();
}

function updatePushupTimer() {
  document.getElementById("pushupTimer").innerText = formatTime(pushupTime);
}

function renderPushups() {
  const div = document.getElementById("pushupList");
  div.innerHTML = "";

  pushupOrder.forEach(idx => {
    const c = cadets[idx];
    const row = document.createElement("div");
    row.className = "run-row";
    row.draggable = true;
    row.dataset.idx = idx;

    row.innerHTML = `
      <strong>${c.name}</strong>
      <input type="number" value="${c.pushups}"
        onchange="cadets[${idx}].pushups=this.value; saveData();">
    `;

    enableDrag(row, pushupOrder);
    div.appendChild(row);
  });
}

/******************** SITUPS ********************/
function startSitups() {
  clearInterval(situpInterval);
  situpTime = 60000;
  updateSitupTimer();

  situpInterval = setInterval(() => {
    situpTime -= 10;
    updateSitupTimer();
    if (situpTime <= 0) clearInterval(situpInterval);
  }, 10);
}

function resetSitups() {
  clearInterval(situpInterval);
  situpTime = 60000;
  updateSitupTimer();
}

function updateSitupTimer() {
  document.getElementById("situpTimer").innerText = formatTime(situpTime);
}

function renderSitups() {
  const div = document.getElementById("situpList");
  div.innerHTML = "";

  situpOrder.forEach(idx => {
    const c = cadets[idx];
    const row = document.createElement("div");
    row.className = "run-row";
    row.draggable = true;
    row.dataset.idx = idx;

    row.innerHTML = `
      <strong>${c.name}</strong>
      <input type="number" value="${c.situps}"
        onchange="cadets[${idx}].situps=this.value; saveData();">
    `;

    enableDrag(row, situpOrder);
    div.appendChild(row);
  });
}

/******************** 1.5 MILE RUN ********************/
function startRun() {
  if (runActive) return;
  runActive = true;
  runStart = Date.now();

  runInterval = setInterval(() => {
    document.getElementById("runTimer").innerText =
      formatTime(Date.now() - runStart);
  }, 10);
}

function addLap(idx) {
  if (runActive && !cadets[idx].finishedRun) {
    cadets[idx].laps++;
    saveData();
    renderRun();
  }
}

function stopRunner(idx) {
  const c = cadets[idx];
  if (!runActive || c.finishedRun) return;

  c.finishedRun = true;
  c.runTime = formatTime(Date.now() - runStart);
  saveData();
  renderRun();
}

function resetRun() {
  clearInterval(runInterval);
  runActive = false;
  document.getElementById("runTimer").innerText = "00:00.00";
}

/******************** 300m SPRINT ********************/
function startSprint() {
  if (sprintActive) return;
  sprintActive = true;
  sprintStart = Date.now();

  sprintInterval = setInterval(() => {
    document.getElementById("sprintTimer").innerText =
      formatTime(Date.now() - sprintStart);
  }, 10);
}

function stopSprint(idx) {
  const c = cadets[idx];
  if (!sprintActive || !c.sprintSelected || c.sprintFinished) return;

  c.sprintFinished = true;
  c.sprintTime = formatTime(Date.now() - sprintStart);
  saveData();
  renderSprint();
}

function resetSprint() {
  clearInterval(sprintInterval);
  sprintActive = false;
  document.getElementById("sprintTimer").innerText = "00:00.00";
  cadets.forEach(c => c.sprintSelected = false);
  saveData();
  renderSprint();
}

/******************** EXPORT ********************/
function exportToExcel() {
  let csv = "Name,Pushups,Situps,1.5 Mile Time,Laps,300m Time\n";

  cadets.forEach(c => {
    csv += `"${c.name}",${c.pushups},${c.situps},${c.runTime},${c.laps},${c.sprintTime}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "PT_Results.csv";
  a.click();

  URL.revokeObjectURL(url);
}

/******************** DRAG & DROP ********************/
function enableDrag(el, orderArray) {
  el.addEventListener("dragstart", e => {
    e.dataTransfer.setData("text/plain", el.dataset.idx);
    el.classList.add("dragging");
  });

  el.addEventListener("dragend", () => {
    el.classList.remove("dragging");
    saveData();
  });

  el.addEventListener("dragover", e => e.preventDefault());

  el.addEventListener("drop", e => {
    e.preventDefault();

    const draggedIdx = Number(e.dataTransfer.getData("text/plain"));
    const targetIdx = Number(el.dataset.idx);

    const from = orderArray.indexOf(draggedIdx);
    const to = orderArray.indexOf(targetIdx);

    orderArray.splice(from, 1);
    orderArray.splice(to, 0, draggedIdx);

    saveData();
    renderAll();
  });
}

/******************** RENDER ********************/
function renderRun() {
  const div = document.getElementById("runList");
  div.innerHTML = "";

  runOrder.forEach(idx => {
    const c = cadets[idx];
    const row = document.createElement("div");
    row.className = "run-row";
    row.draggable = true;
    row.dataset.idx = idx;

    row.innerHTML = `
      <strong>${c.name}</strong>
      | Laps: ${c.laps}
      | Time: ${c.runTime || "--:--.--"}
      <button onclick="addLap(${idx})">+Lap</button>
      <button onclick="stopRunner(${idx})">STOP</button>
    `;

    enableDrag(row, runOrder);
    div.appendChild(row);
  });
}

function renderSprint() {
  const div = document.getElementById("sprintList");
  div.innerHTML = "";

  sprintOrder.forEach(idx => {
    const c = cadets[idx];
    const row = document.createElement("div");
    row.className = "run-row";
    row.draggable = true;
    row.dataset.idx = idx;

    row.innerHTML = `
      <input type="checkbox"
        ${c.sprintSelected ? "checked" : ""}
        onchange="cadets[${idx}].sprintSelected=this.checked; saveData();">
      <strong>${c.name}</strong>
      | Time: ${c.sprintTime || "--:--.--"}
      <button onclick="stopSprint(${idx})">STOP</button>
    `;

    enableDrag(row, sprintOrder);
    div.appendChild(row);
  });
}

function renderAll() {
  renderCadets();
  renderPushups();
  renderSitups();
  renderRun();
  renderSprint();
}

