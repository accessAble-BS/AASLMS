import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/BrandLogo';

type AuthLayoutProps = {
  children: ReactNode;
};

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-card__logo">
          <BrandLogo height={80} />
        </div>
        {children}
      </div>
    </div>
  );
}
