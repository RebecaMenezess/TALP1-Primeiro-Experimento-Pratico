import { useEffect, useState } from "react";
import type { Alternative, ExamMode, Question, UpdateQuestionBody } from "@closed-questions/shared";
import { randomId } from "../id";
import * as api from "../api";
import styles from "./QuestionEditor.module.css";

type Props = {
  question: Question;
  onSaved: (q: Question) => void;
};

type DraftAlt = Pick<Alternative, "description" | "isCorrect"> & { clientId: string };

function toDrafts(alts: Alternative[]): DraftAlt[] {
  return alts.map((a) => ({
    clientId: a.id,
    description: a.description,
    isCorrect: a.isCorrect,
  }));
}

export function QuestionEditor({ question, onSaved }: Props) {
  const [description, setDescription] = useState(question.description);
  const [labelMode, setLabelMode] = useState<ExamMode>(question.labelMode);
  const [alternatives, setAlternatives] = useState<DraftAlt[]>(() => toDrafts(question.alternatives));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setDescription(question.description);
    setLabelMode(question.labelMode);
    setAlternatives(toDrafts(question.alternatives));
    setSaveError(null);
  }, [question.id, question.description, question.labelMode, question.alternatives]);

  function altLabel(index: number): string {
    if (labelMode === "powersOf2") return String(2 ** index);
    // letters
    if (index < 26) return String.fromCharCode(65 + index);
    return String(index + 1);
  }

  function addAlternative() {
    setAlternatives((prev) => [
      ...prev,
      { clientId: randomId(), description: "", isCorrect: false },
    ]);
  }

  function removeAlternative(clientId: string) {
    setAlternatives((prev) => prev.filter((a) => a.clientId !== clientId));
  }

  function patchAlternative(clientId: string, patch: Partial<Pick<DraftAlt, "description" | "isCorrect">>) {
    setAlternatives((prev) =>
      prev.map((a) => (a.clientId === clientId ? { ...a, ...patch } : a))
    );
  }

  async function handleSave() {
    setSaveError(null);
    const trimmedAlts = alternatives.map((a) => ({
      id: question.alternatives.some((x) => x.id === a.clientId) ? a.clientId : undefined,
      description: a.description.trim(),
      isCorrect: a.isCorrect,
    }));

    if (trimmedAlts.some((a) => !a.description)) {
      setSaveError("Every alternative needs a description (you can use the placeholders as a guide).");
      return;
    }

    const body: UpdateQuestionBody = {
      description: description.trim(),
      labelMode,
      alternatives: trimmedAlts,
    };

    if (!body.description) {
      setSaveError("Question description is required.");
      return;
    }

    setSaving(true);
    try {
      const updated = await api.updateQuestion(question.id, body);
      onSaved(updated);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const correctCount = alternatives.filter((a) => a.isCorrect).length;

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <button type="button" className={styles.save} disabled={saving} onClick={() => void handleSave()}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        {correctCount === 0 ? (
          <span className={styles.warn}>No correct alternative marked</span>
        ) : null}
      </div>

      {saveError ? (
        <div className={styles.error} role="alert">
          {saveError}
        </div>
      ) : null}

      <label className={styles.field}>
        <span className={styles.label}>Question</span>
        <textarea
          className={styles.textarea}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is the question?"
        />
      </label>

      <div className={styles.modeRow}>
        <span className={styles.label}>Alternative labels</span>
        <label className={styles.radio}>
          <input
            type="radio"
            name="question-label-mode"
            value="letters"
            checked={labelMode === "letters"}
            onChange={() => setLabelMode("letters")}
          />
          Letters (A, B, C…)
        </label>
        <label className={styles.radio}>
          <input
            type="radio"
            name="question-label-mode"
            value="powersOf2"
            checked={labelMode === "powersOf2"}
            onChange={() => setLabelMode("powersOf2")}
          />
          Powers of 2 (1, 2, 4…)
        </label>
      </div>

      <div className={styles.altHeader}>
        <h2 className={styles.altTitle}>Alternatives</h2>
        <button type="button" className={styles.ghost} onClick={addAlternative}>
          Add alternative
        </button>
      </div>

      {alternatives.length === 0 ? (
        <p className={styles.muted}>Add at least one alternative.</p>
      ) : (
        <ul className={styles.altList}>
          {alternatives.map((a, index) => (
            <li key={a.clientId} className={styles.altRow}>
              <div className={styles.altTop}>
                <span className={styles.altIndex}>{altLabel(index)}</span>
                <label className={styles.correct}>
                  <input
                    type="checkbox"
                    checked={a.isCorrect}
                    onChange={(e) => patchAlternative(a.clientId, { isCorrect: e.target.checked })}
                  />
                  Correct
                </label>
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => removeAlternative(a.clientId)}
                  disabled={alternatives.length <= 1}
                  title={alternatives.length <= 1 ? "Keep at least one alternative" : "Remove"}
                >
                  Remove
                </button>
              </div>
              <input
                type="text"
                className={styles.input}
                value={a.description}
                onChange={(e) => patchAlternative(a.clientId, { description: e.target.value })}
                placeholder={`Alternative ${altLabel(index)}`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
