import { createInternalProtectedRoute } from '@aas/shared-ui';
import { RouteLoading } from '@/components/RouteLoading';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export const ProtectedRoute = createInternalProtectedRoute({
  supabase,
  useAuth,
  RouteLoading: (props: { label?: string }) => <RouteLoading {...props} />,
});
