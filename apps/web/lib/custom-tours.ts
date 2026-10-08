// Customised Tours & Operational Checklist Types & Store
import { api } from '@/lib/api';

export type TourType = 'INDIVIDUAL' | 'GROUP';

export type TourOpsStatus =
  | 'PLANNING'
  | 'LOGISTICS_IN_PROGRESS'
  | 'READY_FOR_DEPARTURE'
  | 'ON_TOUR'
  | 'COMPLETED'
  | 'CANCELLED';

export interface TourChecklistItem {
  id: string;
  phase: 'ITINERARY' | 'ACCOMMODATION' | 'SITES' | 'FLEET' | 'GUIDE' | 'EXECUTION' | 'CUSTOM';
  title: string;
  description?: string;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
  isRequired: boolean;
}

export interface CustomTour {
  id: string;
  tourName: string;
  tourType: TourType;
  clientName: string;
  customerId?: string;
  destinations: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  paxCount: number;
  quotedPrice: number;
  currency: string;
  operationsLead: string;
  contactPhone?: string;
  contactEmail?: string;
  hotelPreference?: string;
  assignedVehicleId?: string;
  assignedDriverName?: string;
  assignedGuideName?: string;
  assignedGuidePhone?: string;
  specialRequests?: string;
  status: TourOpsStatus;
  checklist: TourChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_CHECKLIST_TEMPLATES: Omit<TourChecklistItem, 'id'>[] = [
  {
    phase: 'ITINERARY',
    title: 'Custom Itinerary Finalized & Approved',
    description: 'Day-by-day routing, timing, and meal plans approved by tourist or group leader',
    isCompleted: false,
    isRequired: true,
  },
  {
    phase: 'ACCOMMODATION',
    title: 'Hostel / Hotel / Lodging Booked & Confirmed',
    description: 'Rooms, check-in vouchers, and hotel booking receipts confirmed',
    isCompleted: false,
    isRequired: true,
  },
  {
    phase: 'SITES',
    title: 'Tour Sites & Attraction Permits Booked',
    description: 'All site tickets, heritage entry permits, and activity passes pre-booked',
    isCompleted: false,
    isRequired: true,
  },
  {
    phase: 'FLEET',
    title: 'Transport / Fleet Vehicle & Driver Allocated',
    description: 'Vehicle booked on Fleet Timeline, driver assigned, and per diem computed',
    isCompleted: false,
    isRequired: true,
  },
  {
    phase: 'GUIDE',
    title: 'Licensed Tour Guide Assigned & Briefed',
    description: 'Lead cultural/nature tour guide assigned, contracted, and debriefed with itinerary copy',
    isCompleted: false,
    isRequired: true,
  },
  {
    phase: 'EXECUTION',
    title: 'Tourist Pre-Trip Briefing Delivered',
    description: 'Tourist packet sent: emergency contacts, weather advice, and pickup timing confirmed',
    isCompleted: false,
    isRequired: false,
  },
  {
    phase: 'EXECUTION',
    title: 'Tour Done & Safely Executed',
    description: 'Trip commenced, all scheduled operational legs completed safely for our tourists',
    isCompleted: false,
    isRequired: true,
  },
  {
    phase: 'EXECUTION',
    title: 'Post-Tour Review & Customer Feedback Collected',
    description: 'Debrief completed, tourist review recorded, and supplier reconciliation finalized',
    isCompleted: false,
    isRequired: false,
  },
];

export function createDefaultChecklist(assignedGuideName?: string): TourChecklistItem[] {
  return DEFAULT_CHECKLIST_TEMPLATES.map((item, idx) => {
    const isGuideItem = item.phase === 'GUIDE';
    const guideAssigned = isGuideItem && !!assignedGuideName?.trim();
    return {
      ...item,
      id: `chk_${Date.now()}_${idx}`,
      description: guideAssigned
        ? `Lead Tour Guide Assigned: ${assignedGuideName?.trim()}`
        : item.description,
      isCompleted: guideAssigned ? true : item.isCompleted,
      completedAt: guideAssigned ? new Date().toISOString() : undefined,
      completedBy: guideAssigned ? 'Operations Setup' : undefined,
    };
  });
}

export function computeChecklistProgress(checklist: TourChecklistItem[]): {
  completed: number;
  total: number;
  percent: number;
  allRequiredDone: boolean;
} {
  if (!checklist || checklist.length === 0) {
    return { completed: 0, total: 0, percent: 0, allRequiredDone: false };
  }
  const completed = checklist.filter((i) => i.isCompleted).length;
  const total = checklist.length;
  const percent = Math.round((completed / total) * 100);
  const required = checklist.filter((i) => i.isRequired);
  const allRequiredDone = required.every((i) => i.isCompleted);
  return { completed, total, percent, allRequiredDone };
}

export function getAutoStatus(checklist: TourChecklistItem[]): TourOpsStatus {
  const { percent, allRequiredDone } = computeChecklistProgress(checklist);
  const tourDoneItem = checklist.find((i) => i.title.toLowerCase().includes('tour done'));
  if (tourDoneItem?.isCompleted) {
    return 'COMPLETED';
  }
  if (allRequiredDone || percent >= 75) {
    return 'READY_FOR_DEPARTURE';
  }
  if (percent > 0) {
    return 'LOGISTICS_IN_PROGRESS';
  }
  return 'PLANNING';
}

const STORAGE_KEY = 'sunseekers_custom_tours_ops_v2';

export function getStoredCustomTours(): CustomTour[] {
  if (typeof window === 'undefined') return [];
  try {
    // Force purge old v1 mock cache keys
    localStorage.removeItem('sunseekers_custom_tours_ops_v1');
    localStorage.removeItem('sunseekers_custom_tours_ops');

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Filter out any mock/sample items so operational side starts cleanly from scratch
      const clean = parsed.filter((t: any) => 
        !t.id?.startsWith('ct_sample_') &&
        !t.tourName?.includes('Smith Family') &&
        !t.tourName?.includes('Howard University') &&
        !t.tourName?.includes('Solo Adventurer')
      );
      if (clean.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
      }
      return clean;
    }
    return [];
  } catch {
    return [];
  }
}

