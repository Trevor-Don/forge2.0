import React, { useState } from 'react';
import { BrainCircuit, ArrowRight, Loader2, Mail, Lock, User, AlertCircle, Command } from 'lucide-react';
import { StorageService } from '../services/storageService';

export const Auth: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        const { user, error } = await StorageService.login(email, password);
        if (error) setError(error);
        else onLogin();
      } else {
        if (!name) {
           setError("Name is required");
           setIsLoading(false);
           return;
        }
        const { user, error } = await StorageService.signup(email, password, name);
        if (error) setError(error);
        else onLogin();
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[rgb(var(--color-bg))] font-sans text-white overflow-hidden relative">
      
      {/* Left Side - Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center bg-black/20 p-12">
         <div className="absolute inset-0 bg-grid opacity-20"></div>
         <div className="absolute top-[-20%] left-[-20%] w-[800px] h-[800px] bg-brand-accent/10 rounded-full blur-[150px]"></div>
         
         <div className="relative z-10 glass-panel p-12 rounded-[3rem] border border-white/10 max-w-lg w-full shadow-[0_0_100px_rgba(var(--color-accent),0.1)]">
             <div className="w-20 h-20 bg-brand-accent rounded-2xl flex items-center justify-center mb-8 shadow-2xl transform rotate-3">
                 <BrainCircuit className="w-10 h-10 text-black" />
             </div>
             <h1 className="text-6xl font-display font-bold leading-none mb-6">FORGE <br/><span className="text-brand-accent text-glow">INTELLIGENCE</span></h1>
             <p className="text-gray-400 text-lg leading-relaxed">
                 Transform your study materials into interactive knowledge graphs, flashcards, and podcasts using advanced Gemini AI.
             </p>
             
             <div className="mt-12 grid grid-cols-2 gap-4">
                 <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                     <div className="text-2xl font-bold text-white mb-1">2.5 Flash</div>
                     <div className="text-xs text-gray-500 uppercase tracking-wider">Fast Analysis</div>
                 </div>
                 <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                     <div className="text-2xl font-bold text-white mb-1">Imagen 4</div>
                     <div className="text-xs text-gray-500 uppercase tracking-wider">Visual Context</div>
                 </div>
             </div>
         </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
         <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-brand-secondary/10 rounded-full blur-[150px]"></div>

         <div className="w-full max-w-md relative z-10">
            <div className="flex justify-center lg:hidden mb-8">
                <div className="flex items-center gap-2 text-brand-accent font-display font-bold text-3xl">
                    <BrainCircuit className="w-8 h-8" />
                    <span>FORGE AI</span>
                </div>
            </div>

            <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">{isLogin ? 'Welcome back' : 'Create account'}</h2>
                <p className="text-gray-400">Enter your credentials to access your workspace.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                    <div className="group">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-brand-accent transition-colors" />
                            <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-accent focus:bg-white/10 transition-all"
                                placeholder="John Doe"
                            />
                        </div>
                    </div>
                )}

                <div className="group">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-brand-accent transition-colors" />
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-accent focus:bg-white/10 transition-all"
                            placeholder="name@example.com"
                        />
                    </div>
                </div>

                <div className="group">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-brand-accent transition-colors" />
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-accent focus:bg-white/10 transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs animate-pulse">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-brand-accent text-black rounded-xl font-bold text-sm uppercase tracking-wider hover:shadow-[0_0_20px_rgba(var(--color-accent),0.4)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Sign Up')}
                    {!isLoading && <ArrowRight className="w-5 h-5" />}
                </button>
            </form>

            <div className="mt-8 text-center">
                <p className="text-sm text-gray-400">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button 
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        className="text-brand-accent font-bold hover:underline"
                    >
                        {isLogin ? 'Create one' : 'Sign in'}
                    </button>
                </p>
            </div>
         </div>
      </div>
    </div>
  );
};