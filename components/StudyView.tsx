
import React, { useState, useRef, useEffect } from 'react';
import { StudySet, StudyMode, Flashcard, PodcastConfig } from '../types';
import { GeminiService } from '../services/geminiService';
import { StorageService } from '../services/storageService';
import { FlashcardDeck } from './FlashcardDeck';
import { QuizPlayer } from './QuizPlayer';
import { ChatBot } from './ChatBot';
import { ArrowLeft, Play, Pause, Download, Edit2, X, Sparkles as SparklesIcon, Mic2, HelpCircle, FileText, FileType, Loader2, RotateCcw, User, Minimize2, Maximize2, Save, Music } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MermaidBlock } from './ui/MermaidBlock';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Document, Packer, Paragraph, HeadingLevel } from "docx";

interface StudyViewProps {
  set: StudySet;
  initialMode?: StudyMode;
  onBack: () => void;
  onUpdateXP: (amount: number) => void;
}

// Helper to convert AudioBuffer to WAV Blob
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferOut = new ArrayBuffer(length);
  const view = new DataView(bufferOut);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  for (i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));

  while (pos < buffer.length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][pos])); 
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; 
      view.setInt16(44 + offset, sample, true); 
      offset += 2;
    }
    pos++;
  }

  return new Blob([bufferOut], { type: "audio/wav" });

  function setUint16(data: any) { view.setUint16(pos, data, true); pos += 2; }
  function setUint32(data: any) { view.setUint32(pos, data, true); pos += 4; }
}

