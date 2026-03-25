import { useEffect, useMemo, useState } from "react";
import type {
  CreateExamBody,
  Exam,
  ExamHeader,
  ExamMode,
  GenerateExamFilesBody,
  Question,
  UpdateExamBody,
} from "@closed-questions/shared";
import * as api from "../api";
import styles from "./ExamEditor.module.css";

type Props = {
  questions: Question[];
  exam: Exam | null; // null = create new exam
  onSaved: (exam: Exam) => void;
};

function altLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

function altPower(index: number): number {
  return 2 ** index;
}

function computeCorrectLetters(question: Question): string {
  return question.alternatives
    .map((alt, idx) => ({ alt, idx }))
    .filter(({ alt }) => alt.isCorrect)
    .map(({ idx }) => altLetter(idx))
    .join("");
}

function computeCorrectPowerSum(question: Question): number {
  return question.alternatives.reduce((sum, alt, idx) => (alt.isCorrect ? sum + altPower(idx) : sum), 0);
}

export function ExamEditor({ questions, exam, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<ExamMode>("letters");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [count, setCount] = useState(10);
  const [header, setHeader] = useState<ExamHeader>({
    courseName: "",
    instructor: "",
    date: "",
    extra: "",
  });

  useEffect(() => {
    if (!exam) {
      setTitle("");
      setMode("letters");
      setSelectedQuestionIds([]);
      setError(null);
      setGenerating(false);
      return;
    }

    setTitle(exam.title);
    setMode(exam.mode);
    setSelectedQuestionIds(exam.questionIds);
    setError(null);
  }, [exam?.id]);

  const selectedSet = useMemo(() => new Set(selectedQuestionIds), [selectedQuestionIds]);
  const selectedQuestions = useMemo(
    () => questions.filter((q) => selectedSet.has(q.id)),
    [questions, selectedSet]
  );

  function toggleQuestion(questionId: string) {
    setSelectedQuestionIds((prev) => {
      const set = new Set(prev);
      if (set.has(questionId)) set.delete(questionId);
      else set.add(questionId);
      return [...set];
    });
  }

  async function handleSave() {
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Exam title is required.");
      return;
    }
    if (selectedQuestions.length === 0) {
      setError("Select at least one question.");
      return;
    }

    const questionIds = selectedQuestions.map((q) => q.id);

    const body: CreateExamBody | UpdateExamBody = {
      title: trimmedTitle,
      mode,
      questionIds,
    };

    setSaving(true);
    try {
      if (!exam) {
        const created = await api.createExam(body as CreateExamBody);
        onSaved(created);
      } else {
        const updated = await api.updateExam(exam.id, body as UpdateExamBody);
        onSaved(updated);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    setError(null);
    if (!exam) {
      setError("Save the exam before generating PDFs.");
      return;
    }
    if (!Number.isFinite(count) || count < 1 || count > 200) {
      setError("Count must be between 1 and 200.");
      return;
    }
    if (!header.courseName.trim() || !header.instructor.trim() || !header.date.trim()) {
      setError("Header fields course name, instructor, and date are required.");
      return;
    }

    const body: GenerateExamFilesBody = {
      count,
      header: {
        courseName: header.courseName.trim(),
        instructor: header.instructor.trim(),
        date: header.date.trim(),
        extra: header.extra?.trim() ? header.extra.trim() : undefined,
      },
    };

    setGenerating(true);
    try {
      const blob = await api.generateExamFiles(exam.id, body);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(exam.title || "exam").replaceAll(/[^\w.-]+/g, "_")}_generated.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <button type="button" className={styles.save} disabled={saving} onClick={() => void handleSave()}>
          {saving ? "Saving…" : exam ? "Save changes" : "Create exam"}
        </button>
        <span className={styles.muted}>
          {selectedQuestions.length} question{selectedQuestions.length === 1 ? "" : "s"} selected
        </span>
      </div>

      {error ? (
        <div className={styles.error} role="alert">
          {error}
        </div>
      ) : null}

      <label className={styles.field}>
        <span className={styles.label}>Exam title</span>
        <input
          className={styles.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Example: Exam 1"
        />
      </label>

      <div className={styles.modeRow}>
        <span className={styles.label}>Student alternatives format</span>
        <label className={styles.radio}>
          <input
            type="radio"
            name="exam-mode"
            value="letters"
            checked={mode === "letters"}
            onChange={() => setMode("letters")}
          />
          Letters (A, B, C…)
        </label>
        <label className={styles.radio}>
          <input
            type="radio"
            name="exam-mode"
            value="powersOf2"
            checked={mode === "powersOf2"}
            onChange={() => setMode("powersOf2")}
          />
          Powers of 2 (1, 2, 4…)
        </label>
      </div>

      <div className={styles.pickerHeader}>
        <h2 className={styles.sectionTitle}>Select questions</h2>
        <span className={styles.muted}>Choose from the registered closed questions.</span>
      </div>

      <div className={styles.questionPicker}>
        {questions.length === 0 ? (
          <p className={styles.muted}>You need to register questions first.</p>
        ) : (
          <ul className={styles.questionList}>
            {questions.map((q) => (
              <li key={q.id} className={styles.questionItem}>
                <label className={styles.questionLabel}>
                  <input
                    type="checkbox"
                    checked={selectedSet.has(q.id)}
                    onChange={() => toggleQuestion(q.id)}
                  />
                  <span className={styles.questionText}>
                    <span className={styles.questionDesc}>{q.description || "(No description)"}</span>
                    <span className={styles.questionMeta}>
                      {q.alternatives.length} alternative{q.alternatives.length === 1 ? "" : "s"}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.previewHeader}>
        <h2 className={styles.sectionTitle}>Student input preview</h2>
      </div>

      {selectedQuestions.length === 0 ? (
        <p className={styles.muted}>Select at least one question to preview.</p>
      ) : (
        <ul className={styles.previewList}>
          {selectedQuestions.map((q) => (
            <li key={q.id} className={styles.previewQuestion}>
              <div className={styles.previewQuestionStatement}>{q.description || "(No statement)"}</div>

              <ul className={styles.previewAlternatives}>
                {q.alternatives.map((alt, idx) => {
                  const label = mode === "letters" ? altLetter(idx) : String(altPower(idx));
                  return (
                    <li key={alt.id} className={styles.previewAltRow}>
                      <span className={styles.previewAltLabel}>{label}.</span>
                      <span className={alt.isCorrect ? styles.correctAlt : styles.altText}>{alt.description}</span>
                    </li>
                  );
                })}
              </ul>

              {mode === "letters" ? (
                <div className={styles.studentBlank}>
                  Selected letters: <span className={styles.blankLine}>________</span>
                </div>
              ) : (
                <div className={styles.studentBlank}>
                  Selected sum: <span className={styles.blankLine}>________</span>
                </div>
              )}

              {mode === "letters" ? (
                <div className={styles.keyLine}>
                  Correct letters: <span className={styles.keyValue}>{computeCorrectLetters(q) || "—"}</span>
                </div>
              ) : (
                <div className={styles.keyLine}>
                  Correct sum: <span className={styles.keyValue}>{computeCorrectPowerSum(q)}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className={styles.previewHeader}>
        <h2 className={styles.sectionTitle}>Generate PDFs + CSV</h2>
      </div>

      <div className={styles.generator}>
        <div className={styles.generatorGrid}>
          <label className={styles.field}>
            <span className={styles.label}>Number of individual exams</span>
            <input
              className={styles.input}
              type="number"
              min={1}
              max={200}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Course name</span>
            <input
              className={styles.input}
              value={header.courseName}
              onChange={(e) => setHeader((h) => ({ ...h, courseName: e.target.value }))}
              placeholder="Example: TALP 1"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Instructor</span>
            <input
              className={styles.input}
              value={header.instructor}
              onChange={(e) => setHeader((h) => ({ ...h, instructor: e.target.value }))}
              placeholder="Example: Prof. Name"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Date</span>
            <input
              className={styles.input}
              value={header.date}
              onChange={(e) => setHeader((h) => ({ ...h, date: e.target.value }))}
              placeholder="YYYY-MM-DD"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Extra (optional)</span>
            <input
              className={styles.input}
              value={header.extra ?? ""}
              onChange={(e) => setHeader((h) => ({ ...h, extra: e.target.value }))}
              placeholder="Room, duration, instructions…"
            />
          </label>
        </div>

        <button
          type="button"
          className={styles.save}
          disabled={generating}
          onClick={() => void handleGenerate()}
          title={!exam ? "Save the exam first" : undefined}
        >
          {generating ? "Generating…" : "Download ZIP (PDFs + CSV)"}
        </button>

        <p className={styles.muted}>
          Each PDF is one individual exam with randomized question/alternative order, a header, a footer with the exam
          number, and a Name/CPF section at the end. The ZIP also includes a CSV answer key.
        </p>
      </div>
    </div>
  );
}

