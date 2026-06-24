'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    } else {
      setAuthorized(true);
    }
  }, [router, pathname]);

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center">
        <p className="text-gray-400">Checking authentication...</p>
      </div>
    );
  }

  return <>{children}</>;
}
