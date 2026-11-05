import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

  try {
    const res = await fetch(`${apiUrl}/qr-library`, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      const item = data.items?.find((i: any) => i.id === id);
      if (item && item.url) {
        return NextResponse.redirect(item.url, 307);
      }
    }
  } catch (err) {
    console.warn('QR redirect lookup failed:', err);
  }

  return NextResponse.redirect(`${apiUrl}/r/${id}`, 307);
}

