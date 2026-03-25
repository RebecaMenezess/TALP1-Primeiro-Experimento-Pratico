import { PassThrough } from "node:stream";
import archiver from "archiver";
import PDFDocument from "pdfkit";
import type { Exam, ExamHeader, ExamMode, GenerateExamFilesBody, Question } from "@closed-questions/shared";

type VariantQuestion = {
  statement: string;
  alternatives: { label: string; description: string; isCorrect: boolean }[];
  answerKey: { key: string; altCount: number }; // key plus total alternatives
};

function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function letterLabel(index: number): string {
  if (index < 26) return String.fromCharCode(65 + index);
  return String(index + 1);
}

function powerLabel(index: number): number {
  return 2 ** index;
}

function buildVariantQuestions(mode: ExamMode, questions: Question[]): VariantQuestion[] {
  const qs = [...questions];
  shuffleInPlace(qs);

  return qs.map((q) => {
    const alts = [...q.alternatives];
    shuffleInPlace(alts);

    const labeled = alts.map((alt, idx) => ({
      label: mode === "letters" ? letterLabel(idx) : String(powerLabel(idx)),
      description: alt.description,
      isCorrect: alt.isCorrect,
    }));

    const key =
      mode === "letters"
        ? labeled
            .filter((a) => a.isCorrect)
            .map((a) => a.label)
            .join("")
        : String(
            labeled.reduce((sum, a, idx) => (a.isCorrect ? sum + powerLabel(idx) : sum), 0)
          );

    return {
      statement: q.description,
      alternatives: labeled,
      answerKey: { key, altCount: labeled.length },
    };
  });
}

function drawHeader(doc: PDFKit.PDFDocument, header: ExamHeader, exam: Exam, examNumber: number) {
  doc.fontSize(14).font("Helvetica-Bold").text(header.courseName || "Course", { align: "left" });
  doc.moveDown(0.2);
  doc.fontSize(10).font("Helvetica").text(`Instructor: ${header.instructor || "—"}`);
  doc.text(`Date: ${header.date || "—"}`);
  if (header.extra?.trim()) doc.text(header.extra.trim());
  doc.moveDown(0.3);
  doc.fontSize(12).font("Helvetica-Bold").text(`${exam.title} — Exam ${examNumber}`, { align: "left" });
  doc.moveDown(0.6);
  doc.moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor("#d0d3dd")
    .stroke();
  doc.moveDown(0.8);
}

function drawFooter(doc: PDFKit.PDFDocument, examNumber: number) {
  const y = doc.page.height - doc.page.margins.bottom + 10;
  doc.save();
  doc.fontSize(9).fillColor("#6b7280").font("Helvetica").text(`Exam ${examNumber}`, doc.page.margins.left, y, {
    width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
    align: "center",
  });
  doc.restore();
}

function ensureSpace(doc: PDFKit.PDFDocument, requiredHeight: number, examNumber: number, header: ExamHeader, exam: Exam) {
  const bottomY = doc.page.height - doc.page.margins.bottom - 30;
  if (doc.y + requiredHeight <= bottomY) return;
  drawFooter(doc, examNumber);
  doc.addPage();
  drawHeader(doc, header, exam, examNumber);
}

function renderExamPdf(
  exam: Exam,
  header: ExamHeader,
  examNumber: number,
  mode: ExamMode,
  questions: Question[]
): { stream: PassThrough; answerKeys: string[] } {
  const variantQuestions = buildVariantQuestions(mode, questions);
  const answerKeys = variantQuestions.map((q) => `${q.answerKey.key}#${q.answerKey.altCount}`);

  const doc = new PDFDocument({ size: "A4", margins: { top: 54, left: 54, right: 54, bottom: 54 } });
  const stream = new PassThrough();
  doc.pipe(stream);

  drawHeader(doc, header, exam, examNumber);

  variantQuestions.forEach((q, idx) => {
    ensureSpace(doc, 120, examNumber, header, exam);

    doc.fontSize(11).fillColor("#111827").font("Helvetica-Bold").text(`${idx + 1}. ${q.statement || "(No statement)"}`);
    doc.moveDown(0.35);

    doc.fontSize(10).font("Helvetica").fillColor("#111827");
    q.alternatives.forEach((a) => {
      ensureSpace(doc, 22, examNumber, header, exam);
      doc.text(`${a.label}. ${a.description || "(No description)"}`, { indent: 12 });
    });

    doc.moveDown(0.35);
    ensureSpace(doc, 36, examNumber, header, exam);
    if (mode === "letters") {
      doc.font("Helvetica").text("Selected letters: ____________________", { indent: 12 });
    } else {
      doc.font("Helvetica").text("Selected sum: ______________________", { indent: 12 });
    }
    doc.moveDown(0.7);
  });

  ensureSpace(doc, 140, examNumber, header, exam);
  doc.moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor("#d0d3dd")
    .stroke();
  doc.moveDown(0.8);

  doc.fontSize(11).font("Helvetica-Bold").text("Student information");
  doc.moveDown(0.6);
  doc.fontSize(11).font("Helvetica").text("Name: ________________________________________________");
  doc.moveDown(0.8);
  doc.text("CPF:  _________________________________________________");

  drawFooter(doc, examNumber);
  doc.end();

  return { stream, answerKeys };
}

function escapeCsv(value: string): string {
  const v = value ?? "";
  if (/[\",\n]/.test(v)) return `"${v.replaceAll("\"", "\"\"")}"`;
  return v;
}

export function generateExamZipStream(args: {
  exam: Exam;
  questions: Question[];
  body: GenerateExamFilesBody;
}): { archive: archiver.Archiver; filename: string } {
  const { exam, questions, body } = args;

  const archive = archiver("zip", { zlib: { level: 9 } });
  const safeTitle = (exam.title || "exam").replaceAll(/[^\w.-]+/g, "_").slice(0, 60);
  const filename = `${safeTitle}_generated.zip`;

  const count = body.count;
  const header = body.header;

  const csvRows: string[][] = [];

  for (let i = 1; i <= count; i += 1) {
    const { stream, answerKeys } = renderExamPdf(exam, header, i, exam.mode, questions);
    archive.append(stream, { name: `exam_${i}.pdf` });
    csvRows.push([String(i), ...answerKeys]);
  }

  const csv =
    ["examNumber", ...questions.map((_, idx) => `q${idx + 1}`)].join(",") +
    "\n" +
    csvRows.map((row) => row.map(escapeCsv).join(",")).join("\n") +
    "\n";

  archive.append(csv, { name: "answer_keys.csv" });
  return { archive, filename };
}

