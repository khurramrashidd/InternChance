from flask import Flask, render_template, request, jsonify
import pickle
import pandas as pd 
import google.generativeai as genai
import os
import re
import json

app = Flask(__name__)

# --- API Key Rotation Logic ---
# Add your keys here or in your environment variables
API_KEYS = [
    os.getenv("GEMINI_API_KEY"),
    os.getenv("GEMINI_API_KEY_2"),
    os.getenv("GEMINI_API_KEY_3")
]

# Filter out empty keys
VALID_KEYS = [key for key in API_KEYS if key]
current_key_index = 0

def get_gemini_response(prompt):
    """
    Tries to generate content using the current key. 
    If it fails, it rotates to the next key and retries.
    """
    global current_key_index
    
    if not VALID_KEYS:
        return "Error: No API keys configured."

    attempts = 0
    max_attempts = len(VALID_KEYS)

    while attempts < max_attempts:
        try:
            # Configure with current key
            genai.configure(api_key=VALID_KEYS[current_key_index])
            model = genai.GenerativeModel("gemini-3-flash-preview") # Or use 'gemini-pro'
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Key index {current_key_index} failed: {e}")
            # Rotate to next key
            current_key_index = (current_key_index + 1) % len(VALID_KEYS)
            attempts += 1
    
    return "Error: All API keys are exhausted or invalid."

# --- Load ML Model (Tech Stream) ---
try:
    with open('model.pkl', 'rb') as f:
        ml_model = pickle.load(f)
except FileNotFoundError:
    ml_model = None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        stream = data.get('stream', 'tech')

        # Tech Stream (Uses ML Model)
        if stream == 'tech' and ml_model:
            df_input = pd.DataFrame([{
                'cgpa': float(data['cgpa']),
                'dsa': int(data['field1']),
                'projects': int(data['field2']),
                'hackathons': int(data['field3']),
                'certs': int(data['field4'])
            }])
            prediction = ml_model.predict(df_input)[0]
            probability = ml_model.predict_proba(df_input)[0][1] * 100
            
            return jsonify({
                'shortlisted': int(prediction),
                'probability': round(probability, 2)
            })

        # Other Streams (Uses AI Estimation)
        else:
            prompt = (
                f"Act as an internship admissions officer. Estimate the percentage chance (0-100) "
                f"of a student getting an internship in the field of {stream}. \n"
                f"Profile: CGPA: {data['cgpa']}, Skills Score: {data['field1']}, "
                f"Projects: {data['field2']}, Competitions: {data['field3']}, "
                f"Certs: {data['field4']}. \n"
                f"Return ONLY a single integer (e.g. 85). No text."
            )
            res_text = get_gemini_response(prompt)
            try:
                prob_str = re.search(r'\d+', res_text).group()
                probability = float(prob_str)
            except:
                probability = 50.0

            return jsonify({
                'shortlisted': 1 if probability > 60 else 0,
                'probability': round(probability, 2)
            })

    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.json
        stream = data.get('stream', 'tech')
        prompt = (
            f"Act as a Career Coach for {stream}. Analyze: "
            f"CGPA: {data['cgpa']}, Skill1: {data['field1']}, Skill2: {data['field2']}, "
            f"Skill3: {data['field3']}, Skill4: {data['field4']}. \n"
            f"Provide 5 actionable tips and 1 motivational quote. Use HTML tags."
        )
        response_text = get_gemini_response(prompt)
        return jsonify({"analysis": response_text})
    except Exception as e:
        return jsonify({"analysis": "Error generating analysis."}), 500

@app.route('/chat', methods=['POST'])
def chat():
    user_msg = request.json.get("message")
    prompt = f"System: You are an AI Career Coach. User: {user_msg}. Keep it professional."
    response_text = get_gemini_response(prompt)
    return jsonify({"response": response_text})

# --- NEW: Job Search Endpoint ---
@app.route('/find_jobs', methods=['POST'])
def find_jobs():
    query = request.json.get('query', 'Internships')
    # Ask Gemini to generate structured job data
    prompt = f"""
    You are a job search aggregator. The user is looking for: "{query}".
    Generate 5 realistic, high-quality job/internship listings that match this request.
    
    Return ONLY valid JSON in this exact format:
    [
        {{
            "title": "Job Title",
            "company": "Company Name",
            "location": "Location (or Remote)",
            "type": "Full-time/Internship"
        }}
    ]
    Do not use Markdown formatting. Just raw JSON string.
    """
    try:
        res_text = get_gemini_response(prompt)
        # clean markdown if present
        clean_json = res_text.replace('```json', '').replace('```', '').strip()
        jobs = json.loads(clean_json)
        return jsonify({'jobs': jobs})
    except Exception as e:
        return jsonify({'error': str(e), 'jobs': []})

if __name__ == "__main__":
    app.run(port= 5000, host = "0.0.0.0")
