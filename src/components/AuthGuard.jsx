import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import toast from 'react-hot-toast';
import { getEmailSession } from '@/lib/authSession';

const PROTECTED_PREFIXES = ['/dashboard'];

export default function AuthGuard({ children }) {
  const router = useRouter();
  const { address, isConnected, isConnecting } = useAccount();
  const emailSession = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return getEmailSession();
  }, [router.pathname]);

  useEffect(() => {
    if (!router.isReady) return;
    const path = router.pathname || '';
    const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
    if (!isProtected) return;
    if (isConnecting) return;

    const hasWallet = isConnected && !!address;
    const hasEmail = !!emailSession;
    if (!hasWallet && !hasEmail) {
      toast.error('Please connect your wallet or continue with email to access the dashboard.');
      router.replace('/?auth=required');
    }
  }, [router, address, isConnected, isConnecting, emailSession]);

  return children;
}


