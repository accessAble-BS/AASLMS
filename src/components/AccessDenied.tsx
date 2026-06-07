type AccessDeniedProps = {
  title: string;
  description: string;
};

export function AccessDenied({ title, description }: AccessDeniedProps) {
  return (
    <div className="access-denied">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