export function saveStoredCustomTours(tours: CustomTour[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('sunseekers_custom_tours_ops_v1');
    const clean = tours.filter((t) => 
      !t.id?.startsWith('ct_sample_') &&
      !t.tourName?.includes('Smith Family') &&
      !t.tourName?.includes('Howard University') &&
      !t.tourName?.includes('Solo Adventurer')
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch (e) {
    console.warn('Failed to save custom tours to storage', e);
  }
}

/**
 * Fetch global custom tours from the server/PostgreSQL database.
 * Falls back to local cache if network is unavailable.
 */
export async function fetchServerCustomTours(): Promise<CustomTour[]> {
  try {
    const serverTours = await api.get<CustomTour[]>('/tours/custom-operations');
    if (Array.isArray(serverTours)) {
      const clean = serverTours.filter((t: any) => 
        !t.id?.startsWith('ct_sample_') &&
        !t.tourName?.includes('Smith Family') &&
        !t.tourName?.includes('Howard University') &&
        !t.tourName?.includes('Solo Adventurer')
      );
      saveStoredCustomTours(clean);
      return clean;
    }
  } catch (e) {
    console.warn('Could not fetch custom tours from backend server, using local cache:', e);
  }
  return getStoredCustomTours();
}

/**
 * Synchronize custom tours globally to all users via backend PostgreSQL database.
 */
export async function syncServerCustomTours(tours: CustomTour[]): Promise<boolean> {
  const clean = tours.filter((t) => 
    !t.id?.startsWith('ct_sample_') &&
    !t.tourName?.includes('Smith Family') &&
    !t.tourName?.includes('Howard University') &&
    !t.tourName?.includes('Solo Adventurer')
  );
  // Save locally first for instant UI response
  saveStoredCustomTours(clean);
  // Sync globally to server
  try {
    await api.put('/tours/custom-operations', { tours: clean });
    return true;
  } catch (e) {
    console.warn('Failed to persist custom tours to server database:', e);
    return false;
  }
}

export async function clearAllCustomTours(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sunseekers_custom_tours_ops_v1');
    localStorage.removeItem('sunseekers_custom_tours_ops_v2');
    localStorage.removeItem('sunseekers_custom_tours_ops');
  }
  try {
    await api.put('/tours/custom-operations', { tours: [] });
  } catch (e) {
    console.warn('Failed to clear custom tours on server:', e);
  }
}

export function getSampleCustomTours(): CustomTour[] {
  return [];
}
