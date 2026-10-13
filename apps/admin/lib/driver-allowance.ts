// Driver & Tour Guide Allowance Calculation Engine
// Supports both:
// 1. INTERNAL ALLOWANCE: Based on official Sunseekers Tours Circular CIRCULAR/SST/22/ADMIN/4/2025 (Effective Feb 1, 2025)
//    - Meal rate included in allowance. Graded by group pax size: Over 20, 10–19, 6–9, Less than 5 pax, & Fam Tours.
//    - Full day vs Half day activities for both Drivers and Tour Guides.
// 2. EXTERNAL ALLOWANCE: Operational schedule for outside rented/contract drivers:
//    - Within Accra: GH₵100/day (0 lodging)
//    - Outside Accra (1 day): GH₵200 same-day return (0 lodging)
//    - Outside Accra (2+ days): GH₵100/day outstation + GH₵200 return day + GH₵250 lodging/night

export type AllowanceType = 'INTERNAL' | 'EXTERNAL';
export type ActivityType = 'FULL_DAY' | 'HALF_DAY' | 'FAM_TOUR';
export type PaxGroupTier = 'OVER_20' | '10_TO_19' | '6_TO_9' | 'LESS_THAN_5';

export interface InternalRateTableItem {
  label: string;
  paxRangeLabel: string;
  driverFullDay: number;
  guideFullDay: number;
  driverHalfDay: number;
  guideHalfDay: number;
}

// Circular SST/22/ADMIN/4/2025 Rate Schedule
export const INTERNAL_RATES: Record<PaxGroupTier, InternalRateTableItem> = {
  OVER_20: {
    label: 'Over 20 Pax',
    paxRangeLabel: '21+ Passengers',
    driverFullDay: 300,
    guideFullDay: 450,
    driverHalfDay: 180,
    guideHalfDay: 225,
  },
  '10_TO_19': {
    label: '10 – 19 Pax',
    paxRangeLabel: '10 to 20 Passengers',
    driverFullDay: 240,
    guideFullDay: 360,
    driverHalfDay: 150,
    guideHalfDay: 195,
  },
  '6_TO_9': {
    label: '6 – 9 Pax',
    paxRangeLabel: '6 to 9 Passengers',
    driverFullDay: 195,
    guideFullDay: 300,
    driverHalfDay: 135,
    guideHalfDay: 180,
  },
  LESS_THAN_5: {
    label: 'Less than 5 Pax',
    paxRangeLabel: '1 to 5 Passengers',
    driverFullDay: 180,
    guideFullDay: 240,
    driverHalfDay: 120,
    guideHalfDay: 160,
  },
};

export const FAM_TOUR_RATES = {
  LESS_THAN_5: {
    label: 'Fam Tour (< 5 Pax)',
    driverRate: 180,
    guideRate: 180,
    note: 'Driver & Guide out-of-pocket expenses (Staff: GH₵0)',
  },
  MORE_THAN_5: {
    label: 'Fam Tour (> 5 Pax)',
    driverRate: 240,
    guideRate: 240,
    note: 'Driver & Guide out-of-pocket expenses (Staff: GH₵0)',
  },
};

export interface DriverAllowanceOptions {
  allowanceType?: AllowanceType; // 'INTERNAL' or 'EXTERNAL'
  paxCount?: number;             // Passenger count (used for Internal tiers)
  activityType?: ActivityType;   // 'FULL_DAY', 'HALF_DAY', 'FAM_TOUR'
  includeGuide?: boolean;        // Include Tour Guide calculation
}

export interface DriverAllowanceCalculation {
  days: number;
  nights: number;
  isOutside: boolean;
  freeAccommodation: boolean;
  allowanceType: AllowanceType;
  activityType: ActivityType;
  paxCount: number;
  paxTier: PaxGroupTier;
  paxTierLabel: string;

  // Rate per day
  driverDailyRate: number;
  guideDailyRate: number;

  // Totals
  dailyAllowanceTotal: number;
  guideAllowanceTotal: number;
  accommodationTotal: number;
  totalDriverExpense: number; // Driver allowance + Driver accommodation
  grandTotalExpense: number;  // Driver + Guide + Accommodation

  allowanceBreakdown: string;
  accommodationBreakdown: string;
  guideBreakdown?: string;
  itemizedLines: { label: string; amount: number; note: string }[];
}

const ACCRA_KEYWORDS = [
  'accra', 'airport', 'kotoka', 'osu', 'east legon', 'legon', 'cantonments',
  'tema', 'spintex', 'dzorwulu', 'labadi', 'circle', 'madina', 'achimota',
  'dansoman', 'ridge', 'airport residential', 'adabraka', 'roman ridge',
  'lapaz', 'sakumono', 'lashibi', 'haatso', 'north kaneshie', 'kaneshie'
];

