'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { apiFetch } from '../lib/api';
import AuthGuard from '../components/AuthGuard';
import DataTable from '../components/DataTable';
import { useToast } from '../components/Toast';

interface Rider {
  id: number;
  name: string;
  phone: string;
  vehicle: string;
  status: string;
  create_time: string;
  total_deliveries?: number;
  avg_rating?: number;
  on_time_rate?: number;
  last_delivery_time?: string;
}

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const target = value;
    const duration = 600;
    const startTime = Date.now();
    const startVal = display;
    let frame: number;
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startVal + (target - startVal) * eased));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <span className="stat-number">
      {prefix}{display.toLocaleString()}{suffix}
    </span>
  );
}

function RidersContent() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editRider, setEditRider] = useState<Rider | null>(null);
  const [user, setUser] = useState<{ role?: string } | null>(null);

  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formVehicle, setFormVehicle] = useState('');
  const [formStatus, setFormStatus] = useState('offline');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // ---- NEW: quick filter ----
  const [statusQuickFilter, setStatusQuickFilter] = useState<'all' | 'online' | 'offline'>('all');

  const pageSize = 20;
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  const isAdmin = user?.role === 'admin';

  const fetchRiders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('page_size', '1000');
      if (search) params.set('name', search);

      const res = await apiFetch(`/api/riders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const all: Rider[] = data.items || data;
        // Add simulated performance data
        const enriched = all.map((r: Rider) => ({
          ...r,
          total_deliveries: Math.floor(Math.random() * 500 + 50),
          avg_rating: parseFloat((Math.random() * 2 + 3).toFixed(1)),
          on_time_rate: Math.floor(Math.random() * 20 + 80),
          last_delivery_time: r.status === 'online'
            ? new Date(Date.now() - Math.random() * 3600000).toISOString()
            : new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
        }));
        setRiders(enriched);
        setTotal(enriched.length);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchRiders();
  }, [fetchRiders]);

  // ---- NEW: filter by quick filter ----
  const filteredRiders = useMemo(() => {
    if (statusQuickFilter === 'all') return riders;
    return riders.filter((r) => r.status === statusQuickFilter);
  }, [riders, statusQuickFilter]);

  // ---- NEW: paginate filtered riders ----
  const paginatedRiders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRiders.slice(start, start + pageSize);
  }, [filteredRiders, page, pageSize]);

  const filteredTotal = filteredRiders.length;

  // ---- NEW: performance stats ----
  const performanceStats = useMemo(() => {
    const active = riders.filter((r) => r.total_deliveries);
    if (active.length === 0) return { totalDeliveries: 0, avgRating: 0, onTimeRate: 0 };
    const totalDeliveries = active.reduce((s, r) => s + (r.total_deliveries || 0), 0);
    const avgRating = active.reduce((s, r) => s + (r.avg_rating || 0), 0) / active.length;
    const onTimeRate = Math.round(active.reduce((s, r) => s + (r.on_time_rate || 0), 0) / active.length);
    return { totalDeliveries, avgRating: parseFloat(avgRating.toFixed(1)), onTimeRate };
  }, [riders]);

  // ---- NEW: status distribution for pie chart ----
  const statusPieData = useMemo(() => {
    const online = riders.filter((r) => r.status === 'online').length;
    const offline = riders.filter((r) => r.status === 'offline').length;
    return { online, offline };
  }, [riders]);

  const statusPieOption = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: '{b}: {c} 人 ({d}%)' },
    legend: { bottom: 0, textStyle: { color: '#94a3b8', fontSize: 11 }, itemWidth: 8, itemHeight: 8, itemGap: 16 },
    series: [{
      type: 'pie',
      radius: ['55%', '80%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 5, borderColor: '#0a0e27', borderWidth: 4 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' }, scaleSize: 8 },
      data: [
        { name: '在线', value: statusPieData.online, itemStyle: { color: '#10b981' } },
        { name: '离线', value: statusPieData.offline, itemStyle: { color: '#475569' } },
      ],
    }],
  }), [statusPieData]);

  const openAdd = () => {
    setEditRider(null);
    setFormName('');
    setFormPhone('');
    setFormVehicle('');
    setFormStatus('offline');
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (rider: Rider) => {
    setEditRider(rider);
    setFormName(rider.name);
    setFormPhone(rider.phone);
    setFormVehicle(rider.vehicle);
    setFormStatus(rider.status);
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setFormError('');
    setFormLoading(true);
    try {
      const body = { name: formName, phone: formPhone, vehicle: formVehicle, status: formStatus };
      const res = editRider
        ? await apiFetch(`/api/riders/${editRider.id}`, { method: 'PUT', body: JSON.stringify(body) })
        : await apiFetch('/api/riders', { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || '保存失败');
      }
      setModalOpen(false);
      toast(editRider ? '骑手信息已更新' : '骑手已添加', 'success');
      fetchRiders();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (rider: Rider) => {
    if (!confirm(`确认删除骑手 "${rider.name}"？`)) return;
    try {
      const res = await apiFetch(`/api/riders/${rider.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.detail || '删除失败', 'error');
        return;
      }
      toast(`骑手 ${rider.name} 已删除`, 'success');
      fetchRiders();
    } catch {
      toast('删除失败', 'error');
    }
  };

  const handleToggleStatus = async (rider: Rider) => {
    const newStatus = rider.status === 'online' ? 'offline' : 'online';
    try {
      const res = await apiFetch(`/api/riders/${rider.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.detail || '状态切换失败', 'error');
        return;
      }
      toast(`骑手 ${rider.name} ${newStatus === 'online' ? '已上线' : '已下线'}`, 'success');
      fetchRiders();
    } catch {
      toast('状态切换失败', 'error');
    }
  };

  const statusBadge = (status: string) => {
    const isOnline = status === 'online';
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs border flex items-center gap-1.5 w-fit ${
          isOnline
            ? 'bg-green-500/15 text-green-400 border-green-500/25'
            : 'bg-gray-500/15 text-gray-400 border-gray-500/25'
        }`}
      >
        {isOnline && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
        {isOnline ? '在线' : '离线'}
      </span>
    );
  };

  const columns = [
    { key: 'name', title: '姓名', dataIndex: 'name' as const },
    { key: 'phone', title: '手机号', dataIndex: 'phone' as const },
    { key: 'vehicle', title: '车辆', dataIndex: 'vehicle' as const },
    {
      key: 'status',
      title: '状态',
      dataIndex: 'status' as const,
      render: (val: unknown) => statusBadge(val as string),
    },
    // ---- NEW: performance columns ----
    {
      key: 'total_deliveries',
      title: '总配送单数',
      dataIndex: 'total_deliveries' as const,
      render: (val: unknown) => ((val as number) ?? 0).toLocaleString(),
    },
    {
      key: 'avg_rating',
      title: '平均评分',
      dataIndex: 'avg_rating' as const,
      render: (val: unknown) => {
        const r = val as number ?? 0;
        return (
          <span className="flex items-center gap-1">
            <span className="text-amber-400">★</span>
            <span className="text-white">{r.toFixed(1)}</span>
          </span>
        );
      },
    },
    {
      key: 'on_time_rate',
      title: '准时率',
      dataIndex: 'on_time_rate' as const,
      render: (val: unknown) => {
        const rate = val as number ?? 0;
        return (
          <span className={rate >= 90 ? 'text-emerald-400' : rate >= 80 ? 'text-amber-400' : 'text-red-400'}>
            {rate}%
          </span>
        );
      },
    },
    // ---- NEW: last delivery time ----
    {
      key: 'last_delivery_time',
      title: '最近配送',
      dataIndex: 'last_delivery_time' as const,
      render: (val: unknown) => {
        if (!val) return '-';
        const date = new Date(val as string);
        const now = Date.now();
        const diffMin = Math.floor((now - date.getTime()) / 60000);
        if (diffMin < 1) return '刚刚';
        if (diffMin < 60) return `${diffMin} 分钟前`;
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return `${diffHr} 小时前`;
        return date.toLocaleDateString('zh-CN');
      },
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
                onClick={(e) => { e.stopPropagation(); handleToggleStatus(record as unknown as Rider); }}
                className="px-2.5 py-1 text-xs rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-all duration-200"
              >
                {(record.status as string) === 'online' ? '下线' : '上线'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); openEdit(record as unknown as Rider); }}
                className="px-2.5 py-1 text-xs rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all duration-200"
              >
                编辑
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(record as unknown as Rider); }}
                className="px-2.5 py-1 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all duration-200"
              >
                删除
              </button>
            </div>
          ),
        } as const]
      : []),
  ];

  return (
    <div className="p-4 sm:p-6 space-y-4 animate-slide-up">
      {/* ---- NEW: Performance stats card ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glow-card bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 flex flex-col gap-2 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
          <p className="text-gray-500 text-xs">总配送单数</p>
          <p className="text-2xl font-bold text-cyan-400 stat-number">
            <AnimatedNumber value={performanceStats.totalDeliveries} />
          </p>
          <p className="text-gray-600 text-xs">所有骑手累计</p>
        </div>
        <div className="glow-card bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 flex flex-col gap-2 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
          <p className="text-gray-500 text-xs">平均评分</p>
          <p className="text-2xl font-bold text-amber-400 stat-number flex items-center gap-1">
            <span className="text-base">★</span>
            <AnimatedNumber value={performanceStats.avgRating} />
          </p>
          <p className="text-gray-600 text-xs">满分 5.0</p>
        </div>
        <div className="glow-card bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 flex flex-col gap-2 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
          <p className="text-gray-500 text-xs">准时率</p>
          <p className="text-2xl font-bold text-emerald-400 stat-number">
            <AnimatedNumber value={performanceStats.onTimeRate} suffix="%" />
          </p>
          <p className="text-gray-600 text-xs">平台平均准时送达率</p>
        </div>
      </div>

      {/* ---- NEW: Status distribution pie + quick filter row ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 shadow-[0_0_30px_rgba(6,182,212,0.08)] flex flex-col items-center justify-center">
          <h3 className="text-sm font-medium text-white mb-2">骑手状态分布</h3>
          <ReactECharts option={statusPieOption} theme="dark" style={{ height: '180px', width: '100%' }} />
          <div className="flex gap-4 mt-2 text-xs">
            <span className="text-emerald-400">在线: {statusPieData.online}</span>
            <span className="text-gray-500">离线: {statusPieData.offline}</span>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-bold text-white">骑手管理</h2>
              {isAdmin && (
                <button
                  onClick={openAdd}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/15 border border-cyan-500/25 text-cyan-400 text-sm hover:from-cyan-500/30 hover:to-emerald-500/20 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all duration-200"
                >
                  + 添加骑手
                </button>
              )}
            </div>

            {/* ---- NEW: Quick filter tabs ---- */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
                {(['all', 'online', 'offline'] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => { setStatusQuickFilter(key); setPage(1); }}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-200 ${
                      statusQuickFilter === key
                        ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/15 text-cyan-400'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {key === 'all' ? '全部' : key === 'online' ? '在线' : '离线'}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="搜索姓名/手机号..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500/40 transition-all w-64"
              />
            </div>

            <DataTable
              columns={columns}
              data={paginatedRiders as unknown as Record<string, unknown>[]}
              total={filteredTotal}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              loading={loading}
              rowKey={(record) => String(record.id)}
            />
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-slide-up"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-slate-900/95 border border-white/[0.08] rounded-2xl p-6 w-full max-w-md mx-4 shadow-[0_0_40px_rgba(6,182,212,0.1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
            <h3 className="text-lg font-bold text-white mb-5">
              {editRider ? '编辑骑手' : '添加骑手'}
            </h3>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm flex items-center gap-2">
                <span>❌</span>
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">姓名</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">手机号</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">车辆</label>
                <input
                  type="text"
                  value={formVehicle}
                  onChange={(e) => setFormVehicle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">状态</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
                >
                  <option value="online">在线</option>
                  <option value="offline">离线</option>
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

export default function RidersPage() {
  return (
    <AuthGuard>
      <RidersContent />
    </AuthGuard>
  );
}
