# Exam Generator and Grading System

Web application for managing closed exam questions, building exams, generating randomized individual PDFs, exporting answer keys, grading student responses from CSV files, and generating a class grade report.

## What this project does

- Manage closed questions (create, update, delete)
  - Question statement
  - Alternatives with description + whether each alternative is correct
- Manage exams (create, update, delete)
  - Build exams from previously registered questions
  - Choose answer format per exam:
    - `letters` (A, B, C...)
    - `powersOf2` (1, 2, 4, 8...)
- Generate exam files
  - ZIP containing individual randomized PDF exams
  - PDF includes header (course/instructor/date/etc), footer with exam number on each page, and name/CPF section at the end
  - CSV answer key for each generated exam
- Grade exams from CSV
  - Inputs:
    - answer key CSV
    - student responses CSV
  - Modes:
    - `strict`: question score is 1 only for exact match, otherwise 0
    - `lenient`: proportional score by alternatives correctly selected or correctly unselected
  - Output:
    - class grade report CSV

## Stack

- Client: React + TypeScript
- Server: Node.js + Express + TypeScript
- Shared contracts/types in a shared workspace package

## Project structure

- `sistema/client` - React frontend
- `sistema/server` - Node/Express API
- `sistema/shared` - shared TypeScript types

## Run locally (development)

From the repository root:

```bash
cd sistema
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- API: auto-selected port starting at `4000`

## Grading CSV format

### 1) Answer key CSV

Required columns:

- `examNumber`
- `q1`, `q2`, ... `qN`

Cell format:

- **Letters mode**: `KEY#ALTCOUNT` (example: `AC#5`)
- **Powers-of-2 mode**: `KEY#ALTCOUNT` (example: `13#6`)

Where:

- `KEY` is the expected answer for that question
- `ALTCOUNT` is the total number of alternatives for that question

Notes:

- Strict mode works with either `KEY#ALTCOUNT` or legacy `KEY`.
- Lenient mode requires `KEY#ALTCOUNT`.

### 2) Student responses CSV

Required columns:

- `examNumber`
- `q1`, `q2`, ... `qN`

Optional columns (used in report when present):

- `studentName` or `name`
- `cpf`
- `studentId` or `email`

Each row should represent one student response for one generated exam number.

### Sample files included

- `answer_keys.csv`
- `student_responses_sample.csv`
- `student_responses_lenient_sample.csv`

You can use these files directly in the Grading tab to test strict and lenient behavior.

## Production build and run

```bash
cd sistema
npm install
npm run build
npm run start
```

In production, the server serves both:

- API routes under `/api`
- React app static files from `client/dist`

## Deploy

### Option A: Deploy as a Node service (recommended)

Use build/start commands:

- Build command: `cd sistema && npm install && npm run build`
- Start command: `cd sistema && npm run start`

Set environment variable:

- `PORT` (provided by most platforms automatically)

### Option B: Deploy with Docker

There is a Dockerfile at `sistema/Dockerfile`.

Build and run:

```bash
cd sistema
docker build -t exam-grading-app .
docker run -p 4000:4000 exam-grading-app
```

Then open: `http://localhost:4000`