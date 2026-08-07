export type ProjectCategory = 'Flats' | 'Villas' | 'Individual Houses' | 'Sites' | 'Duplex';

export type SiteCategory = 'Development Sites' | 'Panchayati Approved Sites' | 'VUDA Approved Sites' | 'VUDA / VMRDA Approved Sites' | 'VUDA/VMRDA Approved Sites' | 'Ventures';

export type ProjectStatus = 'Ongoing' | 'Upcoming' | 'Completed';

export type GalleryCategory = 'Project Photos' | 'Project Videos' | 'Event Photos' | 'Construction Progress Updates';

export type BlogCategory = 'Real Estate News' | 'Property Updates' | 'Investment Guides' | 'Company News';

export type EnquiryStatus = 'New' | 'In Progress' | 'Completed';

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  desc: string;
}

export interface FloorPlan {
  id: string;
  title: string;
  image: string;
}

export interface Project {
  id: string;
  name: string;
  category: ProjectCategory;
  subCategory?: string; // Relevant when category is 'Sites' or residential properties
  status: ProjectStatus;
  location: string;
  description: string;
  images: string[];
  videos?: string[];
  highlights: string[];
  timeline: TimelineEvent[];
  amenities: string[];
  floorPlans: FloorPlan[];
  priceRange: string;
  priceValue: number; // For sorting and filtering
  paymentPlans: string[];
  mapCoordinates: {
    lat: number;
    lng: number;
  };
  brochureUrl: string;
  featured: boolean;
  
  // New fields for Honeyy-style checkbox filters and spec layouts
  facing?: string;
  city?: string;
  microLocation?: string;
  floors?: number;
  unitsCount?: number;
  availabilityDetails?: string;
  specImage?: string;
  uds?: string;
  width?: string;
  length?: string;
  classification?: string;
  isActive?: boolean;
  remarks?: string;
  marketingResult?: string;
  isMarketing?: boolean;
  agentId?: string;
  referredByName?: string;
  referredByPhone?: string;
  referredRemarks?: string;
  autoPostSocial?: boolean;
}


export interface Blog {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary: string;
  category: BlogCategory;
  image: string;
  date: string;
  author: string;
  tags: string[];
}

export interface GalleryItem {
  id: string;
  title: string;
  category: GalleryCategory;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  projectAssociation?: string; // Project ID
  date: string;
}

export interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  projectAssociation?: string; // Project ID or "General"
  projectName?: string; // Cached project name
  date: string;
  status: EnquiryStatus;
  notes?: string;
}

export interface User {
  id: string;
  username: string;
  role: string;
  name: string;
  email: string;
  password?: string;
  allowedScreens?: string[];
  agentId?: string;
  isActive?: boolean;
}

export interface City {
  id: string;
  name: string;
}

export interface LocationMaster {
  id: string;
  name: string;
  cityId: string;
  city?: City;
  locationArea?: string;
  parentCity?: string;
}

export interface PropertyType {
  id: string;
  name: string;
}

export interface Facing {
  id: string;
  name: string;
}

export interface Amenity {
  id: string;
  name: string;
}

export interface JobApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  experience: string;
  coverLetter?: string;
  status: 'Pending' | 'Interview Scheduled' | 'Shortlisted' | 'Rejected';
  date: string;
}

export interface Document {
  id: string;
  title: string;
  category: string;
  fileUrl: string;
  fileType: string;
  projectAssociation?: string;
  uploadedBy?: string;
  date: string;
  sortOrder?: number;
}

