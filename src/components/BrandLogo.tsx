import { BRAND_LOGO_URL } from '@/lib/brand';

type BrandLogoProps = {
  height?: number;
};

export function BrandLogo({ height = 60 }: BrandLogoProps) {
  return (
    <img
      src={BRAND_LOGO_URL}
      alt="Accessable Admin Services"
      style={{ height, width: 'auto' }}
    />
  );
}
