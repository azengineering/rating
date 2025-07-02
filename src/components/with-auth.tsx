"use client";

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, type ComponentType } from 'react';
import { useAuth } from '@/context/auth-context';
import LoadingScreen from '@/components/loading-screen';

export default function withAuth<P extends object>(WrappedComponent: ComponentType<P>) {
  const WithAuthComponent = (props: P) => {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
      if (!loading && !user) {
        router.push(`/login?redirect=${pathname}`);
      }
    }, [user, loading, router, pathname]);

    if (loading || !user) {
      // Return null or a minimal loader to avoid showing the full welcome screen on every refresh.
      return null;
    }

    return <WrappedComponent {...props} />;
  };
  
  WithAuthComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithAuthComponent;
}
