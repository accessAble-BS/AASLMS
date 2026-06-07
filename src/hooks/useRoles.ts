import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LMS_ACCESS_ROLES, LMS_EDITOR_ROLES } from '@/lib/constants';
import { useAuth } from './useAuth';

export function useRoles() {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadRoles() {
      const { data, error } = await supabase
        .from('user_roles')
        .select('roles(slug)')
        .eq('user_id', user!.id);

      if (cancelled) return;

      if (error) {
        console.error('Failed to load roles:', error);
        setRoles([]);
      } else {
        const slugs = (data ?? []).flatMap((row) => {
          const role = row.roles as { slug: string } | { slug: string }[] | null;
          if (!role) return [];
          if (Array.isArray(role)) return role.map((r) => r.slug);
          return [role.slug];
        });
        setRoles(slugs);
      }
      setLoading(false);
    }

    void loadRoles();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const canEditLms = roles.some((slug) => (LMS_EDITOR_ROLES as readonly string[]).includes(slug));
  const canAccessLms = roles.some((slug) => (LMS_ACCESS_ROLES as readonly string[]).includes(slug));
  const isLearnerOnly = canAccessLms && !canEditLms;

  return { roles, loading: authLoading || loading, canEditLms, canAccessLms, isLearnerOnly };
}
