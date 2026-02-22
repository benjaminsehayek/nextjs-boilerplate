// Content Strategy Constants

// Industry service type
export interface IndustryService {
  name: string;
  profit: number;
  close: number;
}

// Industry profile type
export interface IndustryProfile {
  key: string;
  name: string;
  defaultProfit: number;
  defaultClose: number;
  services: IndustryService[];
}

// 18 Industry profiles with default economics
export const INDUSTRY_PROFILES: IndustryProfile[] = [
  {
    key: 'plumbing', name: 'Plumbing', defaultProfit: 280, defaultClose: 45,
    services: [
      { name: 'Drain Cleaning', profit: 180, close: 55 },
      { name: 'Water Heater Repair', profit: 320, close: 42 },
      { name: 'Water Heater Installation', profit: 650, close: 35 },
      { name: 'Pipe Repair', profit: 350, close: 40 },
      { name: 'Sewer Line Repair', profit: 800, close: 30 },
      { name: 'Toilet Repair', profit: 150, close: 60 },
      { name: 'Faucet Installation', profit: 120, close: 55 },
      { name: 'Garbage Disposal', profit: 200, close: 50 },
      { name: 'Sump Pump', profit: 400, close: 35 },
      { name: 'Gas Line Repair', profit: 500, close: 30 },
      { name: 'Leak Detection', profit: 250, close: 45 },
      { name: 'Bathroom Remodel', profit: 2500, close: 20 },
      { name: 'Emergency Plumbing', profit: 350, close: 65 },
      { name: 'Backflow Prevention', profit: 300, close: 40 },
      { name: 'Water Softener', profit: 450, close: 30 },
      { name: 'Hydro Jetting', profit: 350, close: 35 },
      { name: 'Commercial Plumbing', profit: 600, close: 25 },
      { name: 'Tankless Water Heater', profit: 800, close: 25 },
    ],
  },
  {
    key: 'electrical', name: 'Electrical', defaultProfit: 300, defaultClose: 40,
    services: [
      { name: 'Electrical Repair', profit: 250, close: 50 },
      { name: 'Panel Upgrade', profit: 800, close: 30 },
      { name: 'Outlet Installation', profit: 150, close: 55 },
      { name: 'Lighting Installation', profit: 300, close: 45 },
      { name: 'Ceiling Fan Installation', profit: 200, close: 50 },
      { name: 'Generator Installation', profit: 1200, close: 20 },
      { name: 'EV Charger Installation', profit: 500, close: 35 },
      { name: 'Wiring & Rewiring', profit: 600, close: 30 },
      { name: 'Smoke Detector Installation', profit: 120, close: 55 },
      { name: 'Surge Protection', profit: 250, close: 40 },
      { name: 'Emergency Electrical', profit: 350, close: 60 },
      { name: 'Commercial Electrical', profit: 700, close: 25 },
    ],
  },
  {
    key: 'hvac', name: 'HVAC', defaultProfit: 400, defaultClose: 35,
    services: [
      { name: 'AC Repair', profit: 300, close: 55 },
      { name: 'AC Installation', profit: 1500, close: 25 },
      { name: 'Furnace Repair', profit: 300, close: 50 },
      { name: 'Furnace Installation', profit: 1200, close: 25 },
      { name: 'Heat Pump', profit: 1000, close: 25 },
      { name: 'Duct Cleaning', profit: 250, close: 40 },
      { name: 'Ductwork', profit: 600, close: 30 },
      { name: 'Thermostat Installation', profit: 150, close: 50 },
      { name: 'HVAC Maintenance', profit: 150, close: 45 },
      { name: 'Indoor Air Quality', profit: 400, close: 30 },
      { name: 'Mini Split', profit: 800, close: 30 },
      { name: 'Emergency HVAC', profit: 400, close: 60 },
      { name: 'Commercial HVAC', profit: 800, close: 20 },
    ],
  },
  {
    key: 'roofing', name: 'Roofing', defaultProfit: 1500, defaultClose: 25,
    services: [
      { name: 'Roof Repair', profit: 500, close: 45 },
      { name: 'Roof Replacement', profit: 3000, close: 20 },
      { name: 'Roof Inspection', profit: 200, close: 50 },
      { name: 'Gutter Installation', profit: 400, close: 40 },
      { name: 'Gutter Cleaning', profit: 150, close: 55 },
      { name: 'Metal Roofing', profit: 3500, close: 15 },
      { name: 'Shingle Repair', profit: 350, close: 45 },
      { name: 'Flat Roof', profit: 2000, close: 20 },
      { name: 'Storm Damage', profit: 1000, close: 40 },
      { name: 'Skylight Installation', profit: 600, close: 30 },
      { name: 'Commercial Roofing', profit: 5000, close: 15 },
      { name: 'Emergency Roof Repair', profit: 800, close: 55 },
    ],
  },
  {
    key: 'landscaping', name: 'Landscaping', defaultProfit: 250, defaultClose: 40,
    services: [
      { name: 'Lawn Care', profit: 100, close: 55 },
      { name: 'Landscape Design', profit: 1500, close: 20 },
      { name: 'Hardscaping', profit: 2000, close: 20 },
      { name: 'Irrigation', profit: 500, close: 35 },
      { name: 'Tree Trimming', profit: 300, close: 40 },
      { name: 'Mulching', profit: 150, close: 50 },
      { name: 'Sod Installation', profit: 400, close: 35 },
      { name: 'Retaining Wall', profit: 1200, close: 25 },
      { name: 'Patio Installation', profit: 1500, close: 25 },
      { name: 'Outdoor Lighting', profit: 400, close: 35 },
      { name: 'Snow Removal', profit: 150, close: 50 },
      { name: 'Commercial Landscaping', profit: 500, close: 25 },
    ],
  },
  {
    key: 'painting', name: 'Painting', defaultProfit: 400, defaultClose: 35,
    services: [
      { name: 'Interior Painting', profit: 500, close: 40 },
      { name: 'Exterior Painting', profit: 800, close: 30 },
      { name: 'Cabinet Painting', profit: 600, close: 35 },
      { name: 'Deck Staining', profit: 350, close: 40 },
      { name: 'Pressure Washing', profit: 200, close: 50 },
      { name: 'Drywall Repair', profit: 250, close: 45 },
      { name: 'Wallpaper', profit: 400, close: 30 },
      { name: 'Popcorn Ceiling Removal', profit: 500, close: 35 },
      { name: 'Commercial Painting', profit: 1200, close: 20 },
      { name: 'Epoxy Flooring', profit: 600, close: 30 },
    ],
  },
  {
    key: 'concrete', name: 'Concrete', defaultProfit: 800, defaultClose: 30,
    services: [
      { name: 'Concrete Driveway', profit: 1500, close: 25 },
      { name: 'Concrete Patio', profit: 1200, close: 30 },
      { name: 'Concrete Repair', profit: 400, close: 45 },
      { name: 'Stamped Concrete', profit: 2000, close: 20 },
      { name: 'Foundation Repair', profit: 2500, close: 20 },
      { name: 'Sidewalk', profit: 600, close: 35 },
      { name: 'Concrete Leveling', profit: 800, close: 30 },
      { name: 'Decorative Concrete', profit: 1500, close: 25 },
      { name: 'Commercial Concrete', profit: 3000, close: 15 },
    ],
  },
  {
    key: 'flooring', name: 'Flooring', defaultProfit: 600, defaultClose: 35,
    services: [
      { name: 'Hardwood Flooring', profit: 1200, close: 30 },
      { name: 'Laminate Flooring', profit: 500, close: 40 },
      { name: 'Tile Flooring', profit: 800, close: 35 },
      { name: 'Carpet Installation', profit: 400, close: 40 },
      { name: 'Vinyl Flooring', profit: 500, close: 40 },
      { name: 'Floor Refinishing', profit: 600, close: 35 },
      { name: 'Epoxy Flooring', profit: 700, close: 30 },
      { name: 'Commercial Flooring', profit: 1500, close: 20 },
    ],
  },
  {
    key: 'auto-body', name: 'Auto Body', defaultProfit: 500, defaultClose: 40,
    services: [
      { name: 'Collision Repair', profit: 800, close: 45 },
      { name: 'Dent Repair', profit: 250, close: 55 },
      { name: 'Paint Job', profit: 600, close: 35 },
      { name: 'Frame Repair', profit: 1200, close: 30 },
      { name: 'Bumper Repair', profit: 350, close: 50 },
      { name: 'Scratch Repair', profit: 200, close: 55 },
      { name: 'Windshield Replacement', profit: 300, close: 50 },
      { name: 'Insurance Claims', profit: 500, close: 40 },
      { name: 'Classic Car Restoration', profit: 2000, close: 15 },
    ],
  },
  {
    key: 'pest-control', name: 'Pest Control', defaultProfit: 200, defaultClose: 50,
    services: [
      { name: 'General Pest Control', profit: 150, close: 55 },
      { name: 'Termite Treatment', profit: 500, close: 35 },
      { name: 'Bed Bug Treatment', profit: 400, close: 40 },
      { name: 'Rodent Control', profit: 250, close: 50 },
      { name: 'Mosquito Control', profit: 150, close: 45 },
      { name: 'Wildlife Removal', profit: 350, close: 40 },
      { name: 'Ant Control', profit: 150, close: 55 },
      { name: 'Commercial Pest Control', profit: 300, close: 35 },
      { name: 'Crawl Space Treatment', profit: 400, close: 30 },
    ],
  },
  {
    key: 'cleaning', name: 'Cleaning', defaultProfit: 150, defaultClose: 50,
    services: [
      { name: 'House Cleaning', profit: 120, close: 55 },
      { name: 'Deep Cleaning', profit: 250, close: 45 },
      { name: 'Move In/Out Cleaning', profit: 300, close: 50 },
      { name: 'Office Cleaning', profit: 200, close: 40 },
      { name: 'Carpet Cleaning', profit: 200, close: 50 },
      { name: 'Window Cleaning', profit: 150, close: 50 },
      { name: 'Post Construction', profit: 400, close: 35 },
      { name: 'Janitorial Services', profit: 250, close: 35 },
    ],
  },
  {
    key: 'garage-door', name: 'Garage Door', defaultProfit: 350, defaultClose: 45,
    services: [
      { name: 'Garage Door Repair', profit: 250, close: 55 },
      { name: 'Garage Door Installation', profit: 800, close: 30 },
      { name: 'Spring Replacement', profit: 200, close: 60 },
      { name: 'Opener Installation', profit: 250, close: 50 },
      { name: 'Panel Replacement', profit: 350, close: 40 },
      { name: 'Emergency Garage Door', profit: 350, close: 60 },
      { name: 'Commercial Garage Door', profit: 1000, close: 25 },
    ],
  },
  {
    key: 'general-contractor', name: 'General Contractor', defaultProfit: 2000, defaultClose: 20,
    services: [
      { name: 'Home Addition', profit: 5000, close: 15 },
      { name: 'Kitchen Remodel', profit: 3000, close: 20 },
      { name: 'Bathroom Remodel', profit: 2500, close: 25 },
      { name: 'Basement Finishing', profit: 3000, close: 20 },
      { name: 'Deck Building', profit: 1500, close: 30 },
      { name: 'Room Addition', profit: 4000, close: 15 },
      { name: 'Siding', profit: 1500, close: 25 },
      { name: 'Window Replacement', profit: 800, close: 30 },
      { name: 'Door Installation', profit: 400, close: 40 },
      { name: 'Commercial Construction', profit: 8000, close: 10 },
    ],
  },
  {
    key: 'remodeling', name: 'Remodeling', defaultProfit: 2500, defaultClose: 22,
    services: [
      { name: 'Kitchen Remodel', profit: 3000, close: 20 },
      { name: 'Bathroom Remodel', profit: 2500, close: 25 },
      { name: 'Basement Remodel', profit: 3000, close: 20 },
      { name: 'Whole Home Remodel', profit: 8000, close: 10 },
      { name: 'Master Suite', profit: 4000, close: 18 },
      { name: 'Closet Remodel', profit: 800, close: 35 },
      { name: 'Laundry Room', profit: 1500, close: 30 },
      { name: 'Aging in Place', profit: 2000, close: 25 },
    ],
  },
  {
    key: 'tree-service', name: 'Tree Service', defaultProfit: 400, defaultClose: 40,
    services: [
      { name: 'Tree Removal', profit: 800, close: 35 },
      { name: 'Tree Trimming', profit: 300, close: 50 },
      { name: 'Stump Grinding', profit: 200, close: 55 },
      { name: 'Emergency Tree Service', profit: 1000, close: 55 },
      { name: 'Tree Health Assessment', profit: 150, close: 40 },
      { name: 'Land Clearing', profit: 2000, close: 20 },
      { name: 'Pruning', profit: 250, close: 45 },
      { name: 'Commercial Tree Service', profit: 600, close: 25 },
    ],
  },
  {
    key: 'solar', name: 'Solar', defaultProfit: 3000, defaultClose: 15,
    services: [
      { name: 'Solar Panel Installation', profit: 5000, close: 12 },
      { name: 'Solar Repair', profit: 500, close: 40 },
      { name: 'Battery Storage', profit: 2000, close: 15 },
      { name: 'Solar Roof', profit: 8000, close: 8 },
      { name: 'Commercial Solar', profit: 10000, close: 10 },
      { name: 'Solar Maintenance', profit: 200, close: 45 },
      { name: 'EV Charging + Solar', profit: 3000, close: 15 },
    ],
  },
  {
    key: 'fencing', name: 'Fencing', defaultProfit: 500, defaultClose: 35,
    services: [
      { name: 'Wood Fence', profit: 600, close: 35 },
      { name: 'Vinyl Fence', profit: 700, close: 35 },
      { name: 'Chain Link Fence', profit: 400, close: 40 },
      { name: 'Iron Fence', profit: 900, close: 25 },
      { name: 'Fence Repair', profit: 250, close: 50 },
      { name: 'Gate Installation', profit: 400, close: 40 },
      { name: 'Privacy Fence', profit: 700, close: 35 },
      { name: 'Commercial Fencing', profit: 1500, close: 20 },
    ],
  },
  {
    key: 'custom', name: 'Custom / Other', defaultProfit: 300, defaultClose: 35,
    services: [
      { name: 'Service 1', profit: 300, close: 35 },
      { name: 'Service 2', profit: 300, close: 35 },
      { name: 'Service 3', profit: 300, close: 35 },
    ],
  },
];

