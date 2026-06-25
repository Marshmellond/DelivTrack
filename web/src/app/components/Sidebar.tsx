'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface NavGroup {
  header: string;
  icon: string;
  items: NavItem[];
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
  admin?: boolean;
}

const navGroups: NavGroup[] = [
  {
    header: '数据中心',
    icon: '📊',
    items: [
      { href: '/dashboard', label: '实时看板', icon: '📡' },
      { href: '/analytics/orders', label: '订单分析', icon: '📋' },
      { href: '/analytics/revenue', label: '营收分析', icon: '💰' },
      { href: '/analytics/delivery', label: '配送分析', icon: '🛵' },
      { href: '/analytics/customers', label: '客户洞察', icon: '👥' },
    ],
  },
  {
    header: '管理中心',
    icon: '⚙️',
    items: [
      { href: '/manage/orders', label: '订单管理', icon: '📦', admin: true },
      { href: '/manage/riders', label: '骑手管理', icon: '🛵', admin: true },
      { href: '/manage/merchants', label: '商家管理', icon: '🏪', admin: true },
      { href: '/manage/users', label: '用户管理', icon: '👤', admin: true },
      { href: '/manage/menu', label: '菜品管理', icon: '🍱', admin: true },
      { href: '/manage/zones', label: '配送区域', icon: '🗺️', admin: true },
    ],
  },
  {
    header: '运营中心',
    icon: '🚀',
    items: [
      { href: '/operations/orders', label: '订单处理', icon: '📋' },
      { href: '/operations/dispatch', label: '骑手调度', icon: '🛵' },
    ],
  },
  {
    header: '系统',
    icon: '🖥️',
    items: [
      { href: '/profile', label: '个人中心', icon: '👤' },
      { href: '/monitor', label: '系统监控', icon: '📈', admin: true },
      { href: '/system/logs', label: '操作日志', icon: '📝', admin: true },
      { href: '/notifications', label: '通知中心', icon: '🔔' },
      { href: '/help', label: '使用帮助', icon: '❓' },
    ],
  },
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

  const filteredGroups = useMemo(() => {
    return navGroups.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.admin || user?.role === 'admin'
      ),
    })).filter((group) => group.items.length > 0);
  }, [user]);

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
          collapsed ? '-translate-x-full md:translate-x-0 md:w-[72px]' : 'translate-x-0 w-64'
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
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {filteredGroups.map((group) => (
            <div key={group.header}>
              {/* Section header */}
              {!collapsed && (
                <div className="flex items-center gap-2 px-3 py-1.5 mb-1">
                  <span className="text-xs">{group.icon}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                    {group.header}
                  </span>
                </div>
              )}
              {collapsed && (
                <div className="flex justify-center py-1.5 mb-1">
                  <span className="text-xs text-gray-600">{group.icon}</span>
                </div>
              )}

              <div className="space-y-1">
                {group.items.map((item) => {
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
              </div>
            </div>
          ))}
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
