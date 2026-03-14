const socket = io();

// ── DOM refs ──────────────────────────────────────────────────────────
const clientCountEl      = document.getElementById("clientCount");
const phaseBadgeEl       = document.getElementById("phaseBadge");
const adminCountdownEl   = document.getElementById("adminCountdown");
const statusTextEl       = document.getElementById("statusText");
const startBtn           = document.getElementById("startBtn");
const resetBtn           = document.getElementById("resetBtn");
const activityLog        = document.getElementById("activityLog");
const connectionIndicator = document.getElementById("connectionIndicator");
const connLabel          = document.getElementById("connLabel");

let liveCountdownInterval = null;

// ── Socket lifecycle ──────────────────────────────────────────────────
socket.on("connect", () => {
  socket.emit("register", { role: "admin" });
  connectionIndicator.classList.add("connected");
  connLabel.textContent = "CONNECTED";
  appendLog("Socket connection established.", "connect");
});

socket.on("disconnect", () => {
  connectionIndicator.classList.remove("connected");
  connLabel.textContent = "DISCONNECTED";
  appendLog("Socket disconnected — attempting reconnect…", "reset");
  stopLiveCountdown();
});

// ── Stats & state ─────────────────────────────────────────────────────
socket.on("admin:stats", ({ clientCount }) => {
  clientCountEl.textContent = String(clientCount);
});

socket.on("sync:state",      renderState);
socket.on("sequence:start",  renderState);
socket.on("sequence:play",   renderState);
socket.on("sequence:reset",  renderState);

// ── Button actions ────────────────────────────────────────────────────
startBtn.addEventListener("click", () => {
  socket.emit("admin:startSequence");
  appendLog("▶ START SEQUENCE command sent to server.", "start");
});

resetBtn.addEventListener("click", () => {
  socket.emit("admin:resetSequence");
  appendLog("↺  RESET command sent to server.", "reset");
});

// ── State renderer ────────────────────────────────────────────────────
function renderState(payload) {
  if (!payload || !payload.phase) return;

  const { phase, playAt, serverNow } = payload;

  // Phase badge
  phaseBadgeEl.className = "phase-badge";
  if (phase === "countdown") {
    phaseBadgeEl.classList.add("phase-countdown");
    phaseBadgeEl.textContent = "COUNTDOWN";
    appendLog(`⏱  Countdown initiated. Video plays in ${payload.countdownSeconds}s.`, "start");
    startLiveCountdown(playAt, serverNow);
    statusTextEl.textContent = `Countdown running — video plays in ${payload.countdownSeconds}s`;
  } else if (phase === "playing") {
    phaseBadgeEl.classList.add("phase-playing");
    phaseBadgeEl.textContent = "PLAYING";
    appendLog("🎬  Video is now playing on all clients.", "play");
    stopLiveCountdown();
    adminCountdownEl.textContent = "▶ LIVE";
    adminCountdownEl.className = "metric metric-green";
    statusTextEl.textContent = "Hack video is live on all connected clients.";
  } else {
    phaseBadgeEl.classList.add("phase-idle");
    phaseBadgeEl.textContent = "IDLE";
    stopLiveCountdown();
    adminCountdownEl.textContent = "—";
    adminCountdownEl.className = "metric metric-amber";
    statusTextEl.textContent = "Awaiting command…";
  }
}

// ── Live countdown (admin-side ticker) ────────────────────────────────
function startLiveCountdown(playAt, serverNow) {
  stopLiveCountdown();
  const drift = Date.now() - (serverNow || Date.now());

  const tick = () => {
    const msLeft = playAt - Date.now() + drift;
    const secLeft = Math.max(0, Math.ceil(msLeft / 1000));
    adminCountdownEl.textContent = secLeft + "s";
    adminCountdownEl.className = secLeft <= 3
      ? "metric metric-red"
      : "metric metric-amber";
  };

  tick();
  liveCountdownInterval = setInterval(tick, 200);
}

function stopLiveCountdown() {
  if (liveCountdownInterval) {
    clearInterval(liveCountdownInterval);
    liveCountdownInterval = null;
  }
}

// ── Activity log helper ───────────────────────────────────────────────
let _lastMsg = "";
function appendLog(msg, type = "system") {
  // Deduplicate rapid repeated messages
  if (msg === _lastMsg) return;
  _lastMsg = msg;

  const ts = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });

  const entry = document.createElement("div");
  entry.className = `log-entry log-entry--${type}`;
  entry.innerHTML = `<span class="log-ts">${ts}</span><span class="log-msg">${msg}</span>`;

  // Prepend so newest is on top
  activityLog.insertBefore(entry, activityLog.firstChild);

  // Cap log at 50 entries
  while (activityLog.children.length > 50) {
    activityLog.removeChild(activityLog.lastChild);
  }
}
