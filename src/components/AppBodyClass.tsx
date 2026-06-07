import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function AppBodyClass() {
  const { pathname } = useLocation();
  useDocumentTitle();

  useEffect(() => {
    const isAuthScreen = pathname === '/' || pathname === '/auth/callback';
    const isViewer = pathname.startsWith('/view');

    document.body.classList.toggle('app-lms', !isAuthScreen && !isViewer);
    document.body.classList.toggle('viewer-body', isViewer);

    return () => {
      document.body.classList.remove('app-lms', 'viewer-body');
    };
  }, [pathname]);

  return null;
}