const OUTSIDE_ACCRA_KEYWORDS = [
  'aburi', 'cape coast', 'elmina', 'kumasi', 'takoradi', 'tamale', 'koforidua',
  'ho', 'volta', 'shai hills', 'senchi', 'akosombo', 'ada', 'ada foah',
  'mole', 'sunyani', 'wa', 'bolgatanga', 'kakum', 'boti', 'wli', 'aflao',
  'keta', 'nkawkaw', 'obasi', 'tarkwa', 'winneba', 'saltpond', 'mankessim',
  'akropong', 'akropong-akuapem', 'somanya', 'atimpoku', 'anomabo', 'busua'
];

/**
 * Intelligent location scope detection. Returns true if destination is outside Accra.
 */
export function detectOutsideAccra(destination?: string | null): boolean {
  if (!destination) return false;
  const d = destination.toLowerCase().trim();
  if (!d) return false;

  for (const kw of OUTSIDE_ACCRA_KEYWORDS) {
    if (d.includes(kw)) return true;
  }
  for (const kw of ACCRA_KEYWORDS) {
    if (d.includes(kw)) return false;
  }
  return d.length > 2;
}

/**
 * Returns the Pax Group Tier based on passenger count.
 */
export function getPaxTier(pax: number): PaxGroupTier {
  if (pax > 20) return 'OVER_20';
  if (pax >= 10) return '10_TO_19';
  if (pax >= 6) return '6_TO_9';
  return 'LESS_THAN_5';
}

/**
 * Calculates itemized driver (and guide) allowance and accommodation per diem.
 * Supports both INTERNAL (Circular SST/2025) and EXTERNAL (Outside driver) systems.
 */
