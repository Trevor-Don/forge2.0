import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User as UserIcon, Sparkles, Edit3, ImageIcon, X } from 'lucide-react';
import { Chat } from "@google/genai";
import { GeminiService } from '../services/geminiService';

interface ChatBotProps {
  summary: string;
  onUpdateSummary: (newSummary: string) => void;
  variant?: 'full' | 'sidebar';
}

interface Message {
  role: 'user' | 'model';
  text: string;
  image?: string;
  isTool?: boolean;
}

export const ChatBot: React.FC<ChatBotProps> = ({ summary, onUpdateSummary, variant = 'full' }) => {
  const [messages, setMessages] = useState<Message[]>([{ role: 'model', text: 'Greetings. I am your AI Tutor. I can answer questions, generate images, or help you rewrite your notes.' }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<Chat | null>(null);

  // Re-initialize chat when summary changes to ensure context is fresh
  useEffect(() => { 
      chatSessionRef.current = GeminiService.createChatSession(summary); 
  }, [summary]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      // Create session if missing
      if (!chatSessionRef.current) chatSessionRef.current = GeminiService.createChatSession(summary);
      
      // Send message
      const result = await chatSessionRef.current.sendMessage({ message: userText });
      
      // 1. Handle Function Calls (Tool Use)
      // The SDK might return functionCalls in the response structure
      const functionCalls = result.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
          for (const call of functionCalls) {
              const args = call.args as any;
              
              if (call.name === 'update_notes') {
                  const newContent = args.new_content;
                  if (newContent) {
                      onUpdateSummary(newContent);
                      setMessages(prev => [...prev, { 
                          role: 'model', 
                          text: 'I have updated your notes as requested.',
                          isTool: true 
                      }]);
                  }
              } else if (call.name === 'generate_image') {
                  const prompt = args.prompt;
                  const aspectRatio = args.aspectRatio || '4:3';
                  setMessages(prev => [...prev, { role: 'model', text: `Generating image: "${prompt}"...` }]);
                  
                  try {
                      const imageUrl = await GeminiService.generateImage(prompt, aspectRatio);
                      setMessages(prev => {
                          const msgs = [...prev];
                          // Replace the "Generating..." message or add new one
                          msgs[msgs.length - 1] = { 
                              role: 'model', 
                              text: `Here is an illustration for: ${prompt}`, 
                              image: imageUrl 
                          };
                          return msgs;
                      });
                  } catch (err) {
                      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I couldn't generate that image." }]);
                  }
              }
          }
      } else {
          // 2. Handle Regular Text Response
          const text = result.text;
          if (text) {
              setMessages(prev => [...prev, { role: 'model', text: text }]);
          } else {
               // Fallback if no text and no function call (rare)
              setMessages(prev => [...prev, { role: 'model', text: "I processed that, but have no text response." }]);
          }
      }

    } catch (e) {
        console.error("Chat Error", e);
        setMessages(prev => [...prev, { role: 'model', text: "I encountered an error processing your request." }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-full ${variant === 'sidebar' ? 'border-l border-white/10' : 'glass-panel rounded-[2rem]'}`}>
      
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-brand-accent to-brand-secondary rounded-full flex items-center justify-center shadow-lg">
                  <Bot className="w-6 h-6 text-black" />
              </div>
              <div>
                  <h3 className="font-bold text-white font-display tracking-wide">AI TUTOR</h3>
                  <p className="text-[10px] text-brand-accent uppercase tracking-widest font-mono">Connected to Notes</p>
              </div>
          </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {messages.map((msg, i) => (
              <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${msg.role === 'user' ? 'bg-white text-black' : 'bg-brand-card border border-white/10 text-brand-accent'}`}>
                      {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  
                  <div className={`max-w-[85%] space-y-3`}>
                      <div className={`p-4 rounded-2xl shadow-lg text-sm leading-relaxed ${msg.role === 'user' ? 'bg-white text-black rounded-tr-none' : 'glass-panel rounded-tl-none text-gray-200'} ${msg.isTool ? 'border-brand-accent/50 bg-brand-accent/5' : ''}`}>
                          {msg.isTool && (
                              <div className="flex items-center gap-2 mb-2 text-brand-accent text-xs font-bold uppercase tracking-wider">
                                  <Edit3 className="w-3 h-3" /> Action Performed
                              </div>
                          )}
                          
                          {msg.text ? (
                            <div className="whitespace-pre-wrap">{msg.text}</div>
                          ) : (
                             <div className="flex items-center gap-1 h-5 px-1">
                                <div className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-bounce"></div>
                             </div>
                          )}
                      </div>
                      
                      {msg.image && (
                          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-xl">
                              <img 
                                src={msg.image} 
                                alt="Generated" 
                                className="w-full h-auto cursor-zoom-in"
                                onClick={() => setExpandedImage(msg.image!)}
                              />
                              <div className="bg-black/40 p-2 text-[10px] text-gray-400 flex items-center gap-2 backdrop-blur-sm">
                                  <ImageIcon className="w-3 h-3" /> Generated by Imagen
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          ))}
          {isLoading && (
              <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-brand-card border border-white/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-brand-accent" />
                  </div>
                  <div className="glass-panel rounded-2xl rounded-tl-none p-4 flex items-center gap-1">
                      <div className="w-2 h-2 bg-brand-accent/50 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-brand-accent/50 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                      <div className="w-2 h-2 bg-brand-accent/50 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                  </div>
              </div>
          )}
          <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-white/10 bg-white/5">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative">
              <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask to rewrite, explain, or draw..." 
                  className="w-full bg-black/30 border border-white/10 rounded-full py-4 pl-6 pr-14 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-accent focus:bg-black/50 transition-all shadow-inner"
              />
              <button type="submit" disabled={!input || isLoading} className="absolute right-2 top-2 p-2 bg-brand-accent text-black rounded-full hover:scale-110 transition-transform shadow-lg disabled:opacity-50 disabled:scale-100">
                  <Send className="w-5 h-5" />
              </button>
          </form>
      </div>

      {/* Lightbox Modal */}
      {expandedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setExpandedImage(null)}
        >
          <button 
            onClick={() => setExpandedImage(null)}
            className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 hover:scale-110 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={expandedImage} 
            className="max-w-full max-h-[90vh] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10" 
            alt="Enlarged"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  );
};