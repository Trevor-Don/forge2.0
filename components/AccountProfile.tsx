import React, { useState } from 'react';
import { User, ThemeId, Theme } from '../types';
import { User as UserIcon, Mail, Trophy, Flame, Star, Save, LogOut, Palette, Shield, Cloud, CheckCircle, Loader2, BookOpen, Layers, Activity } from 'lucide-react';

interface AccountProfileProps {
  user: User;
  onUpdateUser: (user: User) => void;
  onLogout: () => void;
  currentTheme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
}

const THEMES: { id: ThemeId; name: string; color: string }[] = [
  { id: 'galactic', name: 'Galactic Teal', color: '#14b8a6' },
  { id: 'ocean', name: 'Ocean Deep', color: '#9966f1' },
  { id: 'forest', name: 'Forest Canopy', color: '#34c55e' },
  { id: 'sunset', name: 'Sunset Glow', color: '#f43f5e' }
];

export const AccountProfile: React.FC<AccountProfileProps> = ({ 
  user, 
  onUpdateUser, 
  onLogout,
  currentTheme,
  onThemeChange
}) => {
  const [name, setName] = useState(user.name);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onUpdateUser({ ...user, name });
    setIsEditing(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center mb-8">
         <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-brand-card border-2 border-brand-accent mb-6 shadow-[0_0_40px_rgba(var(--color-accent),0.3)]">
             <UserIcon className="w-12 h-12 text-brand-accent" />
         </div>
         <h1 className="text-4xl font-display font-bold text-white tracking-wide mb-1">{user.name}</h1>
         <p className="text-gray-400 font-mono text-sm">{user.email}</p>
      </div>

      {/* Stats Grid - Productivity Focused (No Levels) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-3xl flex items-center gap-5 group hover:border-brand-accent/40 transition-colors">
              <div className="p-4 rounded-2xl bg-brand-accent/20 text-brand-accent group-hover:scale-110 transition-transform">
                  <BookOpen className="w-6 h-6" />
              </div>
              <div>
                  <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Study Sets</div>
                  <div className="text-3xl font-display font-bold text-white">{user.xp > 0 ? Math.floor(user.xp / 50) : 0}</div>
              </div>
          </div>
          
          <div className="glass-panel p-6 rounded-3xl flex items-center gap-5 group hover:border-orange-400/40 transition-colors">
              <div className="p-4 rounded-2xl bg-orange-500/20 text-orange-400 group-hover:scale-110 transition-transform">
                  <Activity className="w-6 h-6" />
              </div>
              <div>
                  <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Consistency</div>
                  <div className="text-3xl font-display font-bold text-white">{user.streak} Days</div>
              </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl flex items-center gap-5 group hover:border-purple-400/40 transition-colors">
              <div className="p-4 rounded-2xl bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                  <Layers className="w-6 h-6" />
              </div>
              <div>
                  <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Cards Reviewed</div>
                  <div className="text-3xl font-display font-bold text-white">{user.xp}</div>
              </div>
          </div>
      </div>

      {/* Settings Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Personal Info */}
          <div className="space-y-8">
              {/* Profile Edit */}
              <div className="glass-panel rounded-[2rem] p-8 h-full">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                      <Shield className="w-5 h-5 text-brand-accent" />
                      <h2 className="text-xl font-display font-bold text-white tracking-wide">PROFILE SETTINGS</h2>
                  </div>

                  <div className="space-y-5">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Display Name</label>
                          <div className="flex gap-2">
                              <input 
                                  type="text" 
                                  value={name}
                                  onChange={(e) => setName(e.target.value)}
                                  disabled={!isEditing}
                                  className="flex-1 bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:border-brand-accent outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                              />
                              {isEditing ? (
                                  <button onClick={handleSave} className="p-4 bg-brand-accent rounded-xl text-black hover:bg-brand-accent/80 transition-colors">
                                      <Save className="w-5 h-5" />
                                  </button>
                              ) : (
                                  <button onClick={() => setIsEditing(true)} className="p-4 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors">
                                      <Palette className="w-5 h-5" />
                                  </button>
                              )}
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
                          <div className="flex items-center gap-3 bg-black/20 border border-white/10 rounded-xl p-4 text-gray-400 cursor-not-allowed opacity-70">
                              <Mail className="w-5 h-5" />
                              <span className="font-mono text-sm">{user.email}</span>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          {/* Appearance */}
          <div className="h-full">
              <div className="glass-panel rounded-[2rem] p-8 h-full">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                      <Palette className="w-5 h-5 text-brand-secondary" />
                      <h2 className="text-xl font-display font-bold text-white tracking-wide">VISUAL THEME</h2>
                  </div>

                  <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {THEMES.map(theme => (
                              <button
                                  key={theme.id}
                                  onClick={() => onThemeChange(theme.id)}
                                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 group relative overflow-hidden
                                      ${currentTheme === theme.id 
                                          ? 'border-brand-accent bg-brand-accent/10 shadow-[0_0_20px_rgba(var(--color-accent),0.2)]' 
                                          : 'border-white/5 bg-black/20 hover:border-white/20'}`}
                              >
                                  <div className={`w-8 h-8 rounded-full shadow-lg flex-shrink-0 ${currentTheme === theme.id ? 'scale-110' : ''} transition-transform`} style={{ backgroundColor: theme.color }}></div>
                                  <span className={`text-sm font-bold uppercase tracking-wide ${currentTheme === theme.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                                      {theme.name}
                                  </span>
                                  {currentTheme === theme.id && (
                                      <div className="absolute top-0 right-0 p-1.5 bg-brand-accent text-black rounded-bl-xl">
                                          <CheckCircle className="w-3 h-3" />
                                      </div>
                                  )}
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
          </div>

      </div>

      {/* Danger / Logout */}
      <div className="flex justify-center pt-8 pb-8">
          <button 
              onClick={onLogout}
              className="flex items-center gap-2 px-10 py-4 rounded-full bg-red-500/5 text-red-400 font-bold uppercase text-xs tracking-widest border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 transition-all hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]"
          >
              <LogOut className="w-4 h-4" /> Sign Out
          </button>
      </div>
    </div>
  );
};