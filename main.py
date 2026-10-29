import os

import re
from datetime import datetime

from fastapi import FastAPI
from fastapi import Request
from fastapi import UploadFile
from fastapi import File

from fastapi import Form
from app.evaluator import evaluate_answer

from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from parser import extract_text_from_pdf
from app.question_generator import generate_questions

from db import create_table
from db import save_interview
from db import get_interviews

app = FastAPI()
os.makedirs("uploads", exist_ok=True)

create_table()

interview_data = {}

templates = Jinja2Templates(
    directory="templates"
)


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):

    return templates.TemplateResponse(
        request=request,
        name="index.html"
    )


@app.post("/upload")
async def upload_resume(
    request: Request,
    resume: UploadFile = File(...)
):

    file_path = os.path.join(
        "uploads",
        resume.filename
    )

    with open(
        file_path,
        "wb"
    ) as buffer:

        content = await resume.read()

        buffer.write(content)

    resume_text = extract_text_from_pdf(
        file_path
    )

    questions = generate_questions(
    resume_text
    )

    interview_data["questions"] = questions
    interview_data["current"] = 0
    interview_data["scores"] = []
    interview_data["answers"] = []
    
    return templates.TemplateResponse(
        request=request,
        name="questions.html",
        context={
            "question": questions[0],
            "qno": 1
    }
    )

@app.post("/evaluate")
async def evaluate(
    request: Request,
    question: str = Form(...),
    answer: str = Form(...)
):
    questions = interview_data["questions"]
    current = interview_data["current"]

    # Save all answers
    if "answers" not in interview_data:
        interview_data["answers"] = []

    interview_data["answers"].append({
        "question": question,
        "answer": answer
    })

    # Move to next question
    current += 1
    interview_data["current"] = current

    if current < len(questions):
        return templates.TemplateResponse(
            request=request,
            name="questions.html",
            context={
                "question": questions[current],
                "qno": current + 1
            }
        )

    result = evaluate_answer(
        question,
        answer
    )

    match = re.search(
        r'(\d+)/10',
        result
    )

    score = (
        match.group(1) + "/10"
        if match
        else "N/A"
    )

    current_date = datetime.now().strftime(
        "%d-%m-%Y %H:%M"
    )

    save_interview(
        answer,
        result,
        score,
        current_date
    )

    return templates.TemplateResponse(
        request=request,
        name="result.html",
        context={
            "result": result
        }
    )

@app.get("/history")
async def history(
    request: Request
):

    interviews = get_interviews()

    return templates.TemplateResponse(
        request=request,
        name="history.html",
        context={
            "interviews": interviews
        }
    )

@app.post("/clear-history")
async def clear_history():

    import sqlite3

    conn = sqlite3.connect("interview.db")
    cursor = conn.cursor()

    cursor.execute("DELETE FROM interviews")

    conn.commit()
    conn.close()

    return RedirectResponse(
        url="/history",
        status_code=303
    )