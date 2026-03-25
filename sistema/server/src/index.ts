import http from "node:http";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { questionsRouter } from "./routes/questions.js";
import { examsRouter } from "./routes/exams.js";
import { gradingRouter } from "./routes/grading.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..", "..");
const DEV_PORT_FILE = join(projectRoot, ".api-port");
const MAX_PORT_TRIES = 50;

const app = express();
const basePort = Number(process.env.PORT) || 4000;

app.use(cors({ origin: true }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/questions", questionsRouter);
app.use("/api/exams", examsRouter);
app.use("/api/grading", gradingRouter);

const clientDistDir = join(projectRoot, "client", "dist");
if (existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(join(clientDistDir, "index.html"));
  });
}

const shouldPublishDevPort =
  process.env.NODE_ENV !== "production" && process.env.WRITE_API_PORT_FILE !== "0";

function writeDevPortFile(port: number) {
  if (!shouldPublishDevPort) return;
  writeFileSync(DEV_PORT_FILE, `${port}\n`, "utf8");
}

function clearDevPortFile() {
  if (!shouldPublishDevPort) return;
  try {
    unlinkSync(DEV_PORT_FILE);
  } catch {
    /* file may be missing */
  }
}

function listenWithFallback(startPort: number) {
  let port = startPort;
  let attempts = 0;

  const tryListen = () => {
    const server = http.createServer(app);

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE" && attempts < MAX_PORT_TRIES) {
        const taken = port;
        attempts += 1;
        port += 1;
        console.warn(`Port ${taken} is in use, trying ${port}…`);
        tryListen();
      } else {
        console.error("Failed to start API:", err);
        process.exit(1);
      }
    });

    server.listen(port, () => {
      writeDevPortFile(port);
      console.log(`API listening on http://localhost:${port}`);
    });
  };

  tryListen();
}

process.once("SIGINT", () => {
  clearDevPortFile();
  process.exit(0);
});
process.once("SIGTERM", () => {
  clearDevPortFile();
  process.exit(0);
});

listenWithFallback(basePort);
