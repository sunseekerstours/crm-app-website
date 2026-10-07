// Customised Tours & Operational Checklist Types & Store

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
    description: 'Rooming reservations submitted and confirmed booking vouchers received from suppliers',
    isCompleted: false,
    isRequired: true,
  },
  {
    phase: 'SITES',
    title: 'Tour Sites & Attraction Permits Booked',
    description: 'Entry fees, national park permits (Kakum, Cape Coast, Mole, etc.) and guide appointments reserved',
    isCompleted: false,
    isRequired: true,
  },
  {
    phase: 'FLEET',
    title: 'Transport / Fleet Vehicle & Driver Allocated',
    description: 'Vehicle booked on Fleet Timeline, driver assigned, and operations per diem approved',
    isCompleted: false,
    isRequired: true,
  },
  {
    phase: 'GUIDE',
    title: 'Licensed Tour Guide Assigned & Briefed',
    description: 'Lead professional guide assigned with detailed itinerary and tourist emergency contacts',
    isCompleted: false,
    isRequired: true,
  },
  {
    phase: 'EXECUTION',
    title: 'Pre-Tour Tourist Briefing & Welcome Pack Sent',
    description: 'Tourist packet with emergency contacts, packing checklist, and meeting points shared',
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

export function createDefaultChecklist(): TourChecklistItem[] {
  return DEFAULT_CHECKLIST_TEMPLATES.map((item, idx) => ({
    ...item,
    id: `chk_${Date.now()}_${idx}`,
  }));
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

const STORAGE_KEY = 'sunseekers_custom_tours_ops_v1';

export function getStoredCustomTours(): CustomTour[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getSampleCustomTours();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return getSampleCustomTours();
  }
}

export function saveStoredCustomTours(tours: CustomTour[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tours));
  } catch (e) {
    console.warn('Failed to save custom tours to storage', e);
  }
}

