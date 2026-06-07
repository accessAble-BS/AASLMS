type RouteLoadingProps = {
  label?: string;
};

export function RouteLoading({ label = 'Loading…' }: RouteLoadingProps) {
  return (
    <div className="route-loading">
      <p>{label}</p>
    </div>
  );
}
