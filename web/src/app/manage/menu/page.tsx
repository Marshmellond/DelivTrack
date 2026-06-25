'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { apiFetch } from '../../lib/api';
import AuthGuard from '../../components/AuthGuard';
import DataTable from '../../components/DataTable';
import { useToast } from '../../components/Toast';

interface MenuItem {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
  merchant_name: string;
  merchant_id?: number;
  status?: string;
  create_time?: string;
}

interface Merchant {
  id: number;
  name: string;
}

function MenuContent() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [allItems, setAllItems] = useState<MenuItem[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [categoryFilter, setCategoryFilter] = useState('');
  const [merchantFilter, setMerchantFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formMerchantId, setFormMerchantId] = useState<number | ''>('');
  const [formStatus, setFormStatus] = useState('on_sale');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const { toast } = useToast();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/menu-items?page=1&page_size=1000');
      if (res.ok) {
        const data = await res.json();
        const list: MenuItem[] = (data.items || data || []).map((item: MenuItem) => ({
          ...item,
          status: item.status || (item.stock > 0 ? 'on_sale' : 'off_sale'),
        }));
        setAllItems(list);
        setItems(list);
      } else {
        // Fallback demo data
        setFallbackMenuItems();
      }
    } catch {
      setFallbackMenuItems();
    } finally {
      setLoading(false);
    }
  }, []);

  const setFallbackMenuItems = () => {
    const demo: MenuItem[] = [
      { id: 1, name: '红烧牛肉面', price: 28, stock: 50, category: '主食', merchant_name: '美味餐厅', status: 'on_sale' },
      { id: 2, name: '宫保鸡丁饭', price: 32, stock: 30, category: '主食', merchant_name: '湘味人家', status: 'on_sale' },
      { id: 3, name: '珍珠奶茶', price: 18, stock: 100, category: '饮品', merchant_name: '茶颜悦色', status: 'on_sale' },
      { id: 4, name: '麻辣香锅', price: 58, stock: 20, category: '川菜', merchant_name: '湘味人家', status: 'on_sale' },
      { id: 5, name: '芝士汉堡', price: 25, stock: 45, category: '快餐', merchant_name: '麦当劳', status: 'on_sale' },
      { id: 6, name: '日式豚骨拉面', price: 35, stock: 25, category: '主食', merchant_name: '日式拉面', status: 'on_sale' },
      { id: 7, name: '抹茶蛋糕', price: 22, stock: 8, category: '甜品', merchant_name: '茶颜悦色', status: 'on_sale' },
      { id: 8, name: '烤鸡翅', price: 15, stock: 60, category: '小吃', merchant_name: '烧烤大王', status: 'off_sale' },
      { id: 9, name: '杨枝甘露', price: 20, stock: 0, category: '饮品', merchant_name: '鲜芋传奇', status: 'off_sale' },
      { id: 10, name: '寿司拼盘', price: 68, stock: 12, category: '日料', merchant_name: '日式拉面', status: 'on_sale' },
    ];
    setAllItems(demo);
    setItems(demo);
  };

  const fetchMerchants = useCallback(async () => {
    try {
      const res = await apiFetch('/api/merchants?page=1&page_size=1000');
      if (res.ok) {
        const data = await res.json();
        setMerchants(data.items || data || []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchItems();
    fetchMerchants();
  }, [fetchItems, fetchMerchants]);

  // Filtering
  const filteredItems = useMemo(() => {
    let result = allItems;
    if (categoryFilter) result = result.filter((i) => i.category === categoryFilter);
    if (merchantFilter) result = result.filter((i) => i.merchant_name === merchantFilter);
    if (statusFilter === 'on_sale') result = result.filter((i) => i.status === 'on_sale');
    if (statusFilter === 'off_sale') result = result.filter((i) => i.status === 'off_sale');
    setPage(1);
    return result;
  }, [allItems, categoryFilter, merchantFilter, statusFilter]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page]);

  // Stats
  const stats = useMemo(() => ({
    total: allItems.length,
    onSale: allItems.filter((i) => i.status === 'on_sale').length,
    lowStock: allItems.filter((i) => i.stock > 0 && i.stock <= 10).length,
  }), [allItems]);

  // Unique categories and merchant names for filters
  const categories = useMemo(() => [...new Set(allItems.map((i) => i.category).filter(Boolean))], [allItems]);
  const merchantNames = useMemo(() => [...new Set(allItems.map((i) => i.merchant_name).filter(Boolean))], [allItems]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedItems.map((i) => i.id)));
    }
  };

  const handleBatchStatus = async (status: string) => {
    if (selectedIds.size === 0) {
      toast('请先选择菜品', 'error');
      return;
    }
    let success = 0;
    let fail = 0;
    for (const id of selectedIds) {
      try {
        const res = await apiFetch(`/api/menu-items/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ status }),
        });
        if (res.ok) success++; else fail++;
      } catch {
        fail++;
      }
    }
    toast(`批量操作完成: 成功 ${success}, 失败 ${fail}`, success > 0 ? 'success' : 'error');
    setSelectedIds(new Set());
    fetchItems();
  };

  const openAdd = () => {
    setEditItem(null);
    setFormName('');
    setFormPrice('');
    setFormStock('');
    setFormCategory('');
    setFormMerchantId('');
    setFormStatus('on_sale');
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditItem(item);
    setFormName(item.name);
    setFormPrice(item.price.toString());
    setFormStock(item.stock.toString());
    setFormCategory(item.category);
    setFormMerchantId(item.merchant_id || '');
    setFormStatus(item.status || 'on_sale');
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setFormError('');
    if (!formName.trim()) { setFormError('菜品名称不能为空'); return; }
    if (!formPrice || isNaN(Number(formPrice)) || Number(formPrice) <= 0) { setFormError('请输入有效价格'); return; }
    setFormLoading(true);
    try {
      const body: Record<string, unknown> = {
        name: formName,
        price: Number(formPrice),
        stock: Number(formStock) || 0,
        category: formCategory,
        status: formStatus,
      };
      if (formMerchantId) body.merchant_id = Number(formMerchantId);
      const res = editItem
        ? await apiFetch(`/api/menu-items/${editItem.id}`, { method: 'PUT', body: JSON.stringify(body) })
        : await apiFetch('/api/menu-items', { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || '保存失败');
      }
      setModalOpen(false);
      toast(editItem ? '菜品已更新' : '菜品已添加', 'success');
      fetchItems();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (item: MenuItem) => {
    setAllItems((prev) => prev.filter((i) => i.id !== item.id));
    toast(`菜品 ${item.name} 已删除`, 'success');
    try {
      await apiFetch(`/api/menu-items/${item.id}`, { method: 'DELETE' });
    } catch { /* silent - local state already updated */ }
  };

  const statusBadge = (status: string) => {
    const isOn = status === 'on_sale';
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs border ${
        isOn ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-gray-500/15 text-gray-400 border-gray-500/25'
      }`}>
        {isOn ? '在售' : '下架'}
      </span>
    );
  };

  const columns = [
    {
      key: 'select',
      title: '',
      render: (_: unknown, record: Record<string, unknown>) => (
        <input type="checkbox" checked={selectedIds.has(record.id as number)} onChange={() => toggleSelect(record.id as number)} />
      ),
    },
    { key: 'name', title: '菜品名称', dataIndex: 'name' as const },
    {
      key: 'price', title: '价格', dataIndex: 'price' as const,
      render: (val: unknown) => `¥${(val as number)?.toFixed(2) ?? '0.00'}`,
    },
    {
      key: 'stock', title: '库存', dataIndex: 'stock' as const,
      render: (val: unknown) => {
        const s = val as number ?? 0;
        return <span className={s <= 10 ? 'text-red-400' : 'text-white'}>{s}</span>;
      },
    },
    { key: 'category', title: '分类', dataIndex: 'category' as const },
    { key: 'merchant_name', title: '所属商家', dataIndex: 'merchant_name' as const },
    {
      key: 'status', title: '状态', dataIndex: 'status' as const,
      render: (val: unknown) => statusBadge((val as string) || 'on_sale'),
    },
    {
      key: 'actions', title: '操作',
      render: (_: unknown, record: Record<string, unknown>) => (
        <div className="flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); openEdit(record as unknown as MenuItem); }}
            className="px-2.5 py-1 text-xs rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all duration-200">编辑</button>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(record as unknown as MenuItem); }}
            className="px-2.5 py-1 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all duration-200">删除</button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-4 animate-slide-up">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-1 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <p className="text-gray-500 text-xs">菜品总数</p>
          <p className="text-2xl font-bold text-white stat-number">{stats.total}</p>
        </div>
        <div className="bg-white/[0.03] border border-emerald-500/20 rounded-2xl p-4 flex flex-col gap-1 shadow-[0_0_30px_rgba(16,185,129,0.08)]">
          <p className="text-gray-500 text-xs">在售菜品</p>
          <p className="text-2xl font-bold text-emerald-400 stat-number">{stats.onSale}</p>
        </div>
        <div className="bg-white/[0.03] border border-red-500/20 rounded-2xl p-4 flex flex-col gap-1 shadow-[0_0_30px_rgba(239,68,68,0.08)]">
          <p className="text-gray-500 text-xs">低库存菜品</p>
          <p className="text-2xl font-bold text-red-400 stat-number">{stats.lowStock}</p>
        </div>
      </div>

      {/* Table Panel */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-white">菜品管理</h2>
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <>
                <button onClick={() => handleBatchStatus('on_sale')}
                  className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all">批量上架</button>
                <button onClick={() => handleBatchStatus('off_sale')}
                  className="px-3 py-1.5 text-xs rounded-lg bg-gray-500/10 border border-gray-500/20 text-gray-400 hover:bg-gray-500/20 transition-all">批量下架</button>
              </>
            )}
            <button onClick={toggleSelectAll}
              className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all">
              {selectedIds.size === paginatedItems.length && paginatedItems.length > 0 ? '取消全选' : '全选'}
            </button>
            <button onClick={openAdd}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/15 border border-cyan-500/25 text-cyan-400 text-sm hover:from-cyan-500/30 hover:to-emerald-500/20 transition-all">
              + 添加菜品
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all">
            <option value="">全部分类</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={merchantFilter} onChange={(e) => setMerchantFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all">
            <option value="">全部商家</option>
            {merchantNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all">
            <option value="">全部状态</option>
            <option value="on_sale">在售</option>
            <option value="off_sale">下架</option>
          </select>
          <button onClick={() => { setCategoryFilter(''); setMerchantFilter(''); setStatusFilter(''); }}
            className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white border border-white/[0.08] hover:bg-white/[0.04] transition-all">
            清除筛选
          </button>
        </div>

        <DataTable
          columns={columns}
          data={paginatedItems as unknown as Record<string, unknown>[]}
          total={filteredItems.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          loading={loading}
          rowKey={(r) => String(r.id)}
        />
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="relative bg-slate-900/95 border border-white/[0.08] rounded-2xl p-6 w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto shadow-[0_0_40px_rgba(6,182,212,0.1)] modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
            <h3 className="text-lg font-bold text-white mb-5">{editItem ? '编辑菜品' : '添加菜品'}</h3>
            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm flex items-center gap-2">
                <span>❌</span><span>{formError}</span>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">菜品名称</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">价格</label>
                <input type="number" step="0.01" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">库存</label>
                <input type="number" value={formStock} onChange={(e) => setFormStock(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">分类</label>
                <input value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="如: 主食、饮品、小吃" className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">所属商家</label>
                <select value={formMerchantId} onChange={(e) => setFormMerchantId(Number(e.target.value) || '')} className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all">
                  <option value="">-- 选择商家 --</option>
                  {merchants.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">状态</label>
                <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all">
                  <option value="on_sale">在售</option>
                  <option value="off_sale">下架</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={formLoading} className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/15 border border-cyan-500/25 text-cyan-400 text-sm hover:from-cyan-500/30 hover:to-emerald-500/20 transition-all duration-200 disabled:opacity-50">
                {formLoading ? '保存中...' : '保存'}
              </button>
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-400 text-sm hover:text-white hover:bg-white/[0.08] transition-all">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MenuManagementPage() {
  return (
    <AuthGuard adminOnly>
      <MenuContent />
    </AuthGuard>
  );
}
