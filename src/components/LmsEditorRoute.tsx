import { AccessDenied } from '@/components/AccessDenied';
import { RouteLoading } from '@/components/RouteLoading';
import { useRoles } from '@/hooks/useRoles';

type LmsEditorRouteProps = {
  children: React.ReactNode;
};

export function LmsEditorRoute({ children }: LmsEditorRouteProps) {
  const { canEditLms, loading } = useRoles();

  if (loading) {
    return <RouteLoading label="Loading your access…" />;
  }

  if (!canEditLms) {
    return (
      <div className="content-panel content-panel--access-denied">
        <AccessDenied
          title="LMS"
          description="You need the LMS Editor or Super Admin role to manage courses. Ask an administrator to assign access in the Admin site."
        />
      </div>
    );
  }

  return <>{children}</>;
}
