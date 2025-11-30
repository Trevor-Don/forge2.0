import React, { useState, useEffect } from 'react';
import { LogOut, User as UserIcon, Home, PlusCircle, Users, MessageSquare, Menu, X, Library } from 'lucide-react';
import { ThemeId, Theme } from '../../types';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
  activeTab: string;
  onNavigate: (tab: string) => void;
  currentTheme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
}

const THEMES: Record<ThemeId, Theme> = {
  galactic: {
    id: 'galactic',
    name: 'Galactic Teal',
    colors: {
      bg: '4 28 35',
      card: '9 58 66',
      accent: '20 184 166',
      secondary: '255 255 255'
    }
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean Deep',
    colors: {
      bg: '15 23 42',
      card: '30 41 59',
      accent: '56 189 248',
      secondary: '14 165 233'
    }
  },
  forest: {
    id: 'forest',
    name: 'Forest Canopy',
    colors: {
      bg: '5 46 22',
      card: '20 83 45',
      accent: '74 222 128',
      secondary: '34 197 94'
    }
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Glow',
    colors: {
      bg: '69 10 10',
      card: '127 29 29',
      accent: '251 146 60',
      secondary: '248 113 113'
    }
  }
};

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  onLogout, 
  activeTab, 
  onNavigate,
  currentTheme,
  onThemeChange
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const theme = THEMES[currentTheme] || THEMES['galactic'];
    const root = document.documentElement;
    root.style.setProperty('--color-bg', theme.colors.bg);
    root.style.setProperty('--color-card', theme.colors.card);
    root.style.setProperty('--color-accent', theme.colors.accent);
    root.style.setProperty('--color-secondary', theme.colors.secondary);
  }, [currentTheme]);

  return (
    <div className="min-h-screen relative text-white selection:bg-brand-accent selection:text-black transition-colors duration-500 font-sans bg-[rgb(var(--color-bg))] flex flex-col overflow-hidden">
      
      {/* Background Elements */}
      <div className="bg-grid fixed inset-0 z-0 opacity-30 pointer-events-none"></div>
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-brand-accent/20 rounded-full blur-[120px] animate-pulse-slow pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-brand-secondary/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col h-screen">
        
        {/* Desktop Header - Galactic Pills */}
        <header className="hidden md:flex items-center justify-between px-8 py-6">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => onNavigate('dashboard')}>
             <div className="w-10 h-10 bg-gradient-to-br from-brand-accent to-brand-secondary rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(var(--color-accent),0.4)]">
                <span className="font-display font-bold text-xl text-black">F</span>
             </div>
             <span className="font-display font-bold text-2xl tracking-widest text-white">FORGE AI</span>
          </div>

          <nav className="glass-panel rounded-full px-2 py-1 flex items-center gap-1">
             <NavPill icon={<Home className="w-4 h-4"/>} label="Home" active={activeTab === 'dashboard'} onClick={() => onNavigate('dashboard')} />
             <NavPill icon={<Library className="w-4 h-4"/>} label="Library" active={activeTab === 'library'} onClick={() => onNavigate('library')} />
             <NavPill icon={<PlusCircle className="w-4 h-4"/>} label="Create" active={activeTab === 'create'} onClick={() => onNavigate('create')} />
             <NavPill icon={<Users className="w-4 h-4"/>} label="Groups" active={activeTab === 'groups'} onClick={() => onNavigate('groups')} />
             <NavPill icon={<MessageSquare className="w-4 h-4"/>} label="Chat" active={activeTab === 'chatbot'} onClick={() => onNavigate('chatbot')} />
             <NavPill icon={<UserIcon className="w-4 h-4"/>} label="Profile" active={activeTab === 'account'} onClick={() => onNavigate('account')} />
          </nav>

          <div className="flex items-center gap-4">
             <button onClick={onLogout} className="p-3 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-all" title="Logout">
                <LogOut className="w-5 h-5" />
             </button>
          </div>
        </header>
        
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-6 relative z-50">
             <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-brand-accent rounded-lg flex items-center justify-center">
                    <span className="font-bold text-black">F</span>
                 </div>
                 <span className="font-display font-bold text-xl tracking-widest">FORGE</span>
             </div>
             <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
             >
                {isMenuOpen ? <X className="w-6 h-6 text-brand-accent" /> : <Menu className="w-6 h-6" />}
             </button>
        </header>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl pt-24 px-6 flex flex-col gap-4 md:hidden animate-in slide-in-from-top-10 fade-in duration-300">
              <div className="flex flex-col gap-2">
                <MobileMenuLink icon={<Home/>} label="Home" active={activeTab === 'dashboard'} onClick={() => { onNavigate('dashboard'); setIsMenuOpen(false); }} />
                <MobileMenuLink icon={<Library/>} label="Library" active={activeTab === 'library'} onClick={() => { onNavigate('library'); setIsMenuOpen(false); }} />
                <MobileMenuLink icon={<PlusCircle/>} label="Create New" active={activeTab === 'create'} onClick={() => { onNavigate('create'); setIsMenuOpen(false); }} />
                <MobileMenuLink icon={<Users/>} label="Groups" active={activeTab === 'groups'} onClick={() => { onNavigate('groups'); setIsMenuOpen(false); }} />
                <MobileMenuLink icon={<MessageSquare/>} label="AI Chat" active={activeTab === 'chatbot'} onClick={() => { onNavigate('chatbot'); setIsMenuOpen(false); }} />
                <MobileMenuLink icon={<UserIcon/>} label="Profile" active={activeTab === 'account'} onClick={() => { onNavigate('account'); setIsMenuOpen(false); }} />
              </div>

              <div className="h-px bg-white/10 my-4"></div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                  {Object.values(THEMES).map(t => (
                    <button
                      key={t.id}
                      onClick={() => onThemeChange(t.id)}
                      className={`w-10 h-10 rounded-full shrink-0 transition-transform ${currentTheme === t.id ? 'ring-2 ring-white scale-110' : 'opacity-50'}`}
                      style={{ backgroundColor: `rgb(${t.colors.accent})` }}
                      title={t.name}
                    />
                  ))}
              </div>
              
              <button onClick={onLogout} className="flex items-center gap-4 text-red-400 font-bold uppercase tracking-wider p-4 rounded-xl hover:bg-white/5 mt-auto mb-8">
                  <LogOut className="w-6 h-6" /> Sign Out
              </button>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-10 px-4 md:px-8 custom-scrollbar relative z-0">
          {children}
        </main>

        {/* Theme Switcher (Desktop Only) */}
        {activeTab === 'account' && (
          <div className="hidden md:flex fixed bottom-8 right-8 z-50 glass-panel p-2 rounded-full gap-2">
             {Object.values(THEMES).map(t => (
                <button
                  key={t.id}
                  onClick={() => onThemeChange(t.id)}
                  className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${currentTheme === t.id ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-100'}`}
                  style={{ backgroundColor: `rgb(${t.colors.accent})` }}
                  title={t.name}
                />
             ))}
          </div>
        )}
      </div>
    </div>
  );
};

const NavPill = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 font-bold text-sm tracking-wide
      ${active 
        ? 'bg-brand-accent text-black shadow-[0_0_20px_rgba(var(--color-accent),0.3)]' 
        : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const MobileMenuLink = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 w-full
      ${active 
        ? 'bg-brand-accent text-black shadow-lg' 
        : 'text-gray-300 hover:bg-white/5'}`}
  >
    {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: "w-6 h-6" }) : icon}
    <span className="font-display font-bold text-xl tracking-wide">{label}</span>
  </button>
);