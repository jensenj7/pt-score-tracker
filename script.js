/******************** STORAGE ********************/
const STORAGE_KEY = "PT_TRACKER_DATA";

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    cadets,
    pushupOrder,
    situpOrder,
    runOrder,
    sprintOrder
  }));
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
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
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

  const i = cadets.length - 1;
  pushupOrder.push(i);
  situpOrder.push(i);
  runOrder.push(i);
  sprintOrder.push(i);

  document.getElementById('newCadetName').value = "";
  saveData();
  renderAll();
}

function deleteCadet(idx) {
  if (!confirm(`Remove ${cadets[idx].name}? This cannot be undone.`)) return;

  cadets.splice(idx, 1);
  const fix = arr => arr.filter(i => i !== idx).map(i => i > idx ? i - 1 : i);
  pushupOrder = fix(pushupOrder);
  situpOrder = fix(situpOrder);
  runOrder = fix(runOrder);
  sprintOrder = fix(sprintOrder);

  saveData();
  renderAll();
}

/******************** FORMAT ********************/
function formatTime(ms) {
  const s = ms / 1000;
  return `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(Math.floor(s % 60)).padStart(2,"0")}.${String(Math.floor((s % 1)*100)).padStart(2,"0")}`;
}

/******************** CLEAR PER EVENT ********************/
function clearPushups() {
  if (!confirm("Clear ALL pushup scores?")) return;
  cadets.forEach(c => c.pushups = "");
  saveData();
  renderPushups();
}

function clearSitups() {
  if (!confirm("Clear ALL situp scores?")) return;
  cadets.forEach(c => c.situps = "");
  saveData();
  renderSitups();
}

function clearRunScores() {
  if (!confirm("Clear ALL 1.5 mile run results?")) return;
  cadets.forEach(c => {
    c.laps = 0;
    c.finishedRun = false;
    c.runTime = "";
  });
  saveData();
  renderRun();
}

function clearSprintScores() {
  if (!confirm("Clear ALL 300m sprint results?")) return;
  cadets.forEach(c => {
    c.sprintTime = "";
    c.sprintFinished = false;
    c.sprintSelected = false;
  });
  saveData();
  renderSprint();
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
  const d = document.getElementById("pushupList");
  d.innerHTML = "";
  pushupOrder.forEach(i => {
    const c = cadets[i];
    const r = document.createElement("div");
    r.className = "run-row";
    r.draggable = true;
    r.dataset.idx = i;
    r.innerHTML = `<strong>${c.name}</strong><input type="number" value="${c.pushups}" onchange="cadets[${i}].pushups=this.value;saveData()">`;
    enableDrag(r, pushupOrder);
    d.appendChild(r);
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
  const d = document.getElementById("situpList");
  d.innerHTML = "";
  situpOrder.forEach(i => {
    const c = cadets[i];
    const r = document.createElement("div");
    r.className = "run-row";
    r.draggable = true;
    r.dataset.idx = i;
    r.innerHTML = `<strong>${c.name}</strong><input type="number" value="${c.situps}" onchange="cadets[${i}].situps=this.value;saveData()">`;
    enableDrag(r, situpOrder);
    d.appendChild(r);
  });
}

/******************** RUN ********************/
function startRun() {
  if (runActive) return;
  runActive = true;
  runStart = Date.now();
  runInterval = setInterval(() => {
    document.getElementById("runTimer").innerText = formatTime(Date.now()-runStart);
  },10);
}

function resetRun() {
  clearInterval(runInterval);
  runActive = false;
  document.getElementById("runTimer").innerText = "00:00.00";
}

function addLap(i) {
  if (runActive && !cadets[i].finishedRun) {
    cadets[i].laps++;
    saveData();
    renderRun();
  }
}

function stopRunner(i) {
  if (!runActive || cadets[i].finishedRun) return;
  cadets[i].finishedRun = true;
  cadets[i].runTime = formatTime(Date.now()-runStart);
  saveData();
  renderRun();
}

function renderRun() {
  const d = document.getElementById("runList");
  d.innerHTML = "";
  runOrder.forEach(i => {
    const c = cadets[i];
    const r = document.createElement("div");
    r.className = "run-row";
    r.draggable = true;
    r.dataset.idx = i;
    r.innerHTML = `<strong>${c.name}</strong> | Laps:${c.laps} | ${c.runTime||"--"} <button onclick="addLap(${i})">+Lap</button><button onclick="stopRunner(${i})">STOP</button>`;
    enableDrag(r, runOrder);
    d.appendChild(r);
  });
}

/******************** SPRINT ********************/
function startSprint() {
  if (sprintActive) return;
  sprintActive = true;
  sprintStart = Date.now();
  sprintInterval = setInterval(() => {
    document.getElementById("sprintTimer").innerText = formatTime(Date.now()-sprintStart);
  },10);
}

function resetSprint() {
  clearInterval(sprintInterval);
  sprintActive = false;
  document.getElementById("sprintTimer").innerText = "00:00.00";
  cadets.forEach(c => c.sprintSelected=false);
  saveData();
  renderSprint();
}

function stopSprint(i) {
  if (!sprintActive || !cadets[i].sprintSelected || cadets[i].sprintFinished) return;
  cadets[i].sprintFinished=true;
  cadets[i].sprintTime=formatTime(Date.now()-sprintStart);
  saveData();
  renderSprint();
}

function renderSprint() {
  const d = document.getElementById("sprintList");
  d.innerHTML="";
  sprintOrder.forEach(i=>{
    const c=cadets[i];
    const r=document.createElement("div");
    r.className="run-row";
    r.draggable=true;
    r.dataset.idx=i;
    r.innerHTML=`<input type="checkbox" ${c.sprintSelected?"checked":""} onchange="cadets[${i}].sprintSelected=this.checked;saveData()"> <strong>${c.name}</strong> | ${c.sprintTime||"--"} <button onclick="stopSprint(${i})">STOP</button>`;
    enableDrag(r,sprintOrder);
    d.appendChild(r);
  });
}

/******************** DRAG ********************/
function enableDrag(el, arr) {
  el.addEventListener("dragstart",e=>e.dataTransfer.setData("text",el.dataset.idx));
  el.addEventListener("dragover",e=>e.preventDefault());
  el.addEventListener("drop",e=>{
    e.preventDefault();
    const from=arr.indexOf(+e.dataTransfer.getData("text"));
    const to=arr.indexOf(+el.dataset.idx);
    arr.splice(to,0,arr.splice(from,1)[0]);
    saveData();
    renderAll();
  });
}

/******************** RENDER ********************/
function renderCadets() {
  const l=document.getElementById("cadetList");
  l.innerHTML="";
  cadets.forEach((c,i)=>{
    const li=document.createElement("li");
    li.innerHTML=`${c.name} <button onclick="deleteCadet(${i})" style="color:red">✖</button>`;
    l.appendChild(li);
  });
}

function renderAll() {
  renderCadets();
  renderPushups();
  renderSitups();
  renderRun();
  renderSprint();
}
