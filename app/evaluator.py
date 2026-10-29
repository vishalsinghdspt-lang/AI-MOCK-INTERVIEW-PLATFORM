from gemini_client import model

def evaluate_answer(question, answer):

    prompt = f"""
    You are a technical interviewer.

    Question:
    {question}

    Candidate Answer:
    {answer}

    Evaluate the answer and provide:

    1. Score out of 10
    2. Strengths
    3. Weaknesses
    4. Better Answer
    """

    response = model.generate_content(prompt)

    return response.text