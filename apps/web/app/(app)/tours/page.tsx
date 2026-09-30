'use client';

import { Card, PageHeader } from '@/components/ui';

export default function ToursRedirectPage() {
  return (
    <div>
      <PageHeader
        title="Tours & Product Catalogue"
        subtitle="Tour management has been moved to the Admin Console"
      />
      <Card title="Admin Feature">
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>🗺️</div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
            Tours Management has moved to Admin
          </h2>
          <p style={{ color: '#64748b', fontSize: 14, maxWidth: 480, margin: '0 auto 20px' }}>
            Creating, editing, and publishing tours, itineraries, and departures is now exclusively managed from the Admin Console.
          </p>
          <a
            href="http://localhost:3003/crm/tours"
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
            style={{ display: 'inline-flex', textDecoration: 'none' }}
          >
            Open Tours in Admin Console →
          </a>
        </div>
      </Card>
    </div>
  );
}
