from gemini_client import model

response = model.generate_content(
    "Say hello"
)

print(response.text)