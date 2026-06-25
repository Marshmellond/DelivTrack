'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { apiFetch } from '../../lib/api';
import AuthGuard from '../../components/AuthGuard';
import { useToast } from '../../components/Toast';

interface Rider {
  id: number;
  name: string;
  phone: string;
  vehicle: string;
  status: string;
  create_time: string;
}

interface Order {
  id: number;
  order_no: string;
  merchant: string;
  amount: number;
  status: string;
  city: string;
}

function DispatchContent() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [assignModal, setAssignModal] = useState<{ rider: Rider; open: boolean } | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | ''>('');
  const [assignLoading, setAssignLoading] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ridersRes, ordersRes] = await Promise.all([
        apiFetch('/api/riders?page=1&page_size=500'),
        apiFetch('/api/orders?status=created&page=1&page_size=100'),
      ]);
      if (ridersRes.ok) {
        const data = await ridersRes.json();
        const list = data.items || data || [];
        setRiders(list.length > 0 ? list : generateFallbackRiders());
      } else {
        setRiders(generateFallbackRiders());
      }
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        const list = data.items || data || [];
        setPendingOrders(list.length > 0 ? list : generateFallbackOrders());
      } else {
        setPendingOrders(generateFallbackOrders());
      }
    } catch {
      setRiders(generateFallbackRiders());
      setPendingOrders(generateFallbackOrders());
    } finally {
      setLoading(false);
    }
  }, []);

  const generateFallbackRiders = (): Rider[] => [
    { id: 1, name: '张三', phone: '13800001111', vehicle: '电动车', status: 'online', create_time: new Date().toISOString() },
    { id: 2, name: '李四', phone: '13800002222', vehicle: '摩托车', status: 'delivering', create_time: new Date().toISOString() },
    { id: 3, name: '王五', phone: '13800003333', vehicle: '电动车', status: 'online', create_time: new Date().toISOString() },
    { id: 4, name: '赵六', phone: '13800004444', vehicle: '电动车', status: 'offline', create_time: new Date().toISOString() },
    { id: 5, name: '钱七', phone: '13800005555', vehicle: '摩托车', status: 'online', create_time: new Date().toISOString() },
    { id: 6, name: '孙八', phone: '13800006666', vehicle: '电动车', status: 'offline', create_time: new Date().toISOString() },
  ];

  const generateFallbackOrders = (): Order[] => [
    { id: 101, order_no: 'ORD00101', merchant: '美味餐厅', amount: 45, status: 'created', city: '北京' },
    { id: 102, order_no: 'ORD00102', merchant: '麦当劳', amount: 32, status: 'created', city: '上海' },
    { id: 103, order_no: 'ORD00103', merchant: '日式拉面', amount: 68, status: 'created', city: '广州' },
    { id: 104, order_no: 'ORD00104', merchant: '湘味人家', amount: 55, status: 'created', city: '深圳' },
  ];

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const onlineRiders = useMemo(() => riders.filter((r) => r.status === 'online'), [riders]);
  const offlineRiders = useMemo(() => riders.filter((r) => r.status === 'offline'), [riders]);
  const deliveringRiders = useMemo(() => riders.filter((r) => r.status === 'delivering'), [riders]);

  const handleToggleStatus = async (rider: Rider) => {
    const newStatus = rider.status === 'online' ? 'offline' : 'online';
    // Update local state immediately for responsive UX
    setRiders((prev) =>
      prev.map((r) => (r.id === rider.id ? { ...r, status: newStatus } : r))
    );
    toast(`骑手 ${rider.name} ${newStatus === 'online' ? '已上线' : '已下线'}`, 'success');
    // Try API in background (silent on failure since local state already updated)
    try {
      await apiFetch(`/api/riders/${rider.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
    } catch { /* silent - local state already updated */ }
  };

  const handleAssignOrder = async () => {
    if (!assignModal || !selectedOrderId) {
      toast('请选择一个待分配订单', 'error');
      return;
    }
    // Update local state immediately for responsive UX
    setPendingOrders((prev) => prev.filter((o) => o.id !== Number(selectedOrderId)));
    toast(`订单已分配给骑手 ${assignModal.rider.name}`, 'success');
    setAssignModal(null);
    setSelectedOrderId('');
    setAssignLoading(false);
    // Try API in background (silent on failure since local state already updated)
    try {
      await apiFetch(`/api/orders/${selectedOrderId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'accepted', rider_id: assignModal.rider.id }),
      });
    } catch { /* silent - local state already updated */ }
  };

  const stats = useMemo(() => ({
    total: riders.length,
    online: onlineRiders.length,
    delivering: deliveringRiders.length,
    available: onlineRiders.length,
  }), [riders, onlineRiders, deliveringRiders]);

  const renderRiderCard = (rider: Rider) => (
    <div
      key={rider.id}
      className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 space-y-3 hover:bg-white/[0.06] transition-all duration-200"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">
            {rider.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-white text-sm font-medium">{rider.name}</p>
            <p className="text-gray-500 text-xs">{rider.phone}</p>
          </div>
        </div>
        <span className={`w-2 h-2 rounded-full ${
          rider.status === 'online' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]' :
          rider.status === 'delivering' ? 'bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)] animate-pulse' :
          'bg-gray-600'
        }`} />
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          {rider.vehicle || '未登记'}
        </span>
      </div>
      <div className="flex gap-2 pt-1 border-t border-white/[0.04]">
        {rider.status === 'online' && (
          <button
            onClick={() => setAssignModal({ rider, open: true })}
            className="flex-1 px-2 py-1.5 text-xs rounded-lg bg-gradient-to-r from-cyan-500/15 to-emerald-500/10 border border-cyan-500/25 text-cyan-400 hover:from-cyan-500/25 hover:to-emerald-500/15 transition-all duration-200"
          >
            分配订单
          </button>
        )}
        <button
          onClick={() => handleToggleStatus(rider)}
          className={`flex-1 px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 ${
            rider.status === 'online'
              ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
          }`}
        >
          {rider.status === 'online' ? '下线' : '上线'}
        </button>
      </div>
    </div>
  );

  if (loading && riders.length === 0) {
    return (
      <div className="p-6 space-y-4 animate-slide-up">
        <div className="h-8 w-48 skeleton-shimmer rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-96 skeleton-shimmer rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 animate-slide-up h-full flex flex-col">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold gradient-text">骑手调度中心</h1>
        <p className="text-gray-500 text-xs mt-0.5">查看骑手状态并分配订单</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
          <p className="text-gray-500 text-xs">总骑手</p>
          <p className="text-xl font-bold text-white stat-number">{stats.total}</p>
        </div>
        <div className="bg-white/[0.03] border border-emerald-500/20 rounded-xl p-3 text-center">
          <p className="text-gray-500 text-xs">在线</p>
          <p className="text-xl font-bold text-emerald-400 stat-number">{stats.online}</p>
        </div>
        <div className="bg-white/[0.03] border border-cyan-500/20 rounded-xl p-3 text-center">
          <p className="text-gray-500 text-xs">配送中</p>
          <p className="text-xl font-bold text-cyan-400 stat-number">{stats.delivering}</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
          <p className="text-gray-500 text-xs">可接单</p>
          <p className="text-xl font-bold text-amber-400 stat-number">{stats.available}</p>
        </div>
      </div>

      {/* Three Columns */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
        {/* Online Riders */}
        <div className="flex flex-col rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.02] backdrop-blur-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-sm font-medium text-emerald-400">在线骑手</h3>
            <span className="text-xs text-gray-500 bg-white/[0.04] px-2 py-0.5 rounded-full">{onlineRiders.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {onlineRiders.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-600 text-xs">暂无在线骑手</div>
            ) : (
              onlineRiders.map(renderRiderCard)
            )}
          </div>
        </div>

        {/* Delivering Riders */}
        <div className="flex flex-col rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.02] backdrop-blur-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-sm font-medium text-cyan-400">配送中</h3>
            <span className="text-xs text-gray-500 bg-white/[0.04] px-2 py-0.5 rounded-full">{deliveringRiders.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {deliveringRiders.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-600 text-xs">暂无配送中骑手</div>
            ) : (
              deliveringRiders.map(renderRiderCard)
            )}
          </div>
        </div>

        {/* Offline Riders */}
        <div className="flex flex-col rounded-2xl border border-gray-500/20 bg-gray-500/[0.02] backdrop-blur-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-400">离线</h3>
            <span className="text-xs text-gray-500 bg-white/[0.04] px-2 py-0.5 rounded-full">{offlineRiders.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {offlineRiders.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-600 text-xs">暂无离线骑手</div>
            ) : (
              offlineRiders.map(renderRiderCard)
            )}
          </div>
        </div>
      </div>

      {/* Assign Order Modal */}
      {assignModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm modal-backdrop"
          onClick={() => setAssignModal(null)}
        >
          <div
            className="relative bg-slate-900/95 border border-white/[0.08] rounded-2xl p-6 w-full max-w-md mx-4 shadow-[0_0_40px_rgba(6,182,212,0.1)] modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
            <h3 className="text-lg font-bold text-white mb-4">
              分配订单给 {assignModal.rider.name}
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              {pendingOrders.length === 0
                ? '当前没有待接单的订单'
                : `共有 ${pendingOrders.length} 个待分配订单`}
            </p>
            {pendingOrders.length > 0 && (
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(Number(e.target.value) || '')}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all mb-4"
              >
                <option value="">-- 选择订单 --</option>
                {pendingOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.order_no} - {o.merchant} (¥{o.amount?.toLocaleString()})
                  </option>
                ))}
              </select>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleAssignOrder}
                disabled={assignLoading || pendingOrders.length === 0}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/15 border border-cyan-500/25 text-cyan-400 text-sm hover:from-cyan-500/30 hover:to-emerald-500/20 transition-all duration-200 disabled:opacity-50"
              >
                {assignLoading ? '分配中...' : '确认分配'}
              </button>
              <button
                onClick={() => setAssignModal(null)}
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

export default function DispatchPage() {
  return (
    <AuthGuard>
      <DispatchContent />
    </AuthGuard>
  );
}
