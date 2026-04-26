'use client';

import { useEffect, useState } from 'react';
import { getAuthContext } from '@/lib/auth/client';
import { isLiveMode } from '@/lib/config';

const MOCK_SUPPLIER_ID = 's5';

export function useSupplierId() {
  const [supplierId, setSupplierId] = useState<string | null>(isLiveMode() ? null : MOCK_SUPPLIER_ID);
  const [loading, setLoading] = useState(isLiveMode());

  useEffect(() => {
    if (!isLiveMode()) return;

    const load = async () => {
      try {
        const auth = await getAuthContext();
        if (auth.role === 'supplier' && auth.userId) {
          setSupplierId(auth.userId);
        } else {
          setSupplierId(null);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { supplierId, loading };
}
