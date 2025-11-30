import React, { useState, useEffect } from 'react';
import { StorageService } from './services/storageService';
import { User, StudySet, Group, ThemeId, StudyMode } from './types';
import { Layout } from './components/ui/Layout';
import { Dashboard } from './components/Dashboard';
import { CreateStudySet } from './components/CreateStudySet';
import { StudyView } from './components/StudyView';
import { AccountProfile } from './components/AccountProfile';
import { Auth } from './components/Auth';
import { ChatBot } from './components/ChatBot';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedSet, setSelectedSet] = useState<StudySet | null>(null);
  const [initialStudyMode, setInitialStudyMode] = useState<StudyMode>(StudyMode.NOTES);
  
  // Data State
  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  
  const [currentTheme, setCurrentTheme] = useState<ThemeId>('galactic');

  // Initial Session Check
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    setIsLoading(true);
    const currentUser = await StorageService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      if (currentUser.preferredTheme) {
        setCurrentTheme(currentUser.preferredTheme as ThemeId);
      }
      await loadData();
    }
    setIsLoading(false);
  };

  const loadData = async () => {
    const sets = await StorageService.getStudySets();
    setStudySets(sets);
    const gs = await StorageService.getGroups();
    setGroups(gs);
  };

  const handleLoginSuccess = async () => {
    await checkSession();
  };

  const handleLogout = async () => {
    await StorageService.logout();
    setUser(null);
    setSelectedSet(null);
    setStudySets([]);
    setGroups([]);
    setActiveTab('dashboard');
  };

  const handleUpdateXP = async (amount: number) => {
    const updatedUser = await StorageService.updateUserXP(amount);
    if (updatedUser) setUser({ ...updatedUser });
  };

  const handleCreateGroup = async () => {
    if (!user) return;
    const name = prompt("Enter Group Name:");
    if (name) {
      const newGroup = await StorageService.createGroup(name, user.id);
      if (newGroup) {
        await loadData(); // Refresh lists
      }
    }
  };

  const handleThemeChange = async (theme: ThemeId) => {
    setCurrentTheme(theme);
    if (user) {
      const updated = await StorageService.updateUserTheme(theme);
      if (updated) setUser(updated);
    }
  };

  const handleSelectSet = (set: StudySet, mode: StudyMode = StudyMode.NOTES) => {
      setInitialStudyMode(mode);
      setSelectedSet(set);
  };

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    setSelectedSet(null);
  };

  if (isLoading) {
    return (
        <div className="min-h-screen bg-[#041C23] flex flex-col items-center justify-center text-white">
            <Loader2 className="w-12 h-12 animate-spin text-[#14b8a6] mb-4" />
            <p className="text-sm font-display tracking-widest">LOADING FORGE AI...</p>
        </div>
    );
  }

  if (!user) {
    return <Auth onLogin={handleLoginSuccess} />;
  }

  return (
    <Layout 
      onLogout={handleLogout} 
      activeTab={selectedSet ? '' : activeTab} 
      onNavigate={handleNavigate}
      currentTheme={currentTheme}
      onThemeChange={handleThemeChange}
    >
      {selectedSet ? (
        <StudyView 
          set={selectedSet}
          initialMode={initialStudyMode} 
          onBack={() => { setSelectedSet(null); loadData(); }} // Refresh data on back to capture edits
          onUpdateXP={handleUpdateXP}
        />
      ) : (
        <>
          {(activeTab === 'dashboard' || activeTab === 'library') && (
            <Dashboard 
              user={user}
              studySets={studySets}
              groups={groups}
              onSelectSet={handleSelectSet}
              onCreateGroup={handleCreateGroup}
              onNavigate={handleNavigate}
              initialView={activeTab === 'library' ? 'library' : 'home'}
            />
          )}
          
          {activeTab === 'create' && (
            <CreateStudySet 
              user={user}
              onCreated={(set) => {
                loadData(); // Refresh list
                handleSelectSet(set);
              }}
            />
          )}

          {activeTab === 'chatbot' && (
            <div className="h-[calc(100vh-140px)] pb-4">
                <ChatBot 
                    summary="Global AI Tutor Mode. I am here to help with any general questions or topics you'd like to discuss."
                    onUpdateSummary={() => {}} // No update action in global mode
                    variant="full"
                />
            </div>
          )}

          {activeTab === 'account' && (
            <AccountProfile 
               user={user}
               onUpdateUser={async (updatedUser) => {
                   await StorageService.saveUser(updatedUser);
                   setUser(updatedUser);
               }}
               onLogout={handleLogout}
               currentTheme={currentTheme}
               onThemeChange={handleThemeChange}
            />
          )}

          {activeTab === 'groups' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-display font-bold text-white">Study Groups</h2>
                <button 
                  onClick={handleCreateGroup}
                  className="px-6 py-3 bg-brand-accent rounded-full text-xs font-bold uppercase tracking-wider hover:bg-brand-accent/80 text-brand-card shadow-lg"
                >
                  Create New Group
                </button>
              </div>
              
              <div className="grid gap-4">
                {groups.map(g => (
                  <div key={g.id} className="p-6 rounded-2xl bg-brand-card border border-white/5 backdrop-blur flex justify-between items-center hover:border-brand-accent/30 transition-colors">
                    <div>
                      <h3 className="font-bold text-lg text-white font-display tracking-wide">{g.name}</h3>
                      <p className="text-sm text-gray-400">{g.members.length} members</p>
                      <p className="text-xs text-gray-500 mt-1 font-mono select-all">Invite: {g.inviteCode}</p>
                    </div>
                    {!g.members.includes(user.id) ? (
                      <button 
                        onClick={async () => {
                          await StorageService.joinGroup(g.inviteCode, user.id);
                          loadData();
                        }}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold"
                      >
                        Join
                      </button>
                    ) : (
                       <span className="text-brand-accent text-xs font-bold px-3 py-1 bg-brand-accent/10 rounded-full border border-brand-accent/20">MEMBER</span>
                    )}
                  </div>
                ))}
                {groups.length === 0 && (
                   <div className="p-10 rounded-2xl border border-white/5 border-dashed text-center">
                      <p className="text-gray-500 italic">No groups found. Create one to get started!</p>
                      <div className="mt-4 max-w-xs mx-auto flex gap-2">
                         <input id="joinCode" type="text" placeholder="Enter Code" className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm w-full text-white" />
                         <button 
                            onClick={async () => {
                                const code = (document.getElementById('joinCode') as HTMLInputElement).value;
                                if(code) {
                                    const success = await StorageService.joinGroup(code, user.id);
                                    if(success) loadData();
                                    else alert('Invalid code');
                                }
                            }}
                            className="bg-white/10 hover:bg-white/20 px-4 rounded-lg text-sm font-bold"
                         >
                             Join
                         </button>
                      </div>
                   </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

export default App;