import { existsSync } from "node:fs";
import { join } from "node:path";
import cors from "cors";
import express from "express";
import { questionsRouter } from "./routes/questions.js";
import { examsRouter } from "./routes/exams.js";
import { gradingRouter } from "./routes/grading.js";

export function createApp(args?: { enableStatic?: boolean; projectRoot?: string }) {
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/questions", questionsRouter);
  app.use("/api/exams", examsRouter);
  app.use("/api/grading", gradingRouter);

  const enableStatic = args?.enableStatic ?? false;
  const projectRoot = args?.projectRoot ?? process.cwd();
  const clientDistDir = join(projectRoot, "client", "dist");

  if (enableStatic && existsSync(clientDistDir)) {
    app.use(express.static(clientDistDir));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        next();
        return;
      }
      res.sendFile(join(clientDistDir, "index.html"));
    });
  }

  return app;
}

