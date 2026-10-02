require('dotenv').config();
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const prompt = `You are "Sage", an elite global AI assistant for a productivity and fitness app called ProductiveX.
The user just said this to you: "How are you"

Your job is to parse their intent and return a STRICT JSON object telling the frontend what to do.
The JSON must have this exact structure:
{
  "action": "NAVIGATE" | "ADD_HABIT" | "ADD_TASK" | "ADD_GOAL" | "ADD_EXPENSE" | "START_POMODORO" | "PAUSE_POMODORO" | "RESET_POMODORO" | "EDIT_FITNESS" | "CHAT" | "ERROR",
  "payload": {},
  "message": "A short, friendly conversational response acknowledging what you just did, OR your full conversational reply if action is CHAT. Always populate this field!"
}

Rules:
- If it's a general question or greeting (e.g. "Hey Sage", "How are you"), use CHAT.
- Be concise.
`;

groq.chat.completions.create({
  messages: [{ role: 'user', content: prompt }],
  model: 'qwen/qwen3.8-27b',
  response_format: { type: 'json_object' }
}).then(res => {
    let responseText = res.choices[0].message.content;
    console.log("RAW RESPONSE:");
    console.log(responseText);
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    console.log("AFTER REPLACE:");
    console.log(responseText);
    console.log("JSON PARSE:");
    console.log(JSON.parse(responseText));
})
.catch(err => console.error('ERROR:', err.message));
