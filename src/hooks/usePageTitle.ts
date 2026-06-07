import { useLocation } from 'react-router-dom';

const TITLES: Record<string, string> = {
  '/dashboard': 'Course Catalogue',
  '/users': 'Users',
};

export function usePageTitle(): string {
  const { pathname } = useLocation();

  if (pathname.startsWith('/course/')) return 'Course';
  if (pathname.startsWith('/module/')) return 'Module Builder';
  if (pathname.startsWith('/view')) return 'Module Viewer';

  return TITLES[pathname] ?? 'LMS';
}
