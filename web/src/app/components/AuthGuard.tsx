'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthGuard({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (adminOnly && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role !== 'admin') {
          router.replace('/dashboard');
          return;
        }
      } catch {}
    }
    setAuthorized(true);
  }, [router, pathname, adminOnly]);

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center">
        <p className="text-gray-400">验证中...</p>
      </div>
    );
  }

  return <>{children}</>;
}
