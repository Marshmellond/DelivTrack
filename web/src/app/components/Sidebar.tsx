'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: '数据看板', icon: '🏠' },
  { href: '/orders', label: '订单管理', icon: '📦' },
  { href: '/riders', label: '骑手管理', icon: '🛵' },
  { href: '/merchants', label: '商家管理', icon: '🏪', admin: true },
  { href: '/monitor', label: '系统监控', icon: '🖥️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ username?: string; role?: string } | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const filteredItems = navItems.filter(
    (item) => !item.admin || user?.role === 'admin'
  );

  const initials = (user?.username || 'U').slice(0, 2).toUpperCase();

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative z-50 h-screen flex flex-col transition-all duration-300 ease-in-out ${
          collapsed ? '-translate-x-full md:translate-x-0 md:w-[68px]' : 'translate-x-0 w-64'
        } bg-slate-900/80 backdrop-blur-xl border-r border-white/[0.06]`}
      >
        {/* Gradient accent line on right edge */}
        <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-cyan-500 via-emerald-500 to-transparent opacity-30" />

        {/* Logo */}
        <div className="p-4 border-b border-white/[0.06] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            D
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold gradient-text whitespace-nowrap">
                DelivTrack
              </h1>
              <p className="text-gray-500 text-[10px] leading-tight">外卖配送监控平台</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                onClick={() => { if (window.innerWidth < 768) setCollapsed(true); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/15 to-emerald-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.08)]'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                } ${collapsed ? 'justify-center px-2' : ''}`}
              >
                <span className="text-lg shrink-0">{item.icon}</span>
                {!collapsed && (
                  <span className="overflow-hidden whitespace-nowrap">{item.label}</span>
                )}
                {!collapsed && isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.6)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-white/[0.06]">
          {user && !collapsed && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {initials}
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-sm text-white truncate">{user.username}</p>
                <p className="text-[10px] text-gray-500">
                  {user.role === 'admin' ? '管理员' : '用户'}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/8 transition-all duration-200 border border-transparent hover:border-red-500/15 ${
              collapsed ? 'justify-center px-3 py-2.5' : 'w-full px-3 py-2.5'
            }`}
            title={collapsed ? '退出登录' : undefined}
          >
            <span className="text-base shrink-0">🚪</span>
            {!collapsed && <span>退出登录</span>}
          </button>
        </div>

        {/* Mobile toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="md:hidden absolute -right-10 top-4 w-8 h-8 rounded-r-lg bg-slate-900/90 border border-white/[0.06] border-l-0 flex items-center justify-center text-gray-400 hover:text-cyan-400"
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </aside>
    </>
  );
}
