# Project 9: L'Oréal Routine Builder

L’Oréal is expanding what’s possible with AI, and now your chatbot is getting smarter. This week, you’ll upgrade it into a product-aware routine builder.

Users will be able to browse real L'Oréal brand products, select the ones they want, and generate a personalized routine using AI. They can also ask follow-up questions about their routine—just like chatting with a real advisor.

## Adding your OpenAI API key (development)

1. Create a local file at the project root named `secrets.js`.
2. Add a single line that sets the key on the window object, for example:
   ```
   window.OPENAI_API_KEY = "sk-REPLACE_WITH_YOUR_KEY";
   ```
3. The repo already ignores `secrets.js` so the key won't be committed. Keep this file private.
4. Restart your local dev server (or reload the page) so `index.html` loads `secrets.js` before `script.js`.

Security reminder: Never paste your real API key into public code, chat messages, or shared commits. If a key is exposed, revoke it immediately from the OpenAI dashboard.
