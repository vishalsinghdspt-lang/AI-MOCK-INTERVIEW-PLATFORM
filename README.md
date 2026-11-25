# AI Mock Interview Platform

An AI-powered mock interview app. Upload your resume, get personalized technical interview questions, answer them in a focused workspace and receive a scored evaluation with strengths, improvements and a stronger sample answer. Every evaluated interview is saved to a history dashboard.

Built with **FastAPI**, **Google Gemini** and **SQLite**, with a custom dark UI that needs no frontend build step.


## Features

**Interview experience**
- Resume-based question generation: 10 technical questions tailored to your own projects and skills
- One-question-at-a-time workspace with a live progress bar and question tracker
- Answer editor with word and character counts, and a `Ctrl + Enter` shortcut to submit
- Duplicate-submission protection while the AI is working
- Animated AI processing screen with status messages

**Evaluation**
- Score out of 10, shown in an animated progress ring
- Feedback split into Overall assessment, Strengths, Areas for improvement and Better answer
- Gemini's Markdown (headings, bold, lists, code, blockquotes) rendered as formatted, sanitized HTML
- One-click copy for the suggested better answer

**History dashboard**
- Total interviews, average score, best score and most recent session
- Search, score filtering, sorting and pagination
- Detail view with the full evaluation for any past interview
- Clear-history action behind a confirmation dialog

**UI and design**
- Dark premium design system with reusable tokens and components
- Drag-and-drop PDF upload with file name, size, validation and remove action
- Staggered entrance animations and an ambient animated background
- Responsive layout for desktop, tablet and mobile
- Respects `prefers-reduced-motion`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI, Uvicorn |
| AI | Google Gemini (`google-generativeai`) |
| Resume parsing | PyMuPDF (`pymupdf`) |
| Database | SQLite |
| Templating | Jinja2 |
| Markdown rendering | `markdown-it-py` + `bleach` (sanitizer) |
| Frontend | Vanilla HTML, CSS and JavaScript (no build step) |

---

## How It Works

```text
Upload PDF resume
      │
      ▼
PyMuPDF extracts the resume text
      │
      ▼
Gemini generates 10 interview questions
      │
      ▼
User answers each question, one at a time
      │
      ▼
Gemini evaluates the answer and returns a score and feedback
      │
      ▼
Result is saved to SQLite and shown as a formatted report
```

1. **Upload:** the resume is saved to `uploads/` and its text is extracted with PyMuPDF.
2. **Question generation:** the resume text is sent to Gemini, which returns 10 questions.
3. **Interview:** questions are served one by one. Answers are held in memory for the session.
4. **Evaluation:** Gemini scores the answer out of 10 and returns strengths, weaknesses and a better answer.
5. **Rendering:** `renderer.py` splits the feedback into sections and converts Markdown to sanitized HTML.
6. **History:** the answer, evaluation, score and timestamp are stored in `interview.db`.

---

## Project Structure

```text
AI_MOCK_INTERVIEW_PLATFORM/
├── main.py                 # FastAPI app and routes
├── db.py                   # SQLite helpers (create, save, fetch)
├── gemini_client.py        # Gemini model configuration
├── parser.py               # PDF text extraction (PyMuPDF)
├── renderer.py             # Markdown -> sanitized HTML, report builder
├── requirements.txt
├── .env                    # API key (never commit this)
├── .gitignore
├── app/
│   ├── evaluator.py        # Answer evaluation prompt
│   └── question_generator.py  # Question generation prompt
├── templates/
│   ├── base.html           # Shared layout, navigation, processing overlay
│   ├── index.html          # Landing page and resume upload
│   ├── questions.html      # Interview workspace
│   ├── result.html         # Evaluation report
│   └── history.html        # History dashboard
├── static/
│   ├── css/style.css       # Design system and component styles
│   └── js/app.js           # Upload, editor, processing and history logic
├── uploads/                # Uploaded resumes (created automatically)
└── interview.db            # SQLite database (created automatically)
```

---

## Getting Started

### Prerequisites

- Python 3.10 or newer
- A Google Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Installation (Windows, PowerShell)

```powershell
# 1. Clone the repository
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>

# 2. Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt
```

### Installation (macOS / Linux)

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Run the app

```bash
python -m uvicorn main:app --reload
```

Open **http://127.0.0.1:8000** in your browser.

---

## Routes

| Method | Route | Description |
|---|---|---|
| GET | `/` | Landing page and resume upload |
| POST | `/upload` | Saves the PDF, generates questions, shows question 1 |
| POST | `/evaluate` | Stores an answer, shows the next question or the final evaluation |
| GET | `/history` | Interview history dashboard |
| POST | `/clear-history` | Deletes all saved interviews, then redirects to `/history` |
| GET | `/static/*` | CSS and JavaScript assets |

---

## Database

SQLite file `interview.db`, created automatically on first run.

**Table: `interviews`**

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER (PK, autoincrement) | Interview ID |
| `answer` | TEXT | The candidate's answer |
| `evaluation` | TEXT | Raw Gemini evaluation (Markdown) |
| `score` | TEXT | Score such as `7/10`, or `N/A` if none was found |
| `date` | TEXT | Timestamp, `DD-MM-YYYY HH:MM` |

---

## Security

- **Markdown from the AI is never trusted.** Raw HTML is disabled in the Markdown parser, and the output is sanitized again with an allow-list of tags and attributes before it reaches a template.
- **Jinja2 auto-escaping** is on for all user-provided text (answers, questions).
- **Secrets stay out of the repo.** The API key lives in `.env`, which is git-ignored.
- **Upload validation** on the client limits files to PDF.

---

## Known Limitations

- **Only the final answer is evaluated and saved.** Answers to earlier questions are held in memory but are not scored or stored in history.
- **Session state is global.** Interview progress is kept in a single in-memory dictionary, so the app supports one active interview at a time and loses state on server restart.
- **PDF only.** Resume parsing uses PyMuPDF, so DOC and DOCX files are not supported.
- **No error screen for AI failures.** If Gemini returns a quota or network error, FastAPI's default error page is shown.
- **Scores depend on the AI's wording.** The score is read from the evaluation text (for example `7/10`). If the model omits it, the score shows as `N/A`.

---

## Roadmap

- [ ] Evaluate and store every answer, with a per-question breakdown
- [ ] Per-user sessions instead of global in-memory state
- [ ] Styled error pages for Gemini and parsing failures
- [ ] Structured (JSON) evaluation output for more reliable scoring
- [ ] Per-question detail view and score trend chart in history
- [ ] DOCX resume support
- [ ] Export results as PDF
- [ ] Authentication and per-user history

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Page looks unstyled | Confirm files are at `static/css/style.css` and `static/js/app.js`, then hard-refresh with `Ctrl + Shift + R` |
| `ModuleNotFoundError: markdown_it` or `bleach` | Run `pip install markdown-it-py bleach` inside the active virtual environment |
| `/upload` returns an error | Make sure the file is a valid, text-based PDF (scanned image PDFs have no extractable text) |
| Gemini errors or empty responses | Check the API key in `.env`, your quota, and your internet connection |
| History shows `N/A` scores | The model did not include a `x/10` score in its reply; try the interview again |
| Server won't start | Activate the virtual environment first: `venv\Scripts\activate` |

---

## Author

**Vishal Singh**
GitHub: [@vishalsinghdspt-lang](https://github.com/vishalsinghdspt-lang)