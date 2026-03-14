const socket = io();

const clientCountEl = document.getElementById("clientCount");
const phaseEl       = document.getElementById("phase");
const phaseCard     = document.getElementById("phaseCard");
const nextStartEl   = document.getElementById("nextStart");
const startBtn      = document.getElementById("startBtn");
const resetBtn      = document.getElementById("resetBtn");

socket.on("connect", () => {
  socket.emit("register", { role: "admin" });
});

socket.on("admin:stats", ({ clientCount }) => {
  clientCountEl.textContent = String(clientCount);
});

socket.on("sync:state",      renderState);
socket.on("sequence:start",  renderState);
socket.on("sequence:play",   renderState);
socket.on("sequence:reset",  renderState);

startBtn.addEventListener("click", () => {
  socket.emit("admin:startSequence");
});

resetBtn.addEventListener("click", () => {
  socket.emit("admin:resetSequence");
});

function renderState(payload) {
  if (!payload || !payload.phase) return;

  const { phase, playAt, serverNow } = payload;

  // Update text + data attribute for CSS colour theming
  phaseEl.textContent = phase.toUpperCase();
  phaseCard.setAttribute("data-phase", phase);

  if (phase === "countdown" && playAt) {
    const secondsLeft = Math.max(0, Math.ceil((playAt - serverNow) / 1000));
    nextStartEl.textContent = `Video launches in ${secondsLeft}s — breach imminent`;
    return;
  }

  if (phase === "playing") {
    nextStartEl.textContent = "ACTIVE — hack sequence is live on all clients";
    return;
  }

  nextStartEl.textContent = "Awaiting command input...";
}
