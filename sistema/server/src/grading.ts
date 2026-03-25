import type { ExamMode, GradeExamsResult, GradingMode } from "@closed-questions/shared";

type ParsedCsv = { headers: string[]; rows: Record<string, string>[] };

type AnswerKeyEntry = {
  key: string;
  altCount?: number;
};

function parseCsv(text: string): ParsedCsv {
  const src = (text ?? "").replaceAll("\r\n", "\n").replaceAll("\r", "\n");

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell.trim());
    cell = "";
  };
  const pushRow = () => {
    // Skip completely empty rows
    const isEmpty = row.length === 0 || row.every((c) => c.trim() === "");
    if (!isEmpty) rows.push(row);
    row = [];
  };

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === "\"") {
      if (inQuotes && src[i + 1] === "\"") {
        cell += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      pushCell();
      continue;
    }
    if (ch === "\n" && !inQuotes) {
      pushCell();
      pushRow();
      continue;
    }

    cell += ch;
  }

  // Flush tail
  pushCell();
  pushRow();

  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0].map((h) => h.trim());
  const objects = rows.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] ?? "";
    });
    return obj;
  });

  return { headers, rows: objects };
}

function toInt(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (!Number.isInteger(n)) return null;
  return n;
}

function letterLabel(index: number): string {
  if (index < 26) return String.fromCharCode(65 + index);
  return String(index + 1);
}

function powerLabel(index: number): number {
  return 2 ** index;
}

function normalizeLettersAnswer(raw: string): Set<string> {
  const upper = (raw ?? "").toUpperCase();
  const tokens = upper.split(/[^A-Z0-9]+/g).map((t) => t.trim()).filter(Boolean);
  const joined = tokens.length === 1 ? tokens[0] : tokens.join("");
  const set = new Set<string>();
  for (const ch of joined) {
    if (/[A-Z0-9]/.test(ch)) set.add(ch);
  }
  return set;
}

function decodePowerSum(sum: number, altCount: number): Set<string> {
  const set = new Set<string>();
  let remaining = sum;
  for (let i = 0; i < altCount; i += 1) {
    const p = powerLabel(i);
    if (remaining >= p && Math.floor(remaining / p) % 2 === 1) {
      set.add(String(p));
    }
  }
  return set;
}

function correctSetFromKey(mode: ExamMode, entry: AnswerKeyEntry): Set<string> | null {
  if (mode === "letters") return normalizeLettersAnswer(entry.key);
  const n = toInt(entry.key);
  if (n === null) return null;
  if (entry.altCount === undefined) return null;
  return decodePowerSum(n, entry.altCount);
}

function selectionSetFromStudent(mode: ExamMode, entry: AnswerKeyEntry, rawAnswer: string): Set<string> | null {
  if (mode === "letters") return normalizeLettersAnswer(rawAnswer);
  const n = toInt(rawAnswer);
  if (n === null) return null;
  if (entry.altCount === undefined) return null;
  return decodePowerSum(n, entry.altCount);
}

