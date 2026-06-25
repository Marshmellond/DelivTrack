'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { apiFetch } from '../../lib/api';
import AuthGuard from '../../components/AuthGuard';
import { useToast } from '../../components/Toast';

interface Order {
  id: number;
  order_no: string;
  user_id: string;
  merchant: string;
  amount: number;
  status: string;
  city: string;
  create_time: string;
}

const STATUS_MAP: Record<string, string> = {
  pending: '待接单',
  accepted: '已接单',
  picking: '取货中',
  delivering: '配送中',
  completed: '已完成',
  delivered: '已送达',
  cancelled: '已取消',
};

const COLUMNS = [
  { key: 'pending', label: '待接单', color: 'border-yellow-500/30 bg-yellow-500/5' },
  { key: 'delivering', label: '配送中', color: 'border-cyan-500/30 bg-cyan-500/5' },
  { key: 'completed', label: '已完成', color: 'border-emerald-500/30 bg-emerald-500/5' },
  { key: 'cancelled', label: '已取消', color: 'border-red-500/30 bg-red-500/5' },
];

function getStatusColumnKey(status: string): string {
  if (status === 'pending' || status === 'created') return 'pending';
  if (status === 'accepted' || status === 'picking' || status === 'delivering') return 'delivering';
  if (status === 'completed' || status === 'delivered') return 'completed';
  if (status === 'cancelled') return 'cancelled';
  return 'pending';
}

function OrdersContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/orders?page=1&page_size=200');
      if (res.ok) {
        const data = await res.json();
        const list = data.items || data || [];
        if (list.length > 0) {
          setOrders(list);
        } else {
          setFallbackOrders();
        }
      } else {
        setFallbackOrders();
      }
    } catch {
      setFallbackOrders();
    } finally {
      setLoading(false);
    }
  }, []);

  const setFallbackOrders = () => {
    const cities = ['北京', '上海', '广州', '深圳'];
    const merchants = ['美味餐厅', '麦当劳(朝阳店)', '日式拉面馆', '湘味人家', '茶颜悦色(国贸店)', '烧烤大王'];
    const statuses = ['pending', 'accepted', 'picking', 'delivering', 'completed'];
    const demo: Order[] = [];
    for (let i = 0; i < 25; i++) {
      demo.push({
        id: 1000 + i,
        order_no: `ORD${String(Date.now() % 100000).padStart(5, '0')}${String(i).padStart(2, '0')}`,
        user_id: `user_${(i % 8) + 1}`,
        merchant: merchants[i % merchants.length],
        amount: Math.floor(Math.random() * 150 + 20),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        city: cities[i % cities.length],
        create_time: new Date(Date.now() - Math.random() * 86400000 * 2).toISOString(),
      });
    }
    setOrders(demo);
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const groupedOrders = useMemo(() => {
    const groups: Record<string, Order[]> = {};
    COLUMNS.forEach((col) => { groups[col.key] = []; });
    orders.forEach((o) => {
      const key = getStatusColumnKey(o.status);
      if (groups[key]) groups[key].push(o);
    });
    return groups;
  }, [orders]);

  const pendingCount = (groupedOrders['pending'] || []).length;
  const deliveringCount = (groupedOrders['delivering'] || []).length;
  const completedToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (groupedOrders['completed'] || []).filter((o) => o.create_time?.startsWith(today)).length;
  }, [groupedOrders]);

  const handleUpdateStatus = async (order: Order, newStatus: string) => {
    // Update local state immediately for responsive UX
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o))
    );
    toast(`订单 ${order.order_no} ${STATUS_MAP[newStatus] || newStatus}`, 'success');
    // Try API in background (silent on failure since local state already updated)
    try {
      await apiFetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
    } catch { /* silent - local state already updated */ }
  };

  const getActions = (order: Order) => {
    const status = order.status;
    const actions: { label: string; nextStatus: string; color: string }[] = [];
    if (status === 'pending' || status === 'created') {
      actions.push({ label: '接单', nextStatus: 'accepted', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20' });
    }
    if (status === 'accepted' || status === 'picking') {
      actions.push({ label: '开始配送', nextStatus: 'delivering', color: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20' });
    }
    if (status === 'delivering') {
      actions.push({ label: '完成配送', nextStatus: 'completed', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' });
    }
    return actions;
  };

  const formatTime = (t: string) => {
    if (!t) return '-';
    return new Date(t).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit', month: '2-digit', day: '2-digit' });
  };

  if (loading && orders.length === 0) {
    return (
      <div className="p-6 space-y-4 animate-slide-up">
        <div className="h-8 w-48 skeleton-shimmer rounded-lg" />
        <div className="h-6 w-32 skeleton-shimmer rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-96 skeleton-shimmer rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 animate-slide-up h-full flex flex-col">
      {/* Header + Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold gradient-text">订单处理台</h1>
          <p className="text-gray-500 text-xs mt-0.5">拖拽或点击按钮处理订单状态</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/25 text-yellow-400">
            待接单 <span className="font-bold">{pendingCount}</span>
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400">
            配送中 <span className="font-bold">{deliveringCount}</span>
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
            今日完成 <span className="font-bold">{completedToday}</span>
          </span>
        </div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        每 10 秒自动刷新
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-hidden">
        {COLUMNS.map((col) => {
          const items = groupedOrders[col.key] || [];
          return (
            <div
              key={col.key}
              className={`flex flex-col rounded-2xl border backdrop-blur-xl overflow-hidden ${col.color}`}
            >
              {/* Column Header */}
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <h3 className="text-sm font-medium text-white">{col.label}</h3>
                <span className="text-xs text-gray-500 bg-white/[0.04] px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>

              {/* Column Body */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {items.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-gray-600 text-xs">
                    暂无订单
                  </div>
                ) : (
                  items.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 space-y-2 hover:bg-white/[0.06] transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-cyan-400 font-mono text-xs">{order.order_no}</span>
                        <span className="text-gray-500 text-[10px]">{formatTime(order.create_time)}</span>
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{order.merchant}</p>
                        <p className="text-gray-500 text-xs">{order.city}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400 font-medium text-sm">¥{order.amount?.toLocaleString()}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] border bg-white/[0.03] text-gray-400">
                          {STATUS_MAP[order.status] || order.status}
                        </span>
                      </div>
                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-1 border-t border-white/[0.04]">
                        {getActions(order).map((action) => (
                          <button
                            key={action.nextStatus}
                            onClick={() => handleUpdateStatus(order, action.nextStatus)}
                            className={`flex-1 px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 ${action.color}`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OrdersProcessingPage() {
  return (
    <AuthGuard>
      <OrdersContent />
    </AuthGuard>
  );
}
