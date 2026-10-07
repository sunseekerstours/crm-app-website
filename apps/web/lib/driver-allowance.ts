// Driver Allowance & Accommodation Calculation Engine
// Based on Sunseekers Tours operational per diem guidelines:
// 1 day in Accra = 100 GHS (0 accommodation)
// 1 day outside Accra = 200 GHS (0 accommodation - same-day return)
// 2 days or more outside Accra = 100 GHS each day outside + 250 GHS accommodation each day outside + 200 GHS on return day
// Example: 3 days in Aburi = 100 + 100 + 200 allowance (= 400 GHS) + 250 + 250 accommodation (= 500 GHS) = 900 GHS total.

export interface DriverAllowanceCalculation {
  days: number;
  nights: number;
  isOutside: boolean;
  freeAccommodation: boolean;
  dailyAllowanceTotal: number;
  accommodationTotal: number;
  totalDriverExpense: number;
  allowanceBreakdown: string;
  accommodationBreakdown: string;
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
  // If destination is specified and doesn't match Accra landmarks, default to outside Accra
  return d.length > 2;
}

/**
 * Calculates itemized driver allowance and accommodation per diem.
 */
export function calculateDriverAllowance(
  days: number,
  isOutside: boolean,
  freeAccommodation: boolean = false
): DriverAllowanceCalculation {
  const safeDays = Math.max(1, days);
  const nights = Math.max(0, safeDays - 1);
  const itemizedLines: { label: string; amount: number; note: string }[] = [];

  // CASE 1: WITHIN ACCRA
  if (!isOutside) {
    const dailyAllowanceTotal = safeDays * 100;
    const accommodationTotal = 0;
    const totalDriverExpense = dailyAllowanceTotal;

    for (let i = 1; i <= safeDays; i++) {
      itemizedLines.push({
        label: `Day ${i} Allowance (Accra)`,
        amount: 100,
        note: 'Intra-city standard daily allowance',
      });
    }

    return {
      days: safeDays,
      nights: 0,
      isOutside: false,
      freeAccommodation: false,
      dailyAllowanceTotal,
      accommodationTotal,
      totalDriverExpense,
      allowanceBreakdown: safeDays === 1
        ? '1 day in Accra @ GH₵100 = GH₵100'
        : `${safeDays} days in Accra @ GH₵100/day = GH₵${dailyAllowanceTotal}`,
      accommodationBreakdown: 'GH₵0 (Within Accra — driver returns home)',
      itemizedLines,
    };
  }

  // CASE 2: 1 DAY OUTSIDE ACCRA (Same-day return)
  if (safeDays === 1) {
    const dailyAllowanceTotal = 200;
    const accommodationTotal = 0;
    const totalDriverExpense = 200;

    itemizedLines.push({
      label: 'Day 1 Allowance (Outside Accra)',
      amount: 200,
      note: 'Same-day return trip outside Accra',
    });

    return {
      days: 1,
      nights: 0,
      isOutside: true,
      freeAccommodation: false,
      dailyAllowanceTotal,
      accommodationTotal,
      totalDriverExpense,
      allowanceBreakdown: '1 day outside Accra = GH₵200',
      accommodationBreakdown: 'GH₵0 (Same-day return trip)',
      itemizedLines,
    };
  }

  // CASE 3: 2 OR MORE DAYS OUTSIDE ACCRA
  // Days 1 .. (safeDays - 1) = GH₵100 each day
  // Return Day = GH₵200
  // Accommodation for each night away = GH₵250 (unless free accommodation provided)
  const stayOutDays = safeDays - 1;
  const returnDayAllowance = 200;
  const dailyAllowanceTotal = (stayOutDays * 100) + returnDayAllowance;

  for (let i = 1; i <= stayOutDays; i++) {
    itemizedLines.push({
      label: `Day ${i} Allowance (Outstation)`,
      amount: 100,
      note: 'Daily outstation per diem prior to return',
    });
  }
  itemizedLines.push({
    label: `Day ${safeDays} Return Day Allowance`,
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
    dailyAllowanceTotal,
    accommodationTotal,
    totalDriverExpense,
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
  return `[DRIVER PER DIEM: GH₵${calc.totalDriverExpense} | ${calc.days}d (${loc}) | Allowance: GH₵${calc.dailyAllowanceTotal} (${calc.allowanceBreakdown}) | Lodging: GH₵${calc.accommodationTotal} (${calc.accommodationBreakdown})]`;
}

/**
 * Parses existing driver per diem metadata from booking notes if present.
 */
export function parseDriverPerDiemNote(notes?: string | null): {
  total?: number;
  allowance?: number;
  lodging?: number;
  raw?: string;
} | null {
  if (!notes) return null;
  const match = notes.match(/\[DRIVER PER DIEM: GH₵(\d+)(?:.*?Allowance: GH₵(\d+))?(?:.*?Lodging: GH₵(\d+))?.*?\]/i);
  if (!match) return null;
  return {
    total: match[1] ? parseInt(match[1], 10) : undefined,
    allowance: match[2] ? parseInt(match[2], 10) : undefined,
    lodging: match[3] ? parseInt(match[3], 10) : undefined,
    raw: match[0],
  };
}
