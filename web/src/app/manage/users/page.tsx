'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { apiFetch } from '../../lib/api';
import AuthGuard from '../../components/AuthGuard';
import DataTable from '../../components/DataTable';
import { useToast } from '../../components/Toast';

interface User {
  id: number;
  username: string;
  role: string;
  create_time: string;
}

function UsersContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [currentUser, setCurrentUser] = useState<{ role?: string } | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('user');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const pageSize = 20;
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setCurrentUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('page_size', '1000');
      if (search) params.set('username', search);
      if (roleFilter) params.set('role', roleFilter);

      const res = await apiFetch(`/api/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.items || data);
        setTotal(data.total || (data.items || data).length);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Pagination
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return users.slice(start, start + pageSize);
  }, [users, page, pageSize]);

  // Summary stats
  const adminCount = useMemo(() => users.filter((u) => u.role === 'admin').length, [users]);
  const userCount = useMemo(() => users.filter((u) => u.role === 'user').length, [users]);

  // Open modal for add
  const openAdd = () => {
    setEditUser(null);
    setFormUsername('');
    setFormPassword('');
    setFormRole('user');
    setFormError('');
    setModalOpen(true);
  };

  // Open modal for edit
  const openEdit = (u: User) => {
    setEditUser(u);
    setFormUsername(u.username);
    setFormPassword('');
    setFormRole(u.role);
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setFormError('');
    setFormLoading(true);
    try {
      const body: Record<string, string> = { username: formUsername, role: formRole };
      if (formPassword) body.password = formPassword;

      const res = editUser
        ? await apiFetch(`/api/users/${editUser.id}`, { method: 'PUT', body: JSON.stringify(body) })
        : await apiFetch('/api/users', { method: 'POST', body: JSON.stringify({ ...body, password: formPassword || 'default123' }) });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || '保存失败');
      }
      setModalOpen(false);
      toast(editUser ? '用户信息已更新' : '用户已创建', 'success');
      fetchUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (u: User) => {
    setUsers((prev) => prev.filter((x) => x.id !== u.id));
    toast(`用户 ${u.username} 已删除`, 'success');
    try {
      await apiFetch(`/api/users/${u.id}`, { method: 'DELETE' });
    } catch { /* silent - local state already updated */ }
  };

  const roleBadge = (role: string) => {
    const isAdminRole = role === 'admin';
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs border flex items-center gap-1.5 w-fit ${
        isAdminRole
          ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
          : 'bg-blue-500/15 text-blue-400 border-blue-500/25'
      }`}>
        {isAdminRole ? '管理员' : '普通用户'}
      </span>
    );
  };

  const columns = [
    { key: 'id', title: 'ID', dataIndex: 'id' as const },
    { key: 'username', title: '用户名', dataIndex: 'username' as const },
    {
      key: 'role',
      title: '角色',
      dataIndex: 'role' as const,
      render: (val: unknown) => roleBadge(val as string),
    },
    {
      key: 'create_time',
      title: '创建时间',
      dataIndex: 'create_time' as const,
      render: (val: unknown) =>
        val ? new Date(val as string).toLocaleString('zh-CN') : '-',
    },
    ...(isAdmin
      ? [{
          key: 'actions',
          title: '操作',
          render: (_val: unknown, record: Record<string, unknown>) => (
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); openEdit(record as unknown as User); }}
                className="px-2.5 py-1 text-xs rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all duration-200"
              >
                编辑
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(record as unknown as User); }}
                className="px-2.5 py-1 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all duration-200"
              >
                删除
              </button>
            </div>
          ),
        } as const]
      : []),
  ];

  if (!isAdmin) {
    return (
      <div className="p-4 sm:p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <span className="text-5xl">🔒</span>
          <h2 className="text-xl font-bold text-white">权限不足</h2>
          <p className="text-gray-400 text-sm">仅管理员可访问用户管理页面</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 animate-slide-up">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 flex flex-col gap-2 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <p className="text-gray-500 text-xs">总用户数</p>
          <p className="text-2xl font-bold text-cyan-400">{users.length.toLocaleString()}</p>
          <p className="text-gray-600 text-xs">平台注册用户总数</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 flex flex-col gap-2 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <p className="text-gray-500 text-xs">管理员</p>
          <p className="text-2xl font-bold text-amber-400">{adminCount}</p>
          <p className="text-gray-600 text-xs">具有管理权限的用户</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 flex flex-col gap-2 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <p className="text-gray-500 text-xs">普通用户</p>
          <p className="text-2xl font-bold text-blue-400">{userCount}</p>
          <p className="text-gray-600 text-xs">平台普通注册用户</p>
        </div>
      </div>

      {/* Main content */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-white">用户管理</h2>
          <button
            onClick={openAdd}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/15 border border-cyan-500/25 text-cyan-400 text-sm hover:from-cyan-500/30 hover:to-emerald-500/20 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all duration-200"
          >
            + 添加用户
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
          >
            <option value="">全部角色</option>
            <option value="admin">管理员</option>
            <option value="user">普通用户</option>
          </select>
          <input
            type="text"
            placeholder="搜索用户名..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500/40 transition-all w-48"
          />
          <button
            onClick={() => { setSearch(''); setRoleFilter(''); setPage(1); }}
            className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white border border-white/[0.08] hover:bg-white/[0.04] transition-all duration-200"
          >
            清除筛选
          </button>
        </div>

        <DataTable
          columns={columns}
          data={paginatedUsers as unknown as Record<string, unknown>[]}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          loading={loading}
          rowKey={(record) => String(record.id)}
        />
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-slide-up"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative bg-slate-900/95 border border-white/[0.08] rounded-2xl p-6 w-full max-w-md mx-4 shadow-[0_0_40px_rgba(6,182,212,0.1)] modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
            <h3 className="text-lg font-bold text-white mb-5">
              {editUser ? '编辑用户' : '添加用户'}
            </h3>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm flex items-center gap-2">
                <span>❌</span>
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">用户名</label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
                  placeholder="请输入用户名"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">
                  密码{editUser ? '（留空则不修改）' : ''}
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
                  placeholder={editUser ? '留空则不修改密码' : '请输入密码'}
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">角色</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
                >
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={formLoading}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/15 border border-cyan-500/25 text-cyan-400 text-sm hover:from-cyan-500/30 hover:to-emerald-500/20 transition-all duration-200 disabled:opacity-50"
              >
                {formLoading ? '保存中...' : '保存'}
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-400 text-sm hover:text-white hover:bg-white/[0.08] transition-all duration-200"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  return <AuthGuard adminOnly><UsersContent /></AuthGuard>;
}
