import requests
import json
import sys

BASE = "http://localhost:8000"

# Test direct quiz generation
print("=== Testing Topic Quiz ===")
r = requests.post(f"{BASE}/api/quizzes/generate", json={
    "topic": "Python", "num_questions": 2, "difficulty": "easy"
}, headers={"Authorization": "Bearer test"})
print(f"Status: {r.status_code}")
if r.status_code == 200:
    data = r.json()
    print(f"Quiz: {data['title']} - {len(data['questions'])} questions")
else:
    print(f"Error: {r.text}")

print("\n=== Testing Document Quiz Generator ===")
# First check if Groq directly works with text
import os, django
from services.ai_service import generate_quiz_from_text
try:
    questions = generate_quiz_from_text(
        "Python is a programming language. Machine learning uses algorithms.",
        2, "easy"
    )
    print(f"Direct AI call: OK - {len(questions)} questions")
    print(f"Q1: {questions[0]['question_text']}")
except Exception as e:
    print(f"Direct AI call failed: {e}")

print("\nAll checks done!")
