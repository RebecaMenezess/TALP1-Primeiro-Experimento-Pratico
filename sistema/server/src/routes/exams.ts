import { Router } from "express";
import type { CreateExamBody, ExamMode, GenerateExamFilesBody, UpdateExamBody } from "@closed-questions/shared";
import * as examsStore from "../examsStore.js";
import { getQuestion } from "../store.js";
import { generateExamZipStream } from "../examGeneration.js";

export const examsRouter = Router();

function isExamMode(value: unknown): value is ExamMode {
  return value === "letters" || value === "powersOf2";
}

function isGenerateBody(value: unknown): value is GenerateExamFilesBody {
  if (!value || typeof value !== "object") return false;
  const v = value as GenerateExamFilesBody;
  return (
    typeof v.count === "number" &&
    Number.isFinite(v.count) &&
    v.count >= 1 &&
    v.count <= 200 &&
    !!v.header &&
    typeof v.header.courseName === "string" &&
    typeof v.header.instructor === "string" &&
    typeof v.header.date === "string" &&
    (v.header.extra === undefined || typeof v.header.extra === "string")
  );
}

examsRouter.get("/", (_req, res) => {
  res.json(examsStore.listExams());
});

examsRouter.get("/:id", (req, res) => {
  const exam = examsStore.getExam(req.params.id);
  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }
  res.json(exam);
});

examsRouter.post("/", (req, res) => {
  const body = req.body as CreateExamBody;

  if (typeof body?.title !== "string" || !body.title.trim()) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  if (!isExamMode(body?.mode)) {
    res.status(400).json({ error: "mode must be letters or powersOf2" });
    return;
  }
  if (!Array.isArray(body?.questionIds) || body.questionIds.length === 0) {
    res.status(400).json({ error: "questionIds must be a non-empty array" });
    return;
  }
  if (body.questionIds.some((id) => typeof id !== "string")) {
    res.status(400).json({ error: "questionIds must be an array of strings" });
    return;
  }

  const created = examsStore.createExam(body);
  if (!created) {
    res.status(400).json({ error: "One or more questions do not exist" });
    return;
  }
  res.status(201).json(created);
});

examsRouter.put("/:id", (req, res) => {
  const body = req.body as UpdateExamBody;

  if (typeof body?.title !== "string" || !body.title.trim()) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  if (!isExamMode(body?.mode)) {
    res.status(400).json({ error: "mode must be letters or powersOf2" });
    return;
  }
  if (!Array.isArray(body?.questionIds) || body.questionIds.length === 0) {
    res.status(400).json({ error: "questionIds must be a non-empty array" });
    return;
  }
  if (body.questionIds.some((id) => typeof id !== "string")) {
    res.status(400).json({ error: "questionIds must be an array of strings" });
    return;
  }

  const updated = examsStore.updateExam(req.params.id, body);
  if (!updated) {
    res.status(404).json({ error: "Exam not found (or questions invalid)" });
    return;
  }
  res.json(updated);
});

examsRouter.delete("/:id", (req, res) => {
  const ok = examsStore.deleteExam(req.params.id);
  if (!ok) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }
  res.status(204).send();
});

examsRouter.post("/:id/generate", (req, res) => {
  const exam = examsStore.getExam(req.params.id);
  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  const body = req.body as unknown;
  if (!isGenerateBody(body)) {
    res.status(400).json({ error: "Invalid body: { count: 1..200, header: { courseName, instructor, date, extra? } }" });
    return;
  }

  const questions = exam.questionIds
    .map((id) => getQuestion(id))
    .filter((q): q is NonNullable<typeof q> => !!q);

  if (questions.length !== exam.questionIds.length) {
    res.status(400).json({ error: "Exam references missing questions" });
    return;
  }

  const { archive, filename } = generateExamZipStream({ exam, questions, body });

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);

  archive.on("error", (err) => {
    console.error("ZIP generation error:", err);
    if (!res.headersSent) res.status(500);
    res.end();
  });

  archive.pipe(res);
  void archive.finalize();
});

