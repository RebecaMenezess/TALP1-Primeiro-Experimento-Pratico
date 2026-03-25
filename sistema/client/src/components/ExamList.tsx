import type { Exam } from "@closed-questions/shared";
import styles from "./ExamList.module.css";

type Props = {
  exams: Exam[];
  selectedExamId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
};

export function ExamList({ exams, selectedExamId, loading, onSelect, onDelete }: Props) {
  if (loading) return <p className={styles.hint}>Loading exams…</p>;
  if (exams.length === 0) return <p className={styles.hint}>Your exams will appear here.</p>;

  return (
    <ul className={styles.list}>
      {exams.map((exam) => (
        <li key={exam.id} className={styles.item}>
          <button
            type="button"
            className={selectedExamId === exam.id ? styles.cardActive : styles.card}
            onClick={() => onSelect(exam.id)}
          >
            <span className={styles.cardTitle}>{exam.title || "(No title)"}</span>
            <span className={styles.cardMeta}>{exam.questionIds.length} question(s)</span>
          </button>
          <button
            type="button"
            className={styles.delete}
            title="Delete exam"
            aria-label={`Delete exam: ${exam.title}`}
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm("Delete this exam?")) onDelete(exam.id);
            }}
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}

