import type { Question } from "@closed-questions/shared";
import styles from "./QuestionList.module.css";

type Props = {
  questions: Question[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
};

export function QuestionList({ questions, selectedId, loading, onSelect, onDelete }: Props) {
  if (loading) {
    return <p className={styles.hint}>Loading list…</p>;
  }

  if (questions.length === 0) {
    return <p className={styles.hint}>Your questions will appear here.</p>;
  }

  return (
    <ul className={styles.list}>
      {questions.map((q) => (
        <li key={q.id} className={styles.item}>
          <button
            type="button"
            className={selectedId === q.id ? styles.cardActive : styles.card}
            onClick={() => onSelect(q.id)}
          >
            <span className={styles.cardTitle}>{q.description || "(No description)"}</span>
            <span className={styles.cardMeta}>
              {q.alternatives.length} alternative{q.alternatives.length === 1 ? "" : "s"}
            </span>
          </button>
          <button
            type="button"
            className={styles.delete}
            title="Delete question"
            aria-label={`Delete: ${q.description}`}
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm("Delete this question?")) onDelete(q.id);
            }}
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
