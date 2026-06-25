'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '../components/AuthGuard';
import { apiFetch } from '../lib/api';

function decodeJwt(token: string): { sub?: string; role?: string; user_id?: number } | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch {
    return null;
  }
}

interface UserProfile {
  id: number;
  username: string;
  role: string;
  create_time?: string;
}

function ProfileContent() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editUsername, setEditUsername] = useState('');
  const [editOldPassword, setEditOldPassword] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const jwt = decodeJwt(token);
      const userId = jwt?.user_id;
      if (!userId) {
        setError('无法解析用户信息，请重新登录');
        setLoading(false);
        return;
      }

      const res = await apiFetch(`/api/users/${userId}`);
      if (res.ok) {
        const data: UserProfile = await res.json();
        setProfile(data);
        setEditUsername(data.username);
      } else if (res.status === 404) {
        setError('用户信息未找到');
      } else {
        setError('获取用户信息失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!editUsername.trim()) {
      setError('用户名不能为空');
      return;
    }
    if (editUsername.trim().length < 2) {
      setError('用户名至少需要 2 个字符');
      return;
    }

    if (!profile) return;
    const currentUser = profile;

    // Password validation
    let passwordPayload: string | undefined;
    if (showPasswordFields) {
      if (!editOldPassword) {
        setError('请输入当前密码');
        return;
      }
      if (!editPassword && !editConfirmPassword) {
        passwordPayload = undefined;
      } else if (editPassword.length < 6) {
        setError('新密码至少需要 6 个字符');
        return;
      } else if (editPassword !== editConfirmPassword) {
        setError('两次输入的新密码不一致');
        return;
      } else {
        // Verify old password by calling login API
        const verifyRes = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username: currentUser.username, password: editOldPassword }),
        });
        if (!verifyRes.ok) {
          setError('当前密码错误');
          return;
        }
        passwordPayload = editPassword;
      }
    }

    setSaving(true);
    try {
      const body: Record<string, string> = { username: editUsername.trim() };
      if (passwordPayload) {
        body.password = passwordPayload;
      }

      const res = await apiFetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || '保存失败');
      }

      setSuccess('个人信息已更新');
      setEditPassword('');
      setEditConfirmPassword('');
      setShowPasswordFields(false);

      // Update localStorage user
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          user.username = editUsername.trim();
          localStorage.setItem('user', JSON.stringify(user));
        } catch { /* ignore */ }
      }

      fetchProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const roleLabels: Record<string, string> = {
    admin: '管理员',
    editor: '编辑者',
    viewer: '观察者',
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-7 w-40 rounded-lg skeleton-shimmer" />
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-6">
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 rounded-xl skeleton-shimmer" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 animate-slide-up">
      <div className="flex items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-bold gradient-text">个人中心</h1>
        <span className="text-xs text-gray-500 hidden sm:block">|</span>
        <span className="text-sm text-gray-400 hidden sm:block">个人信息管理</span>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm flex items-center gap-2">
          <span>❌</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm flex items-center gap-2">
          <span>✅</span>
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile card */}
        <div className="lg:col-span-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white text-2xl font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              {profile?.username?.slice(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="text-center">
              <p className="text-white text-lg font-bold">{profile?.username}</p>
              <span className={`inline-block px-3 py-1 rounded-full text-xs border mt-1.5 ${
                profile?.role === 'admin'
                  ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25'
                  : profile?.role === 'editor'
                  ? 'bg-purple-500/15 text-purple-400 border-purple-500/25'
                  : 'bg-gray-500/15 text-gray-400 border-gray-500/25'
              }`}>
                {roleLabels[profile?.role || ''] || profile?.role || '用户'}
              </span>
            </div>
            <div className="w-full border-t border-white/[0.06] pt-3 mt-1 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">用户 ID</span>
                <span className="text-gray-300 font-mono">{profile?.id}</span>
              </div>
              {profile?.create_time && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">注册时间</span>
                  <span className="text-gray-300">{new Date(profile.create_time).toLocaleDateString('zh-CN')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit form */}
        <div className="lg:col-span-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <h3 className="text-sm font-medium text-white mb-5">编辑个人信息</h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">用户名</label>
              <input
                type="text"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
              />
            </div>

            {/* Password change toggle */}
            <div>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordFields(!showPasswordFields);
                  if (showPasswordFields) {
                    setEditOldPassword('');
                    setEditPassword('');
                    setEditConfirmPassword('');
                  }
                }}
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                {showPasswordFields ? '− 取消修改密码' : '+ 修改密码'}
              </button>
            </div>

            {showPasswordFields && (
              <>
                <div>
                  <label className="block text-gray-400 text-sm mb-1.5">当前密码</label>
                  <input
                    type="password"
                    value={editOldPassword}
                    onChange={(e) => setEditOldPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
                    placeholder="请输入当前密码"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1.5">新密码</label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
                    placeholder="至少 6 位，留空则不修改"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1.5">确认新密码</label>
                  <input
                    type="password"
                    value={editConfirmPassword}
                    onChange={(e) => setEditConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
                    placeholder="请再次输入新密码"
                  />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving || (showPasswordFields && (!editOldPassword || !editPassword || editPassword.length < 6 || editPassword !== editConfirmPassword))}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/15 border border-cyan-500/25 text-cyan-400 text-sm hover:from-cyan-500/30 hover:to-emerald-500/20 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all duration-200 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存修改'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return <AuthGuard><ProfileContent /></AuthGuard>;
}
