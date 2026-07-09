import { City } from "../models/City";
import { LocationMaster } from "../models/LocationMaster";
import { Project } from "../models/Project";
import { Blog } from "../models/Blog";
import { GalleryItem } from "../models/GalleryItem";
import { Enquiry } from "../models/Enquiry";
import { User } from "../models/User";
import { UserSessionLog } from "../models/UserSessionLog";
import { JobApplication } from "../models/JobApplication";
import { PropertyType } from "../models/PropertyType";
import { Facing } from "../models/Facing";
import { Amenity } from "../models/Amenity";
import { SiteVisit } from "../models/SiteVisit";
import { MailConfig } from "../models/MailConfig";
import { MarketingAgent } from "../models/MarketingAgent";

const INITIAL_CITIES = [
  { id: 'c1', name: 'Visakhapatnam' },
  { id: 'c2', name: 'Vijayawada' },
  { id: 'c3', name: 'Guntur' }
];

const INITIAL_PROPERTY_TYPES = [
  { id: 'pt1', name: 'Plots' },
  { id: 'pt2', name: '1 BHK' },
  { id: 'pt3', name: '2 BHK' },
  { id: 'pt4', name: '3 BHK' },
  { id: 'pt5', name: '4 BHK' },
  { id: 'pt6', name: 'Villa' }
];

const INITIAL_FACINGS = [
  { id: 'f1', name: 'North' },
  { id: 'f2', name: 'East' },
  { id: 'f3', name: 'West' },
  { id: 'f4', name: 'South' },
  { id: 'f5', name: 'North East' },
  { id: 'f6', name: 'North West' }
];

const INITIAL_AMENITIES = [
  { id: 'a1', name: 'Clubhouse' },
  { id: 'a2', name: 'Gymnasium' },
  { id: 'a3', name: 'Swimming Pool' },
  { id: 'a4', name: 'Gated Security' }
];

const INITIAL_LOCATIONS = [
  { id: 'loc1', name: 'Madhurawada', cityId: 'c1' },
  { id: 'loc2', name: 'Sheela Nagar', cityId: 'c1' },
  { id: 'loc3', name: 'Atchutapuram', cityId: 'c1' },
  { id: 'loc4', name: 'Bhogapuram', cityId: 'c1' },
  { id: 'loc5', name: 'Pendurthi', cityId: 'c1' },
  { id: 'loc6', name: 'Bheemili', cityId: 'c1' },
  { id: 'loc7', name: 'Lawsons Bay', cityId: 'c1' },
  { id: 'loc8', name: 'Anandapuram', cityId: 'c1' },
  { id: 'loc9', name: 'Gunadala', cityId: 'c2' },
  { id: 'loc10', name: 'Yanamalakuduru', cityId: 'c2' },
  { id: 'loc11', name: 'Penamaluru', cityId: 'c2' },
  { id: 'loc12', name: 'Moghalrajpuram', cityId: 'c2' },
  { id: 'loc13', name: 'Mangalagiri', cityId: 'c3' }
];

const INITIAL_USERS = [
  {
    id: 'u1',
    username: 'admin',
    role: 'Admin' as const,
    name: 'J. K. Rama Rao',
    email: 'ramarao@jkfutureinfra.com',
    password: 'admin123',
    allowedScreens: ['dashboard', 'projects', 'marketing', 'sites', 'gallery', 'blogs', 'project_enquiries', 'marketing_enquiries', 'careers', 'users', 'masters']
  }
];

