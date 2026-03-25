export interface Alternative {
  id: string;
  description: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  description: string;
  labelMode: ExamMode;
  alternatives: Alternative[];
}

export type CreateQuestionBody = {
  description: string;
  labelMode: ExamMode;
  alternatives?: Omit<Alternative, "id">[];
};

export type UpdateQuestionBody = {
  description: string;
  labelMode: ExamMode;
  alternatives: (Omit<Alternative, "id"> & { id?: string })[];
};

export type ExamMode = "letters" | "powersOf2";

export interface Exam {
  id: string;
  title: string;
  mode: ExamMode;
  questionIds: string[];
}

export type CreateExamBody = {
  title: string;
  mode: ExamMode;
  questionIds: string[];
};

export type UpdateExamBody = {
  title: string;
  mode: ExamMode;
  questionIds: string[];
};

export type ExamHeader = {
  courseName: string;
  instructor: string;
  date: string;
  extra?: string;
};

export type GenerateExamFilesBody = {
  count: number;
  header: ExamHeader;
};

export type GradingMode = "strict" | "lenient";

export type GradeExamsBody = {
  answerKeyCsv: string;
  responsesCsv: string;
  mode: GradingMode;
};

export type GradeRow = {
  examNumber: number;
  studentId: string;
  studentName?: string;
  cpf?: string;
  totalScore: number;
  maxScore: number;
  questionScores: number[];
  answers: string[];
};

export type GradeExamsResult = {
  rows: GradeRow[];
  reportCsv: string;
  warnings: string[];
};
