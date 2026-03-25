import type {
  CreateExamBody,
  CreateQuestionBody,
  Exam,
  GenerateExamFilesBody,
  GradeExamsBody,
  GradeExamsResult,
  Question,
  UpdateExamBody,
  UpdateQuestionBody,
} from "@closed-questions/shared";

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function fetchQuestions(): Promise<Question[]> {
  const res = await fetch("/api/questions");
  if (!res.ok) throw new Error("Failed to load questions");
  return parseJson<Question[]>(res);
}

export async function fetchExams(): Promise<Exam[]> {
  const res = await fetch("/api/exams");
  if (!res.ok) throw new Error("Failed to load exams");
  return parseJson<Exam[]>(res);
}

export async function fetchQuestion(id: string): Promise<Question> {
  const res = await fetch(`/api/questions/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Question not found");
  return parseJson<Question>(res);
}

export async function createExam(body: CreateExamBody): Promise<Exam> {
  const res = await fetch("/api/exams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await parseJson<{ error?: string }>(res).catch(() => null);
    const message =
      err && typeof err === "object" && "error" in err && typeof err.error === "string"
        ? err.error
        : "Could not create exam";
    throw new Error(message);
  }
  return parseJson<Exam>(res);
}

export async function updateExam(id: string, body: UpdateExamBody): Promise<Exam> {
  const res = await fetch(`/api/exams/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await parseJson<{ error?: string }>(res).catch(() => null);
    const message =
      err && typeof err === "object" && "error" in err && typeof err.error === "string"
        ? err.error
        : "Could not save exam";
    throw new Error(message);
  }
  return parseJson<Exam>(res);
}

export async function deleteExam(id: string): Promise<void> {
  const res = await fetch(`/api/exams/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Could not delete exam");
}

export async function generateExamFiles(examId: string, body: GenerateExamFilesBody): Promise<Blob> {
  const res = await fetch(`/api/exams/${encodeURIComponent(examId)}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await parseJson<{ error?: string }>(res).catch(() => null);
    const message =
      err && typeof err === "object" && "error" in err && typeof err.error === "string"
        ? err.error
        : "Could not generate files";
    throw new Error(message);
  }
  return res.blob();
}

export async function gradeExams(body: GradeExamsBody): Promise<GradeExamsResult> {
  const res = await fetch("/api/grading/grade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await parseJson<{ error?: string }>(res).catch(() => null);
    const message =
      err && typeof err === "object" && "error" in err && typeof err.error === "string"
        ? err.error
        : "Could not grade exams";
    throw new Error(message);
  }
  return parseJson<GradeExamsResult>(res);
}

export async function createQuestion(body: CreateQuestionBody): Promise<Question> {
  const res = await fetch("/api/questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await parseJson<{ error?: string }>(res).catch(() => null);
    const message =
      err && typeof err === "object" && "error" in err && typeof err.error === "string"
        ? err.error
        : "Could not create question";
    throw new Error(message);
  }
  return parseJson<Question>(res);
}

export async function updateQuestion(id: string, body: UpdateQuestionBody): Promise<Question> {
  const res = await fetch(`/api/questions/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await parseJson<{ error?: string }>(res).catch(() => null);
    const message =
      err && typeof err === "object" && "error" in err && typeof err.error === "string"
        ? err.error
        : "Could not save question";
    throw new Error(message);
  }
  return parseJson<Question>(res);
}

export async function deleteQuestion(id: string): Promise<void> {
  const res = await fetch(`/api/questions/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Could not delete question");
}
