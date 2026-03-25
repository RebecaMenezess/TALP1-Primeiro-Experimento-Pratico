import { randomUUID } from "node:crypto";
import type { Alternative, Question, UpdateQuestionBody } from "@closed-questions/shared";

function newAlternative(partial: Omit<Alternative, "id">): Alternative {
  return {
    id: randomUUID(),
    description: partial.description.trim(),
    isCorrect: partial.isCorrect,
  };
}

function normalizeAlternatives(
  items: UpdateQuestionBody["alternatives"]
): Alternative[] {
  return items.map((a) => ({
    id: a.id?.trim() ? a.id.trim() : randomUUID(),
    description: a.description.trim(),
    isCorrect: a.isCorrect,
  }));
}

const questions = new Map<string, Question>();

export function listQuestions(): Question[] {
  return [...questions.values()].sort((a, b) =>
    a.description.localeCompare(b.description, undefined, { sensitivity: "base" })
  );
}

export function getQuestion(id: string): Question | undefined {
  return questions.get(id);
}

export function createQuestion(
  description: string,
  labelMode: Question["labelMode"],
  alternatives: Omit<Alternative, "id">[]
): Question {
  const q: Question = {
    id: randomUUID(),
    description: description.trim(),
    labelMode,
    alternatives: alternatives.map((a) => newAlternative(a)),
  };
  questions.set(q.id, q);
  return q;
}

export function updateQuestion(id: string, body: UpdateQuestionBody): Question | undefined {
  const existing = questions.get(id);
  if (!existing) return undefined;

  const updated: Question = {
    id: existing.id,
    description: body.description.trim(),
    labelMode: body.labelMode,
    alternatives: normalizeAlternatives(body.alternatives),
  };
  questions.set(id, updated);
  return updated;
}

export function deleteQuestion(id: string): boolean {
  return questions.delete(id);
}