export interface SiteVisit {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  projectAssociation: string;
  projectName: string;
  visitDate: string;
  visitTime: string;
  emailStatus: 'Pending' | 'Sent' | 'Failed' | 'Skipped';
  emailSentDate?: string;
  assignedAgent?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MailConfig {
  id: string;
  deliveryMode: 'smtp' | 'simulation';
  triggerWindowDays: number;
  sendBeforeDays: number;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  senderEmail: string;
  summaryEmail: string;
  emailSubject: string;
  emailTemplate: string;
  // SMS Integration
  smsProvider: string;
  smsApiKey: string;
  smsSenderId: string;
  smsEnabled: boolean;
  // WhatsApp Integration
  whatsappToken: string;
  whatsappPhoneId: string;
  whatsappEnabled: boolean;
  // Database Connection cache
  dbType: string;
  dbHost: string;
  dbPort: number;
  dbUser: string;
  dbPassword?: string;
  dbName: string;
  // JWT
  jwtSecret: string;
  // Facebook/Instagram live integration
  facebookPageId?: string;
  facebookPageAccessToken?: string;
  instagramAccountId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MarketingAgent {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  designation?: string;
  photoUrl?: string;
  status: string; // 'Active' | 'Inactive'
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpenseLineItem {
  item: string;
  qty: number;
  priceUnit: number;
  taxLabel: string;
  taxPct: number;
  amount: number;
}

export interface Expense {
  id: string;
  party: string;
  location?: string;
  apartment?: string;
  projectName?: string;
  expenseCategory: string;
  expenseNo?: string;
  billDate: string;
  stateOfSupply?: string;
  lineItems: ExpenseLineItem[];
  paymentType?: string;
  walletId?: string;
  accountName?: string;
  referenceNo?: string;
  roundOff: boolean;
  gstEnabled?: boolean;
  hasVoucherBill?: boolean;
  documentUrl?: string;
  voucherUrl?: string;
  billUrl?: string;
  totalAmount: number;
  paidAmount?: number;
  pendingAmount?: number;
  paymentStatus?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

// Vyapaar Accounting System Interfaces
export interface Wallet {
  id: string;
  name: string;
  openingBalance: number;
  currentBalance: number;
  type: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  toWalletId?: string;
  type: string;
  amount: number;
  date: string;
  paymentMode: string;
  referenceNumber?: string;
  description?: string;
  receiptUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  creditLimit: number;
  openingBalance: number;
  outstandingAmount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactNumber: string;
  address?: string;
  gstNumber?: string;
  openingBalance: number;
  outstandingAmount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  code: string;
  category?: string;
  brand?: string;
  unit: string;
  openingStock: number;
  purchasePrice: number;
  sellingPrice: number;
  gstPercentage: number;
  currentStock: number;
  minimumStockLevel: number;
  supplierName?: string;
  warehouseLocation?: string;
  type?: string;
  hsn?: string;
  image?: string;
  batchTracking?: boolean;
  sellingPriceTaxType?: string;
  purchasePriceTaxType?: string;
  batches?: Array<{
    facingFloor: string;
    uds: string | number;
    flatNo: string;
    openingQty: number;
    currentQty: number;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockMovement {
  id: string;
  productCode: string;
  type: string;
  quantity: number;
  date: string;
  warehouse?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuotationItem {
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  gstPercentage: number;
  total: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerName: string;
  customerMobile: string;
  customerAddress?: string;
  projectName?: string;
  date: string;
  validTillDate: string;
  items: QuotationItem[];
  amenityItems?: QuotationItem[];
  totalAmount: number;
  notes?: string;
  termsAndConditions?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceItem {
  productName: string;
  productCode: string;
  quantity: number;
  price: number;
  discount: number;
  gst: number;
  gstPercentage?: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerMobile?: string;
  customerAddress?: string;
  projectName?: string;
  date: string;
  items: InvoiceItem[];
  amenityItems?: InvoiceItem[];
  totalAmount: number;
  gstAmount: number;
  discountAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: string;
  termsAndConditions?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Loan {
  id: string;
  providerName: string;
  accountNumber: string;
  type: string;
  amount: number;
  interestRate: number;
  startDate: string;
  endDate: string;
  emiAmount: number;
  frequency: string;
  paidAmount: number;
  pendingAmount: number;
  nextDueDate?: string;
  documentUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  paymentDate: string;
  amount: number;
  reference?: string;
  walletId?: string;
  accountName?: string;
  isInterestOnly?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentIn {
  id: string;
  customerName: string;
  invoiceNumber?: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  accountName?: string;
  referenceNumber?: string;
  notes?: string;
  walletId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentOut {
  id: string;
  supplierName: string;
  billNumber?: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  accountName?: string;
  referenceNumber?: string;
  notes?: string;
  walletId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Project Cost Analysis (Excel Model Structure)
export interface ProjectCostAnalysis {
  id: string;
  projectId?: string;
  projectName: string;
  location?: string;
  date?: string;
  
  // Section 1: Land Cost
  siteAreaSqYards: number;
  outRateCostPerSqYard: number;
  outRateCostTotal: number; // Auto: siteArea * outRate
  govtMarketValuePerSqYard: number;
  registrationCost: number;
  lrsVudaPercentage: number; // e.g. 14
  lrsVudaCost: number; // Auto: (siteArea * govtMV * 9) * 14% or direct cost
  totalLandCost: number; // Auto: outRateCostTotal + registrationCost + lrsVudaCost
  
  // Section 2: TDR & Plan Approval
  gvmcPlanApprovalCost: number; // e.g. 500000
  tdrPercentage: number; // e.g. 1
  tdrAreaSft: number; // e.g. 600
  tdrTotalCost: number; // e.g. 3552000
  totalTdrPlanCost: number; // Auto: gvmcPlan + tdrTotalCost
  
  // Section 3: Construction Cost
  totalFlatsAreaSft: number; // e.g. 22000
  constructionCostPerSft: number; // e.g. 1500
  totalConstructionCost: number; // Auto: totalFlatsAreaSft * constructionCostPerSft
  
  // Share Breakdown Ratios
  ownerSharePercent: number; // e.g. 40
  builderSharePercent: number; // e.g. 60
  
  // Section 4: Total Project Cost
  totalProjectCost: number; // Auto: totalLandCost + totalTdrPlanCost + totalConstructionCost
  
  // Section 5: Saluable Cost / Sales Realization
  totalSaluableAreaSft: number; // e.g. 22000
  sellingPricePerSft: number; // e.g. 3000
  totalAreaSaluableCost: number; // Auto: totalSaluableAreaSft * sellingPricePerSft
  amenitiesCostPerUnit: number; // e.g. 100000
  numberOfUnits: number; // e.g. 12
  totalAmenitiesCost: number; // Auto: amenitiesCostPerUnit * numberOfUnits
  totalSaleValue: number; // Auto: totalAreaSaluableCost + totalAmenitiesCost
  
  // Section 6: Unit Cost & Net Margin
  costPerOneSft: number; // Auto: totalProjectCost / totalSaluableAreaSft
  netMarginTotal: number; // Auto: totalSaleValue - totalProjectCost
  
  updatedAt?: string;
}

// Stage Checklist Types
export interface ChecklistCheckpoint {
  id: number | string;
  item: string;
  purpose: string;
  status: 'OK' | 'Pending' | 'Issue';
  remarks?: string;
  photoUrl?: string;
  verifiedBy?: string;
  verifiedDate?: string;
}

export interface ChecklistStageData {
  stageId: number;
  stageName: string;
  checkpoints: ChecklistCheckpoint[];
}

export interface ProjectInspectionRecord {
  id: string;
  projectId: string;
  projectName: string;
  builderName: string;
  location: string;
  reraNo: string;
  checkedBy: string;
  inspectionDate: string;
  stages: ChecklistStageData[];
  overallProgress: number; // Percentage
  updatedAt?: string;
}

