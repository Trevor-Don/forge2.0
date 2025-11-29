
import React, { useState, useRef } from 'react';
import { Upload, FileText, X, Loader2, Sparkles, Plus, FileAudio, Layers, Split, Tag } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { StorageService } from '../services/storageService';
import { StudySet, User } from '../types';

interface CreateStudySetProps {
  user: User;
  onCreated: (set: StudySet) => void;
}

export const CreateStudySet: React.FC<CreateStudySetProps> = ({ user, onCreated }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [generationMode, setGenerationMode] = useState<'merge' | 'batch'>('merge');
  
  // Tagging State
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      
      if (files.length + selectedFiles.length > 20) {
        alert(`You can only upload a maximum of 20 files. You currently have ${files.length}.`);
        return;
      }

      const newFiles = [...files, ...selectedFiles];
      setFiles(newFiles);
      
      // Reset input value to allow selecting same files again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (!title && newFiles.length > 0) {
        if (newFiles.length === 1) {
            setTitle(newFiles[0].name.split('.')[0]);
        } else {
            // Default Title Logic
            setTitle("New Study Collection");
        }
      }
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:mime/type;base64, prefix for Gemini
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const processFile = async (file: File): Promise<{ data: string, mimeType: string }> => {
    // Handle DOCX via Mammoth
    if (file.name.endsWith('.docx')) {
      if (!(window as any).mammoth) {
        throw new Error("Processing library not loaded. Please refresh.");
      }
      const arrayBuffer = await file.arrayBuffer();
      const result = await (window as any).mammoth.extractRawText({ arrayBuffer });
      const base64Text = btoa(unescape(encodeURIComponent(result.value)));
      return { data: base64Text, mimeType: 'text/plain' };
    }

    // Handle Audio & Standard Files
    const base64Data = await convertFileToBase64(file);
    
    let mimeType = file.type;
    if (!mimeType) {
       if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
       else if (file.name.endsWith('.txt')) mimeType = 'text/plain';
       else if (file.name.endsWith('.png')) mimeType = 'image/png';
       else if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) mimeType = 'image/jpeg';
       else if (file.name.endsWith('.mp3')) mimeType = 'audio/mp3';
       else if (file.name.endsWith('.wav')) mimeType = 'audio/wav';
    }
    
    return { data: base64Data, mimeType: mimeType || 'application/pdf' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0 || !title) return;

    setIsProcessing(true);
    
    try {
      if (files.length > 1 && generationMode === 'batch') {
          // BATCH MODE: Create separate sets in a Binder
          setStatus(`Initializing Binder: ${title}...`);
          
          const setIds: string[] = [];
          
          // Create Binder first
          const binder = await StorageService.createBinder(title, []);
          
          // Process sequentially to avoid rate limits and better UX
          for (let i = 0; i < files.length; i++) {
              const file = files[i];
              setStatus(`Processing ${i+1}/${files.length}: ${file.name}...`);
              
              const processedFile = await processFile(file);
              const summary = await GeminiService.generateSummary([processedFile], "Focus on the specifics of this document.");
              const flashcards = await GeminiService.generateFlashcards(summary);

              const newSet: StudySet = {
                  id: crypto.randomUUID(),
                  title: file.name.split('.')[0],
                  description: `Part of ${title} collection.`,
                  summary,
                  flashcards,
                  quiz: [],
                  createdBy: user.id,
                  createdAt: Date.now(),
                  tags: tags.length > 0 ? tags : ['Batch Generated'],
                  binderId: binder.id
              };
              
              await StorageService.saveStudySet(newSet);
              setIds.push(newSet.id);
          }
          
          // Update binder with set IDs
          // Note: In a real DB we'd use relation tables. Here we just rely on binderId in StudySet, 
          // but we also updated the binder logic to store setIds if we wanted two-way.
          // For now, let's just trigger the callback with the first set created so the UI switches.
          
          // Re-fetch sets to ensure they exist
          const allSets = await StorageService.getStudySets();
          const firstSet = allSets.find(s => s.id === setIds[0]);
          
          await StorageService.updateUserXP(50 * files.length);
          if (firstSet) onCreated(firstSet);

      } else {
          // MERGE MODE: Combine all into one
          setStatus(`Processing ${files.length} file(s)...`);
          const processedFiles = await Promise.all(files.map(processFile));

          setStatus('Analyzing combined content...');
          const summary = await GeminiService.generateSummary(processedFiles);
          
          setStatus('Generating Flashcards...');
          const flashcards = await GeminiService.generateFlashcards(summary);
          
          const newSet: StudySet = {
            id: crypto.randomUUID(),
            title,
            description: `Generated from ${files.length} file(s). Includes: ${files.slice(0,2).map(f=>f.name).join(', ')}`,
            summary,
            flashcards,
            quiz: [],
            createdBy: user.id,
            createdAt: Date.now(),
            tags: tags.length > 0 ? tags : ['Merged Summary']
          };

          await StorageService.saveStudySet(newSet);
          await StorageService.updateUserXP(50);
          onCreated(newSet);
      }
    } catch (error) {
      console.error(error);
      setStatus(`Error: ${(error as Error).message || 'Failed to process document'}`);
      setTimeout(() => setIsProcessing(false), 3000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-10 duration-700">
      <div className="mb-8 text-center">
        <h2 className="text-4xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-brand-accent mb-2 tracking-wide">
          FORGE NEW KNOWLEDGE
        </h2>
        <p className="text-gray-400 text-lg font-light">Upload documents to generate study materials.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 p-8 rounded-[2rem] glass-panel shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/5 rounded-full blur-3xl pointer-events-none"></div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
             {files.length > 1 && generationMode === 'batch' ? 'Binder Name' : 'Study Set Title'}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-accent/50 transition-colors font-display text-xl tracking-wide"
            placeholder={files.length > 1 && generationMode === 'batch' ? "e.g., Biology Semester 1" : "e.g., History Lecture Notes"}
            required
          />
        </div>
        
        {/* Tags Input */}
        <div>
           <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Tags (Optional)</label>
           <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                  <Tag className="absolute left-4 top-3.5 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-accent/50 transition-colors text-sm"
                    placeholder="Add tags..."
                  />
              </div>
              <button 
                type="button" 
                onClick={addTag}
                className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand-accent/30 transition-all text-white"
              >
                  <Plus className="w-5 h-5" />
              </button>
           </div>
           
           {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                 {tags.map(tag => (
                    <span key={tag} className="px-3 py-1 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-xs font-bold flex items-center gap-2">
                       {tag}
                       <button 
                         type="button" 
                         onClick={() => removeTag(tag)}
                         className="hover:text-white"
                       >
                          <X className="w-3 h-3" />
                       </button>
                    </span>
                 ))}
              </div>
           )}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Source Material</label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[200px] group
              ${files.length > 0 ? 'border-brand-accent/30 bg-brand-accent/5' : 'border-white/10 hover:border-brand-accent/30 hover:bg-white/5'}`}
          >
            <input 
              type="file" 
              multiple
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept=".txt,.pdf,.png,.jpg,.jpeg,.webp,.docx,.mp3,.wav,.ogg,.mpeg"
            />
            
            {files.length > 0 ? (
              <div className="w-full z-10">
                <div className="grid grid-cols-1 gap-3 mb-6 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                   {files.map((file, idx) => (
                     <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10 group hover:border-brand-accent/30 transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                           {file.type.startsWith('audio/') ? (
                              <div className="p-2 rounded-lg bg-brand-secondary/20 text-brand-secondary">
                                <FileAudio className="w-4 h-4 flex-shrink-0" />
                              </div>
                           ) : (
                              <div className="p-2 rounded-lg bg-brand-accent/20 text-brand-accent">
                                <FileText className="w-4 h-4 flex-shrink-0" />
                              </div>
                           )}
                           <div className="flex flex-col min-w-0">
                             <span className="truncate text-sm font-medium text-gray-200">{file.name}</span>
                             <span className="text-xs text-gray-500 font-mono">{(file.size / 1024).toFixed(0)} KB</span>
                           </div>
                        </div>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400 text-gray-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                     </div>
                   ))}
                </div>
                
                <div className="flex flex-col items-center gap-2">
                    <button 
                      type="button" 
                      className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-accent hover:text-brand-accent/80 px-4 py-2 rounded-full bg-brand-accent/10 hover:bg-brand-accent/20 transition-colors border border-brand-accent/20"
                    >
                      <Plus className="w-4 h-4" /> Add more files
                    </button>
                    <p className="text-[10px] text-gray-500 mt-1 font-mono">{files.length} / 20 files selected</p>
                </div>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_20px_rgba(var(--color-accent),0.1)]">
                  <Upload className="w-8 h-8 text-gray-400 group-hover:text-brand-accent transition-colors" />
                </div>
                <p className="text-lg font-display font-bold text-gray-300 tracking-wide">CLICK OR DRAG TO UPLOAD</p>
                <p className="text-sm text-gray-500 mt-1">PDF, DOCX, Images, MP3, WAV</p>
              </>
            )}
          </div>
        </div>

        {/* Generation Mode Selector (Visible only if >1 file) */}
        {files.length > 1 && (
            <div className="bg-white/5 rounded-2xl p-2 flex gap-2">
                <button
                    type="button"
                    onClick={() => setGenerationMode('merge')}
                    className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all ${generationMode === 'merge' ? 'bg-brand-accent text-black shadow-lg font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <Layers className="w-4 h-4" />
                    <span className="text-sm">Merge into One Summary</span>
                </button>
                <button
                    type="button"
                    onClick={() => setGenerationMode('batch')}
                    className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all ${generationMode === 'batch' ? 'bg-brand-accent text-black shadow-lg font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <Split className="w-4 h-4" />
                    <span className="text-sm">Create Binder (Individual)</span>
                </button>
            </div>
        )}

        <button
          type="submit"
          disabled={isProcessing || files.length === 0 || !title}
          className={`w-full py-4 rounded-xl font-bold font-display tracking-widest text-lg flex items-center justify-center gap-3 transition-all
            ${isProcessing 
              ? 'bg-gray-800 text-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-brand-accent to-brand-secondary hover:opacity-90 text-black shadow-[0_0_30px_rgba(var(--color-accent),0.4)] hover:scale-[1.01]'}`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              {status}
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              {files.length > 1 && generationMode === 'batch' ? 'GENERATE BINDER' : 'GENERATE INTELLIGENCE'}
            </>
          )}
        </button>
      </form>
    </div>
  );
};
