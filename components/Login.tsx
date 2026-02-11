
import React, { useState } from 'react';

interface LoginProps {
  onLogin: (success: boolean, remember: boolean) => void;
  onCancel: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onCancel }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Updated credentials for J-Bay Zebra Lodge Admin
    if (username === 'GreyFox66' && password === 'Divergent@66') {
      onLogin(true, rememberMe);
    } else {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-stone-50 animate-fade-in">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-stone-100 animate-scale-in">
        <div className="p-10 md:p-12">
          <div className="text-center mb-10">
            <h4 className="text-amber-700 font-bold uppercase tracking-[0.3em] text-[10px] mb-3">Secure Portal</h4>
            <h2 className="text-3xl font-serif font-bold text-stone-900 mb-2">Management Login</h2>
            <p className="text-stone-400 text-sm">Enter credentials to access Lodge analytics</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">Username</label>
              <input 
                required
                type="text" 
                className="w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 transition-colors text-lg font-serif"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">Password</label>
              <input 
                required
                type="password" 
                className="w-full border-b border-stone-200 py-3 outline-none focus:border-stone-900 transition-colors text-lg"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  id="remember" 
                  className="w-5 h-5 rounded border-stone-300 text-amber-700 focus:ring-amber-600 cursor-pointer transition-all"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                />
              </div>
              <label htmlFor="remember" className="text-xs font-bold text-stone-500 uppercase tracking-widest cursor-pointer select-none">
                Remember this session
              </label>
            </div>

            {error && (
              <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                Invalid credentials. Please try again.
              </p>
            )}

            <div className="pt-6 space-y-4">
              <button 
                type="submit"
                className="w-full bg-stone-900 text-white py-5 rounded-2xl font-bold hover:bg-black transition-all shadow-xl text-[10px] uppercase tracking-widest transform active:scale-95"
              >
                Sign In to Dashboard
              </button>
              <button 
                type="button"
                onClick={onCancel}
                className="w-full text-stone-400 py-2 font-bold hover:text-stone-900 transition-all text-[10px] uppercase tracking-widest"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
        <div className="bg-stone-50 p-6 text-center border-t border-stone-100">
           <p className="text-stone-400 text-[9px] uppercase tracking-widest font-medium">J-Bay Zebra Sanctuary Lodge & Bike Park</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