function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export const StudyView: React.FC<StudyViewProps> = ({ set, initialMode = StudyMode.NOTES, onBack, onUpdateXP }) => {
  const [mode, setMode] = useState<StudyMode>(initialMode);
  const [localSet, setLocalSet] = useState<StudySet>(set);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(set.summary);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Audio State
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [podcastScript, setPodcastScript] = useState<string>(set.podcastScript || '');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [podcastConfig, setPodcastConfig] = useState<PodcastConfig>({ tone: 'Casual', length: 'Medium' });

  // Quiz State
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizConfig, setQuizConfig] = useState({ difficulty: 'Medium', count: 5 });

  // Graph State
  const [mindMapCode, setMindMapCode] = useState<string | null>(null);
  const [isGeneratingMap, setIsGeneratingMap] = useState(false);
  
  // Lightbox State
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => { setMode(initialMode); }, [initialMode]);

  useEffect(() => {
      if (mode === StudyMode.GRAPH && !mindMapCode && !isGeneratingMap) {
          setIsGeneratingMap(true);
          GeminiService.generateMindMap(localSet.summary)
              .then(code => { setMindMapCode(code); setIsGeneratingMap(false); })
              .catch(err => { console.error(err); setIsGeneratingMap(false); });
      }
  }, [mode]);

  const handleCardUpdate = async (updatedCard: Flashcard) => {
     const currentCards = localSet.flashcards || [];
     const updatedCards = currentCards.map(c => (c.front === updatedCard.front && c.back === updatedCard.back) ? updatedCard : c);
     const newSet = { ...localSet, flashcards: updatedCards };
     setLocalSet(newSet);
     await StorageService.updateStudySet(newSet);
  };

  const handleSummaryUpdate = async (newSummary: string) => {
      const newSet = { ...localSet, summary: newSummary };
      setLocalSet(newSet);
      setEditValue(newSummary);
      await StorageService.updateStudySet(newSet);
      setMindMapCode(null);
  };

  const handleGenerateQuiz = async () => {
      setIsGeneratingQuiz(true);
      try {
          const quiz = await GeminiService.generateQuiz(localSet.summary, quizConfig.difficulty, quizConfig.count);
          const newSet = { ...localSet, quiz };
          setLocalSet(newSet);
          await StorageService.updateStudySet(newSet);
      } finally { setIsGeneratingQuiz(false); }
  };

  const handleGeneratePodcast = async () => {
      setIsAudioLoading(true);
      try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          audioCtxRef.current = ctx;
          const result = await GeminiService.generatePodcastAudio(localSet.summary, podcastConfig);
          setAudioBuffer(result.audio);
          setPodcastScript(result.script);
          setDuration(result.audio.duration);

          // Auto-save script to library
          const newSet = { ...localSet, podcastScript: result.script };
          setLocalSet(newSet);
          await StorageService.updateStudySet(newSet);

      } finally { setIsAudioLoading(false); }
  };

  const handleSavePodcast = async () => {
      if(!podcastScript) return;
      const newSet = { ...localSet, podcastScript: podcastScript };
      setLocalSet(newSet);
      await StorageService.updateStudySet(newSet);
      alert("Podcast saved to library!");
  };

  const playAudio = () => {
    const ctx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    if (!audioCtxRef.current) audioCtxRef.current = ctx;

    if (!audioBuffer) return;
    if (ctx.state === 'suspended') ctx.resume();
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start(0, pausedAtRef.current);
    startTimeRef.current = ctx.currentTime - pausedAtRef.current;
    sourceRef.current = source;
    const updateProgress = () => {
        const current = ctx.currentTime - startTimeRef.current;
        if (current >= audioBuffer.duration) {
             setCurrentTime(audioBuffer.duration);
             setIsPlaying(false);
             pausedAtRef.current = 0;
             if (rafRef.current) cancelAnimationFrame(rafRef.current);
        } else {
             setCurrentTime(current);
             rafRef.current = requestAnimationFrame(updateProgress);
        }
    };
    rafRef.current = requestAnimationFrame(updateProgress);
    setIsPlaying(true);
  };

  const pauseAudio = () => {
    if (sourceRef.current) { sourceRef.current.stop(); sourceRef.current = null; }
    if (audioCtxRef.current) pausedAtRef.current = audioCtxRef.current.currentTime - startTimeRef.current;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setIsPlaying(false);
  };

  const togglePlay = () => isPlaying ? pauseAudio() : playAudio();

  const handleDownloadAudio = () => {
      if (!audioBuffer) return;
      const wavBlob = audioBufferToWav(audioBuffer);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${localSet.title}_Podcast.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * duration;
      
      if (audioCtxRef.current) {
         if (sourceRef.current) { sourceRef.current.stop(); sourceRef.current = null; }
         pausedAtRef.current = newTime;
         startTimeRef.current = audioCtxRef.current.currentTime - newTime;
         setCurrentTime(newTime);
         if (isPlaying) playAudio();
      }
  };

  const handleExportPDF = async () => {
      const element = document.querySelector('.markdown-content') as HTMLElement;
      if (!element) return;
      setIsExporting(true);
      try {
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pageWidth = 210; const pageHeight = 297; const margin = 15;
          const contentWidth = pageWidth - (2 * margin);
          const contentHeight = pageHeight - (2 * margin);

          const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#041C23', useCORS: true });
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          const imgWidth = contentWidth; 
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          let heightLeft = imgHeight;
          let position = margin;
          let pageNumber = 1;

          pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
          heightLeft -= contentHeight;
          pdf.setFontSize(8); pdf.setTextColor(150);
          pdf.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

          while (heightLeft > 0) {
              position = position - 297; 
              pdf.addPage(); pageNumber++;
              pdf.addImage(imgData, 'JPEG', margin, margin - (contentHeight * (pageNumber - 1)), imgWidth, imgHeight);
              pdf.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
              heightLeft -= contentHeight;
          }
          pdf.save(`${localSet.title}_notes.pdf`);
      } catch (err) { console.error("PDF Export Error", err); alert("Could not generate PDF."); } 
      finally { setIsExporting(false); setShowExportModal(false); }
  };
  
  const handleExportDOCX = async () => {
       setIsExporting(true);
       try {
           const doc = new Document({
               sections: [{ children: [ new Paragraph({ text: localSet.title, heading: HeadingLevel.TITLE }), new Paragraph({ text: localSet.summary }) ] }]
           });
           const blob = await Packer.toBlob(doc);
           const a = document.createElement('a');
           a.href = URL.createObjectURL(blob);
           a.download = `${localSet.title}.docx`;
           a.click();
       } finally { setIsExporting(false); setShowExportModal(false); }
  };

  const VisualBlock = ({ text }: { text: string }) => {
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const concept = text.split(':')[1]?.split('\n')[0]?.trim() || "Concept";
    const description = text.split('\n').slice(1).join(' ') || text;
    const [ratio, setRatio] = useState('4:3');

    return (
      <div className="my-8 p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur shadow-lg">
        <h4 className="text-xs font-bold text-brand-accent uppercase tracking-widest mb-2">VISUAL MENTAL MODEL</h4>
        <p className="text-gray-300 italic mb-4 font-serif text-lg leading-relaxed">{description}</p>
        {url ? (
            <img 
              src={url} 
              alt="Visual" 
              className="w-full rounded-xl border border-white/10 shadow-2xl cursor-zoom-in"
              onClick={() => setExpandedImage(url)} 
            />
        ) : (
            <div className="flex items-center gap-2">
                <select value={ratio} onChange={(e) => setRatio(e.target.value)} className="bg-black/30 text-xs text-white border border-white/10 rounded-lg p-2">
                    <option value="1:1">Square (1:1)</option>
                    <option value="16:9">Wide (16:9)</option>
                    <option value="4:3">Standard (4:3)</option>
                    <option value="3:4">Portrait (3:4)</option>
                </select>
                <button onClick={() => { setLoading(true); GeminiService.generateConceptImage(concept, description, ratio).then(setUrl).finally(() => setLoading(false)); }} disabled={loading} className="px-4 py-2 bg-brand-accent text-black text-xs font-bold rounded-lg hover:scale-105 transition-transform flex items-center gap-2">
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <SparklesIcon className="w-3 h-3" />}
                    {loading ? "GENERATING..." : "GENERATE VISUAL"}
                </button>
            </div>
        )}
      </div>
    );
  };

  useEffect(() => { return () => { if (sourceRef.current) sourceRef.current.stop(); if (audioCtxRef.current) audioCtxRef.current.close(); }; }, []);

  const safeQuiz = localSet.quiz || [];

  return (
    <div className="h-full flex flex-col relative pb-32 animate-in fade-in duration-500">
      
      {/* Galactic Header */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 pb-6 border-b border-white/10 gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
              <button onClick={onBack} className="p-3 glass-button rounded-full text-white hover:bg-white hover:text-black transition-all">
                  <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 md:flex-none">
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-wide uppercase truncate max-w-[200px] md:max-w-md">{localSet.title}</h1>
                  <p className="text-xs font-mono text-brand-accent uppercase tracking-widest">Study Mode Active</p>
              </div>
          </div>
          
          <div className="flex items-center gap-3">
              {mode === StudyMode.NOTES && (
                 <button onClick={() => setIsEditing(!isEditing)} className="p-3 glass-button rounded-full text-gray-300 hover:text-white" title="Edit Notes">
                     {isEditing ? <X className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                 </button>
              )}
              <button onClick={() => setShowExportModal(!showExportModal)} className="flex items-center gap-2 px-4 py-2 glass-button rounded-full text-xs font-bold uppercase tracking-wider hover:bg-brand-accent hover:text-black hover:border-brand-accent">
                  <Download className="w-4 h-4" /> <span>Export</span>
              </button>
          </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="absolute top-20 right-0 w-64 glass-panel p-4 rounded-[1.5rem] z-50 flex flex-col gap-2 animate-in slide-in-from-top-2 shadow-2xl">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-2">Download As</h3>
            <button onClick={handleExportPDF} disabled={isExporting} className="p-3 rounded-xl hover:bg-white/10 text-left flex items-center gap-3 transition-colors disabled:opacity-50">
                {isExporting ? <Loader2 className="w-5 h-5 animate-spin"/> : <FileText className="w-5 h-5 text-brand-accent"/>}
                <span className="text-sm font-bold">{isExporting ? 'Generating PDF...' : 'PDF Document'}</span>
            </button>
            <button onClick={handleExportDOCX} disabled={isExporting} className="p-3 rounded-xl hover:bg-white/10 text-left flex items-center gap-3 transition-colors disabled:opacity-50">
                <FileType className="w-5 h-5 text-brand-accent"/> <span className="text-sm font-bold">Word Document</span>
            </button>
        </div>
      )}

      {/* Galactic Tabs - FIXED VISIBILITY */}
      <div className="w-full mb-8 relative z-20">
        <div className="flex justify-start md:justify-center w-full overflow-x-auto no-scrollbar py-2 px-1">
          <div className="glass-panel rounded-full p-1.5 flex items-center gap-1 min-w-max mx-auto shadow-lg bg-black/20 backdrop-blur-xl border border-white/10">
             {[
                { id: StudyMode.NOTES, label: 'Notes' },
                { id: StudyMode.FLASHCARDS, label: 'Flashcards' },
                { id: StudyMode.QUIZ, label: 'Quiz' },
                { id: StudyMode.GRAPH, label: 'Graph' },
                { id: StudyMode.PODCAST, label: 'Podcast' },
                { id: StudyMode.CHAT, label: 'Tutor' }
             ].map(tab => (
                 <button 
                   key={tab.id}
                   onClick={() => setMode(tab.id)}
                   className={`px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap
                      ${mode === tab.id ? 'bg-brand-accent text-black shadow-[0_0_20px_rgba(var(--color-accent),0.4)] scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                 >
                    {tab.label}
                 </button>
             ))}
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="flex-1 w-full relative z-10">
        
        {mode === StudyMode.NOTES && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className={showAiPanel ? 'lg:col-span-2' : 'lg:col-span-3 transition-all'}>
                <div className="glass-panel rounded-[2rem] p-8 md:p-12 min-h-[60vh]">
                    {isEditing ? (
                        <textarea 
                           value={editValue}
                           onChange={(e) => setEditValue(e.target.value)}
                           className="w-full h-[60vh] bg-black/20 border border-white/10 rounded-xl p-6 text-gray-300 font-mono text-sm leading-relaxed focus:border-brand-accent outline-none resize-none"
                        />
                    ) : (
                        <div className="prose prose-invert prose-lg max-w-none font-light markdown-content">
                             <ReactMarkdown 
                               remarkPlugins={[remarkGfm]}
                               components={{
                                 h1: ({node, ...props}) => <h1 className="text-4xl font-display font-bold text-white mb-8 pb-4 border-b border-white/10 leading-tight" {...props} />,
                                 h2: ({node, ...props}) => <h2 className="text-2xl font-display font-bold text-brand-accent mb-6 mt-12 flex items-center gap-2" {...props} />,
                                 h3: ({node, ...props}) => <h3 className="text-xl font-display font-bold text-white/90 mb-4 mt-8" {...props} />,
                                 p: ({node, ...props}) => <p className="mb-6 leading-loose text-gray-300 font-light" {...props} />,
                                 ul: ({node, ...props}) => <ul className="list-disc list-outside ml-6 mb-6 space-y-2 text-gray-300" {...props} />,
                                 ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-6 mb-6 space-y-2 text-gray-300" {...props} />,
                                 li: ({node, ...props}) => <li className="pl-2 leading-relaxed" {...props} />,
                                 strong: ({node, ...props}) => <strong className="highlight-mark" {...props} />,
                                 blockquote: ({children}) => {
                                   const text = String(children?.toString() || '');
                                   if (text.includes("Visual Mental Model")) return <VisualBlock text={text} />;
                                   return <blockquote className="border-l-4 border-brand-accent pl-6 text-gray-400 italic my-6 bg-white/5 p-4 rounded-r-xl">{children}</blockquote>;
                                 },
                                 code: ({children, className}) => {
                                    const match = /language-(\w+)/.exec(className || '');
                                    if (match && match[1] === 'mermaid') return <MermaidBlock code={String(children)} />;
                                    return <code className="bg-white/10 px-1 py-0.5 rounded text-brand-accent font-mono text-xs">{children}</code>;
                                 }
                               }}
                             >
                               {localSet.summary}
                             </ReactMarkdown>
                        </div>
                    )}
                </div>
             </div>
             <div className="fixed bottom-28 right-8 md:static md:block z-40">
                 <button 
                    onClick={() => setShowAiPanel(!showAiPanel)}
                    className="w-14 h-14 bg-gradient-to-br from-brand-accent to-brand-secondary text-black rounded-full shadow-[0_0_30px_rgba(var(--color-accent),0.5)] flex items-center justify-center hover:scale-110 transition-transform md:hidden"
                 >
                     <SparklesIcon className="w-6 h-6" />
                 </button>
             </div>
             
             {(showAiPanel || window.innerWidth > 1024) && (
                <div className={`fixed inset-y-0 right-0 w-full md:w-96 glass-panel border-l border-white/10 z-50 p-4 transform transition-transform lg:static lg:transform-none lg:w-full lg:h-[80vh] lg:border-none lg:bg-transparent lg:p-0 ${showAiPanel ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
                   <div className="h-full flex flex-col">
                       <button onClick={() => setShowAiPanel(false)} className="md:hidden absolute top-4 right-4 p-2 bg-white/10 rounded-full"><X className="w-5 h-5"/></button>
                       <ChatBot summary={localSet.summary} onUpdateSummary={handleSummaryUpdate} variant="sidebar" />
                   </div>
                </div>
             )}
          </div>
        )}

        {mode === StudyMode.FLASHCARDS && (
           <div className="h-[60vh] flex items-center justify-center">
              <FlashcardDeck cards={localSet.flashcards || []} onUpdateCard={handleCardUpdate} onComplete={() => onUpdateXP(20)} />
           </div>
        )}

        {mode === StudyMode.QUIZ && (
            <div className="max-w-3xl mx-auto glass-panel rounded-[2.5rem] p-8 md:p-12 min-h-[50vh] flex items-center justify-center">
               {safeQuiz.length === 0 ? (
                   <div className="text-center w-full max-w-md">
                       <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                          <HelpCircle className="w-10 h-10 text-gray-500" />
                       </div>
                       <h3 className="font-display font-bold text-2xl text-white mb-2">Assessment Module</h3>
                       <p className="text-gray-400 mb-8 text-sm">Configure your quiz parameters below.</p>
                       
                       <div className="space-y-6 mb-10 bg-black/20 p-6 rounded-2xl border border-white/5">
                           <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Difficulty Level</label>
                               <div className="flex bg-black/30 p-1 rounded-xl border border-white/10">
                                   {['Easy', 'Medium', 'Hard'].map(level => (
                                       <button
                                           key={level}
                                           onClick={() => setQuizConfig(c => ({ ...c, difficulty: level }))}
                                           className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${quizConfig.difficulty === level ? 'bg-brand-accent text-black shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                       >
                                           {level}
                                       </button>
                                   ))}
                               </div>
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Number of Questions</label>
                               <div className="flex justify-between gap-2">
                                   {[5, 10, 15, 20].map(num => (
                                       <button
                                           key={num}
                                           onClick={() => setQuizConfig(c => ({ ...c, count: num }))}
                                           className={`flex-1 py-3 rounded-xl border transition-all text-xs font-bold ${quizConfig.count === num ? 'bg-brand-secondary border-brand-secondary text-white shadow-[0_0_15px_rgba(var(--color-secondary),0.3)]' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'}`}
                                       >
                                           {num}
                                       </button>
                                   ))}
                               </div>
                           </div>
                       </div>

                       <button onClick={handleGenerateQuiz} disabled={isGeneratingQuiz} className="w-full py-4 bg-brand-accent text-black rounded-xl font-bold text-sm uppercase tracking-widest hover:scale-[1.02] transition-transform shadow-[0_0_30px_rgba(var(--color-accent),0.4)] disabled:opacity-50 disabled:cursor-not-allowed">
                          {isGeneratingQuiz ? (
                              <span className="flex items-center justify-center gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                              </span>
                          ) : 'Start Quiz Generation'}
                       </button>
                   </div>
               ) : (
                   <div className="w-full">
                       <div className="flex justify-end mb-4">
                           <button 
                             onClick={() => {
                                 const newSet = { ...localSet, quiz: [] };
                                 setLocalSet(newSet);
                             }}
                             className="text-xs text-gray-500 hover:text-brand-accent flex items-center gap-1"
                           >
                               <RotateCcw className="w-3 h-3" /> New Configuration
                           </button>
                       </div>
                       <QuizPlayer questions={safeQuiz} onComplete={(score) => onUpdateXP(score * 10)} />
                   </div>
               )}
            </div>
        )}

        {mode === StudyMode.PODCAST && (
            <div className="max-w-4xl mx-auto text-center">
                {!audioBuffer && !podcastScript ? (
                    <div className="py-20 px-6 glass-panel rounded-[3rem]">
                        <div className="w-24 h-24 bg-gradient-to-br from-brand-accent to-brand-secondary rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(var(--color-accent),0.3)] animate-pulse-slow">
                             <Mic2 className="w-10 h-10 text-black" />
                        </div>
                        <h2 className="text-4xl font-display font-bold text-white mb-8">PODCAST STUDIO</h2>
                        
                        <div className="flex items-center justify-center gap-8 mb-8">
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500 flex items-center justify-center mx-auto mb-2">
                                    <User className="w-8 h-8 text-blue-400" />
                                </div>
                                <p className="text-xs font-bold text-blue-300 uppercase tracking-wider">Alex Gent</p>
                            </div>
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-full bg-pink-500/20 border border-pink-500 flex items-center justify-center mx-auto mb-2">
                                    <User className="w-8 h-8 text-pink-400" />
                                </div>
                                <p className="text-xs font-bold text-pink-300 uppercase tracking-wider">Jamie Lady</p>
                            </div>
                        </div>
                        
                        <div className="space-y-8 mb-10 max-w-2xl mx-auto">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Conversation Tone</label>
                                <div className="flex flex-wrap justify-center gap-3">
                                    {['Casual', 'Formal', 'Debate', 'Humorous'].map(t => (
                                        <button key={t} onClick={() => setPodcastConfig(c => ({...c, tone: t as any}))} className={`px-6 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${podcastConfig.tone === t ? 'bg-brand-accent text-black border-brand-accent' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'}`}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Duration</label>
                                <div className="flex justify-center gap-3">
                                    {['Short', 'Medium', 'Long'].map(l => (
                                        <button key={l} onClick={() => setPodcastConfig(c => ({...c, length: l as any}))} className={`px-8 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${podcastConfig.length === l ? 'bg-brand-secondary text-white border-brand-secondary' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'}`}>
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button onClick={handleGeneratePodcast} disabled={isAudioLoading} className="px-12 py-5 bg-gradient-to-r from-brand-accent to-brand-secondary rounded-2xl font-bold text-black uppercase tracking-widest hover:scale-105 transition-transform shadow-[0_0_40px_rgba(var(--color-accent),0.4)] disabled:opacity-50 disabled:cursor-not-allowed">
                            {isAudioLoading ? <span className="flex items-center gap-2"><Loader2 className="animate-spin" /> GENERATING AUDIO...</span> : "GENERATE PODCAST"}
                        </button>
                    </div>
                ) : (
                    <div className="glass-panel rounded-[3rem] p-8 md:p-12 relative overflow-hidden">
                         {/* Audio Visualizer BG */}
                         <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none gap-1">
                             {[...Array(20)].map((_, i) => (
                                 <div key={i} className="w-4 bg-brand-accent rounded-full animate-pulse" style={{ height: `${Math.random() * 100}%`, animationDuration: `${0.5 + Math.random()}s` }}></div>
                             ))}
                         </div>
                         
                         <div className="relative z-10">
                             <div className="flex items-center justify-center gap-4 mb-8">
                                 <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all ${isPlaying ? 'border-brand-accent scale-110 shadow-[0_0_40px_rgba(var(--color-accent),0.6)]' : 'border-white/10 bg-white/5'}`}>
                                     <button onClick={togglePlay} className="text-white hover:scale-110 transition-transform">
                                         {isPlaying ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10 ml-1" />}
                                     </button>
                                 </div>
                             </div>
                             
                             <div className="max-w-2xl mx-auto mb-8">
                                 <div className="flex justify-between text-xs font-mono text-gray-400 mb-2">
                                     <span>{formatTime(currentTime)}</span>
                                     <span>{formatTime(duration)}</span>
                                 </div>
                                 <div className="w-full h-2 bg-white/10 rounded-full cursor-pointer overflow-hidden" onClick={handleSeek}>
                                     <div className="h-full bg-brand-accent relative" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}>
                                         <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform"></div>
                                     </div>
                                 </div>
                             </div>
                             
                             <div className="flex justify-center gap-4 mb-12">
                                 <button onClick={handleSavePodcast} className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-xs font-bold uppercase tracking-wider">
                                     <Save className="w-4 h-4" /> Save to Library
                                 </button>
                                 <button onClick={handleDownloadAudio} className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-xs font-bold uppercase tracking-wider">
                                     <Download className="w-4 h-4" /> Download WAV
                                 </button>
                             </div>

                             <div className="text-left max-w-2xl mx-auto h-64 overflow-y-auto custom-scrollbar bg-black/40 rounded-2xl p-6 border border-white/5">
                                 <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 sticky top-0 bg-black/40 py-2 backdrop-blur-md">Transcript</h4>
                                 <div className="space-y-4 text-sm text-gray-300 leading-relaxed font-light">
                                     {podcastScript.split('\n').map((line, i) => (
                                         <p key={i} className={line.startsWith('Alex:') ? 'text-blue-200' : 'text-pink-200'}>
                                             {line.split(':').map((part, idx) => idx === 0 ? <span key={idx} className="font-bold opacity-70 uppercase text-[10px] mr-2 tracking-wider">{part}:</span> : part)}
                                         </p>
                                     ))}
                                 </div>
                             </div>
                         </div>
                    </div>
                )}
            </div>
        )}

        {mode === StudyMode.GRAPH && (
           <div className="h-[70vh] glass-panel rounded-[2.5rem] p-8 flex flex-col items-center justify-center relative overflow-hidden">
               {isGeneratingMap ? (
                   <div className="text-center">
                       <Loader2 className="w-12 h-12 text-brand-accent animate-spin mx-auto mb-4" />
                       <p className="font-display text-xl animate-pulse">Constructing Neural Graph...</p>
                   </div>
               ) : mindMapCode ? (
                   <div className="w-full h-full overflow-auto custom-scrollbar flex items-center justify-center bg-white/5 rounded-xl border border-white/10">
                       <MermaidBlock code={mindMapCode} />
                   </div>
               ) : (
                   <p className="text-red-400">Could not generate graph.</p>
               )}
               
               <div className="absolute bottom-8 left-8 p-4 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 max-w-xs">
                   <h4 className="text-xs font-bold text-brand-accent uppercase tracking-wider mb-1">Knowledge Graph</h4>
                   <p className="text-[10px] text-gray-400">Visualizing connections between core concepts extracted from your study material.</p>
               </div>
           </div>
        )}
        
        {mode === StudyMode.CHAT && (
            <div className="h-[70vh]">
                <ChatBot summary={localSet.summary} onUpdateSummary={handleSummaryUpdate} variant="full" />
            </div>
        )}
      </div>
      
      {/* Mini Player */}
      {audioBuffer && mode !== StudyMode.PODCAST && (
          <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-xl glass-panel p-3 rounded-full flex items-center gap-4 z-50 shadow-2xl animate-in slide-in-from-bottom-4 border border-brand-accent/30 backdrop-blur-xl bg-black/60">
              <button 
                  onClick={togglePlay} 
                  className="w-10 h-10 rounded-full bg-brand-accent text-black flex items-center justify-center hover:bg-white transition-colors flex-shrink-0 shadow-[0_0_15px_rgba(var(--color-accent),0.4)]"
              >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              
              <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
                  <div className="flex justify-between text-[10px] font-mono text-brand-accent uppercase tracking-wider">
                      <span className="truncate pr-2">Playing Podcast</span>
                      <span className="flex-shrink-0">{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer" onClick={(e) => {
                      // Simple seek on click
                      const rect = e.currentTarget.getBoundingClientRect();
                      const percent = (e.clientX - rect.left) / rect.width;
                      const newTime = percent * duration;
                      
                      // Seek logic
                      if (audioCtxRef.current) {
                         if (sourceRef.current) { sourceRef.current.stop(); sourceRef.current = null; }
                         pausedAtRef.current = newTime;
                         startTimeRef.current = audioCtxRef.current.currentTime - newTime;
                         setCurrentTime(newTime);
                         if (isPlaying) playAudio();
                      }
                  }}>
                      <div className="h-full bg-brand-accent relative" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}>
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-lg"></div>
                      </div>
                  </div>
              </div>

              <div className="flex items-center gap-1">
                  <button 
                      onClick={handleDownloadAudio}
                      className="p-2 text-gray-400 hover:text-brand-secondary transition-colors"
                      title="Download Audio"
                  >
                      <Download className="w-4 h-4" />
                  </button>
                  <button 
                      onClick={() => setMode(StudyMode.PODCAST)}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                      title="Expand Player"
                  >
                      <Maximize2 className="w-4 h-4" />
                  </button>
                  <button 
                      onClick={() => { pauseAudio(); setAudioBuffer(null); }}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      title="Close Player"
                  >
                      <X className="w-4 h-4" />
                  </button>
              </div>
          </div>
      )}

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