// Funnel conversion multipliers
export const FUNNEL_MULT = { bottom: 3.0, middle: 1.5, top: 0.5 } as const;

// CTR by Google position (averages)
export const CTR_BY_POSITION: Record<number, number> = {
  1: 0.284, 2: 0.155, 3: 0.11, 4: 0.08, 5: 0.062,
  6: 0.048, 7: 0.038, 8: 0.031, 9: 0.026, 10: 0.022,
  11: 0.015, 12: 0.012, 13: 0.010, 14: 0.008, 15: 0.006,
};
export const DEFAULT_CTR = 0.11; // position 3

// Page type patterns for classifying crawled pages
export const PAGE_TYPE_PATTERNS = {
  blog: [/\/blog\//i, /\/news\//i, /\/article/i, /\/tips\//i, /\/guide\//i, /\/how-to/i, /\/faq/i],
  service: [/\/service/i, /\/what-we-do/i],
  location: [/\/area/i, /\/location/i, /\/city/i, /\/service-area/i, /\/areas-served/i, /\/serving/i],
};

// Keyword modifier lists for generation
export const KW_MODIFIERS = [
  'best', 'affordable', 'emergency', '24 hour', 'licensed', 'professional',
  'local', 'cheap', 'top rated', 'reliable', 'trusted', 'fast',
  'same day', 'residential', 'commercial', 'certified',
];

export const KW_QUESTIONS = [
  'how to', 'when to', 'signs you need', 'diy', 'cost of',
  'how much does', 'what is', 'why do', 'when should',
  'benefits of', 'pros and cons of', 'vs',
];

// Location codes for DataForSEO
export const LOCATION_CODES: Record<string, number> = {
  'United States': 2840,
  'Canada': 2124,
  'United Kingdom': 2826,
  'Australia': 2036,
};
