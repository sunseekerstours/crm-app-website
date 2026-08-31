'use client';

import { useState } from 'react';
import { Button, Card, Input, PageHeader, Select, Badge, Spinner } from '@/components/ui';
import { api, type Paginated } from '@/lib/api';

interface Departure {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface ChecklistItem {
  id: string;
  title: string;
  category?: string;
  isRequired: boolean;
  isCompleted: boolean;
  sortOrder: number;
}

interface Assignment {
  id: string;
  dayNumber?: number | null;
  guide?: { id: string; firstName: string; lastName: string } | null;
  hotel?: { id: string; name: string } | null;
  vehicle?: { id: string; name: string; registrationNo?: string | null } | null;
  notes?: string | null;
}

interface Board {
  departure: {
    startDate: string;
    endDate: string;
    tour: { name: string };
    bookedCount: number;
    maxPax?: number | null;
    availableSeats: number;
  };
  resources: { guidesAssigned: number; hotelsAssigned: number; vehiclesAssigned: number };
  assignments: Assignment[];
  checklists: { items: ChecklistItem[]; total: number; completed: number };
  bookings: { id: string; bookingNumber: string; status: string; paxCount: number }[];
}

export default function OperationsPage() {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [departureId, setDepartureId] = useState('');
  const [board, setBoard] = useState<Board | null>(null);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [newItem, setNewItem] = useState('');

  useState(() => {
    api
      .get<Paginated<Departure>>('/departures?limit=100')
      .then((r) => setDepartures(r.items ?? []))
      .catch(() => undefined);
  });

  async function loadBoard(id: string) {
    if (!id) return;
    setDepartureId(id);
    setLoadingBoard(true);
    setBoardError(null);
    try {
      const b = await api.get<Board>(`/trips/${id}/board`);
      setBoard(b);
    } catch (err) {
      setBoardError(err instanceof Error ? err.message : 'Failed to load board');
    } finally {
      setLoadingBoard(false);
    }
  }

  async function addChecklist(e: React.FormEvent) {
    e.preventDefault();
    if (!departureId || !newItem) return;
    await api.post('/checklists', { departureId, title: newItem });
    setNewItem('');
    loadBoard(departureId);
  }

  async function completeItem(id: string, completed: boolean) {
    const route = completed ? '/reopen' : '/complete';
    await api.post(`/checklists/${id}${route}`);
    loadBoard(departureId);
  }

  const b = board;

  return (
    <div>
      <PageHeader title="Trip Board" subtitle="Operations view of departures: resources, checklists, bookings" />
      <Card title="Select departure">
        <div className="form-grid">
          <Select
            label="Departure"
            name="departureId"
            value={departureId}
            onChange={(e) => loadBoard(e.target.value)}
            options={departures.map((d) => ({
              value: d.id,
              label: `${new Date(d.startDate).toLocaleDateString()} — ${d.status}`,
            }))}
          />
        </div>
      </Card>

      {loadingBoard ? (
        <Spinner />
      ) : boardError ? (
        <div className="error-state">{boardError}</div>
      ) : b ? (
        <>
          <div className="form-grid" style={{ marginBottom: 20 }}>
            <Card>
              <div className="card-body">
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Tour</div>
                <div style={{ fontWeight: 700 }}>{b.departure.tour.name}</div>
              </div>
            </Card>
            <Card>
              <div className="card-body">
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Dates</div>
                <div style={{ fontWeight: 700 }}>
                  {new Date(b.departure.startDate).toLocaleDateString()} →{' '}
                  {new Date(b.departure.endDate).toLocaleDateString()}
                </div>
              </div>
            </Card>
            <Card>
              <div className="card-body">
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Capacity</div>
                <div style={{ fontWeight: 700 }}>
                  {b.departure.bookedCount}/{b.departure.maxPax ?? '∞'} (open {b.departure.availableSeats})
                </div>
              </div>
            </Card>
          </div>

          <Card title="Assigned resources">
            <div className="form-grid">
              <div className="card"><div className="card-body">Guides: {b.resources.guidesAssigned}</div></div>
              <div className="card"><div className="card-body">Hotels: {b.resources.hotelsAssigned}</div></div>
              <div className="card"><div className="card-body">Vehicles: {b.resources.vehiclesAssigned}</div></div>
            </div>
            <ul style={{ paddingLeft: 18, lineHeight: 1.8 }}>
              {b.assignments.map((a) => (
                <li key={a.id}>
                  {a.dayNumber != null ? `Day ${a.dayNumber}: ` : ''}
                  {a.guide ? `Guide ${a.guide.firstName} ${a.guide.lastName}` : ''}
                  {a.hotel ? (a.guide ? ', ' : '') + `Hotel ${a.hotel.name}` : ''}
                  {a.vehicle ? (a.guide || a.hotel ? ', ' : '') + `Vehicle ${a.vehicle.name}` : ''}
                  {a.notes ? ` — ${a.notes}` : ''}
                </li>
              ))}
              {b.assignments.length === 0 ? <li>No resources assigned yet.</li> : null}
            </ul>
          </Card>

          <Card
            title={`Checklists (${b.checklists.completed}/${b.checklists.total})`}
            action={
              <form onSubmit={addChecklist} style={{ display: 'flex', gap: 8 }}>
                <Input label="" name="title" placeholder="Add checklist item" value={newItem} onChange={(e) => setNewItem(e.target.value)} />
                <Button type="submit">Add</Button>
              </form>
            }
          >
            <ul style={{ paddingLeft: 18, lineHeight: 2 }}>
              {b.checklists.items.map((c) => (
                <li key={c.id}>
                  {c.isCompleted ? '☑' : '☐'}{' '}
                  <button className="btn btn-ghost" onClick={() => completeItem(c.id, c.isCompleted)}>
                    {c.title}
                  </button>
                  {c.category ? <Badge>{c.category}</Badge> : null}
                </li>
              ))}
              {b.checklists.items.length === 0 ? <li>No checklist items yet.</li> : null}
            </ul>
          </Card>

          <Card title={`Bookings (${b.bookings.length})`}>
            <ul style={{ paddingLeft: 18, lineHeight: 1.8 }}>
              {b.bookings.map((bk) => (
                <li key={bk.id}>
                  <Badge>{bk.status}</Badge> {bk.bookingNumber} — {bk.paxCount} pax
                </li>
              ))}
              {b.bookings.length === 0 ? <li>No confirmed bookings yet.</li> : null}
            </ul>
          </Card>
        </>
      ) : (
        <div className="empty-state">Select a departure to view its trip board.</div>
      )}
    </div>
  );
}
