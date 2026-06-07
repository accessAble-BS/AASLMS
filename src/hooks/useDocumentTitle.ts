import { useEffect } from 'react';
import { usePageTitle } from './usePageTitle';

const PREFIX = 'LMS';

export function useDocumentTitle() {
  const pageTitle = usePageTitle();

  useEffect(() => {
    document.title = pageTitle === 'Module Viewer' ? PREFIX : `${PREFIX} - ${pageTitle}`;
  }, [pageTitle]);
}
