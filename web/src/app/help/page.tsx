'use client';

import { useState } from 'react';
import Link from 'next/link';

interface FaqItem {
  q: string;
  a: string;
}

const faqItems: FaqItem[] = [
  {
    q: 'DelivTrack 是什么？',
    a: 'DelivTrack 是一个 O2O 外卖配送实时监控平台，提供订单管理、骑手调度、数据分析、菜品管理等功能，帮助配送团队高效运营。',
  },
  {
    q: '如何创建新订单？',
    a: '目前订单主要通过 API 接口创建。您可以在「运营中心 > 订单处理」页面查看和处理已有的订单，通过状态流转按钮完成订单的处理流程。',
  },
  {
    q: '如何管理骑手？',
    a: '管理员可以访问「管理中心 > 骑手管理」页面，查看、添加、编辑和删除骑手信息。在「运营中心 > 骑手调度」中可以查看骑手实时状态并分配订单。',
  },
  {
    q: '如何添加菜品？',
    a: '管理员可以访问「管理中心 > 菜品管理」页面，点击「添加菜品」按钮，填写菜品名称、价格、库存、分类等信息完成添加。也可以批量上架/下架菜品。',
  },
  {
    q: '数据看板多久刷新一次？',
    a: '实时数据看板每 5 秒自动刷新一次，您可以查看页面顶部的倒计时了解下次刷新时间。订单处理台每 10 秒刷新，骑手调度中心每 15 秒刷新。',
  },
  {
    q: '如何查看配送区域？',
    a: '管理员可以访问「管理中心 > 配送区域管理」页面，查看所有已配置的配送城市和区域，包括配送费和订单数量。也支持添加和编辑区域信息。',
  },
  {
    q: '系统支持哪些用户角色？',
    a: '系统支持两种角色：管理员（admin）和普通用户（user）。管理员拥有完整的管理权限，包括用户管理、商家管理、骑手管理等；普通用户可以查看数据看板和处理订单。',
  },
  {
    q: '如何注册账号？',
    a: '点击登录页面的「注册」链接进入注册页面，填写用户名和密码即可完成注册。新注册用户默认为普通用户角色。',
  },
  {
    q: '数据安全吗？',
    a: '系统采用 JWT Token 认证机制，所有 API 请求都需要携带有效的 Token。生产环境建议配置 HTTPS 以加密数据传输。',
  },
  {
    q: '遇到问题如何反馈？',
    a: '请通过系统管理员联系技术支持团队。您也可以在「系统 > 通知中心」查看系统通知和告警信息。',
  },
];

