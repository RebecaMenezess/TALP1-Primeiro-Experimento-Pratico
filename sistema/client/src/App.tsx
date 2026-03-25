import { useCallback, useEffect, useState } from "react";
import type { Exam, Question } from "@closed-questions/shared";
import * as api from "./api";
import { QuestionEditor } from "./components/QuestionEditor";
import { QuestionList } from "./components/QuestionList";
import { ExamList } from "./components/ExamList";
import { ExamEditor } from "./components/ExamEditor";
import { Grading } from "./components/Grading";
import styles from "./App.module.css";

export function App() {
  type Tab = "questions" | "exams" | "grading";
  type ExamEditMode = "create" | "edit";

  const [tab, setTab] = useState<Tab>("questions");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [questionError, setQuestionError] = useState<string | null>(null);

  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [examsLoading, setExamsLoading] = useState(false);
  const [examError, setExamError] = useState<string | null>(null);
  const [examEditMode, setExamEditMode] = useState<ExamEditMode>("edit");

  const loadQuestions = useCallback(async () => {
    setQuestionError(null);
    setQuestionsLoading(true);
    try {
      const list = await api.fetchQuestions();
      setQuestions(list);
      setSelectedId((current) => {
        if (current && list.some((q) => q.id === current)) return current;
        return list[0]?.id ?? null;
      });
    } catch (e) {
      setQuestionError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setQuestionsLoading(false);
    }
  }, []);

  const loadExams = useCallback(async () => {
    setExamError(null);
    setExamsLoading(true);
    try {
      const list = await api.fetchExams();
      setExams(list);
      setSelectedExamId((current) => {
        // When creating, the editor ignores selectedExamId anyway.
        if (examEditMode === "create") return null;
        if (current && list.some((e) => e.id === current)) return current;
        return list[0]?.id ?? null;
      });
    } catch (e) {
      setExamError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setExamsLoading(false);
    }
  }, [examEditMode]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    if (tab !== "exams") return;
    void loadExams();
  }, [tab, loadExams]);

  const selectedQuestion = selectedId ? questions.find((q) => q.id === selectedId) ?? null : null;
  const selectedExam =
    examEditMode === "edit" && selectedExamId ? exams.find((e) => e.id === selectedExamId) ?? null : null;

  async function handleCreate() {
    setQuestionError(null);
    try {
      const created = await api.createQuestion({
        description: "New question",
        labelMode: "letters",
        alternatives: [
          { description: "", isCorrect: true },
          { description: "", isCorrect: false },
        ],
      });
      setQuestions((prev) => [
        ...prev,
        created,
      ].sort((a, b) => a.description.localeCompare(b.description, undefined, { sensitivity: "base" })));
      setSelectedId(created.id);
    } catch (e) {
      setQuestionError(e instanceof Error ? e.message : "Could not create");
    }
  }

  async function handleDelete(id: string) {
    setQuestionError(null);
    try {
      await api.deleteQuestion(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      setSelectedId((current) => (current === id ? null : current));

      // Keep exams consistent after server removes this question from exams.
      if (tab === "exams") await loadExams();
    } catch (e) {
      setQuestionError(e instanceof Error ? e.message : "Could not delete");
    }
  }

  async function handleSaved(updated: Question) {
    setQuestions((prev) => {
      const next = prev.map((q) => (q.id === updated.id ? updated : q));
      return next.sort((a, b) =>
        a.description.localeCompare(b.description, undefined, { sensitivity: "base" })
      );
    });
    setSelectedId(updated.id);
  }

  async function handleExamDelete(id: string) {
    setExamError(null);
    try {
      await api.deleteExam(id);
      const next = exams.filter((e) => e.id !== id);
      setExams(next);
      if (selectedExamId === id) {
        setSelectedExamId(null);
        if (examEditMode === "edit") setExamEditMode("create");
      }
    } catch (e) {
      setExamError(e instanceof Error ? e.message : "Could not delete");
    }
  }

  function handleExamSaved(saved: Exam) {
    setExamError(null);
    setExams((prev) => {
      const exists = prev.some((e) => e.id === saved.id);
      const next = exists ? prev.map((e) => (e.id === saved.id ? saved : e)) : [...prev, saved];
      return next.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
      );
    });
    setExamEditMode("edit");
    setSelectedExamId(saved.id);
  }

  function startNewExam() {
    setExamError(null);
    setExamEditMode("create");
    setSelectedExamId(null);
  }

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div>
          {tab === "questions" ? (
            <>
              <h1 className={styles.title}>Closed questions</h1>
              <p className={styles.subtitle}>Create and edit multiple-choice items</p>
            </>
          ) : tab === "exams" ? (
            <>
              <h1 className={styles.title}>Exams</h1>
              <p className={styles.subtitle}>Create exams from registered questions</p>
            </>
          ) : (
            <>
              <h1 className={styles.title}>Grading</h1>
              <p className={styles.subtitle}>Grade exams from CSVs and generate a class report</p>
            </>
          )}
        </div>

        <div className={styles.headerRight}>
          <div className={styles.tabs} role="tablist" aria-label="Management tabs">
            <button
              type="button"
              className={tab === "questions" ? styles.tabButtonActive : styles.tabButton}
              onClick={() => setTab("questions")}
            >
              Questions
            </button>
            <button
              type="button"
              className={tab === "exams" ? styles.tabButtonActive : styles.tabButton}
              onClick={() => setTab("exams")}
            >
              Exams
            </button>
            <button
              type="button"
              className={tab === "grading" ? styles.tabButtonActive : styles.tabButton}
              onClick={() => setTab("grading")}
            >
              Grading
            </button>
          </div>

          {tab === "questions" ? (
            <button type="button" className={styles.primaryButton} onClick={() => void handleCreate()}>
              New question
            </button>
          ) : tab === "exams" ? (
            <button type="button" className={styles.primaryButton} onClick={startNewExam}>
              New exam
            </button>
          ) : null}
        </div>
      </header>

      {tab === "questions" && questionError ? (
        <div className={styles.banner} role="alert">
          {questionError}
        </div>
      ) : null}
      {tab === "exams" && examError ? (
        <div className={styles.banner} role="alert">
          {examError}
        </div>
      ) : null}

      <div className={styles.main}>
        <aside className={styles.sidebar}>
          {tab === "questions" ? (
            <QuestionList
              questions={questions}
              selectedId={selectedId}
              loading={questionsLoading}
              onSelect={setSelectedId}
              onDelete={(id) => void handleDelete(id)}
            />
          ) : tab === "exams" ? (
            <ExamList
              exams={exams}
              selectedExamId={examEditMode === "edit" ? selectedExamId : null}
              loading={examsLoading}
              onSelect={(id) => {
                setExamEditMode("edit");
                setSelectedExamId(id);
              }}
              onDelete={(id) => void handleExamDelete(id)}
            />
          ) : (
            <div className={styles.muted} style={{ padding: 12 }}>
              Upload answer key + responses CSVs to generate a class grade report.
            </div>
          )}
        </aside>

        <section className={styles.editor}>
          {tab === "questions" ? (
            questionsLoading ? (
              <p className={styles.muted}>Loading…</p>
            ) : selectedQuestion ? (
              <QuestionEditor key={selectedQuestion.id} question={selectedQuestion} onSaved={handleSaved} />
            ) : (
              <div className={styles.empty}>
                <p>No questions yet.</p>
                <button type="button" className={styles.primaryButton} onClick={() => void handleCreate()}>
                  Add your first question
                </button>
              </div>
            )
          ) : tab === "exams" ? (
            examsLoading && exams.length === 0 ? (
              <p className={styles.muted}>Loading…</p>
            ) : (
              <ExamEditor
                questions={questions}
                exam={examEditMode === "edit" ? selectedExam : null}
                onSaved={handleExamSaved}
              />
            )
          ) : (
            <Grading />
          )}
        </section>
      </div>
    </div>
  );
}
