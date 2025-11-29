
import React, { useMemo, useState, useEffect } from 'react';
import { User, StudySet, Group, StudyMode, Binder } from '../types';
import { Search, Mic, ArrowRight, Book, Sparkles, Zap, Activity, Plus, Layers, HelpCircle, Mic2, Folder, FolderOpen, X, Tag } from 'lucide-react';
import { StorageService } from '../services/storageService';

interface DashboardProps {
  user: User;
  studySets: StudySet[];
  groups: Group[];
  onSelectSet: (set: StudySet, mode?: StudyMode) => void;
  onCreateGroup: () => void;
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, studySets, groups, onSelectSet, onCreateGroup, onNavigate }) => {
  const [binders, setBinders] = useState<Binder[]>([]);
  const [activeBinderId, setActiveBinderId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
      StorageService.getBinders().then(setBinders);
  }, []);
  
  const heatmapData = useMemo(() => {
    return Array.from({ length: 21 }, () => Math.random() > 0.4);
  }, []);

  // Safety check for arrays
  const safeStudySets = studySets || [];

  // Extract all unique tags
  const allTags = useMemo(() => {
      const tags = new Set<string>();
      safeStudySets.forEach(set => {
          if (set.tags) {
              set.tags.forEach(t => tags.add(t));
          }
      });
      return Array.from(tags);
  }, [safeStudySets]);

  // Filter sets Logic
  const filteredSets = safeStudySets.filter(set => {
      const matchesBinder = activeBinderId ? set.binderId === activeBinderId : true;
      const matchesTag = selectedTag ? set.tags && set.tags.includes(selectedTag) : true;
      const matchesSearch = searchTerm ? set.title.toLowerCase().includes(searchTerm.toLowerCase()) : true;
      return matchesBinder && matchesTag && matchesSearch;
  });

  const activeBinder = binders.find(b => b.id === activeBinderId);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      
      {/* Top Section: Search & Collaboration Banner */}
      <div className="flex flex-col md:flex-row gap-6">
          {/* Search Bar */}
          <div className="flex-1 glass-panel rounded-[2rem] p-4 flex items-center gap-4 px-6">
              <Search className="w-5 h-5 text-gray-400" />
              <input 
                 type="text" 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 placeholder="Search..." 
                 className="bg-transparent border-none outline-none text-white placeholder-gray-500 flex-1 font-display tracking-wide text-lg"
              />
              <div className="w-px h-6 bg-white/10"></div>
              <button className="text-gray-400 hover:text-brand-accent"><Mic className="w-5 h-5" /></button>
          </div>

          {/* Collaboration Banner */}
          <div className="md:w-1/3 bg-brand-card rounded-[2rem] p-6 relative overflow-hidden flex flex-col justify-center border border-white/5 shadow-xl">
              <div className="absolute top-0 right-0 text-[100px] font-display font-bold text-white/5 leading-none pointer-events-none">TEAM</div>
              <div className="relative z-10">
                  <div className="text-xs font-bold tracking-[0.3em] text-brand-accent mb-1 uppercase">Collaboration</div>
                  <div className="flex items-center justify-between">
                      <div className="text-2xl font-display font-bold text-white">STUDY TOGETHER</div>
                      <button onClick={() => onNavigate('groups')} className="bg-brand-accent text-black px-4 py-2 rounded-lg text-xs font-bold uppercase hover:scale-105 transition-transform">
                          Get Started
                      </button>
                  </div>
              </div>
          </div>
      </div>

      {/* Hero Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Featured Set */}
          <div className="md:col-span-2 bg-brand-card rounded-[3rem] p-6 md:p-10 relative overflow-hidden border border-white/5 shadow-2xl group cursor-pointer" onClick={() => safeStudySets[0] && onSelectSet(safeStudySets[0])}>
              {/* Abstract Background */}
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

              {safeStudySets.length > 0 && (
                   <div className="absolute bottom-10 right-10">
                       <button className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-brand-accent hover:text-black hover:border-brand-accent transition-all shadow-[0_0_30px_rgba(0,0,0,0.3)]">
                           <ArrowRight className="w-6 h-6" />
                       </button>
                   </div>
              )}
          </div>

          {/* Stats / Widgets */}
          <div className="space-y-6">
              {/* User Stat Card */}
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
      
      {/* Binders Section */}
      {binders.length > 0 && (
          <div>
              <div className="px-4 py-1 mb-4 bg-white/10 rounded-full w-fit text-xs font-bold uppercase tracking-widest">Binders</div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4">
                  {binders.map(binder => (
                      <button
                          key={binder.id}
                          onClick={() => setActiveBinderId(activeBinderId === binder.id ? null : binder.id)}
                          className={`min-w-[150px] p-4 rounded-2xl border transition-all flex flex-col gap-2 items-start
                              ${activeBinderId === binder.id 
                                  ? 'bg-brand-accent text-black border-brand-accent shadow-lg scale-105' 
                                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30 text-gray-300'}`}
                      >
                          {activeBinderId === binder.id ? <FolderOpen className="w-6 h-6"/> : <Folder className="w-6 h-6"/>}
                          <span className="font-bold text-sm truncate w-full text-left">{binder.title}</span>
                          <span className="text-[10px] opacity-70 font-mono">Collection</span>
                      </button>
                  ))}
              </div>
          </div>
      )}
      
      {/* Tags Filter */}
      {allTags.length > 0 && (
          <div>
               <div className="px-4 py-1 mb-4 bg-white/10 rounded-full w-fit text-xs font-bold uppercase tracking-widest">Filter by Tag</div>
               <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                   <button 
                       onClick={() => setSelectedTag(null)}
                       className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border
                           ${!selectedTag 
                               ? 'bg-white text-black border-white' 
                               : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                   >
                       All
                   </button>
                   {allTags.map(tag => (
                       <button
                           key={tag}
                           onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                           className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border whitespace-nowrap
                               ${selectedTag === tag
                                   ? 'bg-brand-accent text-black border-brand-accent'
                                   : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                       >
                           {tag}
                       </button>
                   ))}
               </div>
          </div>
      )}

      {/* Library Section */}
      <div>
          <div className="flex items-center justify-between mb-6 px-4">
               <div className="flex items-center gap-2">
                   <div className="px-4 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-widest">
                       {activeBinderId ? `Binder: ${activeBinder?.title}` : 'Recent Library'}
                   </div>
                   {(activeBinderId || selectedTag || searchTerm) && (
                       <button 
                         onClick={() => { setActiveBinderId(null); setSelectedTag(null); setSearchTerm(''); }} 
                         className="p-1 rounded-full hover:bg-white/20 text-gray-400 hover:text-white"
                         title="Clear Filters"
                       >
                           <X className="w-4 h-4" />
                       </button>
                   )}
               </div>
               <button onClick={() => onNavigate('create')} className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-brand-accent hover:text-black transition-colors">
                   <Plus className="w-5 h-5" />
               </button>
          </div>

          {filteredSets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredSets.map(set => (
                      <div key={set.id} className="glass-panel rounded-[2.5rem] p-8 relative overflow-hidden group hover:border-brand-accent/30 transition-colors animate-in fade-in">
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
                              {/* Library Indicator for Podcast */}
                              {set.podcastScript && (
                                 <div className="w-8 h-8 rounded-full bg-brand-secondary/20 flex items-center justify-center text-brand-secondary border border-brand-secondary/30" title="Podcast Available">
                                    <Mic2 className="w-4 h-4" />
                                 </div>
                              )}
                          </div>
                          
                          <h3 className="text-3xl font-display font-bold text-white mb-2 mt-2 truncate">{set.title}</h3>
                          <p className="text-xs text-gray-400 mb-8 line-clamp-2 font-mono">{set.description}</p>
                          
                          {/* Widget Buttons */}
                          <div className="flex gap-4 relative z-10">
                              <button 
                                onClick={() => onSelectSet(set, StudyMode.NOTES)}
                                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider hover:bg-brand-accent hover:text-black transition-colors"
                              >
                                  Notes
                              </button>
                              <button 
                                onClick={() => onSelectSet(set, StudyMode.PODCAST)}
                                className="w-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-brand-secondary hover:text-white transition-colors"
                                title="Open Podcast"
                              >
                                  <Mic2 className="w-5 h-5" />
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          ) : (
              <div className="text-center py-20 opacity-50">
                  <p>No study sets found matching your filters.</p>
              </div>
          )}
      </div>
      
      {/* Heatmap Footer */}
      <div className="glass-panel rounded-[2rem] p-8 flex flex-col items-center">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-gray-500 mb-4">Study Consistency</div>
          <div className="flex gap-2 flex-wrap justify-center">
              {heatmapData.map((active, i) => (
                  <div key={i} className={`w-8 h-8 rounded-lg transition-colors ${active ? 'bg-brand-accent shadow-[0_0_10px_rgba(var(--color-accent),0.5)]' : 'bg-white/5'}`}></div>
              ))}
          </div>
      </div>

    </div>
  );
};