export function calculateDriverAllowance(
  days: number,
  isOutside: boolean,
  freeAccommodation: boolean = false,
  options?: DriverAllowanceOptions
): DriverAllowanceCalculation {
  const safeDays = Math.max(1, days);
  const nights = Math.max(0, safeDays - 1);
  const allowanceType = options?.allowanceType || 'INTERNAL';
  const activityType = options?.activityType || 'FULL_DAY';
  const paxCount = Math.max(0, options?.paxCount ?? 1);
  const includeGuide = !!options?.includeGuide;
  const paxTier = getPaxTier(paxCount);
  const tierConfig = INTERNAL_RATES[paxTier];

  const itemizedLines: { label: string; amount: number; note: string }[] = [];

  // =========================================================================
  // SYSTEM 1: INTERNAL ALLOWANCE (Sunseekers Tours Circular SST/22/ADMIN/4/2025)
  // =========================================================================
  if (allowanceType === 'INTERNAL') {
    let driverDailyRate = 0;
    let guideDailyRate = 0;
    let tierDescription = '';

    if (activityType === 'FAM_TOUR') {
      const isMoreThan5 = paxCount > 5;
      driverDailyRate = isMoreThan5 ? FAM_TOUR_RATES.MORE_THAN_5.driverRate : FAM_TOUR_RATES.LESS_THAN_5.driverRate;
      guideDailyRate = isMoreThan5 ? FAM_TOUR_RATES.MORE_THAN_5.guideRate : FAM_TOUR_RATES.LESS_THAN_5.guideRate;
      tierDescription = isMoreThan5 ? 'Fam Tour (> 5 Pax)' : 'Fam Tour (≤ 5 Pax)';
    } else if (activityType === 'HALF_DAY') {
      driverDailyRate = tierConfig.driverHalfDay;
      guideDailyRate = tierConfig.guideHalfDay;
      tierDescription = `${tierConfig.label} (Half Day)`;
    } else {
      // Default: Full Day Activities
      driverDailyRate = tierConfig.driverFullDay;
      guideDailyRate = tierConfig.guideFullDay;
      tierDescription = `${tierConfig.label} (Full Day)`;
    }

    const dailyAllowanceTotal = safeDays * driverDailyRate;
    const guideAllowanceTotal = includeGuide ? safeDays * guideDailyRate : 0;

    // Outstation lodging: if trip is outside Accra and multi-day, standard driver lodging per night applies
    // (unless free accommodation is provided by client/lodge as noted in circular)
    const accommodationTotal = (isOutside && !freeAccommodation) ? (nights * 250) : 0;

    // Build itemized breakdown lines
    for (let i = 1; i <= safeDays; i++) {
      itemizedLines.push({
        label: `Day ${i} Internal Driver Allowance`,
        amount: driverDailyRate,
        note: `${tierDescription} • SST Circular 2025 (incl. meals)`,
      });
      if (includeGuide) {
        itemizedLines.push({
          label: `Day ${i} Tour Guide Allowance`,
          amount: guideDailyRate,
          note: `${tierDescription} • Guide official allowance`,
        });
      }
    }

    if (isOutside && !freeAccommodation && nights > 0) {
      for (let i = 1; i <= nights; i++) {
        itemizedLines.push({
          label: `Night ${i} Driver Overnight Lodging`,
          amount: 250,
          note: 'Outstation driver hotel accommodation',
        });
      }
    }

    const totalDriverExpense = dailyAllowanceTotal + accommodationTotal;
    const grandTotalExpense = totalDriverExpense + guideAllowanceTotal;

    const allowanceBreakdown = `${safeDays} ${safeDays === 1 ? 'day' : 'days'} @ GH₵${driverDailyRate}/day = GH₵${dailyAllowanceTotal} (${tierDescription})`;
    const accommodationBreakdown = isOutside
      ? (freeAccommodation
          ? 'GH₵0 (Accommodation provided by client/lodge)'
          : `${nights} ${nights === 1 ? 'night' : 'nights'} @ GH₵250 = GH₵${accommodationTotal}`)
      : 'GH₵0 (Within Accra — returns home)';

    const guideBreakdown = includeGuide
      ? `${safeDays} ${safeDays === 1 ? 'day' : 'days'} @ GH₵${guideDailyRate}/day = GH₵${guideAllowanceTotal}`
      : undefined;

    return {
      days: safeDays,
      nights,
      isOutside,
      freeAccommodation,
      allowanceType: 'INTERNAL',
      activityType,
      paxCount,
      paxTier,
      paxTierLabel: tierConfig.label,
      driverDailyRate,
      guideDailyRate,
      dailyAllowanceTotal,
      guideAllowanceTotal,
      accommodationTotal,
      totalDriverExpense,
      grandTotalExpense,
      allowanceBreakdown,
      accommodationBreakdown,
      guideBreakdown,
      itemizedLines,
    };
  }

  // =========================================================================
  // SYSTEM 2: EXTERNAL ALLOWANCE (Outside Rented / Contract Drivers)
  // =========================================================================
  // CASE 2A: WITHIN ACCRA
  if (!isOutside) {
    const dailyAllowanceTotal = safeDays * 100;
    const accommodationTotal = 0;
    const totalDriverExpense = dailyAllowanceTotal;

    for (let i = 1; i <= safeDays; i++) {
      itemizedLines.push({
        label: `Day ${i} External Allowance (Accra)`,
        amount: 100,
        note: 'Intra-city standard external allowance',
      });
    }

    return {
      days: safeDays,
      nights: 0,
      isOutside: false,
      freeAccommodation: false,
      allowanceType: 'EXTERNAL',
      activityType,
      paxCount,
      paxTier,
      paxTierLabel: 'External Driver (Intra-City)',
      driverDailyRate: 100,
      guideDailyRate: 0,
      dailyAllowanceTotal,
      guideAllowanceTotal: 0,
      accommodationTotal,
      totalDriverExpense,
      grandTotalExpense: totalDriverExpense,
      allowanceBreakdown: safeDays === 1
        ? '1 day in Accra @ GH₵100 = GH₵100'
        : `${safeDays} days in Accra @ GH₵100/day = GH₵${dailyAllowanceTotal}`,
      accommodationBreakdown: 'GH₵0 (Within Accra — driver returns home)',
      itemizedLines,
    };
  }

  // CASE 2B: 1 DAY OUTSIDE ACCRA (Same-day return)
  if (safeDays === 1) {
    const dailyAllowanceTotal = 200;
    const accommodationTotal = 0;
    const totalDriverExpense = 200;

    itemizedLines.push({
      label: 'Day 1 External Allowance (Outside Accra)',
      amount: 200,
      note: 'Same-day return trip outside Accra (contract driver)',
    });

    return {
      days: 1,
      nights: 0,
      isOutside: true,
      freeAccommodation: false,
      allowanceType: 'EXTERNAL',
      activityType,
      paxCount,
      paxTier,
      paxTierLabel: 'External Driver (Same-Day Outstation)',
      driverDailyRate: 200,
      guideDailyRate: 0,
      dailyAllowanceTotal,
      guideAllowanceTotal: 0,
      accommodationTotal,
      totalDriverExpense,
      grandTotalExpense: 200,
      allowanceBreakdown: '1 day outside Accra = GH₵200',
      accommodationBreakdown: 'GH₵0 (Same-day return trip)',
      itemizedLines,
    };
  }

  // CASE 2C: 2 OR MORE DAYS OUTSIDE ACCRA
  // Days 1 .. (safeDays - 1) = GH₵100 each day
  // Return Day = GH₵200
  // Accommodation for each night away = GH₵250 (unless free accommodation provided)
  const stayOutDays = safeDays - 1;
  const returnDayAllowance = 200;
  const dailyAllowanceTotal = (stayOutDays * 100) + returnDayAllowance;

  for (let i = 1; i <= stayOutDays; i++) {
    itemizedLines.push({
      label: `Day ${i} External Allowance (Outstation)`,
      amount: 100,
      note: 'Daily outstation per diem prior to return',
    });
  }
  itemizedLines.push({
    label: `Day ${safeDays} Return Day External Allowance`,
    amount: 200,
    note: 'Final return trip day allowance',
  });

  const accommodationTotal = freeAccommodation ? 0 : (nights * 250);
  if (!freeAccommodation && nights > 0) {
    for (let i = 1; i <= nights; i++) {
      itemizedLines.push({
        label: `Night ${i} Driver Accommodation`,
        amount: 250,
        note: 'Nightly outstation driver hotel lodging',
      });
    }
  }

  const totalDriverExpense = dailyAllowanceTotal + accommodationTotal;

  const allowanceBreakdown = `${stayOutDays} ${stayOutDays === 1 ? 'day' : 'days'} @ GH₵100 + 1 return day @ GH₵200 = GH₵${dailyAllowanceTotal}`;
  const accommodationBreakdown = freeAccommodation
    ? 'GH₵0 (Accommodation provided by client/resort)'
    : `${nights} ${nights === 1 ? 'night' : 'nights'} @ GH₵250 = GH₵${accommodationTotal}`;

  return {
    days: safeDays,
    nights,
    isOutside: true,
    freeAccommodation,
    allowanceType: 'EXTERNAL',
    activityType,
    paxCount,
    paxTier,
    paxTierLabel: 'External Driver (Outstation)',
    driverDailyRate: 100,
    guideDailyRate: 0,
    dailyAllowanceTotal,
    guideAllowanceTotal: 0,
    accommodationTotal,
    totalDriverExpense,
    grandTotalExpense: totalDriverExpense,
    allowanceBreakdown,
    accommodationBreakdown,
    itemizedLines,
  };
}

