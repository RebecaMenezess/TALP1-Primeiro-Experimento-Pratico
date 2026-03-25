import { Router } from "express";
import type { GradeExamsBody } from "@closed-questions/shared";
import { gradeFromCsv } from "../grading.js";

export const gradingRouter = Router();

gradingRouter.post("/grade", (req, res) => {
  const body = req.body as Partial<GradeExamsBody> | undefined;

  if (!body || typeof body !== "object") {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  if (typeof body.answerKeyCsv !== "string" || !body.answerKeyCsv.trim()) {
    res.status(400).json({ error: "answerKeyCsv is required" });
    return;
  }
  if (typeof body.responsesCsv !== "string" || !body.responsesCsv.trim()) {
    res.status(400).json({ error: "responsesCsv is required" });
    return;
  }
  if (body.mode !== "strict" && body.mode !== "lenient") {
    res.status(400).json({ error: "mode must be strict or lenient" });
    return;
  }

  try {
    const result = gradeFromCsv({
      answerKeyCsv: body.answerKeyCsv,
      responsesCsv: body.responsesCsv,
      mode: body.mode,
    });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Grading failed" });
  }
});
