import React from 'react';
import { exigirAdmin } from '@/lib/guard-admin';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await exigirAdmin();
  return <>{children}</>;
}
