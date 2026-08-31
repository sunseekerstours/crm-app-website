import type { Metadata } from 'next';
import CarRentalsClient from '@/components/CarRentalsClient';

export const metadata: Metadata = {
  title: 'Vehicle Rental & Fleet Services | Sunseekers Tours',
  description:
    'Rent 4x4 SUVs, luxury saloons, mini-buses, and tourist coaches across Ghana with experienced professional chauffeurs.',
};

export default function CarRentalsPage() {
  return <CarRentalsClient />;
}
