import { useState } from 'react';
import { supabase } from '../db/supabase';
import { I } from '../components/icons';

type Mode = 'login' | 'signup' | 'forgot';

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ text: 'Check your email to confirm your account.', ok: true });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setMessage({ text: 'Password reset link sent — check your email.', ok: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setMessage({ text: msg, ok: false });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper dark:bg-night px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl inline-flex items-center justify-center shadow-glow mb-4"
            style={{ background: 'linear-gradient(135deg, oklch(65% 0.22 290), oklch(52% 0.24 290))' }}
          >
            <span className="font-extrabold text-base tracking-tighter text-white">DSA</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">DSA Coach</h1>
          <p className="text-sm text-ink3 dark:text-mist2 mt-1 font-medium">
            {mode === 'login' ? 'Sign in to continue your streak' :
             mode === 'signup' ? 'Create your free account' :
             'Reset your password'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[oklch(94%_0.003_280)] dark:bg-night2 border border-hairline dark:border-night4 rounded-2xl shadow-card dark:shadow-card-dark p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink2 dark:text-mist">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                className="h-10 px-3 rounded-xl bg-paper dark:bg-night3 border border-hairline dark:border-night4 outline-none focus:ring-2 focus:ring-accent/25 text-sm font-medium transition-all"
              />
            </div>

            {mode !== 'forgot' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-ink2 dark:text-mist">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Min 6 characters' : '••••••••'}
                  required
                  minLength={6}
                  className="h-10 px-3 rounded-xl bg-paper dark:bg-night3 border border-hairline dark:border-night4 outline-none focus:ring-2 focus:ring-accent/25 text-sm font-medium transition-all"
                />
              </div>
            )}

            {message && (
              <div
                className={`text-xs px-3 py-2.5 rounded-xl font-medium ${
                  message.ok
                    ? 'bg-[oklch(92%_0.05_150)] text-[oklch(32%_0.14_150)] dark:bg-[oklch(26%_0.07_150)] dark:text-[oklch(78%_0.12_150)]'
                    : 'bg-[oklch(93%_0.035_20)] text-[oklch(32%_0.13_20)] dark:bg-[oklch(26%_0.05_20)] dark:text-[oklch(78%_0.1_20)]'
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="press cursor-pointer h-10 rounded-xl bg-accent text-white text-sm font-semibold hover:brightness-110 active:brightness-95 shadow-glow-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <I.Loader size={14} className="animate-spin" />
                  {mode === 'login' ? 'Signing in…' : mode === 'signup' ? 'Creating account…' : 'Sending…'}
                </>
              ) : (
                mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'
              )}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-hairline dark:border-night4 flex flex-col gap-2 text-center text-xs text-ink3 dark:text-mist2 font-medium">
            {mode === 'login' && (
              <>
                <button onClick={() => { setMode('signup'); setMessage(null); }} className="cursor-pointer hover:text-accent transition-colors">
                  No account? <span className="font-bold text-ink dark:text-paper">Sign up free</span>
                </button>
                <button onClick={() => { setMode('forgot'); setMessage(null); }} className="cursor-pointer hover:text-accent transition-colors">
                  Forgot password?
                </button>
              </>
            )}
            {mode !== 'login' && (
              <button onClick={() => { setMode('login'); setMessage(null); }} className="cursor-pointer hover:text-accent transition-colors">
                Back to <span className="font-bold text-ink dark:text-paper">sign in</span>
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-ink3 dark:text-mist2 mt-6 font-medium">
          Your progress syncs across all your devices.
        </p>
      </div>
    </div>
  );
}
