import type { Metadata } from 'next';
import PlanYourTripClient from '@/components/PlanYourTripClient';

export const metadata: Metadata = {
  title: 'Plan Your Trip | Sunseekers Tours',
  description: 'Tell us your travel plans and let our tour specialists design your dream itinerary in Ghana and worldwide.',
};

export default function PlanYourTripPage() {
  return <PlanYourTripClient />;
}
