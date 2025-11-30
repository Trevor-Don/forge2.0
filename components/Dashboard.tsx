import React, { useMemo, useState, useEffect } from 'react';
import { User, StudySet, Group, StudyMode, Binder } from '../types';
import { Search, Mic, ArrowRight, Book, Sparkles, Zap, Activity, Plus, Layers, HelpCircle, Mic2, Folder, FolderOpen, X, Tag, Library, Grid, List, BookOpen, BrainCircuit } from 'lucide-react';
import { StorageService } from '../services/storageService';

interface DashboardProps {
  user: User;
  studySets: StudySet[];
  groups: Group[];
  onSelectSet: (set: StudySet, mode?: StudyMode) => void;
  onCreateGroup: () => void;
  onNavigate: (tab: string) => void;
  initialView?: 'home' | 'library';
}

type LibraryTab = 'all' | 'folders' | 'notes' | 'podcasts' | 'quizzes' | 'flashcards';

export const Dashboard: React.FC<DashboardProps> = ({ user, studySets, groups, onSelectSet, onCreateGroup, onNavigate, initialView = 'home' }) => {
  const [binders, setBinders] = useState<Binder[]>([]);
  const [activeBinderId, setActiveBinderId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<'home' | 'library'>(initialView);
  const [libraryTab, setLibraryTab] = useState<LibraryTab>('all');

  useEffect(() => {
      setActiveView(initialView);
  }, [initialView]);

  useEffect(() => {
      StorageService.getBinders().then(setBinders);
  }, []);
  
  const heatmapData = useMemo(() => {
    return Array.from({ length: 21 }, () => Math.random() > 0.4);
  }, []);

  const safeStudySets = studySets || [];

  const allTags = useMemo(() => {
      const tags = new Set<string>();
      safeStudySets.forEach(set => {
          if (set.tags) {
              set.tags.forEach(t => tags.add(t));
          }
      });
      return Array.from(tags);
  }, [safeStudySets]);

  const filteredSets = safeStudySets.filter(set => {
      const matchesBinder = activeBinderId ? set.binderId === activeBinderId : true;
      const matchesTag = selectedTag ? set.tags && set.tags.includes(selectedTag) : true;
      const matchesSearch = searchTerm ? set.title.toLowerCase().includes(searchTerm.toLowerCase()) : true;
      
      if (activeView === 'library') {
          if (libraryTab === 'podcasts' && !set.podcastScript) return false;
          if (libraryTab === 'quizzes' && (!set.quiz || set.quiz.length === 0)) return false;
          if (libraryTab === 'flashcards' && (!set.flashcards || set.flashcards.length === 0)) return false;
      }
      
      return matchesBinder && matchesTag && matchesSearch;
  });

  const activeBinder = binders.find(b => b.id === activeBinderId);

  const renderLibraryContent = () => {
      if (libraryTab === 'folders') {
          return (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in">
                  {binders.map(binder => (
                      <button
                          key={binder.id}
                          onClick={() => { setActiveBinderId(binder.id); setLibraryTab('all'); }}
                          className="p-6 rounded-[2rem] border transition-all flex flex-col gap-4 items-start bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30 text-gray-300 aspect-square justify-between group"
                      >
                          <Folder className="w-10 h-10 text-brand-accent group-hover:scale-110 transition-transform"/>
                          <div>
                            <span className="font-bold text-lg truncate w-full text-left block text-white">{binder.title}</span>
                            <span className="text-xs opacity-60 font-mono">{binder.setIds.length} Sets</span>
                          </div>
                      </button>
                  ))}
                  <button 
                    onClick={() => onNavigate('create')}
                    className="p-6 rounded-[2rem] border border-dashed border-white/20 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-white hover:border-white/40 transition-colors"
                  >
                      <Plus className="w-8 h-8" />
                      <span className="text-xs font-bold uppercase tracking-wider">New Folder</span>
                  </button>
              </div>
          );
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
            {filteredSets.map(set => (
                <div key={set.id} className="glass-panel rounded-[2.5rem] p-8 relative overflow-hidden group hover:border-brand-accent/30 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-1 flex-wrap">
                            {set.tags && set.tags.length > 0 ? (
                                set.tags.slice(0, 2).map(tag => (
                                    <div key={tag} className="px-3 py-1 rounded-full border border-white/20 text-[10px] font-bold uppercase tracking-wider">
                                        {tag}
                                    </div>
                                ))
                            ) : (
                                <div className="px-3 py-1 rounded-full border border-white/20 text-[10px] font-bold uppercase tracking-wider">
                                    Study
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                           {set.podcastScript && <Mic2 className="w-4 h-4 text-brand-secondary" title="Podcast" />}
                           {set.quiz && set.quiz.length > 0 && <HelpCircle className="w-4 h-4 text-purple-400" title="Quiz" />}
                           {set.flashcards && set.flashcards.length > 0 && <Layers className="w-4 h-4 text-orange-400" title="Flashcards" />}
                        </div>
                    </div>
                    
                    <h3 className="text-3xl font-display font-bold text-white mb-2 mt-2 truncate">{set.title}</h3>
                    <p className="text-xs text-gray-400 mb-8 line-clamp-2 font-mono">{set.description}</p>
                    
                    <div className="flex gap-3 relative z-10">
                        <button 
                          onClick={() => onSelectSet(set, StudyMode.NOTES)}
                          className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider hover:bg-brand-accent hover:text-black transition-colors"
                        >
                            Open
                        </button>
                        {set.podcastScript && (
                          <button 
                            onClick={() => onSelectSet(set, StudyMode.PODCAST)}
                            className="w-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-brand-secondary hover:text-white transition-colors"
                            title="Play Podcast"
                          >
                             <Mic2 className="w-5 h-5" />
                          </button>
                        )}
                        {set.quiz && set.quiz.length > 0 && (
                           <button 
                             onClick={() => onSelectSet(set, StudyMode.QUIZ)}
                             className="w-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-purple-500 hover:text-white transition-colors"
                             title="Take Quiz"
                           >
                              <HelpCircle className="w-5 h-5" />
                           </button>
                        )}
                    </div>
                </div>
            ))}
            {filteredSets.length === 0 && (
                <div className="col-span-full text-center py-20 opacity-50">
                    <p>No items found in this category.</p>
                </div>
            )}
        </div>
      );
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      
      <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 glass-panel rounded-[2rem] p-4 flex items-center gap-4 px-6">
              <Search className="w-5 h-5 text-gray-400" />
              <input 
                 type="text" 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 placeholder="Search library..." 
                 className="bg-transparent border-none outline-none text-white placeholder-gray-500 flex-1 font-display tracking-wide text-lg"
              />
              {searchTerm && <button onClick={() => setSearchTerm('')}><X className="w-4 h-4 text-gray-500 hover:text-white"/></button>}
          </div>
          
          <div className="flex bg-brand-card rounded-[2rem] p-1.5 border border-white/10">
              <button 
                 onClick={() => setActiveView('home')} 
                 className={`px-6 py-3 rounded-[1.5rem] flex items-center gap-2 transition-all ${activeView === 'home' ? 'bg-brand-accent text-black font-bold shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                  <Grid className="w-4 h-4" /> <span className="text-xs uppercase tracking-wider hidden md:inline">Dashboard</span>
              </button>
              <button 
                 onClick={() => setActiveView('library')} 
                 className={`px-6 py-3 rounded-[1.5rem] flex items-center gap-2 transition-all ${activeView === 'library' ? 'bg-brand-accent text-black font-bold shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                  <Library className="w-4 h-4" /> <span className="text-xs uppercase tracking-wider hidden md:inline">Library</span>
              </button>
          </div>
      </div>

      {activeView === 'home' ? (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 bg-brand-card rounded-[3rem] p-6 md:p-10 relative overflow-hidden border border-white/5 shadow-2xl group cursor-pointer" onClick={() => safeStudySets[0] && onSelectSet(safeStudySets[0])}>
                    <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-brand-accent/10 rounded-full blur-[80px] group-hover:bg-brand-accent/20 transition-colors"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between min-h-[250px]">
                        <div className="border border-white/20 rounded-full px-4 py-1 w-fit text-xs font-mono text-brand-accent uppercase tracking-wider mb-4">
                            Featured Set
                        </div>
                        <div>
                            <h2 className="text-4xl md:text-6xl font-display font-bold text-white leading-[0.9] mb-4 break-words">
                                {safeStudySets.length > 0 ? safeStudySets[0].title : "CREATE A SET"}
                            </h2>
                            <p className="text-gray-400 max-w-md line-clamp-3 text-sm leading-relaxed">
                                {safeStudySets.length > 0 ? safeStudySets[0].description : "Upload documents to generate your first study set using Gemini AI."}
                            </p>
                        </div>
                        {safeStudySets.length === 0 && (
                            <button onClick={() => onNavigate('create')} className="mt-6 flex items-center gap-2 text-brand-accent font-bold tracking-widest uppercase hover:underline">
                                <Plus className="w-5 h-5" /> Start Now
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="glass-panel rounded-[2.5rem] p-6 flex flex-col items-center justify-center text-center h-full relative overflow-hidden">
                        <div className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-2">Your Level</div>
                        <div className="text-6xl font-display font-bold text-white mb-4">{user.level}</div>
                        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                            <div className="bg-brand-accent h-full" style={{ width: '65%' }}></div>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-brand-accent text-xs font-mono">
                            <Activity className="w-4 h-4" />
                            <span>{user.streak} Day Streak</span>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                 <div className="flex justify-between items-center mb-6 px-2">
                     <h3 className="text-xl font-display font-bold text-white">Recent Activity</h3>
                     <button onClick={() => setActiveView('library')} className="text-xs font-bold uppercase tracking-widest text-brand-accent hover:underline">View All</button>
                 </div>
                 {safeStudySets.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {safeStudySets.slice(0, 2).map(set => (
                             <div key={set.id} onClick={() => onSelectSet(set)} className="glass-panel p-6 rounded-[2rem] flex items-center gap-6 hover:bg-white/5 cursor-pointer transition-colors group">
                                 <div className="w-16 h-16 rounded-2xl bg-brand-accent/20 flex items-center justify-center text-brand-accent group-hover:scale-110 transition-transform">
                                     <BookOpen className="w-8 h-8" />
                                 </div>
                                 <div className="min-w-0">
                                     <h4 className="text-xl font-bold text-white truncate font-display">{set.title}</h4>
                                     <p className="text-xs text-gray-400 truncate mt-1">{set.tags && set.tags.length > 0 ? set.tags[0] : 'Study Set'}</p>
                                 </div>
                             </div>
                         ))}
                     </div>
                 ) : (
                     <div className="text-center py-10 opacity-50"><p>No recent activity.</p></div>
                 )}
            </div>
            
            <div className="glass-panel rounded-[2rem] p-8 flex flex-col items-center">
                <div className="text-xs font-bold uppercase tracking-[0.3em] text-gray-500 mb-4">Study Consistency</div>
                <div className="flex gap-2 flex-wrap justify-center">
                    {heatmapData.map((active, i) => (
                        <div key={i} className={`w-8 h-8 rounded-lg transition-colors ${active ? 'bg-brand-accent shadow-[0_0_10px_rgba(var(--color-accent),0.5)]' : 'bg-white/5'}`}></div>
                    ))}
                </div>
            </div>
        </>
      ) : (
        <div className="animate-in fade-in slide-in-from-right-4">
             <div className="flex gap-2 overflow-x-auto no-scrollbar mb-8 pb-2">
                 {[
                     { id: 'all', label: 'All', icon: <Grid className="w-4 h-4"/> },
                     { id: 'folders', label: 'Folders', icon: <Folder className="w-4 h-4"/> },
                     { id: 'notes', label: 'Notes', icon: <BookOpen className="w-4 h-4"/> },
                     { id: 'podcasts', label: 'Podcasts', icon: <Mic2 className="w-4 h-4"/> },
                     { id: 'quizzes', label: 'Quizzes', icon: <HelpCircle className="w-4 h-4"/> },
                     { id: 'flashcards', label: 'Flashcards', icon: <Layers className="w-4 h-4"/> }
                 ].map(tab => (
                     <button
                         key={tab.id}
                         onClick={() => { setLibraryTab(tab.id as any); setActiveBinderId(null); }}
                         className={`px-5 py-2.5 rounded-full flex items-center gap-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border
                             ${libraryTab === tab.id 
                                 ? 'bg-white text-black border-white shadow-lg' 
                                 : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}`}
                     >
                         {tab.icon} {tab.label}
                     </button>
                 ))}
             </div>

             {renderLibraryContent()}
        </div>
      )}

    </div>
  );
};