import { randomUUID } from "node:crypto";
import type { CreateExamBody, Exam, UpdateExamBody } from "@closed-questions/shared";
import { getQuestion } from "./store.js";

const exams = new Map<string, Exam>();

export function clearExams(): void {
  exams.clear();
}

export function listExams(): Exam[] {
  return [...exams.values()].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
}

export function getExam(id: string): Exam | undefined {
  return exams.get(id);
}

function validateAllQuestionsExist(questionIds: string[]): boolean {
  return questionIds.every((id) => !!getQuestion(id));
}

export function createExam(body: CreateExamBody): Exam | undefined {
  if (!validateAllQuestionsExist(body.questionIds)) return undefined;

  const created: Exam = {
    id: randomUUID(),
    title: body.title.trim(),
    mode: body.mode,
    questionIds: body.questionIds,
  };
  exams.set(created.id, created);
  return created;
}

export function updateExam(id: string, body: UpdateExamBody): Exam | undefined {
  const existing = exams.get(id);
  if (!existing) return undefined;
  if (!validateAllQuestionsExist(body.questionIds)) return undefined;

  const updated: Exam = {
    id: existing.id,
    title: body.title.trim(),
    mode: body.mode,
    questionIds: body.questionIds,
  };
  exams.set(id, updated);
  return updated;
}

export function deleteExam(id: string): boolean {
  return exams.delete(id);
}

export function removeQuestionFromExams(questionId: string): void {
  for (const exam of exams.values()) {
    const nextIds = exam.questionIds.filter((id) => id !== questionId);
    if (nextIds.length === exam.questionIds.length) continue;
    if (nextIds.length === 0) {
      exams.delete(exam.id);
      continue;
    }
    exams.set(exam.id, { ...exam, questionIds: nextIds });
  }
}

