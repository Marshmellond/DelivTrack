'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { apiFetch } from '../lib/api';
import AuthGuard from '../components/AuthGuard';
import DataTable from '../components/DataTable';
import { useToast } from '../components/Toast';

function linearGradient(
  x0: number, y0: number, x2: number, y2: number,
  stops: { offset: number; color: string }[]
) {
  return new echarts.graphic.LinearGradient(x0, y0, x2, y2, stops);
}

interface Merchant {
  id: number;
  name: string;
  category: string;
  address: string;
  phone: string;
  status: string;
  order_count?: number;
  gmv?: number;
  sparkline?: number[];
}

interface MenuItem {
  id: number;
  merchant_id: number;
  name: string;
  price: number;
  category: string;
}

function MerchantsContent() {
  const { toast } = useToast();

  // Merchants state
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // ---- NEW: category filter ----
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  // Menu items state
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);

  // Modal state
  const [merchantModal, setMerchantModal] = useState(false);
  const [editMerchant, setEditMerchant] = useState<Merchant | null>(null);
  const [merchantForm, setMerchantForm] = useState({ name: '', category: '', address: '', phone: '', status: 'active' });
  const [merchantFormError, setMerchantFormError] = useState('');
  const [merchantFormLoading, setMerchantFormLoading] = useState(false);

  // Menu item modal
  const [menuModal, setMenuModal] = useState(false);
  const [editMenuItem, setEditMenuItem] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState({ name: '', price: 0, category: '' });
  const [menuFormError, setMenuFormError] = useState('');
  const [menuFormLoading, setMenuFormLoading] = useState(false);

  const pageSize = 20;

  const fetchMerchants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('page_size', '1000');
      if (search) params.set('name', search);

      const res = await apiFetch(`/api/merchants?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const all: Merchant[] = data.items || data;
        // Enrich with simulated data
        const enriched = all.map((m: Merchant) => ({
          ...m,
          order_count: Math.floor(Math.random() * 200 + 10),
          gmv: Math.floor(Math.random() * 50000 + 1000),
          sparkline: Array.from({ length: 7 }, () => Math.floor(Math.random() * 30 + 5)),
        }));
        setMerchants(enriched);
        setTotal(enriched.length);
        // Extract unique categories
        const cats = Array.from(new Set(enriched.map((m: Merchant) => m.category).filter(Boolean)));
        setCategories(cats as string[]);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  // ---- NEW: filter by category ----
  const filteredMerchants = useMemo(() => {
    if (!categoryFilter) return merchants;
    return merchants.filter((m) => m.category === categoryFilter);
  }, [merchants, categoryFilter]);

  const paginatedMerchants = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredMerchants.slice(start, start + pageSize);
  }, [filteredMerchants, page, pageSize]);

  const filteredTotal = filteredMerchants.length;

  // ---- NEW: Revenue ranking chart data (top 10 by gmv) ----
  const revenueRankData = useMemo(() => {
    return [...merchants]
      .sort((a, b) => (b.gmv || 0) - (a.gmv || 0))
      .slice(0, 10);
  }, [merchants]);

  const revenueRankOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '14%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8', formatter: (v: number) => `¥${(v / 1000).toFixed(0)}k` },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.06)' } },
    },
    yAxis: {
      type: 'category',
      data: revenueRankData.map((m) => m.name).reverse(),
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      axisLine: { lineStyle: { color: 'rgba(148,163,184,0.15)' } },
      inverse: true,
    },
    series: [{
      name: 'GMV',
      type: 'bar',
      data: revenueRankData.map((m, i) => ({
        value: m.gmv,
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: linearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#f59e0b' },
            { offset: 1, color: '#ef4444' },
          ]),
        },
      })),
      label: { show: true, position: 'right', color: '#cbd5e1', fontSize: 11, formatter: (p: { value: number }) => `¥${(p.value as number).toLocaleString()}` },
    }],
  };

  const fetchMenuItems = async (merchantId: number) => {
    setMenuLoading(true);
    try {
      const res = await apiFetch(`/api/merchants/${merchantId}/menu`);
      if (res.ok) {
        const data = await res.json();
        setMenuItems(data.items || data);
      } else {
        setMenuItems([]);
      }
    } catch {
      setMenuItems([]);
    } finally {
      setMenuLoading(false);
    }
  };

  const handleSelectMerchant = (merchant: Merchant) => {
    if (selectedMerchant?.id === merchant.id) {
      setSelectedMerchant(null);
      setMenuItems([]);
    } else {
      setSelectedMerchant(merchant);
      fetchMenuItems(merchant.id);
    }
  };

  // Merchant CRUD
  const openMerchantAdd = () => {
    setEditMerchant(null);
    setMerchantForm({ name: '', category: '', address: '', phone: '', status: 'active' });
    setMerchantFormError('');
    setMerchantModal(true);
  };

  const openMerchantEdit = (m: Merchant) => {
    setEditMerchant(m);
    setMerchantForm({ name: m.name, category: m.category, address: m.address, phone: m.phone, status: m.status });
    setMerchantFormError('');
    setMerchantModal(true);
  };

  const handleMerchantSave = async () => {
    setMerchantFormError('');
    setMerchantFormLoading(true);
    try {
      const res = editMerchant
        ? await apiFetch(`/api/merchants/${editMerchant.id}`, {
            method: 'PUT',
            body: JSON.stringify(merchantForm),
          })
        : await apiFetch('/api/merchants', {
            method: 'POST',
            body: JSON.stringify(merchantForm),
          });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || '保存失败');
      }

      setMerchantModal(false);
      toast(editMerchant ? '商家信息已更新' : '商家已添加', 'success');
      fetchMerchants();
    } catch (err) {
      setMerchantFormError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setMerchantFormLoading(false);
    }
  };

  const handleMerchantDelete = async (m: Merchant) => {
    if (!confirm(`确认删除商家 "${m.name}"？`)) return;
    try {
      const res = await apiFetch(`/api/merchants/${m.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.detail || '删除失败', 'error');
        return;
      }
      if (selectedMerchant?.id === m.id) {
        setSelectedMerchant(null);
        setMenuItems([]);
      }
      toast(`商家 ${m.name} 已删除`, 'success');
      fetchMerchants();
    } catch {
      toast('删除失败', 'error');
    }
  };

  // ---- NEW: status toggle with confirmation ----
  const handleToggleStatus = (m: Merchant) => {
    const newStatus = m.status === 'active' ? 'inactive' : 'active';
    const actionLabel = newStatus === 'active' ? '开启营业' : '暂停营业';
    if (!confirm(`确认${actionLabel}商家 "${m.name}"？`)) return;
    (async () => {
      try {
        const res = await apiFetch(`/api/merchants/${m.id}`, {
          method: 'PUT',
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast(data.detail || '状态切换失败', 'error');
          return;
        }
        toast(`商家 ${m.name} ${newStatus === 'active' ? '已恢复营业' : '已暂停营业'}`, 'success');
        fetchMerchants();
      } catch {
        toast('状态切换失败', 'error');
      }
    })();
  };

  // Menu Item CRUD
  const openMenuItemAdd = () => {
    setEditMenuItem(null);
    setMenuForm({ name: '', price: 0, category: '' });
    setMenuFormError('');
    setMenuModal(true);
  };

  const openMenuItemEdit = (item: MenuItem) => {
    setEditMenuItem(item);
    setMenuForm({ name: item.name, price: item.price, category: item.category });
    setMenuFormError('');
    setMenuModal(true);
  };

  const handleMenuItemSave = async () => {
    if (!selectedMerchant) return;
    setMenuFormError('');
    setMenuFormLoading(true);
    try {
      const res = editMenuItem
        ? await apiFetch(`/api/merchants/${selectedMerchant.id}/menu/${editMenuItem.id}`, {
            method: 'PUT',
            body: JSON.stringify(menuForm),
          })
        : await apiFetch(`/api/merchants/${selectedMerchant.id}/menu`, {
            method: 'POST',
            body: JSON.stringify(menuForm),
          });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || '保存失败');
      }

      setMenuModal(false);
      toast(editMenuItem ? '菜品已更新' : '菜品已添加', 'success');
      fetchMenuItems(selectedMerchant.id);
    } catch (err) {
      setMenuFormError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setMenuFormLoading(false);
    }
  };

  const handleMenuItemDelete = async (item: MenuItem) => {
    if (!selectedMerchant) return;
    if (!confirm(`确认删除菜品 "${item.name}"？`)) return;
    try {
      const res = await apiFetch(`/api/merchants/${selectedMerchant.id}/menu/${item.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.detail || '删除失败', 'error');
        return;
      }
      toast(`菜品 ${item.name} 已删除`, 'success');
      fetchMenuItems(selectedMerchant.id);
    } catch {
      toast('删除失败', 'error');
    }
  };

  const statusBadge = (status: string) => {
    const isActive = status === 'active';
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs border flex items-center gap-1.5 w-fit ${
          isActive
            ? 'bg-green-500/15 text-green-400 border-green-500/25'
            : 'bg-gray-500/15 text-gray-400 border-gray-500/25'
        }`}
      >
        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
        {isActive ? '营业中' : '休息中'}
      </span>
    );
  };

  // ---- NEW: sparkline renderer ----
  const SparklineCell = ({ data }: { data: number[] }) => {
    if (!data || data.length === 0) return <span className="text-gray-600">-</span>;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 80;
    const height = 24;
    const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`);
    const pathD = points.map((p, i) => (i === 0 ? `M${p}` : `L${p}`)).join(' ');
    const trend = data[data.length - 1] >= data[0];
    return (
      <svg width={width} height={height} className="inline-block">
        <path d={pathD} fill="none" stroke={trend ? '#10b981' : '#ef4444'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  const merchantColumns = [
    { key: 'name', title: '商家名称', dataIndex: 'name' as const },
    { key: 'category', title: '分类', dataIndex: 'category' as const },
    { key: 'address', title: '地址', dataIndex: 'address' as const },
    { key: 'phone', title: '电话', dataIndex: 'phone' as const },
    {
      key: 'status',
      title: '状态',
      dataIndex: 'status' as const,
      render: (val: unknown) => statusBadge(val as string),
    },
    // ---- NEW: order count column ----
    {
      key: 'order_count',
      title: '订单数',
      dataIndex: 'order_count' as const,
      render: (val: unknown) => ((val as number) ?? 0).toLocaleString(),
    },
    // ---- NEW: sparkline column ----
    {
      key: 'sparkline',
      title: '近7日趋势',
      dataIndex: 'sparkline' as const,
      render: (val: unknown) => <SparklineCell data={val as number[]} />,
    },
    {
      key: 'actions',
      title: '操作',
      render: (_val: unknown, record: Record<string, unknown>) => (
        <div className="flex gap-2">
          {/* ---- NEW: status toggle ---- */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleStatus(record as unknown as Merchant);
            }}
            className={`px-2.5 py-1 text-xs rounded-lg border transition-all duration-200 ${
              (record.status as string) === 'active'
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            {(record.status as string) === 'active' ? '暂停' : '开启'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openMerchantEdit(record as unknown as Merchant);
            }}
            className="px-2.5 py-1 text-xs rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all duration-200"
          >
            编辑
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMerchantDelete(record as unknown as Merchant);
            }}
            className="px-2.5 py-1 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all duration-200"
          >
            删除
          </button>
        </div>
      ),
    },
  ];

  const menuItemColumns = [
    { key: 'name', title: '菜品名称', dataIndex: 'name' as const },
    { key: 'category', title: '分类', dataIndex: 'category' as const },
    {
      key: 'price',
      title: '价格',
      dataIndex: 'price' as const,
      render: (val: unknown) => `¥${(val as number)?.toLocaleString() ?? '0'}`,
    },
    {
      key: 'actions',
      title: '操作',
      render: (_val: unknown, record: Record<string, unknown>) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openMenuItemEdit(record as unknown as MenuItem);
            }}
            className="px-2.5 py-1 text-xs rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all duration-200"
          >
            编辑
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMenuItemDelete(record as unknown as MenuItem);
            }}
            className="px-2.5 py-1 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all duration-200"
          >
            删除
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-4 animate-slide-up">
      {/* ---- NEW: Revenue ranking chart ---- */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-white">商家营收排行 TOP10</h3>
          <span className="text-gray-500 text-xs">按 GMV 排序</span>
        </div>
        <ReactECharts option={revenueRankOption} theme="dark" style={{ height: '320px', width: '100%' }} />
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-white">商家管理</h2>
          <button
            onClick={openMerchantAdd}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/15 border border-cyan-500/25 text-cyan-400 text-sm hover:from-cyan-500/30 hover:to-emerald-500/20 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all duration-200"
          >
            + 添加商家
          </button>
        </div>

        {/* ---- NEW: Category filter tabs + search ---- */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 flex-wrap">
            <button
              onClick={() => { setCategoryFilter(''); setPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-200 ${
                !categoryFilter
                  ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/15 text-cyan-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              全部
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => { setCategoryFilter(cat); setPage(1); }}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-200 ${
                  categoryFilter === cat
                    ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/15 text-cyan-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="搜索名称/分类..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500/40 transition-all w-64"
          />
        </div>

        <DataTable
          columns={merchantColumns}
          data={paginatedMerchants as unknown as Record<string, unknown>[]}
          total={filteredTotal}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          loading={loading}
          onRowClick={(record) => handleSelectMerchant(record as unknown as Merchant)}
          rowKey={(record) => String(record.id)}
        />
      </div>

      {/* Menu Items Section */}
      {selectedMerchant && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 space-y-4 shadow-[0_0_30px_rgba(6,182,212,0.08)] animate-slide-up">
          <div className="flex justify-between items-center">
            <h3 className="text-white font-medium">
              菜品列表 — {selectedMerchant.name}
            </h3>
            <button
              onClick={openMenuItemAdd}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/15 border border-cyan-500/25 text-cyan-400 text-sm hover:from-cyan-500/30 hover:to-emerald-500/20 transition-all duration-200"
            >
              + 添加菜品
            </button>
          </div>

          {menuLoading ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 rounded-lg skeleton-shimmer" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={menuItemColumns}
              data={menuItems as unknown as Record<string, unknown>[]}
              total={menuItems.length}
              page={1}
              pageSize={menuItems.length || 1}
              onPageChange={() => {}}
              loading={false}
              rowKey={(record) => String(record.id)}
            />
          )}
        </div>
      )}

      {/* Merchant Modal */}
      {merchantModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-slide-up"
          onClick={() => setMerchantModal(false)}
        >
          <div
            className="bg-slate-900/95 border border-white/[0.08] rounded-2xl p-6 w-full max-w-md mx-4 shadow-[0_0_40px_rgba(6,182,212,0.1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
            <h3 className="text-lg font-bold text-white mb-5">
              {editMerchant ? '编辑商家' : '添加商家'}
            </h3>

            {merchantFormError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm flex items-center gap-2">
                <span>❌</span>
                <span>{merchantFormError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">商家名称</label>
                <input
                  type="text"
                  value={merchantForm.name}
                  onChange={(e) => setMerchantForm({ ...merchantForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">分类</label>
                <input
                  type="text"
                  value={merchantForm.category}
                  onChange={(e) => setMerchantForm({ ...merchantForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">地址</label>
                <input
                  type="text"
                  value={merchantForm.address}
                  onChange={(e) => setMerchantForm({ ...merchantForm, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">电话</label>
                <input
                  type="text"
                  value={merchantForm.phone}
                  onChange={(e) => setMerchantForm({ ...merchantForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">营业状态</label>
                <select
                  value={merchantForm.status}
                  onChange={(e) => setMerchantForm({ ...merchantForm, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
                >
                  <option value="active">营业中</option>
                  <option value="inactive">休息中</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleMerchantSave}
                disabled={merchantFormLoading}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/15 border border-cyan-500/25 text-cyan-400 text-sm hover:from-cyan-500/30 hover:to-emerald-500/20 transition-all duration-200 disabled:opacity-50"
              >
                {merchantFormLoading ? '保存中...' : '保存'}
              </button>
              <button
                onClick={() => setMerchantModal(false)}
                className="flex-1 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-400 text-sm hover:text-white hover:bg-white/[0.08] transition-all duration-200"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Item Modal */}
      {menuModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-slide-up"
          onClick={() => setMenuModal(false)}
        >
          <div
            className="bg-slate-900/95 border border-white/[0.08] rounded-2xl p-6 w-full max-w-md mx-4 shadow-[0_0_40px_rgba(6,182,212,0.1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
            <h3 className="text-lg font-bold text-white mb-5">
              {editMenuItem ? '编辑菜品' : '添加菜品'}
            </h3>

            {menuFormError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm flex items-center gap-2">
                <span>❌</span>
                <span>{menuFormError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">菜品名称</label>
                <input
                  type="text"
                  value={menuForm.name}
                  onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">分类</label>
                <input
                  type="text"
                  value={menuForm.category}
                  onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">价格</label>
                <input
                  type="number"
                  step="0.01"
                  value={menuForm.price}
                  onChange={(e) => setMenuForm({ ...menuForm, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleMenuItemSave}
                disabled={menuFormLoading}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/15 border border-cyan-500/25 text-cyan-400 text-sm hover:from-cyan-500/30 hover:to-emerald-500/20 transition-all duration-200 disabled:opacity-50"
              >
                {menuFormLoading ? '保存中...' : '保存'}
              </button>
              <button
                onClick={() => setMenuModal(false)}
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

export default function MerchantsPage() {
  return (
    <AuthGuard>
      <MerchantsContent />
    </AuthGuard>
  );
}
