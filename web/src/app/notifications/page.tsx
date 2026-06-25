'use client';

import { useEffect, useState, useMemo } from 'react';
import AuthGuard from '../components/AuthGuard';
import Link from 'next/link';

interface Notification {
  id: string;
  type: 'order' | 'system' | 'rider' | 'alert';
  icon: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  order: { label: '订单提醒', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/25' },
  system: { label: '系统通知', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/25' },
  rider: { label: '骑手状态', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' },
  alert: { label: '告警', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/25' },
};

const TYPE_ICONS: Record<string, string> = {
  order: '📋',
  system: '🔔',
  rider: '🛵',
  alert: '⚠️',
};

function generateDemoNotifications(): Notification[] {
  const now = Date.now();
  const items: (Omit<Notification, 'id'> & { id: string })[] = [
    { id: 'n1', type: 'order', icon: '📋', title: '新订单提醒', description: '订单 ORD-20240625-0034 已创建，商家: 蜀味川菜馆，金额: ¥128.50', time: new Date(now - 120000).toISOString(), read: false },
    { id: 'n2', type: 'order', icon: '📋', title: '订单已接单', description: '订单 ORD-20240625-0032 已被骑手 王芳 接单，预计 35 分钟送达', time: new Date(now - 300000).toISOString(), read: false },
    { id: 'n3', type: 'order', icon: '📋', title: '订单已完成', description: '订单 ORD-20240625-0031 已送达，客户确认收货', time: new Date(now - 600000).toISOString(), read: true },
    { id: 'n4', type: 'order', icon: '📋', title: '订单已取消', description: '订单 ORD-20240625-0028 已被用户取消，原因: 配送时间过长', time: new Date(now - 900000).toISOString(), read: true },
    { id: 'n5', type: 'order', icon: '📋', title: '新订单提醒', description: '订单 ORD-20240625-0035 已创建，商家: 老北京炸酱面馆，金额: ¥32.00', time: new Date(now - 180000).toISOString(), read: false },
    { id: 'n6', type: 'system', icon: '🔔', title: '系统维护通知', description: '系统计划于 2024-06-26 02:00-04:00 进行例行维护，届时服务可能短暂中断', time: new Date(now - 1800000).toISOString(), read: false },
    { id: 'n7', type: 'system', icon: '🔔', title: '数据备份完成', description: '每日数据自动备份已完成，备份文件大小: 312MB，状态: 成功', time: new Date(now - 3600000).toISOString(), read: true },
    { id: 'n8', type: 'system', icon: '🔔', title: '版本更新', description: 'DelivTrack 系统已更新至 v2.3.1，新增配送区域管理功能', time: new Date(now - 7200000).toISOString(), read: true },
    { id: 'n9', type: 'system', icon: '🔔', title: 'API 调用量提醒', description: '今日 API 调用量已达 85% 配额，请关注使用情况', time: new Date(now - 14400000).toISOString(), read: true },
    { id: 'n10', type: 'rider', icon: '🛵', title: '骑手上线通知', description: '骑手 张伟 已上线，当前在线骑手: 8 人', time: new Date(now - 1500000).toISOString(), read: true },
    { id: 'n11', type: 'rider', icon: '🛵', title: '骑手状态变更', description: '骑手 李明 已完成今日第 25 单配送，准时率: 96%', time: new Date(now - 2400000).toISOString(), read: true },
    { id: 'n12', type: 'rider', icon: '🛵', title: '骑手取货通知', description: '骑手 王芳 已到达商家 "蜀味川菜馆" 取货', time: new Date(now - 360000).toISOString(), read: false },
    { id: 'n13', type: 'rider', icon: '🛵', title: '骑手离线通知', description: '骑手 赵刚 已离线，离线原因: 休息', time: new Date(now - 5400000).toISOString(), read: true },
    { id: 'n14', type: 'alert', icon: '⚠️', title: '配送超时预警', description: '订单 ORD-20240625-0024 配送已超时 15 分钟，请及时处理', time: new Date(now - 420000).toISOString(), read: false },
    { id: 'n15', type: 'alert', icon: '⚠️', title: '库存不足提醒', description: '菜品 "宫保鸡丁" 库存仅剩 3 份，请及时补货', time: new Date(now - 270000).toISOString(), read: false },
    { id: 'n16', type: 'alert', icon: '⚠️', title: '系统性能告警', description: '服务器 CPU 使用率达到 92%，系统响应时间延长至 2.3 秒', time: new Date(now - 4800000).toISOString(), read: true },
    { id: 'n17', type: 'order', icon: '📋', title: '批量订单提醒', description: '午餐高峰期，过去 5 分钟内新增 12 笔订单，请合理调度骑手', time: new Date(now - 450000).toISOString(), read: false },
    { id: 'n18', type: 'system', icon: '🔔', title: '安全提醒', description: '检测到异常登录尝试，IP: 192.168.1.254 已被自动封锁 30 分钟', time: new Date(now - 10800000).toISOString(), read: true },
    { id: 'n19', type: 'alert', icon: '⚠️', title: '恶劣天气预警', description: '北京市发布暴雨黄色预警，预计未来 3 小时将持续降雨，配送时效可能受影响', time: new Date(now - 1500000).toISOString(), read: false },
    { id: 'n20', type: 'rider', icon: '🛵', title: '骑手考核完成', description: '本月骑手绩效考核已完成，综合评分 TOP3: 张伟(4.8分)、王芳(4.7分)、李明(4.6分)', time: new Date(now - 86400000).toISOString(), read: true },
  ];
  return items;
}

function NotificationsContent() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      setNotifications(generateDemoNotifications());
      setLoaded(true);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return notifications;
    return notifications.filter((n) => n.type === typeFilter);
  }, [notifications, typeFilter]);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleToggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  if (!loaded) {
    return (
      <div className="p-6 space-y-4 animate-slide-up">
        <div className="h-8 w-48 skeleton-shimmer rounded-lg" />
        <div className="h-6 w-32 skeleton-shimmer rounded-lg" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 skeleton-shimmer rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold gradient-text">消息通知中心</h1>
          <p className="text-gray-500 text-xs mt-0.5">
            {unreadCount > 0 ? `${unreadCount} 条未读消息` : '所有消息已读'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <span className="px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/25 text-red-400 text-xs font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              {unreadCount} 条未读
            </span>
          )}
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="px-4 py-2 rounded-xl text-sm text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            全部已读
          </button>
        </div>
      </div>

      {/* Type Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setTypeFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
            typeFilter === 'all'
              ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/15 text-cyan-400 border border-cyan-500/25'
              : 'bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:text-white'
          }`}
        >
          全部 ({notifications.length})
        </button>
        {Object.entries(TYPE_CONFIG).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setTypeFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              typeFilter === key
                ? `${config.bg} ${config.color} border-${config.label === '告警' ? 'red' : 'cyan'}-500/25`
                : 'bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:text-white'
            }`}
          >
            {TYPE_ICONS[key]} {config.label} ({notifications.filter((n) => n.type === key).length})
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.08)]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <span className="text-4xl">📭</span>
            <p className="text-gray-500 text-sm">暂无此类通知</p>
          </div>
        ) : (
          <div>
            {filtered.map((notif, idx) => {
              const typeConfig = TYPE_CONFIG[notif.type];
              return (
                <div
                  key={notif.id}
                  onClick={() => handleToggleRead(notif.id)}
                  className={`flex items-start gap-4 px-4 py-3.5 border-b border-white/[0.04] cursor-pointer transition-all hover:bg-white/[0.02] ${
                    !notif.read ? 'bg-white/[0.02]' : ''
                  } ${idx % 2 === 0 ? 'bg-transparent' : ''}`}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${typeConfig.bg}`}>
                    <span className="text-lg">{notif.icon}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-medium ${!notif.read ? 'text-white' : 'text-gray-400'}`}>
                        {notif.title}
                      </h4>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
                      )}
                    </div>
                    <p className={`text-sm mt-0.5 ${!notif.read ? 'text-gray-300' : 'text-gray-500'}`}>
                      {notif.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-gray-600 text-xs">
                        {new Date(notif.time).toLocaleString('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${typeConfig.bg} ${typeConfig.color}`}>
                        {typeConfig.label}
                      </span>
                    </div>
                  </div>

                  {/* Read/Unread toggle */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleRead(notif.id); }}
                    className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs text-gray-600 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                    title={notif.read ? '标为未读' : '标为已读'}
                  >
                    {notif.read ? '○' : '●'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <NotificationsContent />
    </AuthGuard>
  );
}
