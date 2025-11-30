
import { GoogleGenAI, Type, Modality, Chat, FunctionDeclaration } from "@google/genai";
import { Flashcard, QuizQuestion, PodcastConfig } from "../types";

// Initialize Gemini API Client
const apiKey = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || 'DUMMY_KEY' }); 

const MODEL_STANDARD = 'gemini-2.5-flash';
const MODEL_FAST = 'gemini-flash-lite-latest';
const MODEL_COMPLEX = 'gemini-3-pro-preview';
const MODEL_TTS = 'gemini-2.5-flash-preview-tts';
const MODEL_IMAGE = 'imagen-4.0-generate-001';

// --- Helpers for Audio Decoding ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const updateNotesTool: FunctionDeclaration = {
  name: 'update_notes',
  description: 'Update the study notes with new content.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      new_content: { type: Type.STRING, description: 'The FULL updated markdown content.' },
    },
    required: ['new_content'],
  },
};

const generateImageTool: FunctionDeclaration = {
  name: 'generate_image',
  description: 'Generate an image to visually explain a concept.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: { type: Type.STRING, description: 'Image description.' },
      aspectRatio: { type: Type.STRING, enum: ["1:1", "3:4", "4:3", "16:9", "9:16"] }
    },
    required: ['prompt'],
  },
};

