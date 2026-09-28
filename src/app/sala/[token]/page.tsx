import AppSala from './AppSala';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Sala · DKitchen',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

/** App de sala del camarero (el token se valida en cada llamada a /api/sala). */
export default async function PaginaSala({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <AppSala token={token} />;
}
