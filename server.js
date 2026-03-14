require("dotenv").config();

const path = require("path");
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length > 0 ? allowedOrigins : "*",
    methods: ["GET", "POST"]
  }
});

const countdownSeconds = Number(process.env.COUNTDOWN_SECONDS || 10);

const sequenceState = {
  phase: "idle",
  sequenceId: 0,
  countdownSeconds,
  countdownStartAt: null,
  playAt: null,
  videoUrl:
    process.env.VIDEO_URL ||
    "https://cdn.coverr.co/videos/coverr-hacker-typing-1579/1080p.mp4",
  imageUrl:
    process.env.IMAGE_URL ||
    "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1920&auto=format&fit=crop"
};

let playTimeout = null;

function activeClientCount() {
  let count = 0;
  for (const [, socket] of io.of("/").sockets) {
    if (socket.data.role === "client") {
      count += 1;
    }
  }
  return count;
}

function statePayload(extra = {}) {
  return {
    phase: sequenceState.phase,
    sequenceId: sequenceState.sequenceId,
    countdownSeconds: sequenceState.countdownSeconds,
    countdownStartAt: sequenceState.countdownStartAt,
    playAt: sequenceState.playAt,
    videoUrl: sequenceState.videoUrl,
    imageUrl: sequenceState.imageUrl,
    serverNow: Date.now(),
    ...extra
  };
}

function emitAdminStats() {
  io.emit("admin:stats", { clientCount: activeClientCount() });
}

function clearPendingPlay() {
  if (playTimeout) {
    clearTimeout(playTimeout);
    playTimeout = null;
  }
}

function startSequence() {
  clearPendingPlay();

  const startAt = Date.now();
  const playAt = startAt + sequenceState.countdownSeconds * 1000;

  sequenceState.phase = "countdown";
  sequenceState.sequenceId += 1;
  sequenceState.countdownStartAt = startAt;
  sequenceState.playAt = playAt;

  io.emit("sequence:start", statePayload());

  playTimeout = setTimeout(() => {
    if (sequenceState.phase !== "countdown") {
      return;
    }

    sequenceState.phase = "playing";
    io.emit("sequence:play", statePayload());
  }, sequenceState.countdownSeconds * 1000);
}

function resetSequence() {
  clearPendingPlay();

  sequenceState.phase = "idle";
  sequenceState.sequenceId += 1;
  sequenceState.countdownStartAt = null;
  sequenceState.playAt = null;

  io.emit("sequence:reset", statePayload());
}

app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : "*" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, phase: sequenceState.phase, now: Date.now() });
});

app.get("/api/config", (_req, res) => {
  res.json({
    videoUrl: sequenceState.videoUrl,
    imageUrl: sequenceState.imageUrl,
    countdownSeconds: sequenceState.countdownSeconds
  });
});

app.use("/admin", express.static(path.join(__dirname, "public", "admin")));
app.get("/admin", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin", "index.html"));
});

io.on("connection", (socket) => {
  socket.on("register", ({ role }) => {
    const normalizedRole = role === "admin" ? "admin" : "client";
    socket.data.role = normalizedRole;

    socket.emit("sync:state", statePayload());
    emitAdminStats();
  });

  socket.on("admin:startSequence", () => {
    if (socket.data.role !== "admin") {
      return;
    }
    startSequence();
  });

  socket.on("admin:resetSequence", () => {
    if (socket.data.role !== "admin") {
      return;
    }
    resetSequence();
  });

  socket.on("disconnect", () => {
    emitAdminStats();
  });
});

const port = Number(process.env.PORT || 3000);
server.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