function HelpContent() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-slide-up max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="text-center py-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
          ?
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text">帮助与文档</h1>
        <p className="text-gray-500 text-sm mt-2">了解 DelivTrack 配送监控系统的各项功能</p>
      </div>

      {/* Section 1: 系统概述 */}
      <section className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-5 sm:p-6 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <span className="text-cyan-400">📖</span> 系统概述
        </h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          DelivTrack 是一套面向 O2O 外卖配送场景的实时监控与运营管理平台。系统整合了订单管理、骑手调度、菜品管理、
          数据分析等核心模块，为运营团队提供一站式的配送业务管理解决方案。
        </p>
        <ul className="mt-3 space-y-2 text-sm text-gray-400">
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-1">&#10003;</span>
            <span>实时数据看板 - 可视化展示关键业务指标</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-1">&#10003;</span>
            <span>订单全生命周期管理 - 从创建到完成全程可追溯</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-1">&#10003;</span>
            <span>骑手智能调度 - 实时查看骑手状态并分配订单</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-1">&#10003;</span>
            <span>多维度数据分析 - 订单、营收、配送、客户洞察</span>
          </li>
        </ul>
      </section>

      {/* Section 2: 模块介绍 */}
      <section className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-5 sm:p-6 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-cyan-400">🧩</span> 模块介绍
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: '数据中心', icon: '📊', desc: '实时看板展示核心业务指标和趋势图表；订单分析、营收分析、配送分析、客户洞察四个子页面提供深度数据。', links: [{ label: '实时看板', href: '/dashboard' }, { label: '订单分析', href: '/analytics/orders' }] },
            { title: '管理中心', icon: '⚙️', desc: '管理员专属模块，提供订单、骑手、商家、用户、菜品和配送区域的完整 CRUD 管理功能。', links: [{ label: '订单管理', href: '/manage/orders' }, { label: '菜品管理', href: '/manage/menu' }] },
            { title: '运营中心', icon: '🚀', desc: '日常运营核心工作台，订单处理台支持看板式状态流转，骑手调度中心可视化展示骑手状态和分配订单。', links: [{ label: '订单处理', href: '/operations/orders' }, { label: '骑手调度', href: '/operations/dispatch' }] },
            { title: '系统', icon: '🖥️', desc: '包含个人中心、系统监控、操作日志和通知中心等功能，帮助您全面掌握系统运行状态。', links: [{ label: '系统监控', href: '/monitor' }, { label: '通知中心', href: '/notifications' }] },
          ].map((mod, idx) => (
            <div key={idx} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 space-y-2">
              <h3 className="text-white font-medium flex items-center gap-2">
                <span>{mod.icon}</span> {mod.title}
              </h3>
              <p className="text-gray-500 text-xs leading-relaxed">{mod.desc}</p>
              <div className="flex gap-2 pt-1">
                {mod.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-2 py-1 text-xs rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-all"
                  >
                    {link.label} &rarr;
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: 快速入门 */}
      <section className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-5 sm:p-6 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-cyan-400">🚀</span> 快速入门
        </h2>
        <div className="space-y-4">
          {[
            { step: '01', title: '注册账号', desc: '访问注册页面创建您的账号，新用户默认为普通用户角色。如需管理员权限，请联系系统管理员。' },
            { step: '02', title: '登录系统', desc: '使用您的用户名和密码登录，系统会为您生成 JWT Token 用于后续 API 认证。' },
            { step: '03', title: '查看数据看板', desc: '登录后默认进入实时数据看板，您可以查看订单量、GMV、骑手在线率等关键指标。' },
            { step: '04', title: '处理订单', desc: '进入「运营中心 > 订单处理台」，按看板列查看不同状态的订单，点击按钮推进订单状态流转。' },
            { step: '05', title: '调度骑手', desc: '进入「运营中心 > 骑手调度中心」，查看在线骑手，选择待分配的订单进行分配。' },
          ].map((item, idx) => (
            <div key={idx} className="flex gap-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/15 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm shrink-0">
                {item.step}
              </div>
              <div>
                <h4 className="text-white text-sm font-medium">{item.title}</h4>
                <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 4: 常见问题 FAQ */}
      <section className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl p-5 sm:p-6 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-cyan-400">❓</span> 常见问题
        </h2>
        <div className="space-y-2">
          {faqItems.map((item, idx) => (
            <div
              key={idx}
              className="bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden transition-all"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.03] transition-all"
              >
                <span className="text-white text-sm font-medium">{item.q}</span>
                <span
                  className={`text-gray-500 text-xs transition-transform duration-200 ${
                    openFaq === idx ? 'rotate-180' : ''
                  }`}
                >
                  ▼
                </span>
              </button>
              {openFaq === idx && (
                <div className="px-4 pb-3 pt-1 border-t border-white/[0.04]">
                  <p className="text-gray-400 text-sm leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer links */}
      <div className="text-center pb-6">
        <p className="text-gray-600 text-xs">
          DelivTrack 外卖配送实时监控系统 &middot; 如有问题请联系系统管理员
        </p>
        <div className="flex justify-center gap-4 mt-2">
          <Link href="/dashboard" className="text-cyan-400 text-xs hover:text-cyan-300 transition-all">
            返回看板
          </Link>
          <Link href="/notifications" className="text-cyan-400 text-xs hover:text-cyan-300 transition-all">
            通知中心
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function HelpPage() {
  return <HelpContent />;
}