function parseAnswerKeyCell(cell: string): AnswerKeyEntry {
  const raw = (cell ?? "").trim();
  // Supports new format "KEY#ALTCOUNT" (e.g. "AC#5" or "13#6") and legacy "KEY".
  const m = raw.match(/^(.*?)#(\d+)$/);
  if (!m) return { key: raw };
  const altCount = Number(m[2]);
  return { key: (m[1] ?? "").trim(), altCount: Number.isFinite(altCount) ? altCount : undefined };
}

function escapeCsv(value: string): string {
  const v = value ?? "";
  if (/[\",\n]/.test(v)) return `"${v.replaceAll("\"", "\"\"")}"`;
  return v;
}

export function gradeFromCsv(args: {
  answerKeyCsv: string;
  responsesCsv: string;
  mode: GradingMode;
}): GradeExamsResult {
  const warnings: string[] = [];

  const answerCsv = parseCsv(args.answerKeyCsv);
  const respCsv = parseCsv(args.responsesCsv);

  if (!answerCsv.headers.includes("examNumber")) {
    throw new Error("Answer key CSV must include an 'examNumber' column.");
  }
  if (!respCsv.headers.includes("examNumber")) {
    throw new Error("Responses CSV must include an 'examNumber' column.");
  }

  const answerQuestionCols = answerCsv.headers.filter((h) => /^q\d+$/i.test(h));
  if (answerQuestionCols.length === 0) {
    throw new Error("Answer key CSV must include question columns named q1, q2, ...");
  }
  answerQuestionCols.sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));

  const answerByExam = new Map<number, AnswerKeyEntry[]>();
  const modeByExam = new Map<number, ExamMode>();

  for (const row of answerCsv.rows) {
    const examNumber = toInt(row.examNumber ?? "");
    if (examNumber === null) continue;
    const entries = answerQuestionCols.map((col) => parseAnswerKeyCell(row[col] ?? ""));
    answerByExam.set(examNumber, entries);

    // Infer mode: if it looks numeric, treat as powersOf2; otherwise letters.
    const hasNumericOnly = entries.every((e) => e.key.trim() !== "" && /^[0-9]+$/.test(e.key.trim()));
    modeByExam.set(examNumber, hasNumericOnly ? "powersOf2" : "letters");
  }

  if (answerByExam.size === 0) {
    throw new Error("Answer key CSV has no valid rows.");
  }

  // Responses: expect wide format with q1..qN. If extra columns exist, we keep them.
  const responseQuestionCols = respCsv.headers.filter((h) => /^q\d+$/i.test(h));
  responseQuestionCols.sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));

  if (responseQuestionCols.length === 0) {
    throw new Error("Responses CSV must include question columns named q1, q2, ... (wide format).");
  }
  if (responseQuestionCols.length < answerQuestionCols.length) {
    throw new Error(
      `Responses CSV has ${responseQuestionCols.length} question columns but answer key requires ${answerQuestionCols.length}.`
    );
  }

  const rows: GradeExamsResult["rows"] = [];

  for (const row of respCsv.rows) {
    const examNumber = toInt(row.examNumber ?? "");
    if (examNumber === null) continue;

    const answerEntries = answerByExam.get(examNumber);
    if (!answerEntries) {
      warnings.push(`No answer key found for examNumber=${examNumber}.`);
      continue;
    }

    const examMode = modeByExam.get(examNumber) ?? "letters";
    const maxScore = answerEntries.length;

    const studentName = (row.studentName ?? row.name ?? "").trim() || undefined;
    const cpf = (row.cpf ?? row.CPF ?? "").trim() || undefined;
    const studentId =
      (row.studentId ?? row.email ?? row.Email ?? row["E-mail"] ?? studentName ?? cpf ?? "unknown").toString().trim() ||
      "unknown";

    const answers = answerEntries.map((_, idx) => (row[`q${idx + 1}`] ?? "").toString());

    const questionScores: number[] = [];

    for (let i = 0; i < answerEntries.length; i += 1) {
      const keyEntry = answerEntries[i];
      const rawAnswer = answers[i] ?? "";

      const correctSet = correctSetFromKey(examMode, keyEntry);
      const selectedSet = selectionSetFromStudent(examMode, keyEntry, rawAnswer);

      if (!correctSet || !selectedSet) {
        questionScores.push(0);
        continue;
      }

      if (args.mode === "strict") {
        const ok = correctSet.size === selectedSet.size && [...correctSet].every((x) => selectedSet.has(x));
        questionScores.push(ok ? 1 : 0);
        continue;
      }

      // Lenient mode requires altCount for proper denominator.
      const altCount = keyEntry.altCount;
      if (altCount === undefined || altCount <= 0) {
        throw new Error(
          "Lenient grading requires answer key cells to include the total number of alternatives as KEY#ALTCOUNT (e.g. AC#5 or 13#6)."
        );
      }

      let correctBits = 0;
      for (let a = 0; a < altCount; a += 1) {
        const label = examMode === "letters" ? letterLabel(a) : String(powerLabel(a));
        const shouldSelect = correctSet.has(label);
        const didSelect = selectedSet.has(label);
        if ((shouldSelect && didSelect) || (!shouldSelect && !didSelect)) correctBits += 1;
      }
      questionScores.push(correctBits / altCount);
    }

    const totalScore = questionScores.reduce((s, v) => s + v, 0);

    rows.push({
      examNumber,
      studentId,
      studentName,
      cpf,
      totalScore,
      maxScore,
      questionScores,
      answers,
    });
  }

  // Report CSV
  const qCols = Array.from({ length: answerQuestionCols.length }, (_, i) => `q${i + 1}_score`);
  const reportHeaders = [
    "examNumber",
    "studentId",
    "studentName",
    "cpf",
    "totalScore",
    "maxScore",
    "percentage",
    ...qCols,
  ];

  const reportRows = rows.map((r) => {
    const pct = r.maxScore > 0 ? (r.totalScore / r.maxScore) * 100 : 0;
    return [
      String(r.examNumber),
      r.studentId,
      r.studentName ?? "",
      r.cpf ?? "",
      r.totalScore.toFixed(4),
      String(r.maxScore),
      pct.toFixed(2),
      ...r.questionScores.map((s) => s.toFixed(4)),
    ];
  });

  const reportCsv =
    reportHeaders.map(escapeCsv).join(",") + "\n" + reportRows.map((r) => r.map(escapeCsv).join(",")).join("\n") + "\n";

  return { rows, reportCsv, warnings };
}

