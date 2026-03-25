import { Router } from "express";
import type { CreateQuestionBody, ExamMode, UpdateQuestionBody } from "@closed-questions/shared";
import * as store from "../store.js";
import * as examsStore from "../examsStore.js";

export const questionsRouter = Router();

function isLabelMode(value: unknown): value is ExamMode {
  return value === "letters" || value === "powersOf2";
}

questionsRouter.get("/", (_req, res) => {
  res.json(store.listQuestions());
});

questionsRouter.get("/:id", (req, res) => {
  const q = store.getQuestion(req.params.id);
  if (!q) {
    res.status(404).json({ error: "Question not found" });
    return;
  }
  res.json(q);
});

questionsRouter.post("/", (req, res) => {
  const body = req.body as CreateQuestionBody;
  if (typeof body?.description !== "string" || !body.description.trim()) {
    res.status(400).json({ error: "description is required" });
    return;
  }
  if (!isLabelMode(body?.labelMode)) {
    res.status(400).json({ error: "labelMode must be letters or powersOf2" });
    return;
  }
  const alts = Array.isArray(body.alternatives) ? body.alternatives : [];
  for (const a of alts) {
    if (typeof a?.description !== "string" || typeof a?.isCorrect !== "boolean") {
      res.status(400).json({ error: "Each alternative needs description (string) and isCorrect (boolean)" });
      return;
    }
  }
  const created = store.createQuestion(body.description, body.labelMode, alts);
  res.status(201).json(created);
});

questionsRouter.put("/:id", (req, res) => {
  const body = req.body as UpdateQuestionBody;
  if (typeof body?.description !== "string" || !body.description.trim()) {
    res.status(400).json({ error: "description is required" });
    return;
  }
  if (!isLabelMode(body?.labelMode)) {
    res.status(400).json({ error: "labelMode must be letters or powersOf2" });
    return;
  }
  if (!Array.isArray(body.alternatives)) {
    res.status(400).json({ error: "alternatives must be an array" });
    return;
  }
  for (const a of body.alternatives) {
    if (typeof a?.description !== "string" || typeof a?.isCorrect !== "boolean") {
      res.status(400).json({ error: "Each alternative needs description (string) and isCorrect (boolean)" });
      return;
    }
  }
  const updated = store.updateQuestion(req.params.id, body);
  if (!updated) {
    res.status(404).json({ error: "Question not found" });
    return;
  }
  res.json(updated);
});

questionsRouter.delete("/:id", (req, res) => {
  const ok = store.deleteQuestion(req.params.id);
  if (!ok) {
    res.status(404).json({ error: "Question not found" });
    return;
  }
  // Keep exams consistent: remove this question from all exams (and delete empty exams).
  examsStore.removeQuestionFromExams(req.params.id);
  res.status(204).send();
});
