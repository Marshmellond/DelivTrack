'use client';

import { Suspense, useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '../lib/api';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `登录失败 (${res.status})`);
      }

      const data = await res.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user || { username }));
      router.push(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-slide-up">
      {/* Gradient border card */}
      <div className="relative rounded-2xl p-[1px] bg-gradient-to-b from-cyan-500/30 via-emerald-500/20 to-transparent">
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl p-8">
          {/* Gradient accent bar */}
          <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white font-bold text-xl shadow-[0_0_30px_rgba(6,182,212,0.3)] mb-4">
              D
            </div>
            <h1 className="text-2xl font-bold gradient-text">DelivTrack</h1>
            <p className="text-gray-500 text-sm mt-1">外卖配送监控平台</p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm flex items-center gap-2">
              <span>❌</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">用户名</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm">👤</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-200"
                  placeholder="请输入用户名"
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">密码</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm">🔒</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-200"
                  placeholder="请输入密码"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/15 border border-cyan-500/25 text-cyan-400 font-medium hover:from-cyan-500/30 hover:to-emerald-500/20 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  登录中...
                </>
              ) : (
                '登 录'
              )}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            还没有账号？{' '}
            <Link href="/register" className="text-cyan-400 hover:text-cyan-300 transition-colors hover:underline">
              立即注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0a0e27] bg-mesh-animated flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">加载中...</p>
            </div>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
