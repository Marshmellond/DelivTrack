export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="text-8xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
          404
        </div>
        <p className="text-xl text-gray-300">页面未找到</p>
        <p className="text-sm text-gray-500">你访问的页面不存在或已被移除</p>
        <a
          href="/dashboard"
          className="inline-block mt-4 px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/15 border border-cyan-500/25 text-cyan-400 hover:from-cyan-500/30 hover:to-emerald-500/20 transition-all"
        >
          返回首页
        </a>
      </div>
    </div>
  );
}