const INITIAL_PROJECTS = [
  {
    id: 'p1',
    name: 'JK Grand Horizon',
    category: 'Villas',
    status: 'Ongoing',
    location: 'Madhurawada, Visakhapatnam',
    description: 'A premium gated community villa project nestled in the scenic hills of Madhurawada. Offering ultra-luxury 4 BHK triplex villas with state-of-the-art home automation, private swimming pools, individual elevators, and massive landscaped terrace gardens. JK Grand Horizon is designed for those who appreciate premium craftsmanship and a serene lifestyle near the coast.',
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80'
    ],
    highlights: [
      '4 BHK Triplex Luxury Villas (4200 - 5500 Sq.Ft.)',
      'Private Swimming Pool & Private Elevator in each Villa',
      '100% Vastu Compliant and IGBC Certified Green Project',
      '24/7 Multi-tier Smart Security with CCTV Surveillance',
      '20,000 Sq.Ft. Clubhouse with Infinity Pool, Spa, and Gym'
    ],
    timeline: [
      { id: 't1_1', date: 'Jan 2025', title: 'Project Scaffolding & Excavation', desc: 'Site grading and initial excavation works completed successfully.' },
      { id: 't1_2', date: 'May 2025', title: 'Foundation & Substructure', desc: 'Raft foundation and concrete pouring for all villa blocks completed.' },
      { id: 't1_3', date: 'Oct 2025', title: 'Superstructure Phase 1', desc: 'Slab casting completed up to 2nd floor for Phase-1 blocks.' },
      { id: 't1_4', date: 'Jun 2026', title: 'Plastering & Internal Wiring', desc: 'Internal brickwork, piping, electrical wiring, and plastering in progress.' },
      { id: 't1_5', date: 'Dec 2026', title: 'Expected Handover', desc: 'Final finishing, landscaping, and handing over possession to homeowners.' }
    ],
    amenities: [
      'Clubhouse', 'Swimming Pool', 'Gymnasium', 'Jogging Track', 'Tennis Court',
      'Children Play Area', 'Amphitheatre', 'Solar Street Lighting', 'Rainwater Harvesting', 'Mini Theatre'
    ],
    floorPlans: [
      { id: 'f1_1', title: 'Ground Floor Plan', image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60' },
      { id: 'f1_2', title: 'First Floor Plan', image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&auto=format&fit=crop&q=60' },
      { id: 'f1_3', title: 'Second Floor Plan', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=60' }
    ],
    priceRange: '₹2.25 Cr - ₹3.50 Cr',
    priceValue: 22500000,
    paymentPlans: [
      '10% Booking Amount',
      '15% within 30 days of booking',
      '10% on completion of foundation',
      '10% on completion of Ground Floor slab',
      '10% on completion of 1st Floor slab',
      '10% on completion of 2nd Floor slab',
      '15% on completion of brickwork and plastering',
      '10% on completion of flooring and sanitary fittings',
      '10% on Handover of Villa'
    ],
    mapCoordinates: { lat: 17.8016, lng: 83.3411 },
    brochureUrl: '#',
    featured: true,
    facing: 'East',
    city: 'Visakhapatnam',
    microLocation: 'Madhurawada',
    floors: 3,
    unitsCount: 24,
    availabilityDetails: '4 BHK: 12',
    specImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60',
    isMarketing: false
  },
  {
    id: 'p2',
    name: 'JK Emerald Heights',
    category: 'Flats',
    status: 'Ongoing',
    location: 'Gunadala, Vijayawada',
    description: 'JK Emerald Heights offers modern, spacious 2 & 3 BHK premium apartments designed for comfort, ventilation, and natural light. Centrally located in Gunadala, Vijayawada, this high-rise gated community features beautiful panoramic views of the city, supreme connectivity, and 30+ premium amenities for a dynamic urban lifestyle.',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&auto=format&fit=crop&q=80'
    ],
    highlights: [
      'Premium 2 & 3 BHK Apartments (1150 - 1850 Sq.Ft.)',
      'Excellent location with close proximity to hospitals, schools, and malls',
      'No common walls design ensuring absolute privacy',
      'Beautifully landscaped podium gardens and walking tracks',
      'Power backup for common areas and flat lights'
    ],
    timeline: [
      { id: 't2_1', date: 'Mar 2025', title: 'Excavation & Piling', desc: 'Deep pile foundation for high-rise tower blocks completed.' },
      { id: 't2_2', date: 'Aug 2025', title: 'Cellar Slab Concrete', desc: 'Double basement parking structure slab completed.' },
      { id: 't2_3', date: 'Jan 2026', title: '5th Floor Slab Casted', desc: 'Structural framework casting reached the 5th floor.' },
      { id: 't2_4', date: 'Jun 2026', title: '10th Floor Construction', desc: 'Formwork and steel binding in progress for the 10th-floor slab.' },
      { id: 't2_5', date: 'Jun 2027', title: 'Project Handover', desc: 'Finishing works, external painting, and possession.' }
    ],
    amenities: [
      'Clubhouse', 'Gymnasium', 'Jogging Track', 'Children Play Area', 'Rooftop Garden',
      '24/7 Security', 'Supermarket Space', 'Yoga & Meditation Hall', 'Rainwater Harvesting', 'Indoor Games'
    ],
    floorPlans: [
      { id: 'f2_1', title: '2 BHK Typical Floor Plan', image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60' },
      { id: 'f2_2', title: '3 BHK Typical Floor Plan', image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&auto=format&fit=crop&q=60' }
    ],
    priceRange: '₹65 L - ₹95 L',
    priceValue: 6500000,
    paymentPlans: [
      'Booking Amount: ₹2,00,000',
      '15% within 15 days of booking',
      '10% on casting of Cellar Slab',
      '5% on casting of Ground Floor slab',
      '5% on casting of respective floor slab',
      '15% on completion of brickwork of respective flat',
      '10% on completion of plastering of respective flat',
      '10% on completion of flooring and bathroom tiling',
      '5% during electrical and painting fittings',
      '5% on handover'
    ],
    mapCoordinates: { lat: 16.5186, lng: 80.6558 },
    brochureUrl: '#',
    featured: true,
    facing: 'West',
    city: 'Vijayawada',
    microLocation: 'Gunadala',
    floors: 10,
    unitsCount: 120,
    availabilityDetails: '2 BHK: 15, 3 BHK: 20',
    specImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60',
    isMarketing: false
  },
  {
    id: 'p3',
    name: 'JK Royal Enclave',
    category: 'Individual Houses',
    status: 'Completed',
    location: 'Vidya Nagar, Guntur',
    description: 'JK Royal Enclave is an premium collection of independent individual houses designed for traditional Indian families. Featuring classic elegance, independent compound walls, municipal water connections, spacious layouts, and high-quality construction materials. Successfully delivered to all happy homeowners in Guntur.',
    images: [
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80'
    ],
    highlights: [
      'Independent Duplex Houses (3 BHK)',
      '100% completed project with Immediate Registration',
      'Individual Borewell and Municipal water storage',
      'Premium teakwood main door and UPVC window systems',
      'Private parking space for sedan car and two-wheelers'
    ],
    timeline: [
      { id: 't3_1', date: 'Feb 2024', title: 'Foundation Stone', desc: 'Construction initiated.' },
      { id: 't3_2', date: 'Jul 2024', title: 'Slab Concrete Casted', desc: 'Ground and first-floor slabs poured.' },
      { id: 't3_3', date: 'Dec 2024', title: 'Finishing & Painting', desc: 'Plastering, painting, and fixtures installed.' },
      { id: 't3_4', date: 'Apr 2025', title: 'Handover Ceremony', desc: 'Keys successfully handed over to clients.' }
    ],
    amenities: [
      'Independent Compound Wall', 'Private Car Parking', '24/7 Water Supply', 'Individual Terrace', '100% Vastu'
    ],
    floorPlans: [],
    priceRange: '₹1.80 Cr - ₹2.10 Cr',
    priceValue: 18000000,
    paymentPlans: [
      '100% Payment on Handover'
    ],
    mapCoordinates: { lat: 17.7289, lng: 83.3364 },
    brochureUrl: '#',
    featured: false,
    facing: 'South',
    city: 'Visakhapatnam',
    microLocation: 'Lawsons Bay',
    floors: 5,
    unitsCount: 20,
    availabilityDetails: '3 BHK: 3',
    specImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60',
    isMarketing: false
  },
  {
    id: 'p7',
    name: 'JK Industrial Gateway',
    category: 'Sites',
    subCategory: 'Development Sites',
    status: 'Ongoing',
    location: 'Anandapuram, Visakhapatnam',
    description: 'JK Industrial Gateway offers premium large-scale development and commercial land parcels strategically located on the Visakhapatnam-Bhubaneswar highway corridor. Ideal for warehousing, logistics yards, cold storage plants, or manufacturing divisions. Completely clear title with immediate registration.',
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&auto=format&fit=crop&q=80'
    ],
    highlights: [
      'Large-scale commercial development land plots (1 to 5 Acres)',
      'Immediate registration with 100% clear title ownership',
      'Direct frontage on Visakhapatnam-Bhubaneswar National Highway',
      'Industrial grade water connection and high voltage power lines'
    ],
    timeline: [
      { id: 't7_1', date: 'Jan 2026', title: 'Layout Approvals', desc: 'VMRDA commercial conversion certificate obtained.' },
      { id: 't7_2', date: 'Jun 2026', title: 'Road Leveling', desc: '40-feet wide BT approach roads in progress.' }
    ],
    amenities: [
      'BT Roads', 'Industrial Power line', 'Water Connection', 'Secure Fencing', 'Security Post'
    ],
    floorPlans: [
      { id: 'f7_1', title: 'Master Land Layout Plan', image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60' }
    ],
    priceRange: '₹1.50 Cr - ₹3.00 Cr',
    priceValue: 15000000,
    paymentPlans: [
      '20% Booking Amount',
      '80% at Registration'
    ],
    mapCoordinates: { lat: 17.8631, lng: 83.3154 },
    brochureUrl: '#',
    featured: false,
    facing: 'North',
    city: 'Visakhapatnam',
    microLocation: 'Anandapuram',
    floors: 0,
    unitsCount: 12,
    availabilityDetails: 'Plots: 4',
    specImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60',
    isMarketing: false
  },
  {
    id: 'p8',
    name: 'JK Paradise Beach Venture',
    category: 'Sites',
    subCategory: 'Ventures',
    status: 'Upcoming',
    location: 'Bheemili, Visakhapatnam',
    description: 'JK Paradise Beach Venture is a premium gated community residential plot layout situated right on the scenic Bheemili coastal corridor. Experience the luxury of sea-breeze living inside a fully developed layout with black-top roads, underground utilities, overhead water tanks, landscaped children parks, and round-the-clock gated security.',
    images: [
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&auto=format&fit=crop&q=80'
    ],
    highlights: [
      'Premium sea-breeze gating plot community (180 - 400 Sq. Yards)',
      'Elegant entrance arch with complete perimeter boundary wall',
      'Underground electricity lines and drainage pipelines connection',
      'Overhead water tank and avenue parks fully developed'
    ],
    timeline: [
      { id: 't8_1', date: 'Jul 2026', title: 'Venture Launch', desc: 'Pre-launch bookings opened for first 30 plots.' },
      { id: 't8_2', date: 'Nov 2026', title: 'Roads & Parks', desc: 'Laying internal blacktop roads and trees plantation.' }
    ],
    amenities: [
      'Theme Entrance Arch', 'Underground Utilities', 'Children Park', 'Avenue Plantation', '24/7 Security Gate'
    ],
    floorPlans: [
      { id: 'f8_1', title: 'Venture Master Layout Map', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=60' }
    ],
    priceRange: '₹45 L - ₹90 L',
    priceValue: 4500000,
    paymentPlans: [
      '25% Booking advance',
      '50% in developmental stages',
      '25% on registration'
    ],
    mapCoordinates: { lat: 17.8994, lng: 83.4561 },
    brochureUrl: '#',
    featured: false,
    facing: 'East',
    city: 'Visakhapatnam',
    microLocation: 'Bheemili',
    floors: 0,
    unitsCount: 110,
    availabilityDetails: 'Plots: 75',
    specImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=60',
    isMarketing: false
  }
];

const INITIAL_MARKETING = [
  {
    id: 'm1',
    name: 'JK Aurelia Towers',
    category: 'Flats',
    status: 'Upcoming',
    location: 'Sheela Nagar, Visakhapatnam',
    description: 'JK Aurelia Towers is an upcoming high-rise apartment marvel featuring 2 & 3 BHK modern smart homes. Strategically located near the highway and airport corridor in Sheela Nagar, Visakhapatnam, this premium project offers sky-lounge amenities, infinity pools, and robust structural engineering. Designed for smart professionals seeking connectivity and a high-end lifestyle.',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80'
    ],
    highlights: [
      'RERA Approved High-Rise smart flats',
      'Modern 2 & 3 BHK configurations (1200 - 1900 Sq.Ft.)',
      'Rooftop sky garden with open-air theatre and jogging track',
      'Close proximity to Visakhapatnam International Airport',
      'Equipped with smart home automated security systems'
    ],
    timeline: [
      { id: 'tm1_1', date: 'Oct 2026', title: 'Groundbreaking Ceremony', desc: 'Official launch and foundation stone laying.' },
      { id: 'tm1_2', date: 'Feb 2027', title: 'Excavation & Piling', desc: 'Excavation and subgrade preparation.' }
    ],
    amenities: [
      'Rooftop Garden', 'Clubhouse', 'Swimming Pool', 'Smart Home Automation', 'Gymnasium',
      '24/7 Security', 'Elevators', 'Power Backup'
    ],
    floorPlans: [
      { id: 'fm1_1', title: '2 BHK Smart Layout Plan', image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60' }
    ],
    priceRange: '₹75 L - ₹1.15 Cr',
    priceValue: 7500000,
    paymentPlans: [
      '10% Booking Amount',
      '15% on Agreement execution',
      '75% in construction-linked milestones'
    ],
    mapCoordinates: { lat: 17.7021, lng: 83.2384 },
    brochureUrl: '#',
    featured: true,
    facing: 'East',
    city: 'Visakhapatnam',
    microLocation: 'Sheela Nagar',
    floors: 15,
    unitsCount: 180,
    availabilityDetails: '2 BHK: 40, 3 BHK: 50',
    specImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60',
    isMarketing: true
  },
  {
    id: 'm2',
    name: 'JK Whispering Pines',
    category: 'Villas',
    status: 'Ongoing',
    location: 'Atchutapuram, Visakhapatnam',
    description: 'JK Whispering Pines is an eco-luxury gated community villa layout offering gorgeous 3 & 4 BHK triplex villas. Located in the fast-growing industrial and IT hub of Atchutapuram, Vizag, this premium project features private organic gardens, solar energy systems, water recycling plants, and a colossal designer clubhouse with top-tier recreational amenities.',
    images: [
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80'
    ],
    highlights: [
      'Eco-Luxury Gated Villa community in 15 acres',
      'Spacious 3 & 4 BHK options (3200 - 4500 Sq.Ft.)',
      'Individual solar roofing providing 5KW power per villa',
      'Centralized water softening and purification plant',
      'Beautiful pine forest avenue plantation & parks'
    ],
    timeline: [
      { id: 'tm2_1', date: 'Sep 2025', title: 'Land Leveling & Access roads', desc: 'Completed layout plotting and perimeter gating.' },
      { id: 'tm2_2', date: 'Jan 2026', title: 'Villa Foundations', desc: 'Concrete foundations casted for Phase 1 villas.' }
    ],
    amenities: [
      'Clubhouse', 'Swimming Pool', 'Organic Garden', 'Solar Power Grid', 'Water Softener',
      'Tennis Court', 'Children Play Area', 'Gymnasium'
    ],
    floorPlans: [
      { id: 'fm2_1', title: 'Typical Duplex Villa Layout', image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&auto=format&fit=crop&q=60' }
    ],
    priceRange: '₹1.60 Cr - ₹2.40 Cr',
    priceValue: 16000000,
    paymentPlans: [
      '20% Booking Advance',
      '20% on foundation completion',
      '40% during superstructure work',
      '20% on finishing & handover'
    ],
    mapCoordinates: { lat: 17.5834, lng: 83.0182 },
    brochureUrl: '#',
    featured: true,
    facing: 'East',
    city: 'Visakhapatnam',
    microLocation: 'Atchutapuram',
    floors: 3,
    unitsCount: 45,
    availabilityDetails: '3 BHK: 15, 4 BHK: 10',
    specImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60',
    isMarketing: true
  },
  {
    id: 'm3',
    name: 'JK Heritage Homes',
    category: 'Individual Houses',
    status: 'Ongoing',
    location: 'Yanamalakuduru, Vijayawada',
    description: 'JK Heritage Homes offers premium individual duplex bungalows crafted for single-family occupancy in the serene residential pocket of Yanamalakuduru, Vijayawada. Each individual house has a private boundary, custom interior option, municipal water connection, and structural checks to guarantee durability. Perfect for peaceful retirement or family living.',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&auto=format&fit=crop&q=80'
    ],
    highlights: [
      'Custom Duplex Individual Houses (3 & 4 BHK)',
      'Completely independent layout with zero association fees',
      'High quality Red-brick construction with teakwood accents',
      'Boring water connection and separate sump storage',
      'Strategic location close to Kanaka Durga Varadhi'
    ],
    timeline: [
      { id: 'tm3_1', date: 'Nov 2025', title: 'Structure Excavation', desc: 'Excavation and brick layout started.' },
      { id: 'tm3_2', date: 'Mar 2026', title: 'Slab Casted', desc: 'First floor and roof slab concrete casted successfully.' }
    ],
    amenities: [
      'Independent Sump', 'Teakwood Doors', 'Private Parking', '100% Vastu', 'Overhead Tank', 'Rainwater Drain'
    ],
    floorPlans: [
      { id: 'fm3_1', title: 'Independent House Plan', image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60' }
    ],
    priceRange: '₹1.10 Cr - ₹1.45 Cr',
    priceValue: 11000000,
    paymentPlans: [
      '25% Booking & Registration Advance',
      '50% in construction milestones',
      '25% on key handover'
    ],
    mapCoordinates: { lat: 16.4862, lng: 80.6593 },
    brochureUrl: '#',
    featured: false,
    facing: 'North East',
    city: 'Vijayawada',
    microLocation: 'Yanamalakuduru',
    floors: 2,
    unitsCount: 8,
    availabilityDetails: '3 BHK: 3, 4 BHK: 1',
    specImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60',
    isMarketing: true
  },
  {
    id: 'm4',
    name: 'JK VMRDA Smart City',
    category: 'Sites',
    subCategory: 'VUDA Approved Sites',
    status: 'Ongoing',
    location: 'Bhogapuram, Visakhapatnam',
    description: 'JK VMRDA Smart City is a premium residential plot venture layout located in the high-growth corridor of Bhogapuram, Vizag. Positioned adjacent to the upcoming Bhogapuram International Airport highway, this layout is fully approved by VMRDA (formerly VUDA). Offering top-tier features like broad 60-feet BT main roads, underground power cables, overhead water tanks, and manicured theme parks.',
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&auto=format&fit=crop&q=80'
    ],
    highlights: [
      'VMRDA Approved Mega Plot Layout (150 - 500 Sq. Yards)',
      'Located just 5 minutes away from Bhogapuram Airport',
      'Wide 60ft, 40ft & 33ft black-top roads with Avenue plantation',
      'Underground power cabling, water connection, and sewage systems',
      'Bank loan facility available up to 70% from leading banks'
    ],
    timeline: [
      { id: 'tm12_1', date: 'Dec 2025', title: 'Venture Inception', desc: 'Acquired 35 acres and obtained initial VMRDA plan approval.' },
      { id: 'tm12_2', date: 'Apr 2026', title: 'BT Roads & Infrastructure', desc: 'BT road layouts concrete and avenue landscaping in progress.' }
    ],
    amenities: [
      'VMRDA Approved Layout', '60ft BT Roads', 'Underground Utilities', 'Overhead Tank', 'Children Park',
      'Security Gate', 'Rainwater Harvesting'
    ],
    floorPlans: [
      { id: 'fm12_1', title: 'Master Plan Layout Map', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=60' }
    ],
    priceRange: '₹25 L - ₹60 L',
    priceValue: 2500000,
    paymentPlans: [
      'Booking Amount: ₹2,00,000',
      '40% within 30 days',
      '60% at plot registration'
    ],
    mapCoordinates: { lat: 18.0053, lng: 83.5012 },
    brochureUrl: '#',
    featured: true,
    facing: 'East',
    city: 'Visakhapatnam',
    microLocation: 'Bhogapuram',
    floors: 0,
    unitsCount: 220,
    availabilityDetails: 'Plots: 110',
    specImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=60',
    isMarketing: true
  },
  {
    id: 'm5',
    name: 'JK Subha Giri Colony',
    category: 'Sites',
    subCategory: 'Panchayati Approved Sites',
    status: 'Upcoming',
    location: 'Pendurthi, Visakhapatnam',
    description: 'JK Subha Giri Colony is an upcoming pocket-friendly residential open plot venture layout located in Pendurthi, Visakhapatnam. This layout is Panchayati approved and is targeted for middle-income buyers planning for immediate self-construction. Offering necessary basic amenities like internal asphalt roads, standard electricity poles, and water pipeline networks.',
    images: [
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80'
    ],
    highlights: [
      'Panchayati Approved affordable residential layout',
      'Plots ranging from 120 to 250 Sq. Yards',
      'Located in highly populated residential micro-market of Pendurthi',
      'Excellent connectivity to Pendurthi railway junction and highway',
      'Clear title with spot documentation registration'
    ],
    timeline: [
      { id: 'tm13_1', date: 'Jul 2026', title: 'Project Launch', desc: 'Opening bookings and allocation map.' },
      { id: 'tm13_2', date: 'Nov 2026', title: 'Layout Development', desc: 'Internal road grading and electricity poles installation.' }
    ],
    amenities: [
      'Panchayati Layout', 'Asphalt Roads', 'Electricity Lines', 'Water Pipeline', 'Vastu Compliant', 'Street Lights'
    ],
    floorPlans: [
      { id: 'fm13_1', title: 'Colony Plot Layout Map', image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60' }
    ],
    priceRange: '₹15 L - ₹30 L',
    priceValue: 150000,
    paymentPlans: [
      'Booking advance: 20%',
      '50% on developmental stage',
      '30% on registration'
    ],
    mapCoordinates: { lat: 17.8094, lng: 83.2045 },
    brochureUrl: '#',
    featured: false,
    facing: 'West',
    city: 'Visakhapatnam',
    microLocation: 'Pendurthi',
    floors: 0,
    unitsCount: 75,
    availabilityDetails: 'Plots: 45',
    specImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=60',
    isMarketing: true
  },
  {
    id: 'm6',
    name: 'JK Logistics Hub',
    category: 'Sites',
    subCategory: 'Development Sites',
    status: 'Completed',
    location: 'Mangalagiri, Guntur',
    description: 'JK Logistics Hub is a major commercial industrial development site spanning across 50 acres. Situated in Mangalagiri, Guntur (near NH-16 corridor), the property is fully customized for warehouse layouts, logistics operations, and truck docking yards. Offers premium heavy-duty concrete internal roads, high-tension power supply, and boundary compound security.',
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&auto=format&fit=crop&q=80'
    ],
    highlights: [
      'Mega Commercial Land Parcels (2 to 10 Acres)',
      '100% completed zoning conversion to industrial/commercial category',
      'Direct access to National Highway 16 with wide entry roads',
      'Heavy industrial power lines and high discharge borewell grid'
    ],
    timeline: [
      { id: 'tm14_1', date: 'Mar 2024', title: 'Layout Approvals', desc: 'CRDA commercial clearance certification obtained.' },
      { id: 'tm14_2', date: 'Nov 2024', title: 'Internal Heavy BT Roads', desc: 'BT heavy vehicle road lines finished.' },
      { id: 'tm14_3', date: 'Aug 2025', title: 'Completion & Handover', desc: 'Handed over plots to three logistics companies.' }
    ],
    amenities: [
      'Industrial Power line', 'Heavy BT Roads', 'Security Fencing', 'Water Borewells', 'Commercial Zoning',
      'CCTV System'
    ],
    floorPlans: [
      { id: 'fm14_1', title: 'Commercial Layout Plan', image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60' }
    ],
    priceRange: '₹2.50 Cr - ₹6.00 Cr',
    priceValue: 25000000,
    paymentPlans: [
      '100% Payment at Registration'
    ],
    mapCoordinates: { lat: 16.4312, lng: 80.5623 },
    brochureUrl: '#',
    featured: false,
    facing: 'South',
    city: 'Guntur',
    microLocation: 'Mangalagiri',
    floors: 0,
    unitsCount: 10,
    availabilityDetails: 'Plots: 2',
    specImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60',
    isMarketing: true
  },
  {
    id: 'm7',
    name: 'JK Coconut Grove Resort Ventures',
    category: 'Sites',
    subCategory: 'Ventures',
    status: 'Upcoming',
    location: 'Bheemili, Visakhapatnam',
    description: 'JK Coconut Grove Resort Ventures is a boutique residential beach resort gated venture. Located on the scenic coastal highway of Bheemili, the venture offers beautiful plots amidst mature coconut plantations. The community features a premium beach lounge, wellness cottages, standard BT roads, and modern underground wiring grids.',
    images: [
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80'
    ],
    highlights: [
      'Beachside Boutique Plot Venture layout (200 - 450 Sq. Yards)',
      'Seeded with mature coconut trees for natural aesthetic shading',
      'Exclusive clubhouse membership for beach lounge and gym access',
      'Fully gated secure boundary with solar street fence and guards'
    ],
    timeline: [
      { id: 'tm15_1', date: 'Sep 2026', title: 'Pre-launch Bookings', desc: 'Pre-launch bookings opened with special early-bird discounts.' },
      { id: 'tm15_2', date: 'Jan 2027', title: 'BT Road Laying', desc: 'Laying internal pathways and landscaping.' }
    ],
    amenities: [
      'Beach Lounge Access', 'BT Roads', 'Gated Security', 'Solar Fencing', 'Underground Cabling',
      'Landscape Gardens', 'Resort Membership'
    ],
    floorPlans: [
      { id: 'fm15_1', title: 'Grove Master Layout Map', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=60' }
    ],
    priceRange: '₹50 L - ₹1.00 Cr',
    priceValue: 5000000,
    paymentPlans: [
      '30% Booking Advance',
      '40% during development phases',
      '30% on spot registration'
    ],
    mapCoordinates: { lat: 17.9045, lng: 83.4612 },
    brochureUrl: '#',
    featured: true,
    facing: 'East',
    city: 'Visakhapatnam',
    microLocation: 'Bheemili',
    floors: 0,
    unitsCount: 60,
    availabilityDetails: 'Plots: 35',
    specImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=60',
    isMarketing: true
  },
  {
    id: 'm8',
    name: 'JK Pinecrest Valley',
    category: 'Villas',
    status: 'Upcoming',
    location: 'Madhurawada, Visakhapatnam',
    description: 'JK Pinecrest Valley is an upcoming eco-luxury boutique villa community. Tucked away in a pristine valley setting in Madhurawada, Vizag, this premium project features 3 BHK automated smart villas with private pools, solar roofs, and individual elevators.',
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&auto=format&fit=crop&q=80'
    ],
    highlights: [
      'Boutique Gated Villa community of 20 luxury units',
      '100% solar powered layout with internal greywater plant',
      'Ultra-modern club lounge with gymnasium and library',
      'Excellent road accessibility to IT hills and Rushikonda Beach'
    ],
    timeline: [
      { id: 'tm8_1', date: 'Dec 2026', title: 'Launch & Booking', desc: 'Pre-launch bookings and layout mapping.' }
    ],
    amenities: [
      'Club Lounge', 'Swimming Pool', 'Solar Roofs', 'Private Lift', '24/7 Security', 'Gymnasium'
    ],
    floorPlans: [
      { id: 'fm8_1', title: '3 BHK Villa Layout', image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&auto=format&fit=crop&q=60' }
    ],
    priceRange: '₹2.10 Cr - ₹2.85 Cr',
    priceValue: 21000000,
    paymentPlans: [
      '25% Booking advance',
      '50% in structural stages',
      '25% on final registration'
    ],
    mapCoordinates: { lat: 17.8092, lng: 83.3452 },
    brochureUrl: '#',
    featured: false,
    facing: 'North',
    city: 'Visakhapatnam',
    microLocation: 'Madhurawada',
    floors: 3,
    unitsCount: 20,
    availabilityDetails: '3 BHK: 8 units',
    specImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60',
    isMarketing: true
  },
  {
    id: 'm9',
    name: 'JK Riviera Apartments',
    category: 'Flats',
    status: 'Ongoing',
    location: 'Moghalrajpuram, Vijayawada',
    description: 'JK Riviera Apartments offers ultra-premium 3 & 4 BHK luxury residences. Nestled in the elite neighborhood of Moghalrajpuram, Vijayawada, the high-rise features panoramic views of the Krishna River, VRV air-conditioning, Italian marble floors, and 24/7 high-end security.',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80'
    ],
    highlights: [
      'Super-luxury 3 & 4 BHK flats (2400 - 3800 Sq.Ft.)',
      'Breathtaking panoramic river views from private balconies',
      'VRV centralized air conditioning & home automation',
      'Dedicated 2 covered car parkings with EV charging points'
    ],
    timeline: [
      { id: 'tm9_1', date: 'Jan 2026', title: 'Excavation finished', desc: 'Basement and piling structures completed.' }
    ],
    amenities: [
      'River View Lounge', 'Gymnasium', 'EV Charging Grid', 'Power Backup', 'Rooftop Pool', 'RERA Compliant'
    ],
    floorPlans: [
      { id: 'fm9_1', title: 'Typical 3 BHK Layout', image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60' }
    ],
    priceRange: '₹1.50 Cr - ₹2.60 Cr',
    priceValue: 15000000,
    paymentPlans: [
      '20% Booking Amount',
      '40% in slab milestones',
      '40% on handover'
    ],
    mapCoordinates: { lat: 16.5023, lng: 80.6412 },
    brochureUrl: '#',
    featured: true,
    facing: 'West',
    city: 'Vijayawada',
    microLocation: 'Moghalrajpuram',
    floors: 12,
    unitsCount: 48,
    availabilityDetails: '3 BHK: 6, 4 BHK: 4',
    specImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60',
    isMarketing: true
  },
  {
    id: 'm10',
    name: 'JK VMRDA Heights',
    category: 'Sites',
    subCategory: 'VUDA Approved Sites',
    status: 'Upcoming',
    location: 'Bhogapuram, Visakhapatnam',
    description: 'JK VMRDA Heights is an upcoming premium plotted layout located at the Bhogapuram airport corridor. Approved by VMRDA, the gated community offers 160-350 Sq.Yard plots with first-class infrastructure including BT roads, water sump, electricity connection, and child play parks.',
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&auto=format&fit=crop&q=80'
    ],
    highlights: [
      'VMRDA / RERA Approved plotted layout near airport',
      'Avenue plantation and 40-feet wide BT roads',
      'Underground power cabling and drainage connections',
      'Special pre-launch early booking pricing advantages'
    ],
    timeline: [
      { id: 'tm10_1', date: 'Nov 2026', title: 'Launch Event', desc: 'Pre-launch bookings opening.' }
    ],
    amenities: [
      'VMRDA Approved', '40ft BT Roads', 'Electricity cabling', 'Overhead Tank', 'Security Arch'
    ],
    floorPlans: [
      { id: 'fm10_1', title: 'Venture Master Plan Map', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=60' }
    ],
    priceRange: '₹22 L - ₹45 L',
    priceValue: 2200000,
    paymentPlans: [
      '25% Booking Amount',
      '75% at plot registration'
    ],
    mapCoordinates: { lat: 18.0123, lng: 83.5112 },
    brochureUrl: '#',
    featured: false,
    facing: 'East',
    city: 'Visakhapatnam',
    microLocation: 'Bhogapuram',
    floors: 0,
    unitsCount: 140,
    availabilityDetails: 'Plots: 95',
    specImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=60',
    isMarketing: true
  },
  {
    id: 'm11',
    name: 'JK Krishna Colony',
    category: 'Sites',
    subCategory: 'Panchayati Approved Sites',
    status: 'Ongoing',
    location: 'Penamaluru, Vijayawada',
    description: 'JK Krishna Colony is a gated residential plot layout located in Penamaluru, Vijayawada. This layout is Panchayati approved and is fully developed with internal black-top roads, street lighting, and water tap lines. Located close to schools and hospitals, it offers excellent immediate building opportunity.',
    images: [
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&auto=format&fit=crop&q=80'
    ],
    highlights: [
      'Panchayati Approved residential layout with clear title',
      'Immediate spot registration and plot allotment',
      'Electricity cabling and LED streetlights already laid',
      'Water connection tap for each plot from storage tank'
    ],
    timeline: [
      { id: 'tm11_1', date: 'Aug 2025', title: 'Internal roads completed', desc: 'Internal asphalt road lines finished.' }
    ],
    amenities: [
      'Panchayati layout', 'Streetlights', 'Water storage tank', 'BT Roads', '24/7 Security Gate'
    ],
    floorPlans: [
      { id: 'fm11_1', title: 'Krishna Colony Layout Map', image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60' }
    ],
    priceRange: '₹20 L - ₹38 L',
    priceValue: 2000000,
    paymentPlans: [
      'Booking advance: 20%',
      'Remaining 80% on spot registration'
    ],
    mapCoordinates: { lat: 16.4523, lng: 80.7212 },
    brochureUrl: '#',
    featured: false,
    facing: 'North',
    city: 'Vijayawada',
    microLocation: 'Penamaluru',
    floors: 0,
    unitsCount: 90,
    availabilityDetails: 'Plots: 25',
    specImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=60',
    isMarketing: true
  }
];

const INITIAL_BLOGS = [
  {
    id: 'b1',
    title: 'Why Visakhapatnam is the Hotbed for Real Estate Investment in 2026',
    slug: 'why-visakhapatnam-hotbed-real-estate-investment-2026',
    category: 'Real Estate News',
    summary: 'Explore the key factors driving real estate appreciation in Vizag, from IT expansion to the proposed beach corridor developments.',
    content: `Visakhapatnam, popularly known as the City of Destiny, is witnessing an unprecedented boom in the real estate sector. In 2026, the city has consolidated its position as the premier investment hub of Andhra Pradesh.\n\n### What is driving this boom?\n1. **IT and Corporate Footprint**: Major technology giants and pharma corporations have expanded their operations in the Rushikonda and Madhurawada corridors, creating a massive influx of professionals.\n2. **Infrastructure Enhancements**: The development of the international airport at Bhogapuram, combined with the expansion of the six-lane beach corridor highway, has slashed travel times and opened up sub-markets like Bheemili for massive appreciation.\n3. **Tourism and Scenic Value**: Nestled between the Eastern Ghats and the Bay of Bengal, Visakhapatnam offers a unique combination of coastal luxury and green living, driving demand for premium gated community villas.\n\n### Investment Takeaway\nFor smart investors, the northern suburbs (Madhurawada, Anandapuram, Bheemili) offer potential returns of 15-20% per annum. Acquiring VUDA-approved open plots or high-end villas now secures your position in a highly appreciation-rich zone before values reach saturation.`,
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80',
    date: 'May 10, 2026',
    author: 'J. K. Rama Rao',
    tags: ['Vizag Real Estate', 'Property Investment', 'VMRDA Approved']
  },
  {
    id: 'b2',
    title: '5 Crucial Things to Check Before Buying an Open Plot in Andhra Pradesh',
    slug: '5-things-to-check-before-buying-open-plot-ap',
    category: 'Investment Guides',
    summary: 'A comprehensive checklist for plot buyers to ensure safe registration, clear titles, and government approvals (VUDA/VMRDA/Panchayati).',
    content: `Buying an open plot is one of the most rewarding investments you can make. However, it can also be fraught with legal hurdles if you do not conduct proper due diligence. Here is a guide to help you navigate your next land purchase safely.\n\n### 1. Verification of Layout Approvals\nEnsure the layout is approved by the regional authority. In Visakhapatnam and surrounding areas, look for **VMRDA/VUDA approvals**. For Vijayawada, verify **CRDA approvals**. Avoid layouts that claim to be "under approval process" without concrete documentation.\n\n### 2. Title Deed Search\nA clear title deed is absolute proof of ownership. Hire a legal professional to perform a title search dating back at least 30 years to verify that the seller has absolute rights to sell the plot.\n\n### 3. Check for Encumbrance Certificate (EC)\nThe Encumbrance Certificate proves that the land is free of any monetary or legal liabilities, such as outstanding bank loans, litigation, or ownership disputes. Secure an EC for the last 15 to 30 years from the sub-registrar office.\n\n### 4. Vastu and Layout Connectivity\nIn South India, Vastu compliance is crucial for resale value. Check the plot orientation (East and North facing plots command a premium). Also, verify that the internal roads are at least 33-feet or 40-feet wide as mandated by urban planning norms.\n\n### 5. Check Developer Reputation\nAlways buy from developers with a proven track record of delivering amenities. Reputable companies like JK Future Infra ensure all approvals, drainage, water supply, and electricity grids are fully laid out before handing over plots.`,
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80',
    date: 'Jun 02, 2026',
    author: 'K. Prasad Kumar',
    tags: ['Plot Buying Guide', 'Legal Checklist', 'Vastu Advice']
  },
  {
    id: 'b3',
    title: 'Apartment vs Independent Villa: Which is Better for Your Family?',
    slug: 'apartment-vs-independent-villa-which-better-family',
    category: 'Property Updates',
    summary: 'We break down the pros and cons of flats and villas across cost, privacy, maintenance, community life, and safety parameters.',
    content: `Choosing between a high-rise apartment and a luxury villa gated community is a classic dilemma for home buyers. Each offers a unique lifestyle. Let's compare them across five main parameters:\n\n| Parameter | Apartment (Flat) | Gated Villa |\n|-----------|------------------|-------------|\n| **Privacy** | Low (Shared walls, balconies) | High (Private space & plot area) |\n| **Amenities** | Shared clubhouse & pool | Premium clubhouse, private lawns |\n| **Resale Value**| Stable, grows with inflation | High land share drives higher growth |\n| **Security** | Centralized security gates | High-end multi-tier smart surveillance |\n| **Maintenance**| Low effort, cost split among residents | High effort, self-managed/community fees |\n\n### Why Apartments are popular\nApartments are cost-efficient, located in key city centers, and require minimal maintenance, making them ideal for young nuclear families or retirees.\n\n### Why Gated Villas are premium\nVillas offer the luxury of space, a private garden, individual terrace rights, and absolute privacy. They represent a symbol of achievement and provide a healthier living environment for growing children and seniors.\n\nAt JK Future Infra, we develop both high-density premium apartments like **JK Emerald Heights** and luxury villa estates like **JK Grand Horizon**, ensuring that whatever your choice, you receive world-class construction quality.`,
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&auto=format&fit=crop&q=80',
    date: 'Jun 14, 2026',
    author: 'M. Sriman',
    tags: ['Luxury Villas', 'Apartment Living', 'Home Buying Tips']
  }
];

const INITIAL_GALLERY = [
  {
    id: 'g1',
    title: 'JK Grand Horizon Villa Entrance View',
    category: 'Project Photos',
    type: 'image' as const,
    url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&auto=format&fit=crop&q=80',
    projectAssociation: 'p1',
    date: 'Jan 2026'
  },
  {
    id: 'g2',
    title: 'JK Grand Horizon Interior Living Space',
    category: 'Project Photos',
    type: 'image' as const,
    url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&auto=format&fit=crop&q=80',
    projectAssociation: 'p1',
    date: 'Feb 2026'
  },
  {
    id: 'g3',
    title: 'VMRDA Open Plot Venture Site Layout',
    category: 'Project Photos',
    type: 'image' as const,
    url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&auto=format&fit=crop&q=80',
    projectAssociation: 'p4',
    date: 'Mar 2026'
  },
  {
    id: 'g4',
    title: 'Groundbreaking Ceremony of JK Grand Horizon',
    category: 'Event Photos',
    type: 'image' as const,
    url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80',
    date: 'Jan 2025'
  },
  {
    id: 'g5',
    title: 'Foundation Piling Works at JK Emerald Heights',
    category: 'Construction Progress Updates',
    type: 'image' as const,
    url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&auto=format&fit=crop&q=80',
    projectAssociation: 'p2',
    date: 'Aug 2025'
  },
  {
    id: 'g6',
    title: 'Virtual Project Walkthrough & Design Video',
    category: 'Project Videos',
    type: 'video' as const,
    url: 'https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-building-in-a-city-40742-large.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80',
    projectAssociation: 'p2',
    date: 'Nov 2025'
  },
  {
    id: 'g7',
    title: 'JK Aurelia Towers Sky Lounge',
    category: 'Project Photos',
    type: 'image' as const,
    url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80',
    projectAssociation: 'm1',
    date: 'Feb 2026'
  },
  {
    id: 'g8',
    title: 'JK Whispering Pines Pine Forest Avenue',
    category: 'Project Photos',
    type: 'image' as const,
    url: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&auto=format&fit=crop&q=80',
    projectAssociation: 'm2',
    date: 'Mar 2026'
  },
  {
    id: 'g9',
    title: 'VMRDA Smart City Gated Arch View',
    category: 'Event Photos',
    type: 'image' as const,
    url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80',
    projectAssociation: 'm4',
    date: 'Dec 2025'
  },
  {
    id: 'g10',
    title: 'JK Riviera Rooftop Infinity Pool Video',
    category: 'Project Videos',
    type: 'video' as const,
    url: 'https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-building-in-a-city-40742-large.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80',
    projectAssociation: 'm9',
    date: 'Jun 2026'
  }
];

const INITIAL_ENQUIRIES = [
  {
    id: 'e1',
    name: 'Suresh Kumar Reddy',
    email: 'suresh.reddy@gmail.com',
    phone: '+91 98765 43210',
    message: 'I am interested in buying a 3 BHK villa at JK Grand Horizon in Vizag. Please share the pricing details and a copy of the brochure.',
    projectAssociation: 'p1',
    projectName: 'JK Grand Horizon',
    date: '2026-06-15T09:30:00Z',
    status: 'New' as const,
    notes: ''
  },
  {
    id: 'e2',
    name: 'Anjali Sharma',
    email: 'anjali.s@yahoo.com',
    phone: '+91 87654 32109',
    message: 'Looking for CRDA/VUDA approved plots near Vijayawada or Vizag. Can you please arrange a site visit for JK Green Meadows next weekend?',
    projectAssociation: 'p4',
    projectName: 'JK Green Meadows',
    date: '2026-06-16T14:15:00Z',
    status: 'In Progress' as const,
    notes: 'Called the client. Site visit scheduled for Sunday at 10 AM.'
  }
];

export async function seedDatabase() {
  try {
    // 0. Auto-migrate legacy non-serial IDs for all tables
    try {
      // 1) Cities
      const allCities = await City.findAll({ order: [['createdAt', 'ASC']] });
      let nextCityNum = 1;
      for (const city of allCities) {
        const oldId = city.id;
        const isLegacyId = oldId.startsWith('c_') || !/^c\d+$/.test(oldId);
        
        if (isLegacyId) {
          const newId = `c${nextCityNum++}`;
          
          await LocationMaster.update(
            { cityId: newId },
            { where: { cityId: oldId } }
          );
          
          await City.sequelize?.query(`UPDATE cities SET id = :newId WHERE id = :oldId`, {
            replacements: { newId, oldId }
          });
          
          console.log(`🛠️ Cleaned up city ID: ${oldId} -> ${newId}`);
        } else {
          const num = parseInt(oldId.substring(1), 10);
          if (num >= nextCityNum) nextCityNum = num + 1;
        }
      }

      // 2) Locations
      const allLocations = await LocationMaster.findAll({ order: [['createdAt', 'ASC']] });
      let nextLocNum = 1;
      for (const loc of allLocations) {
        const oldId = loc.id;
        const isLegacyId = oldId.startsWith('l_') || oldId.startsWith('loc_') || !/^loc\d+$/.test(oldId);
        
        if (isLegacyId) {
          const newId = `loc${nextLocNum++}`;
          
          await LocationMaster.sequelize?.query(`UPDATE locations SET id = :newId WHERE id = :oldId`, {
            replacements: { newId, oldId }
          });
          console.log(`🛠️ Cleaned up location ID: ${oldId} -> ${newId}`);
        } else {
          const num = parseInt(oldId.substring(3), 10);
          if (num >= nextLocNum) nextLocNum = num + 1;
        }
      }

      // 3) Projects & Marketing
      const allProjects = await Project.findAll({ order: [['createdAt', 'ASC']] });
      let nextProjectNum = 1;
      let nextMarketingNum = 1;
      for (const proj of allProjects) {
        const oldId = proj.id;
        const prefix = proj.isMarketing ? 'm' : 'p';
        const isLegacyId = oldId.startsWith('p_') || oldId.startsWith('m_') || !/^[pm]\d+$/.test(oldId);
        
        if (isLegacyId) {
          const newId = proj.isMarketing ? `m${nextMarketingNum++}` : `p${nextProjectNum++}`;
          
          await GalleryItem.update(
            { projectAssociation: newId },
            { where: { projectAssociation: oldId } }
          );
          
          await Enquiry.update(
            { projectAssociation: newId },
            { where: { projectAssociation: oldId } }
          );
          
          await Project.sequelize?.query(`UPDATE projects SET id = :newId WHERE id = :oldId`, {
            replacements: { newId, oldId }
          });
          
          console.log(`🛠️ Cleaned up project ID: ${oldId} -> ${newId}`);
        } else {
          const num = parseInt(oldId.substring(1), 10);
          if (proj.isMarketing) {
            if (num >= nextMarketingNum) nextMarketingNum = num + 1;
          } else {
            if (num >= nextProjectNum) nextProjectNum = num + 1;
          }
        }
      }

      // 4) Users
      const allUsers = await User.findAll({ order: [['createdAt', 'ASC']] });
      let nextUserNum = 1;
      for (const u of allUsers) {
        const oldId = u.id;
        const isLegacyId = oldId.startsWith('u_') || !/^u\d+$/.test(oldId);
        
        if (isLegacyId) {
          const newId = `u${nextUserNum++}`;
          
          await UserSessionLog.update(
            { userId: newId },
            { where: { userId: oldId } }
          );
          
          await User.sequelize?.query(`UPDATE users SET id = :newId WHERE id = :oldId`, {
            replacements: { newId, oldId }
          });
          console.log(`🛠️ Cleaned up user ID: ${oldId} -> ${newId}`);
        } else {
          const num = parseInt(oldId.substring(1), 10);
          if (num >= nextUserNum) nextUserNum = num + 1;
        }
      }

      // 5) Blogs
      const allBlogs = await Blog.findAll({ order: [['createdAt', 'ASC']] });
      let nextBlogNum = 1;
      for (const b of allBlogs) {
        const oldId = b.id;
        const isLegacyId = oldId.startsWith('b_') || !/^b\d+$/.test(oldId);
        
        if (isLegacyId) {
          const newId = `b${nextBlogNum++}`;
          await Blog.sequelize?.query(`UPDATE blogs SET id = :newId WHERE id = :oldId`, {
            replacements: { newId, oldId }
          });
          console.log(`🛠️ Cleaned up blog ID: ${oldId} -> ${newId}`);
        } else {
          const num = parseInt(oldId.substring(1), 10);
          if (num >= nextBlogNum) nextBlogNum = num + 1;
        }
      }

      // 6) Gallery Items
      const allGallery = await GalleryItem.findAll({ order: [['createdAt', 'ASC']] });
      let nextGalleryNum = 1;
      for (const g of allGallery) {
        const oldId = g.id;
        const isLegacyId = oldId.startsWith('g_') || !/^g\d+$/.test(oldId);
        
        if (isLegacyId) {
          const newId = `g${nextGalleryNum++}`;
          await GalleryItem.sequelize?.query(`UPDATE gallery_items SET id = :newId WHERE id = :oldId`, {
            replacements: { newId, oldId }
          });
          console.log(`🛠️ Cleaned up gallery item ID: ${oldId} -> ${newId}`);
        } else {
          const num = parseInt(oldId.substring(1), 10);
          if (num >= nextGalleryNum) nextGalleryNum = num + 1;
        }
      }

      // 7) Enquiries
      const allEnqs = await Enquiry.findAll({ order: [['createdAt', 'ASC']] });
      let nextEnqNum = 1;
      for (const e of allEnqs) {
        const oldId = e.id;
        const isLegacyId = oldId.startsWith('enq_') || oldId.startsWith('e_') || !/^e\d+$/.test(oldId);
        
        if (isLegacyId) {
          const newId = `e${nextEnqNum++}`;
          await Enquiry.sequelize?.query(`UPDATE enquiries SET id = :newId WHERE id = :oldId`, {
            replacements: { newId, oldId }
          });
          console.log(`🛠️ Cleaned up enquiry ID: ${oldId} -> ${newId}`);
        } else {
          const num = parseInt(oldId.substring(1), 10);
          if (num >= nextEnqNum) nextEnqNum = num + 1;
        }
      }

      // 8) Job Applications
      const allApps = await JobApplication.findAll({ order: [['createdAt', 'ASC']] });
      let nextAppNum = 1;
      for (const ja of allApps) {
        const oldId = ja.id;
        const isLegacyId = oldId.startsWith('ja_') || oldId.startsWith('app_') || !/^ja\d+$/.test(oldId);
        
        if (isLegacyId) {
          const newId = `ja${nextAppNum++}`;
          await JobApplication.sequelize?.query(`UPDATE job_applications SET id = :newId WHERE id = :oldId`, {
            replacements: { newId, oldId }
          });
          console.log(`🛠️ Cleaned up job application ID: ${oldId} -> ${newId}`);
        } else {
          const num = parseInt(oldId.substring(2), 10);
          if (num >= nextAppNum) nextAppNum = num + 1;
        }
      }
    } catch (migrationError) {
      console.error("Failed to run automated city/location ID serial migration:", migrationError);
    }

    // 1. Seed Cities
    const cityCount = await City.count();
    if (cityCount === 0) {
      console.log("🌱 Seeding Cities...");
      await City.bulkCreate(INITIAL_CITIES);
    }

    // 2. Seed Locations
    const locationCount = await LocationMaster.count();
    if (locationCount === 0) {
      console.log("🌱 Seeding Locations...");
      await LocationMaster.bulkCreate(INITIAL_LOCATIONS);
    }

    // 2.5 Seed Projects & Marketing Properties
    const projectCount = await Project.count();
    if (projectCount === 0) {
      console.log("🌱 Seeding Projects & Marketing properties...");
      await Project.bulkCreate([...INITIAL_PROJECTS, ...INITIAL_MARKETING]);
    }

    // 2.6 Seed Blogs
    const blogCount = await Blog.count();
    if (blogCount === 0) {
      console.log("🌱 Seeding Blogs...");
      await Blog.bulkCreate(INITIAL_BLOGS);
    }

    // 2.7 Seed Gallery
    const galleryCount = await GalleryItem.count();
    if (galleryCount === 0) {
      console.log("🌱 Seeding Gallery items...");
      await GalleryItem.bulkCreate(INITIAL_GALLERY);
    }

    // 2.8 Seed Enquiries
    const enquiryCount = await Enquiry.count();
    if (enquiryCount === 0) {
      console.log("🌱 Seeding Enquiries...");
      await Enquiry.bulkCreate(INITIAL_ENQUIRIES);
    }

    // 3. Seed Users
    // Remove extra default users from the database if they exist
    await User.destroy({
      where: {
        id: ['u2', 'u3']
      }
    });

    const userCount = await User.count();
    if (userCount === 0) {
      console.log("🌱 Seeding Users (Only Admin)...");
      await User.bulkCreate(INITIAL_USERS);
    } else {
      // Helper to check if a password is already Base64 encoded
      const isBase64 = (str: string): boolean => {
        if (!str || str.trim() === '') return false;
        try {
          const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
          if (!base64Regex.test(str)) return false;
          const decoded = Buffer.from(str, 'base64').toString('utf8');
          const isPrintable = /^[\x20-\x7E]*$/.test(decoded);
          const reEncoded = Buffer.from(decoded, 'utf8').toString('base64');
          return isPrintable && (reEncoded === str);
        } catch {
          return false;
        }
      };

      // Automatically migrate plain text or repair double-encoded passwords to single Base64
      const allUsers = await User.findAll();
      for (const u of allUsers) {
        try {
          const firstDecode = Buffer.from(u.password, 'base64').toString('utf8');
          if (isBase64(u.password) && isBase64(firstDecode)) {
            // Double-encoded: decode it once and save (triggers setter to encode exactly once)
            const decodedPassword = Buffer.from(firstDecode, 'base64').toString('utf8');
            u.password = decodedPassword;
            await u.save();
            console.log(`🔑 Automatically repaired double-encoded password for user '${u.username}' back to single Base64.`);
          } else if (!isBase64(u.password)) {
            const rawPassword = u.password;
            u.password = rawPassword; // Trigger model setter to convert to Base64
            await u.save();
            console.log(`🔑 Automatically migrated existing user '${u.username}' password to Base64 in seeder.`);
          }
        } catch (e) {
          // Ignore
        }
      }
    }



    // 4. Seed Property Types
    const propertyTypeCount = await PropertyType.count();
    if (propertyTypeCount === 0) {
      console.log("🌱 Seeding Property Types...");
      await PropertyType.bulkCreate(INITIAL_PROPERTY_TYPES);
    }

    // 5. Seed Facings
    const facingCount = await Facing.count();
    if (facingCount === 0) {
      console.log("🌱 Seeding Facings...");
      await Facing.bulkCreate(INITIAL_FACINGS);
    }

        // 6. Seed Amenities
    const amenityCount = await Amenity.count();
    if (amenityCount === 0) {
      console.log("🌱 Seeding Amenities...");
      await Amenity.bulkCreate(INITIAL_AMENITIES);
    }

    // 7. Seed MailConfig
    let mailConfig = await MailConfig.findByPk("default");
    if (!mailConfig) {
      console.log("🌱 Seeding MailConfig...");
      await MailConfig.create({
        id: "default",
        deliveryMode: "smtp",
        triggerWindowDays: 5,
        sendBeforeDays: 1,
        smtpHost: "smtpout.secureserver.net",
        smtpPort: 587,
        smtpUser: "info@sevendorsolutions.com",
        smtpPass: "Chinna@123",
        senderEmail: "info@sevendorsolutions.com",
        summaryEmail: "jkfutureinfra@gmail.com",
        emailSubject: "Reminder: Scheduled Site Visit for {projectName}",
        emailTemplate: "Hello {customerName},\n\nThis is a friendly reminder that you have a scheduled site visit for {projectName} on {visitDate} at {visitTime}.\n\nLocation: {location}\n\nOur property consultant {assignedAgent} (Phone: {assignedAgentPhone}) will guide you.\n\nWarm regards,\nJK Future Infra Team",
        smsProvider: "",
        smsApiKey: "",
        smsSenderId: "",
        smsEnabled: false,
        whatsappToken: "",
        whatsappPhoneId: "",
        whatsappEnabled: false,
        dbType: process.env.DB_TYPE || "postgres",
        dbHost: process.env.PG_HOST || "localhost",
        dbPort: parseInt(process.env.PG_PORT || "5432"),
        dbUser: process.env.PG_USER || "postgres",
        dbPassword: process.env.PG_PASSWORD || "Admin@123",
        dbName: process.env.PG_DB || "JKFutureDB",
        jwtSecret: process.env.JWT_SECRET || "jk_future_infra_secret_jwt_key_2026"
      });
    } else {
      console.log("🌱 Updating MailConfig database credentials to SecureServer SMTP...");
      await mailConfig.update({
        smtpHost: "smtpout.secureserver.net",
        smtpPort: 587,
        smtpUser: "info@sevendorsolutions.com",
        smtpPass: "Chinna@123",
        senderEmail: "info@sevendorsolutions.com",
        deliveryMode: "smtp"
      });
    }

    // 8. Seed Site Visits (Removed static site visit data as requested)

    // Seed Marketing Agents (Removed mock marketing agents as requested)
    await MarketingAgent.destroy({
      where: {
        id: ["ma1", "ma2", "ma3", "ma4"]
      }
    });

    // 9. Seed Expense Categories
    const { ExpenseCategory } = require("../models/ExpenseCategory");
    const expenseCategoryCount = await ExpenseCategory.count();
    if (expenseCategoryCount === 0) {
      console.log("🌱 Seeding Expense Categories...");
      await ExpenseCategory.bulkCreate([
        { id: "ec1", name: "Steel" },
        { id: "ec2", name: "Cement" },
        { id: "ec3", name: "Sand & Bricks" },
        { id: "ec4", name: "Labor Charges" },
        { id: "ec5", name: "Transport & Logistics" },
        { id: "ec6", name: "Marketing & Ads" },
        { id: "ec7", name: "Miscellaneous Office" }
      ]);
    }

    // Clean up mock user roles (keep only admin)
    await User.destroy({
      where: {
        username: ["accountant", "salesuser", "inventory"]
      }
    });

    // No mock wallets, customers, suppliers, or inventory items seeded as requested

    console.log("✅ Database Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error during database seeding:", error);
  }
}