/**
 * Formats a clean metadata string for storage in booking notes.
 */
export function formatDriverPerDiemNote(calc: DriverAllowanceCalculation, dest?: string): string {
  const loc = calc.isOutside ? (dest || 'Outside Accra') : 'Within Accra';
  const typeTag = calc.allowanceType === 'INTERNAL' ? 'Internal Allowance' : 'External Allowance';
  const actTag = calc.activityType === 'HALF_DAY' ? ' | Half Day' : (calc.activityType === 'FAM_TOUR' ? ' | Fam Tour' : '');
  const paxTag = calc.allowanceType === 'INTERNAL' ? ` | ${calc.paxCount} Pax (${calc.paxTierLabel})` : '';
  const guideTag = calc.guideAllowanceTotal ? ` | Guide: GH₵${calc.guideAllowanceTotal}` : '';

  return `[DRIVER PER DIEM (${typeTag}): GH₵${calc.totalDriverExpense} | ${calc.days}d (${loc})${actTag}${paxTag} | Allowance: GH₵${calc.dailyAllowanceTotal} (${calc.allowanceBreakdown}) | Lodging: GH₵${calc.accommodationTotal} (${calc.accommodationBreakdown})${guideTag}]`;
}

/**
 * Parses existing driver per diem metadata from booking notes if present.
 */
export function parseDriverPerDiemNote(notes?: string | null): {
  total?: number;
  allowance?: number;
  lodging?: number;
  allowanceType?: AllowanceType;
  activityType?: ActivityType;
  raw?: string;
} | null {
  if (!notes) return null;
  const match = notes.match(/\[DRIVER PER DIEM(?:\s*\((.*?)\))?:\s*GH₵(\d+)(?:.*?Allowance:\s*GH₵(\d+))?(?:.*?Lodging:\s*GH₵(\d+))?.*?\]/i);
  if (!match) return null;

  const rawType = (match[1] || '').toLowerCase();
  const allowanceType: AllowanceType = rawType.includes('external') ? 'EXTERNAL' : 'INTERNAL';

  const rawLower = notes.toLowerCase();
  const activityType: ActivityType = rawLower.includes('half day')
    ? 'HALF_DAY'
    : (rawLower.includes('fam tour') ? 'FAM_TOUR' : 'FULL_DAY');

  return {
    total: match[2] ? parseInt(match[2], 10) : undefined,
    allowance: match[3] ? parseInt(match[3], 10) : undefined,
    lodging: match[4] ? parseInt(match[4], 10) : undefined,
    allowanceType,
    activityType,
    raw: match[0],
  };
}
