
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
  description: 'Update the study notes with new content. Use this when the user asks to rewrite, correct, add to, or modify the summary.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      new_content: {
        type: Type.STRING,
        description: 'The FULL updated markdown content of the study notes. Do not just provide a snippet, provide the entire updated document text.',
      },
    },
    required: ['new_content'],
  },
};

const generateImageTool: FunctionDeclaration = {
  name: 'generate_image',
  description: 'Generate an image to visually explain a concept, provide an example, or illustrate a topic.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description: 'A detailed description of the image to generate. Include style, subject, and setting.',
      },
      aspectRatio: {
        type: Type.STRING,
        description: 'The aspect ratio of the image. Options: "1:1", "3:4", "4:3", "16:9", "9:16". Default is "4:3".',
        enum: ["1:1", "3:4", "4:3", "16:9", "9:16"]
      }
    },
    required: ['prompt'],
  },
};

export const GeminiService = {
  /**
   * Generates a smart, detailed study guide from uploaded content.
   * Uses Standard Flash model for context window.
   */
  async generateSummary(files: { data: string, mimeType: string }[], promptText: string = ""): Promise<string> {
    if (!apiKey) throw new Error("API Key missing");
    
    const prompt = `
    Analyze the provided document and generate a structured, high-clarity summary following these strict requirements:

    1. **Title**: Start with a single # Header containing a short, capturing title.
    2. **Overview**: Provide a brief overview paragraph describing the document's scope and purpose.
    3. **Key Points**: List 5-7 key takeaways as concise bullet items immediately after the overview.
    4. **Detailed Breakdown**: For each major section in the document:
       - Use ## Headers for main sections.
       - Use ### Headers for sub-sections.
       - Explain concepts in simple, accurate terms.
       - Use bullet points for lists of features, steps, or characteristics.
       - Provide examples where applicable.
    5. **Definitions**: Explicitly define key terms using **bold** for the term.
    6. **Logical Flow**: Preserve the logical order of the original content.
    7. **Process/Workflow**: End with a structured workflow or step-by-step process if the document contains one.
    8. **Tone**: Maintain an educational tone that is easy to read for beginners.

    **Crucial Formatting Rules for Readability:**
    - **Spacing**: Add an extra blank line between all paragraphs and list items to ensure open, airy readability.
    - **Indentation**: Use proper markdown indentation (2 spaces) for nested lists.
    - **Highlighting**: Use **bold** (double asterisks) for ALL Key Terms, Important Dates, Numbers, Formulas, and Crucial Sentences.
    - **Tables**: Use standard Markdown table syntax for comparisons.
    - **Visuals**: If a visual concept is described that is complex, insert a visual block:
      > 👁️ **Visual Mental Model:** [Name of Concept]
      > [Description of a visual scene that explains the concept.]
    
    **Diagram Generation Rules:**
    - If a process, hierarchy, or workflow is discussed, generate a Mermaid.js diagram code block.
    - Use syntax: \`\`\`mermaid ... \`\`\`
    - **CRITICAL MERMAID RULES (Strict Syntax):** 
      1. ALWAYS START with 'graph TD' on the first line.
      2. **USE DOUBLE QUOTES for ALL node labels.** Example: A["Start Process"] --> B["Next Step"]
      3. **ONE STATEMENT PER LINE.** Never put multiple arrows on one line.
      4. **NO COMMA SEPARATED TARGETS.** 
      5. **SAFE IDs:** Use simple IDs like N1, N2, N3. Do NOT use 'end', 'start', 'subgraph' as IDs.
      6. **VALID ARROWS:** Use --> for solid, -.-> for dotted, ==> for thick. Do NOT use --.->.
      7. **NO BACKTICKS** inside diagram content/labels.

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
   * Generates flashcards with visual analogies and optional diagrams.
   */
  async generateFlashcards(summary: string): Promise<Flashcard[]> {
    const prompt = `
      Based on the following study notes, create **15-20 high-quality flashcards**.
      
      For each card:
      1. 'front': A clear question or term.
      2. 'back': A concise answer.
      3. 'visualAnalogy': A short text description of a visual scene that helps explain the concept (e.g., "Think of voltage as water pressure in a pipe").
      4. 'diagram': (Optional) If the concept describes a process, cycle, or hierarchy, provide valid Mermaid.js code.
         - **CRITICAL MERMAID**: 
           - Use 'graph TD'.
           - **Wrap ALL labels in double quotes.** e.g. id1["Label"]
           - Do NOT use 'end', 'start' as Node IDs.
           - No commas for multiple targets.
           - One statement per line.
           - Use --> for arrows.
      
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
              visualAnalogy: { type: Type.STRING, description: "A text description of a visual metaphor" },
              diagram: { type: Type.STRING, description: "Mermaid.js code string (optional)" }
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

  /**
   * Generates a quiz using the Fast model (Flash Lite) for low latency.
   */
  async generateQuiz(summary: string, difficulty: string = 'Medium', numQuestions: number = 5): Promise<QuizQuestion[]> {
    const prompt = `
      Create ${numQuestions} multiple-choice quiz questions based on this text.
      Difficulty Level: ${difficulty}.
      Ensure the questions are diverse and test understanding of core concepts.
      Return JSON: [{ "question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0 }]
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FAST, // Uses Flash Lite for speed
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
      const cleanedJson = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanedJson);
    } catch (e) {
      return [];
    }
  },

  /**
   * Generates a mermaid mindmap from the summary
   */
  async generateMindMap(summary: string): Promise<string> {
      const prompt = `
        Based on the text provided, create a comprehensive Mind Map using Mermaid.js syntax.
        
        Rules:
        1. Use the 'mindmap' diagram type.
        2. The root node should be the main topic.
        3. Create branches for key concepts, with sub-branches for details.
        4. **IMPORTANT**: Return ONLY the mermaid code block content. Do not wrap in \`\`\`mermaid.
        5. **STRICT SYNTAX**:
           - Do NOT use special characters like () [] {} inside node labels unless wrapped in double quotes.
           - Example: root((Main Topic))
           - Example: branch["Complex Concept (Detail)"]
           - Indent with exactly 2 spaces.
           - One node per line.
           - NO BACKTICKS allowed.
      `;

      const response = await ai.models.generateContent({
          model: MODEL_STANDARD,
          contents: [{ parts: [{ text: summary }, { text: prompt }] }]
      });

      let code = response.text || "";
      // Clean up markdown code blocks if the model ignores the instruction
      code = code.replace(/```mermaid/g, '').replace(/```/g, '').trim();
      return code;
  },

  /**
   * Generates an educational illustration using Imagen.
   */
  async generateConceptImage(concept: string, analogy: string, aspectRatio: string = '3:4'): Promise<string> {
    const prompt = `
      Create a high-quality, educational illustration for a study flashcard.
      Concept: ${concept}
      Visual Analogy: ${analogy}
      Style: Minimalist, vector art style, flat design, clear background, educational, dark mode friendly colors (indigo, cyan, purple accents).
    `;

    const response = await ai.models.generateImages({
        model: MODEL_IMAGE,
        prompt: prompt,
        config: {
            numberOfImages: 1,
            aspectRatio: aspectRatio,
            outputMimeType: 'image/jpeg'
        }
    });

    const base64 = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64}`;
  },

  /**
   * Generates a general image from a prompt with aspect ratio control.
   */
  async generateImage(promptText: string, aspectRatio: string = '4:3'): Promise<string> {
     const response = await ai.models.generateImages({
        model: MODEL_IMAGE,
        prompt: promptText,
        config: {
            numberOfImages: 1,
            aspectRatio: aspectRatio,
            outputMimeType: 'image/jpeg'
        }
    });

    const base64 = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64}`;
  },

  /**
   * Generates a Podcast-style audio conversation.
   */
  async generatePodcastAudio(summary: string, config?: PodcastConfig): Promise<{ audio: AudioBuffer, script: string }> {
    const tone = config?.tone || 'Casual';
    const length = config?.length || 'Medium';

    let lengthInstruction = "Create a standard length discussion, about 2-3 minutes of dialogue.";
    if (length === 'Short') lengthInstruction = "Keep it very concise and brief, under 1 minute of dialogue.";
    if (length === 'Long') lengthInstruction = "Go into depth, creating a detailed discussion around 5 minutes long.";

    const scriptPrompt = `
      Convert the following study notes into a podcast script between two hosts: 'Alex Gent' and 'Jamie Lady'.
      
      **Configuration:**
      - Tone: ${tone}
      - Length Goal: ${lengthInstruction}
      - **Language Style: ELEGANT BRITISH ENGLISH.** Use British spelling, vocabulary, and phrasing (e.g., 'splendid', 'precisely', 'whilst', 'maths').
      
      **Roles:**
      - Alex: 'Alex Gent', a sophisticated, knowledgeable expert with an **elegant British accent**. He explains concepts with authority and articulation.
      - Jamie: 'Jamie Lady', a sharp, curious interviewer with a **clear British accent**. She asks insightful questions and clarifies points politely.
      
      **Guidelines:**
      - If tone is 'Humorous', use dry British wit.
      - If tone is 'Debate', have them respectfully disagree on interpretations before agreeing.
      - Make it sound natural, with "Indeed", "Quite so", "Brilliant".
      - Format strictly as:
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
                        {
                            speaker: 'Alex',
                            // Fenrir is Deep/Authoritative (Male)
                            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } 
                        },
                        {
                            speaker: 'Jamie',
                            // Kore is Calm/Elegant (Female) - Replacing Puck
                            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                        }
                    ]
                }
            }
        }
    });

    const audioData = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!audioData) throw new Error("No audio generated");

    // Decode
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const buffer = await decodeAudioData(decode(audioData), audioCtx, 24000, 1);
    
    return { audio: buffer, script };
  },

  createChatSession(initialContext: string): Chat {
    return ai.chats.create({
      model: MODEL_COMPLEX, // Uses Gemini 3 Pro Preview for higher intelligence
      config: {
        systemInstruction: `You are an expert AI Tutor connected directly to the user's study notes.
        
        The user is viewing the following material:\n\n${initialContext}
        
        **Capabilities:**
        1. **Answer Questions**: Clarify concepts, explain terms, or provide examples based on the notes.
        2. **Edit Notes**: You have write access. If the user asks to "rewrite", "add", "correct", "fix", or "summarize" a section, you MUST use the 'update_notes' tool.
           - Do not just say you will do it. CALL THE FUNCTION 'update_notes' with the complete, revised text.
        3. **Generate Images**: You can generate visual examples or illustrations. If the user asks to "show me", "draw", "illustrate", or "create an image" of something, use the 'generate_image' tool.
           - You can extract the desired aspect ratio (Square, Wide, Portrait) if the user specifies it.
        
        **Tone:** Encouraging, concise, and academic.`,
        tools: [{ functionDeclarations: [updateNotesTool, generateImageTool] }]
      }
    });
  }
};
