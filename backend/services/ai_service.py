import json
from groq import Groq
from config.settings import GROQ_API_KEY

client = Groq(api_key=GROQ_API_KEY, timeout=15.0)

SYSTEM_PROMPT = """You are a quiz generator. Generate questions in valid JSON format.
Return ONLY a JSON array, no other text. Each question must have:
{
  "question_text": "...",
  "question_type": "mcq" | "true_false" | "fill_blank",
  "options": {...} or null,
  "correct_answer": "...",
  "explanation": "..."
}

For mcq: options = {"A": "...", "B": "...", "C": "...", "D": "..."} and correct_answer must be the option LETTER (e.g., "A", "B", "C", or "D")
For true_false: options = {"true": "True", "false": "False"} and correct_answer must be "true" or "false"
For fill_blank: options = null (correct_answer is the missing word)

Generate exactly the number of questions requested. Mix question types."""


def generate_quiz(topic: str, num_questions: int = 5, difficulty: str = "medium"):
    user_prompt = (
        f"Generate {num_questions} {difficulty} difficulty quiz questions about '{topic}'. "
        f"Include a mix of MCQ, True/False, and Fill-in-the-blank questions. "
        f"Make each question unique and varied — avoid generic or repetitive questions. "
        f"Return valid JSON array only."
    )

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=1.0,
        frequency_penalty=0.5,
        presence_penalty=0.5,
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content
    data = json.loads(content)

    if isinstance(data, dict) and "questions" in data:
        return data["questions"]
    if isinstance(data, list):
        return data
    return [data]


def generate_title_from_text(text: str) -> str:
    max_chars = 3000
    trimmed = text[:max_chars]
    prompt = (
        f"Generate a short quiz title (3-6 words) from this content. "
        f"Must be specific to the topic:\n\n{trimmed}"
    )
    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": "You generate JSON. Reply with {\"title\": \"...\"}"},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=30,
            response_format={"type": "json_object"},
        )
        data = json.loads(response.choices[0].message.content)
        title = data.get("title", "").strip().strip('"').strip("'")
        return title if title and len(title) > 2 else "Untitled Quiz"
    except:
        return "Untitled Quiz"


def get_hint(question_text: str, question_type: str, options: dict | None, correct_answer: str) -> str:
    options_str = ""
    if options:
        options_str = "\n".join(f"{k}: {v}" for k, v in options.items())

    system_prompt = """You are a helpful quiz assistant. Give a subtle hint about the answer without revealing it directly.
- For MCQ: eliminate one wrong option or give a clue pointing to the right one
- For True/False: give context about the statement
- For Fill-in-the-blank: give a related clue or synonym
Keep the hint to 1-2 sentences. Be concise."""

    user_prompt = (
        f"Question type: {question_type}\n"
        f"Question: {question_text}\n"
        f"Options:\n{options_str if options_str else 'N/A'}\n"
        f"(The correct answer is '{correct_answer}' — DO NOT reveal it. Just give a hint.)"
    )

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=1.0,
        frequency_penalty=0.3,
        presence_penalty=0.3,
        max_tokens=100,
    )

    return response.choices[0].message.content.strip()


def judge_answer(question_text: str, correct_answer: str, user_answer: str, question_type: str) -> bool:
    if user_answer.strip().lower() == correct_answer.strip().lower():
        return True

    prompt = (
        f"Question: {question_text}\n"
        f"Correct answer: {correct_answer}\n"
        f"Student's answer: {user_answer}\n"
        f"Question type: {question_type}\n\n"
        f"Decide if the student's answer is semantically correct. "
        f"For fill-in-the-blank, accept synonyms and rephrasing. "
        f"Reply with ONLY 'true' or 'false'."
    )
    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=1.0,
            frequency_penalty=0.1,
            presence_penalty=0.1,
            max_tokens=10,
        )
        return response.choices[0].message.content.strip().lower() == "true"
    except:
        return False


def generate_quiz_from_text(text: str, num_questions: int = 5, difficulty: str = "medium"):
    max_chars = 6000
    trimmed_text = text[:max_chars]

    user_prompt = (
        f"Based on the following content, generate {num_questions} {difficulty} "
        f"difficulty quiz questions. Mix of MCQ, True/False, and Fill-in-the-blank. "
        f"Avoid generic questions — make them specific to the content.\n\n"
        f"Content:\n{trimmed_text}\n\nReturn valid JSON array only."
    )

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=1.0,
        frequency_penalty=0.5,
        presence_penalty=0.5,
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content
    data = json.loads(content)

    if isinstance(data, dict) and "questions" in data:
        return data["questions"]
    if isinstance(data, list):
        return data
    return [data]
