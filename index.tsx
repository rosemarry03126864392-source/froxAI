/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// DOM Elements
const body = document.body;
const mainLayout = document.getElementById('main-layout') as HTMLElement;
const chatContainer = document.getElementById('chat-container') as HTMLElement;
const promptForm = document.getElementById('prompt-form') as HTMLFormElement;
const promptInput = document.getElementById('prompt-input') as HTMLTextAreaElement;
const sendButton = document.getElementById('send-button') as HTMLButtonElement;
const livePreview = document.getElementById('live-preview') as HTMLIFrameElement;
const copyCodeButton = document.getElementById('copy-code-button') as HTMLButtonElement;
const copyCodeButtonText = copyCodeButton.querySelector('span') as HTMLSpanElement;
const homeButton = document.getElementById('home-button') as HTMLButtonElement;
const pricingButton = document.getElementById('pricing-button') as HTMLButtonElement;
const closeModalButton = document.getElementById('close-modal-button') as HTMLButtonElement;
const pricingModal = document.getElementById('pricing-modal') as HTMLElement;

let lastCode: { html: string, css: string, js: string } | null = null;
let hasSwitchedToWorkspace = false;

const froxSystemInstruction = `You are Frox AI, an expert in generative art and web animations, specializing in creating beautiful, performant animated backgrounds with HTML, CSS, and JavaScript. Your sole purpose is to generate code for these backgrounds.
When a user describes an animated background, you MUST respond with ONLY a single JSON code block. The JSON object must have the keys "html", "css", and "js".
- The "html" key should contain the necessary canvas or div elements.
- The "css" key should contain all necessary styling. Ensure the background covers the entire viewport and is positioned correctly behind other content (e.g., using z-index). The body should have margin: 0 and overflow: hidden.
- The "js" key should contain the animation logic. Avoid external libraries unless absolutely necessary.

Example response format for a request like "blue particles floating upwards":
\`\`\`json
{
  "html": "<canvas id=\\"particle-canvas\\"></canvas>",
  "css": "body { margin: 0; overflow: hidden; background-color: #000; } #particle-canvas { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; }",
  "js": "const canvas = document.getElementById('particle-canvas'); const ctx = canvas.getContext('2d'); /* ... rest of the animation logic ... */"
}
\`\`\`

Do not engage in conversation. Only generate the code as requested. If the user's request is unclear, create a beautiful, common interpretation of their prompt.`;

/**
 * Appends a message to the chat container.
 */
function renderMessage(sender: 'user' | 'model', text: string): HTMLElement {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    messageElement.textContent = text;
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return messageElement;
}

/**
 * Updates the live preview iframe with new code.
 */
function updatePreview(code: { html: string, css: string, js: string }) {
    lastCode = code;
    const { html, css, js } = code;
    const srcDoc = `
        <!DOCTYPE html>
        <html>
        <head>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                html, body { 
                    width: 100%;
                    height: 100%;
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    overflow: hidden;
                }
                ${css}
            </style>
        </head>
        <body>
            ${html}
            <script>${js}</script>
        </body>
        </html>
    `;
    livePreview.srcdoc = srcDoc;
    if(copyCodeButtonText) copyCodeButtonText.textContent = 'Copy Code';
}

/**
 * Extracts a JSON object from a string, even if it's inside markdown.
 */
function extractJson(text: string): any | null {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (!match || !match[1]) {
        return null;
    }
    try {
        return JSON.parse(match[1]);
    } catch (error) {
        console.error("Failed to parse JSON:", error);
        return null;
    }
}

/**
 * Handles form submission to send a prompt to the Gemini API.
 */
promptForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = promptInput.value.trim();

    if (!prompt) return;

    // Disable form controls
    promptInput.value = '';
    promptInput.disabled = true;
    sendButton.disabled = true;
    adjustTextareaHeight();

    if (!hasSwitchedToWorkspace) {
        body.classList.add('in-workspace');
        mainLayout.classList.remove('lovable-view');
        mainLayout.classList.add('workspace-view');
        hasSwitchedToWorkspace = true;
    }
    
    renderMessage('user', prompt);
    const modelMessageElement = renderMessage('model', '');
    modelMessageElement.classList.add('thinking');


    try {
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction: froxSystemInstruction }
        });

        let fullResponse = '';
        for await (const chunk of responseStream) {
            if (modelMessageElement.classList.contains('thinking')) {
                modelMessageElement.classList.remove('thinking');
            }
            fullResponse += chunk.text;
            modelMessageElement.textContent = fullResponse;
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        const code = extractJson(fullResponse);
        if (code && code.html) {
            updatePreview(code);
            modelMessageElement.textContent = "I've created a live preview of the animated background for you.";
        }

    } catch (error) {
        console.error(error);
        modelMessageElement.textContent = 'Sorry, something went wrong. Please try again.';
        modelMessageElement.style.color = '#ff6b6b';
    } finally {
        // Re-enable form controls
        modelMessageElement.classList.remove('thinking');
        promptInput.disabled = false;
        sendButton.disabled = false;
        promptInput.focus();
    }
});


// Home Button Logic
homeButton.addEventListener('click', (e) => {
    e.preventDefault();

    // Switch view back to home
    body.classList.remove('in-workspace');
    mainLayout.classList.remove('workspace-view');
    mainLayout.classList.add('lovable-view');
    hasSwitchedToWorkspace = false;

    // Reset workspace state
    chatContainer.innerHTML = '';
    livePreview.srcdoc = 'about:blank';
    lastCode = null;
    if (copyCodeButtonText) copyCodeButtonText.textContent = 'Copy Code';

    // Focus on input for a new prompt
    promptInput.focus();
});


// Modal Logic
pricingButton.addEventListener('click', (e) => {
    e.preventDefault();
    pricingModal.classList.remove('hidden')
});
closeModalButton.addEventListener('click', () => pricingModal.classList.add('hidden'));
pricingModal.addEventListener('click', (e) => {
    if (e.target === pricingModal) pricingModal.classList.add('hidden');
});

// Copy Code Logic
copyCodeButton.addEventListener('click', () => {
    if (!lastCode || !copyCodeButtonText) return;
    const fullCode = `<!-- HTML -->\n${lastCode.html}\n\n<!-- CSS -->\n<style>\n${lastCode.css}\n</style>\n\n<!-- JS -->\n<script>\n${lastCode.js}\n</script>`;
    navigator.clipboard.writeText(fullCode).then(() => {
        copyCodeButtonText.textContent = 'Copied!';
        setTimeout(() => (copyCodeButtonText.textContent = 'Copy Code'), 2000);
    });
});

// Textarea auto-resize
function adjustTextareaHeight() {
    promptInput.style.height = 'auto';
    const newHeight = Math.min(promptInput.scrollHeight, 200);
    promptInput.style.height = `${newHeight}px`;
}
promptInput.addEventListener('input', adjustTextareaHeight);
promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        promptForm.dispatchEvent(new Event('submit'));
    }
});

// Initial load
window.addEventListener('DOMContentLoaded', () => {
  adjustTextareaHeight();
  promptInput.focus();
});