export function getSampleCustomTours(): CustomTour[] {
  return [
    {
      id: 'ct_sample_01',
      tourName: 'Smith Family 5-Day Heritage Experience',
      tourType: 'INDIVIDUAL',
      clientName: 'Dr. Amanda & Marcus Smith',
      customerId: '',
      destinations: 'Accra, Cape Coast, Elmina, Kakum',
      startDate: '2026-10-15',
      endDate: '2026-10-19',
      durationDays: 5,
      paxCount: 3,
      quotedPrice: 3850,
      currency: 'USD',
      operationsLead: 'Kofi Mensah',
      contactPhone: '+233 24 555 1201',
      contactEmail: 'amanda.smith@example.com',
      hotelPreference: 'Ridge Royal Hotel / Coconut Grove',
      specialRequests: 'Child booster seat needed for 6-year-old; 1 vegetarian guest',
      status: 'LOGISTICS_IN_PROGRESS',
      checklist: [
        {
          id: 'chk_1_1',
          phase: 'ITINERARY',
          title: 'Custom Itinerary Finalized & Approved',
          description: '5-Day Coastal Heritage route signed off by client',
          isCompleted: true,
          completedAt: '2026-10-02T10:30:00Z',
          completedBy: 'Kofi Mensah',
          isRequired: true,
        },
        {
          id: 'chk_1_2',
          phase: 'ACCOMMODATION',
          title: 'Hostel / Hotel / Lodging Booked & Confirmed',
          description: 'Coconut Grove Beach Resort Deluxe Ocean Suites reserved',
          isCompleted: true,
          completedAt: '2026-10-04T14:15:00Z',
          completedBy: 'Kofi Mensah',
          isRequired: true,
        },
        {
          id: 'chk_1_3',
          phase: 'SITES',
          title: 'Tour Sites & Attraction Permits Booked',
          description: 'Cape Coast Castle & Kakum Canopy Walk VIP tour reserved',
          isCompleted: true,
          completedAt: '2026-10-05T09:00:00Z',
          completedBy: 'Kofi Mensah',
          isRequired: true,
        },
        {
          id: 'chk_1_4',
          phase: 'FLEET',
          title: 'Transport / Fleet Vehicle & Driver Allocated',
          description: 'Executive Prado Van allocated on Fleet Timeline',
          isCompleted: false,
          isRequired: true,
        },
        {
          id: 'chk_1_5',
          phase: 'GUIDE',
          title: 'Licensed Tour Guide Assigned & Briefed',
          description: 'Senior Heritage Guide assigned',
          isCompleted: false,
          isRequired: true,
        },
        {
          id: 'chk_1_6',
          phase: 'EXECUTION',
          title: 'Pre-Tour Tourist Briefing & Welcome Pack Sent',
          description: 'Briefing deck and WhatsApp group created',
          isCompleted: false,
          isRequired: false,
        },
        {
          id: 'chk_1_7',
          phase: 'EXECUTION',
          title: 'Tour Done & Safely Executed',
          description: 'Trip concluded safely',
          isCompleted: false,
          isRequired: true,
        },
        {
          id: 'chk_1_8',
          phase: 'EXECUTION',
          title: 'Post-Tour Review & Customer Feedback Collected',
          description: 'Review and photo dossier sent to family',
          isCompleted: false,
          isRequired: false,
        },
      ],
      createdAt: '2026-10-01T08:00:00Z',
      updatedAt: '2026-10-05T09:00:00Z',
    },
    {
      id: 'ct_sample_02',
      tourName: 'Howard University Alumni 10-Day Ghana Immersion',
      tourType: 'GROUP',
      clientName: 'Howard Alumni Association (East Coast Chapter)',
      customerId: '',
      destinations: 'Accra, Kumasi, Cape Coast, Volta Region, Shai Hills',
      startDate: '2026-11-01',
      endDate: '2026-11-10',
      durationDays: 10,
      paxCount: 24,
      quotedPrice: 42000,
      currency: 'USD',
      operationsLead: 'Ebenezer Quaye',
      contactPhone: '+1 202 555 0199',
      contactEmail: 'tours@howardalumni.org',
      hotelPreference: 'Lancaster Hotel Kumasi & Labadi Beach Hotel',
      specialRequests: 'Chieftaincy welcoming durbar at Manhyia; naming ceremony robes for 24 pax',
      status: 'PLANNING',
      checklist: [
        {
          id: 'chk_2_1',
          phase: 'ITINERARY',
          title: 'Custom Itinerary Finalized & Approved',
          description: 'Full 10-day cultural & academic program approved',
          isCompleted: true,
          completedAt: '2026-09-28T16:00:00Z',
          completedBy: 'Ebenezer Quaye',
          isRequired: true,
        },
        {
          id: 'chk_2_2',
          phase: 'ACCOMMODATION',
          title: 'Hostel / Hotel / Lodging Booked & Confirmed',
          description: 'Rooming lists for 24 guests across Accra & Kumasi hotels',
          isCompleted: false,
          isRequired: true,
        },
        {
          id: 'chk_2_3',
          phase: 'SITES',
          title: 'Tour Sites & Attraction Permits Booked',
          description: 'Manhyia Palace museum, Prempeh II Jubilee museum, Kakum & Castles',
          isCompleted: false,
          isRequired: true,
        },
        {
          id: 'chk_2_4',
          phase: 'FLEET',
          title: 'Transport / Fleet Vehicle & Driver Allocated',
          description: '33-seater Luxury Coach #SST-04 requested on Fleet Timeline',
          isCompleted: false,
          isRequired: true,
        },
        {
          id: 'chk_2_5',
          phase: 'GUIDE',
          title: 'Licensed Tour Guide Assigned & Briefed',
          description: 'Two licensed national guides required for group size',
          isCompleted: false,
          isRequired: true,
        },
        {
          id: 'chk_2_6',
          phase: 'EXECUTION',
          title: 'Pre-Tour Tourist Briefing & Welcome Pack Sent',
          description: 'Zoom pre-departure orientation scheduled',
          isCompleted: false,
          isRequired: false,
        },
        {
          id: 'chk_2_7',
          phase: 'EXECUTION',
          title: 'Tour Done & Safely Executed',
          description: 'Complete all tour legs safely',
          isCompleted: false,
          isRequired: true,
        },
        {
          id: 'chk_2_8',
          phase: 'EXECUTION',
          title: 'Post-Tour Review & Customer Feedback Collected',
          description: 'Group evaluation and commemorative certificate distribution',
          isCompleted: false,
          isRequired: false,
        },
      ],
      createdAt: '2026-09-25T11:00:00Z',
      updatedAt: '2026-09-28T16:00:00Z',
    },
    {
      id: 'ct_sample_03',
      tourName: 'Solo Adventurer 3-Day Wli & Volta Highlights',
      tourType: 'INDIVIDUAL',
      clientName: 'Chloe Dupont',
      customerId: '',
      destinations: 'Akosombo, Wli Waterfalls, Tafi Atome Monkey Sanctuary',
      startDate: '2026-10-09',
      endDate: '2026-10-11',
      durationDays: 3,
      paxCount: 1,
      quotedPrice: 1150,
      currency: 'USD',
      operationsLead: 'Ama Serwaa',
      contactPhone: '+33 6 12 34 56 78',
      contactEmail: 'chloe.dupont@gmail.com',
      hotelPreference: 'Wli Water Heights Lodge',
      specialRequests: 'Early morning hike to upper falls; photographer guide',
      status: 'READY_FOR_DEPARTURE',
      checklist: [
        {
          id: 'chk_3_1',
          phase: 'ITINERARY',
          title: 'Custom Itinerary Finalized & Approved',
          description: 'Hiking route to upper falls confirmed',
          isCompleted: true,
          completedAt: '2026-10-04T11:00:00Z',
          completedBy: 'Ama Serwaa',
          isRequired: true,
        },
        {
          id: 'chk_3_2',
          phase: 'ACCOMMODATION',
          title: 'Hostel / Hotel / Lodging Booked & Confirmed',
          description: 'Wli Water Heights Eco-chalet booked',
          isCompleted: true,
          completedAt: '2026-10-04T12:00:00Z',
          completedBy: 'Ama Serwaa',
          isRequired: true,
        },
        {
          id: 'chk_3_3',
          phase: 'SITES',
          title: 'Tour Sites & Attraction Permits Booked',
          description: 'Community permits at Tafi Atome and Wli park office',
          isCompleted: true,
          completedAt: '2026-10-05T10:00:00Z',
          completedBy: 'Ama Serwaa',
          isRequired: true,
        },
        {
          id: 'chk_3_4',
          phase: 'FLEET',
          title: 'Transport / Fleet Vehicle & Driver Allocated',
          description: '4x4 SUV booked on timeline, driver briefed',
          isCompleted: true,
          completedAt: '2026-10-05T14:30:00Z',
          completedBy: 'Ama Serwaa',
          isRequired: true,
        },
        {
          id: 'chk_3_5',
          phase: 'GUIDE',
          title: 'Licensed Tour Guide Assigned & Briefed',
          description: 'Local Volta naturalist guide appointed',
          isCompleted: true,
          completedAt: '2026-10-05T15:00:00Z',
          completedBy: 'Ama Serwaa',
          isRequired: true,
        },
        {
          id: 'chk_3_6',
          phase: 'EXECUTION',
          title: 'Pre-Tour Tourist Briefing & Welcome Pack Sent',
          description: 'Packing instructions (hiking shoes, rain gear) delivered',
          isCompleted: true,
          completedAt: '2026-10-06T09:00:00Z',
          completedBy: 'Ama Serwaa',
          isRequired: false,
        },
        {
          id: 'chk_3_7',
          phase: 'EXECUTION',
          title: 'Tour Done & Safely Executed',
          description: 'Tour scheduled to begin Oct 9',
          isCompleted: false,
          isRequired: true,
        },
        {
          id: 'chk_3_8',
          phase: 'EXECUTION',
          title: 'Post-Tour Review & Customer Feedback Collected',
          description: 'Pending completion',
          isCompleted: false,
          isRequired: false,
        },
      ],
      createdAt: '2026-10-03T10:00:00Z',
      updatedAt: '2026-10-06T09:00:00Z',
    },
  ];
}