export const GeminiService = {
  /**
   * Generates a smart, detailed study guide from uploaded content.
   */
  async generateSummary(files: { data: string, mimeType: string }[], promptText: string = ""): Promise<string> {
    if (!apiKey) throw new Error("API Key missing");
    
    const prompt = `
    Analyze the provided content and generate a structured, high-clarity summary following these requirements:

    1. **Title**: Start with a short title that captures the document’s topic.
    2. **Overview**: Provide a brief overview describing what the document covers and how many pages it spans.
    3. **Key Points**: Extract and list the key points as concise bullet items.
    4. **Detailed Breakdown**: For each major section in the PDF, create a clearly labeled subsection with:
       - An explanation of the concept in simple, accurate terms.
       - Examples when they appear in the document.
       - Tables or comparisons rewritten into clean text form.
    5. **Definitions & Distinctions**: Include all definitions, distinctions, and workflows exactly as presented, without adding external knowledge.
    6. **Logical Flow**: Preserve the logical order of the original PDF.
    7. **Process/Workflow**: End with a structured workflow or step-by-step process if the document contains one.
    8. **Tone**: Maintain an educational tone that is easy to read for beginners.

    **Formatting Rules:**
    - Use Markdown.
    - **HIGHLIGHTING**: Use **bold** for Key Terms, Numbers, Dates, Formulas, and Crucial Sentences.
    - Use '##' for major sections.
    - If a visual concept is complex, insert:
      > 👁️ **Visual Mental Model:** [Name of Concept]
      > [Description of a visual scene that explains the concept.]
    
    **Diagram Rules:**
    - If a process is discussed, generate Mermaid.js code.
    - Use syntax: \`\`\`mermaid ... \`\`\`
    - ALWAYS start with 'graph TD'.
    - **USE DOUBLE QUOTES for ALL node labels.** Example: A["Start"] --> B["Next"]
    - ONE STATEMENT PER LINE.
    - NO COMMA SEPARATED TARGETS.

    Your output should look like a clean study note, accurate to the PDF but fully rewritten in your own words.
    
    ${promptText ? `Additional User Instructions: ${promptText}` : ''}
    `;

    const response = await ai.models.generateContent({
      model: MODEL_STANDARD,
      contents: [
        {
          parts: [
            ...files.map(f => ({ inlineData: { data: f.data, mimeType: f.mimeType } })),
            { text: prompt }
          ]
        }
      ]
    });

    return response.text || "Could not generate summary.";
  },

  /**
   * Generates 15-20 flashcards.
   */
  async generateFlashcards(summary: string): Promise<Flashcard[]> {
    const prompt = `
      Based on the study notes, create **15-20 high-quality flashcards**.
      
      For each card:
      1. 'front': A clear question or term.
      2. 'back': A concise answer.
      3. 'visualAnalogy': A short text description of a visual scene explaining the concept.
      4. 'diagram': (Optional) Valid Mermaid.js 'graph TD' code if it's a process.
         - **Wrap ALL labels in double quotes.**
      
      Return valid JSON matching the schema.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_STANDARD,
      contents: [
        { parts: [{ text: summary }, { text: prompt }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING },
              back: { type: Type.STRING },
              visualAnalogy: { type: Type.STRING },
              diagram: { type: Type.STRING }
            },
            required: ["front", "back"]
          }
        }
      }
    });

    const jsonStr = response.text || "[]";
    try {
      const cleanedJson = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanedJson);
    } catch (e) {
      console.error("JSON Parse Error", e);
      return [];
    }
  },

  async generateQuiz(summary: string, difficulty: string = 'Medium', numQuestions: number = 5): Promise<QuizQuestion[]> {
    const prompt = `
      Create ${numQuestions} multiple-choice quiz questions based on this text.
      Difficulty Level: ${difficulty}.
      Return JSON: [{ "question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0 }]
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: [{ parts: [{ text: summary }, { text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctIndex: { type: Type.INTEGER }
            }
          }
        }
      }
    });

    const jsonStr = response.text || "[]";
    try {
      return JSON.parse(jsonStr.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch (e) { return []; }
  },

  async generateMindMap(summary: string): Promise<string> {
      const prompt = `
        Create a comprehensive Mind Map using Mermaid.js 'mindmap' syntax.
        Root node = Main Topic.
        Return ONLY mermaid code. No markdown blocks.
        STRICT: Use double quotes for labels with spaces/symbols. One node per line.
      `;
      const response = await ai.models.generateContent({
          model: MODEL_STANDARD,
          contents: [{ parts: [{ text: summary }, { text: prompt }] }]
      });
      return (response.text || "").replace(/```mermaid/g, '').replace(/```/g, '').trim();
  },

  async generateConceptImage(concept: string, analogy: string, aspectRatio: string = '3:4'): Promise<string> {
    const prompt = `Educational illustration: ${concept}. Analogy: ${analogy}. Style: Minimalist vector art, dark mode colors.`;
    const response = await ai.models.generateImages({
        model: MODEL_IMAGE,
        prompt: prompt,
        config: { numberOfImages: 1, aspectRatio: aspectRatio, outputMimeType: 'image/jpeg' }
    });
    return `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
  },

  async generateImage(promptText: string, aspectRatio: string = '4:3'): Promise<string> {
     const response = await ai.models.generateImages({
        model: MODEL_IMAGE,
        prompt: promptText,
        config: { numberOfImages: 1, aspectRatio: aspectRatio, outputMimeType: 'image/jpeg' }
    });
    return `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
  },

  async generatePodcastAudio(summary: string, config?: PodcastConfig): Promise<{ audio: AudioBuffer, script: string }> {
    const tone = config?.tone || 'Casual';
    const length = config?.length || 'Medium';
    let lengthInstruction = length === 'Short' ? "Keep it under 1 min." : length === 'Long' ? "Detailed, ~5 mins." : "Standard 2-3 mins.";

    const scriptPrompt = `
      Convert notes to a podcast script between 'Alex Gent' and 'Jamie Lady'.
      Tone: ${tone}. Length: ${lengthInstruction}.
      Language: ELEGANT BRITISH ENGLISH (e.g. 'splendid', 'whilst').
      Roles:
      - Alex: Expert, sophisticated British accent.
      - Jamie: Interviewer, sharp British accent.
      Format:
        Alex: [Text]
        Jamie: [Text]
    `;
    
    const scriptResponse = await ai.models.generateContent({
        model: MODEL_STANDARD,
        contents: [{ parts: [{ text: summary }, { text: scriptPrompt }] }]
    });
    const script = scriptResponse.text || "";
    
    const ttsResponse = await ai.models.generateContent({
        model: MODEL_TTS,
        contents: [{ parts: [{ text: script }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: [
                        { speaker: 'Alex', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
                        { speaker: 'Jamie', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
                    ]
                }
            }
        }
    });

    const audioData = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) throw new Error("No audio generated");

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const buffer = await decodeAudioData(decode(audioData), audioCtx, 24000, 1);
    return { audio: buffer, script };
  },

  createChatSession(initialContext: string): Chat {
    return ai.chats.create({
      model: MODEL_COMPLEX,
      config: {
        systemInstruction: `You are an AI Tutor. Context:\n\n${initialContext}\n\nCapabilities: Answer, Rewrite (use update_notes), Generate Images (use generate_image).`,
        tools: [{ functionDeclarations: [updateNotesTool, generateImageTool] }]
      }
    });
  }
};
