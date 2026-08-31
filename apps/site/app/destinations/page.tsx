import type { Metadata } from 'next';
import { apiGet, DestinationPublic } from '@/lib/api';
import DestinationsClient from '@/components/DestinationsClient';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Destinations | Sunseekers Tours',
  description: 'Explore our handcrafted African and worldwide destinations. Plan your dream vacation with Sunseekers Tours.',
};

export default async function DestinationsPage() {
  let destinations: DestinationPublic[] = [];
  let error = false;

  try {
    destinations = await apiGet<DestinationPublic[]>('/public/destinations');
  } catch {
    error = true;
  }

  return <DestinationsClient destinations={destinations || []} error={error} />;
}
