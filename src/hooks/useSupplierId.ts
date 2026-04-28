'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isLiveMode } from '@/lib/config';

const MOCK_SUPPLIER_ID = 's5';

export function useSupplierId() {
  const [supplierId, setSupplierId] = useState<string | null>(isLiveMode() ? null : MOCK_SUPPLIER_ID);
  const [loading, setLoading] = useState(isLiveMode());

  useEffect(() => {
    if (!isLiveMode()) return;

    const load = async () => {
      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        if (!user) {
          setSupplierId(null);
          return;
        }

        const { data: supplier } = await supabase
          .from('suppliers')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        setSupplierId(supplier?.id ?? null);
      } catch {
        setSupplierId(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { supplierId, loading };
}
