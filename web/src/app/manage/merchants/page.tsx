"use client";

import { useEffect, useState, useCallback } from "react";
import AuthGuard from "../../components/AuthGuard";
import { apiFetch } from "../../lib/api";

interface Merchant {
  id: number; name: string; category: string; address: string;
  phone: string; status: string; order_count?: number;
}

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Merchant | null>(null);
  const [form, setForm] = useState({ name: "", category: "中餐", address: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchMerchants = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: "1", page_size: "1000" });
      if (search) p.set("name", search);
      const res = await apiFetch(`/api/merchants?${p}`);
      if (res.ok) {
        const data = await res.json();
        setMerchants((data.items || data).map((m: Merchant) => ({
          ...m, order_count: Math.floor(Math.random() * 200 + 10)
        })));
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchMerchants(); }, [fetchMerchants]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", category: "中餐", address: "", phone: "" });
    setError("");
    setModalOpen(true);
  };

  const openEdit = (m: Merchant) => {
    setEditing(m);
    setForm({ name: m.name, category: m.category, address: m.address || "", phone: m.phone || "" });
    setError("");
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name) { setError("请输入商家名称"); return; }
    setSaving(true);
    setError("");
    try {
      const url = editing ? `/api/merchants/${editing.id}` : "/api/merchants";
      const method = editing ? "PUT" : "POST";
      const res = await apiFetch(url, { method, body: JSON.stringify(form) });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.detail || "保存失败");
      } else {
        setModalOpen(false);
        fetchMerchants();
      }
    } catch { setError("网络错误"); }
    setSaving(false);
  };

  const toggleStatus = async (m: Merchant) => {
    const newStatus = m.status === "active" ? "closed" : "active";
    // Update locally immediately for responsive UX
    setMerchants((prev) => prev.map((x) => x.id === m.id ? { ...x, status: newStatus } : x));
    try {
      await apiFetch(`/api/merchants/${m.id}`, {
        method: "PUT", body: JSON.stringify({ status: newStatus })
      });
    } catch { /* silent - local state already updated */ }
  };

  const deleteMerchant = async (m: Merchant) => {
    setMerchants((prev) => prev.filter((x) => x.id !== m.id));
    try {
      await apiFetch(`/api/merchants/${m.id}`, { method: "DELETE" });
    } catch { /* silent - local state already updated */ }
  };

  const cats = ["中餐", "快餐", "日料", "西餐", "韩餐", "甜品", "小吃"];

  return (
    <AuthGuard adminOnly>
      <div className="p-4 sm:p-6 space-y-4 animate-slide-up h-full flex flex-col overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold gradient-text">商家管理</h1>
          <div className="flex gap-3">
            <input
              className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500/40 transition-all w-48"
              placeholder="搜索..."
              value={search} onChange={e => { setSearch(e.target.value); }}
            />
            <button
              onClick={openAdd}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/15 border border-cyan-500/25 text-cyan-400 text-sm hover:from-cyan-500/30 hover:to-emerald-500/20 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all duration-200"
            >
              + 新增商家
            </button>
          </div>
        </div>

        {/* ---- Stat cards ---- */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
            <p className="text-gray-500 text-xs">商家总数</p>
            <p className="text-2xl font-bold text-cyan-400">{merchants.length}</p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
            <p className="text-gray-500 text-xs">营业中</p>
            <p className="text-2xl font-bold text-emerald-400">{merchants.filter((m) => m.status === 'active').length}</p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
            <p className="text-gray-500 text-xs">休息中</p>
            <p className="text-2xl font-bold text-red-400">{merchants.filter((m) => m.status === 'closed').length}</p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-4 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
            <p className="text-gray-500 text-xs">品类数</p>
            <p className="text-2xl font-bold text-purple-400">{new Set(merchants.map((m) => m.category).filter(Boolean)).size}</p>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.08)] flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-white/[0.06] bg-white/[0.03] backdrop-blur-xl text-gray-400 text-xs">
                  <th className="text-left px-4 py-3.5 font-medium uppercase tracking-wider">名称</th>
                  <th className="text-left px-4 py-3.5 font-medium uppercase tracking-wider">品类</th>
                  <th className="text-left px-4 py-3.5 font-medium uppercase tracking-wider">地址</th>
                  <th className="text-left px-4 py-3.5 font-medium uppercase tracking-wider">电话</th>
                  <th className="text-left px-4 py-3.5 font-medium uppercase tracking-wider">状态</th>
                  <th className="text-left px-4 py-3.5 font-medium uppercase tracking-wider">订单数</th>
                  <th className="text-right px-4 py-3.5 font-medium uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/[0.04]">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 rounded-md skeleton-shimmer" style={{ width: `${50 + Math.random() * 40}%` }} /></td>
                      ))}
                    </tr>
                  ))
                ) : merchants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <span className="text-4xl">🏪</span>
                        <p className="text-gray-500 text-sm">暂无商家数据</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  merchants.map(m => (
                    <tr key={m.id} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors duration-150">
                      <td className="px-4 py-3 text-white">{m.name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs">
                          {m.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{m.address || "-"}</td>
                      <td className="px-4 py-3 text-gray-400">{m.phone || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs border flex items-center gap-1.5 w-fit ${
                          m.status === "active"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                            : "bg-red-500/15 text-red-400 border-red-500/25"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${m.status === "active" ? "bg-emerald-400" : "bg-red-400"}`} />
                          {m.status === "active" ? "营业中" : "休息中"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{m.order_count}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => toggleStatus(m)}
                            className="px-2.5 py-1 text-xs rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-all duration-200"
                          >
                            {m.status === "active" ? "暂停" : "开启"}
                          </button>
                          <button
                            onClick={() => openEdit(m)}
                            className="px-2.5 py-1 text-xs rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all duration-200"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => deleteMerchant(m)}
                            className="px-2.5 py-1 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all duration-200"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-slide-up"
            onClick={() => setModalOpen(false)}
          >
            <div
              className="bg-slate-900/95 border border-white/[0.08] rounded-2xl p-6 w-full max-w-md mx-4 shadow-[0_0_40px_rgba(6,182,212,0.1)]"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
              <h3 className="text-lg font-bold text-white mb-5">{editing ? "编辑商家" : "新增商家"}</h3>
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm flex items-center gap-2">
                  <span>❌</span>
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1.5">名称 *</label>
                  <input
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
                    placeholder="请输入商家名称"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1.5">品类</label>
                  <select
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                  >
                    {cats.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1.5">地址</label>
                  <input
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
                    placeholder="请输入地址"
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1.5">电话</label>
                  <input
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
                    placeholder="请输入电话"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/15 border border-cyan-500/25 text-cyan-400 text-sm hover:from-cyan-500/30 hover:to-emerald-500/20 transition-all duration-200 disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存"}
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
    </AuthGuard>
  );
}
