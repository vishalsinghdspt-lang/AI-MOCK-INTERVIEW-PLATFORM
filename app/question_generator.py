from gemini_client import model


def generate_questions(resume_text):

    prompt = f"""
You are a technical interviewer.

Based on the resume below,
generate 10 interview questions.

Resume:

{resume_text}

Only return the questions.

Do NOT write:
"Here are 10 interview questions"

Do NOT write any introduction.

Return exactly 10 questions.

Format:

1. Question
2. Question
3. Question
"""

    response = model.generate_content(
        prompt
    )

    questions = [
        q.strip()
        for q in response.text.split("\n")
        if q.strip()
    ]

    return questions