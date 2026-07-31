'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status, error } = useSession();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated' && !redirecting) {
      setRedirecting(true);
      router.replace('/login');
    }
  }, [status, router, redirecting]);

  // Loading — show spinner (covers initial session fetch)
  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated — redirect in progress, render nothing to prevent flash
  if (status === 'unauthenticated') {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  // Error fetching session — show error state instead of crashing
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-destructive">Session error: {error.message || 'Unknown error'}</p>
          <button
            className="text-sm text-primary underline hover:no-underline"
            onClick={() => window.location.href = '/login'}
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
