import { AccessDenied } from '@/components/AccessDenied';
import { RouteLoading } from '@/components/RouteLoading';
import { useRoles } from '@/hooks/useRoles';

type LmsAccessRouteProps = {
  children: React.ReactNode;
};

export function LmsAccessRoute({ children }: LmsAccessRouteProps) {
  const { canAccessLms, loading } = useRoles();

  if (loading) {
    return <RouteLoading label="Loading your access…" />;
  }

  if (!canAccessLms) {
    return (
      <div className="content-panel content-panel--access-denied">
        <AccessDenied
          title="LMS access required"
          description="You need the LMS Editor, LMS Learner, or Super Admin role to open the learning system. Ask an administrator to assign access in Admin → Users."
        />
      </div>
    );
  }

  return <>{children}</>;
}
