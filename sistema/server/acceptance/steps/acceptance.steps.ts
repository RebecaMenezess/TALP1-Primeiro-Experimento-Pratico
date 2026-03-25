import assert from "node:assert/strict";
import { Before, Given, Then, When } from "@cucumber/cucumber";
import request, { type Response } from "supertest";
import { createApp } from "../../src/app.js";
import { clearQuestions } from "../../src/store.js";
import { clearExams } from "../../src/examsStore.js";

type AltRow = { description: string; isCorrect: string };
type IdRow = { id: string };

const app = createApp();

let lastResponse: Response | null = null;
let lastQuestionId: string | null = null;
let answerKeyCsv = "";
let responsesCsv = "";
let gradingMode: "strict" | "lenient" = "strict";

Before(() => {
  lastResponse = null;
  lastQuestionId = null;
  answerKeyCsv = "";
  responsesCsv = "";
  gradingMode = "strict";
});

Given("the in-memory data is clean", () => {
  clearExams();
  clearQuestions();
});

When("I create a question with description {string} and alternatives:", async (description: string, table) => {
  const rows = table.hashes() as AltRow[];
  const alternatives = rows.map((r) => ({
    description: r.description,
    isCorrect: r.isCorrect.toLowerCase() === "true",
  }));

  lastResponse = await request(app).post("/api/questions").send({
    description,
    labelMode: "letters",
    alternatives,
  });
  lastQuestionId = lastResponse.body?.id ?? null;
});

When("I create an exam {string} in mode {string} with the last created question", async (title: string, mode: string) => {
  assert.ok(lastQuestionId, "Expected a previously created question id");
  lastResponse = await request(app).post("/api/exams").send({
    title,
    mode,
    questionIds: [lastQuestionId],
  });
});

When("I create an exam {string} in mode {string} with question ids:", async (title: string, mode: string, table) => {
  const rows = table.hashes() as IdRow[];
  lastResponse = await request(app).post("/api/exams").send({
    title,
    mode,
    questionIds: rows.map((r) => r.id),
  });
});

When("I grade with mode {string} using answer key CSV:", async (mode: string, docString: string) => {
  gradingMode = mode === "lenient" ? "lenient" : "strict";
  answerKeyCsv = docString.trim();
  lastResponse = await request(app).post("/api/grading/grade").send({
    mode: gradingMode,
    answerKeyCsv,
    responsesCsv,
  });
});

When("responses CSV:", async (docString: string) => {
  responsesCsv = docString.trim();
  lastResponse = await request(app).post("/api/grading/grade").send({
    mode: gradingMode,
    answerKeyCsv,
    responsesCsv,
  });
});

Then("the API response status should be {int}", (status: number) => {
  assert.ok(lastResponse, "Expected an API response");
  assert.equal(lastResponse.status, status);
});

Then("the response should contain {string}", (field: string) => {
  assert.ok(lastResponse, "Expected an API response");
  assert.ok(field in (lastResponse.body ?? {}), `Expected response body to contain field "${field}"`);
});

Then("the response field {string} should be {string}", (field: string, expected: string) => {
  assert.ok(lastResponse, "Expected an API response");
  assert.equal(String(lastResponse.body?.[field]), expected);
});

Then("student {string} should have total score {float}", (studentName: string, expectedScore: number) => {
  assert.ok(lastResponse, "Expected an API response");
  const rows = lastResponse.body?.rows as Array<{ studentName?: string; totalScore?: number }> | undefined;
  assert.ok(Array.isArray(rows), "Expected a grading response with rows");
  const row = rows.find((r) => r.studentName === studentName);
  assert.ok(row, `Student "${studentName}" not found in grading rows`);
  assert.ok(typeof row.totalScore === "number", "Expected totalScore to be a number");
  assert.ok(Math.abs(row.totalScore - expectedScore) < 0.0001, `Expected ${expectedScore}, got ${row.totalScore}`);
});

Then("student {string} should have total score {int}", (studentName: string, expectedScore: number) => {
  assert.ok(lastResponse, "Expected an API response");
  const rows = lastResponse.body?.rows as Array<{ studentName?: string; totalScore?: number }> | undefined;
  assert.ok(Array.isArray(rows), "Expected a grading response with rows");
  const row = rows.find((r) => r.studentName === studentName);
  assert.ok(row, `Student "${studentName}" not found in grading rows`);
  assert.ok(typeof row.totalScore === "number", "Expected totalScore to be a number");
  assert.ok(Math.abs(row.totalScore - expectedScore) < 0.0001, `Expected ${expectedScore}, got ${row.totalScore}`);
});

