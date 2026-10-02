import type {
  Project,
  Blog,
  GalleryItem,
  Enquiry,
  User,
  JobApplication,
  City,
  LocationMaster,
  PropertyType,
  Facing,
  Amenity,
  Document,
  SiteVisit,
  MailConfig,
  MarketingAgent,
  Expense,
  ExpenseCategory,
  Wallet,
  WalletTransaction,
  Customer,
  Supplier,
  InventoryItem,
  StockMovement,
  Quotation,
  Invoice,
  Loan,
  LoanPayment,
  PaymentIn,
  PaymentOut,
  ProjectCostAnalysis,
  ProjectInspectionRecord,
  DailyAgendaMatrix,
  CompanyProfile
} from '../types';

const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() && !envUrl.includes('3002')) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/+$/, '')}/api`;
  }
  // If in local Vite development, default to local Laravel server
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5173') {
    return 'http://localhost:5000/api';
  }
  // In production (Docker / Nginx), relative /api is reverse-proxied to backend container
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

export const getMediaUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && apiUrl.startsWith('http') && !apiUrl.includes('localhost:5173') && !apiUrl.includes('3002')) {
    const origin = apiUrl.replace(/\/api\/?$/, '');
    return `${origin}${cleanPath}`;
  }
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5173') {
    return `http://localhost:5000${cleanPath}`;
  }
  return cleanPath;
};

const getAuthHeaders = (): Record<string, string> => {
  const token = sessionStorage.getItem('jk_infra_logged_user_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const handleResponse = async (res: Response) => {
  const json = await res.json();
  if (!res.ok || !json.success) {
    if (res.status === 401) {
      sessionStorage.removeItem('jk_infra_logged_user');
      sessionStorage.removeItem('jk_infra_logged_user_token');
      if (typeof window !== 'undefined') {
        window.location.pathname = '/jk-control-panel-99';
        window.location.reload();
      }
    }
    throw new Error(json.message || 'API request failed');
  }
  return json.data;
};

// We don't need real initDB for SQL but we keep it as a no-op just to satisfy App.tsx import
export const initDB = () => {
  // Database runs on backend; no client-side DB initialization needed.
};

// Projects
export const getProjects = async (): Promise<Project[]> => {
  const res = await fetch(`${API_BASE_URL}/projects?isMarketing=false`);
  return handleResponse(res);
};

export const addProject = async (project: Project): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(project)
  });
  await handleResponse(res);
};

export const updateProject = async (project: Project): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/projects/${project.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(project)
  });
  await handleResponse(res);
};

export const deleteProject = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'API request failed');
  }
};

// Marketing Properties
export const getMarketing = async (): Promise<Project[]> => {
  const res = await fetch(`${API_BASE_URL}/projects?isMarketing=true`);
  return handleResponse(res);
};

export const addMarketing = async (property: Project): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ ...property, isMarketing: true })
  });
  await handleResponse(res);
};

export const updateMarketing = async (property: Project): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/projects/${property.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ ...property, isMarketing: true })
  });
  await handleResponse(res);
};

export const deleteMarketing = async (id: string): Promise<void> => {
  await deleteProject(id);
};

// Blogs
export const getBlogs = async (): Promise<Blog[]> => {
  const res = await fetch(`${API_BASE_URL}/blogs`);
  return handleResponse(res);
};

export const addBlog = async (blog: Blog): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/blogs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(blog)
  });
  await handleResponse(res);
};

export const updateBlog = async (blog: Blog): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/blogs/${blog.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(blog)
  });
  await handleResponse(res);
};

export const deleteBlog = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/blogs/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'API request failed');
  }
};

// Gallery
export const getGallery = async (): Promise<GalleryItem[]> => {
  const res = await fetch(`${API_BASE_URL}/gallery`);
  return handleResponse(res);
};

export const addGalleryItem = async (item: GalleryItem): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/gallery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(item)
  });
  await handleResponse(res);
};

export const updateGalleryItem = async (item: GalleryItem): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/gallery/${item.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(item)
  });
  await handleResponse(res);
};

export const deleteGalleryItem = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/gallery/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'API request failed');
  }
};

// Enquiries
export const getEnquiries = async (): Promise<Enquiry[]> => {
  const res = await fetch(`${API_BASE_URL}/enquiries`, {
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

export const addEnquiry = async (enquiry: Enquiry): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/enquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(enquiry)
  });
  await handleResponse(res);
};

export const updateEnquiryStatus = async (id: string, status: Enquiry['status'], notes?: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/enquiries/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ status, notes })
  });
  await handleResponse(res);
};

export const deleteEnquiry = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/enquiries/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'API request failed');
  }
};

// Users
export const getUsers = async (): Promise<User[]> => {
  const res = await fetch(`${API_BASE_URL}/users`, {
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

export const addUser = async (user: User): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(user)
  });
  await handleResponse(res);
};

export const deleteUser = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'API request failed');
  }
};

export const updateUser = async (user: User): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/users/${user.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(user)
  });
  await handleResponse(res);
};

// Current Session User (session storage is used to clear session client-side on tab close)
export const getSessionUser = (): User | null => {
  const user = sessionStorage.getItem('jk_infra_logged_user');
  return user ? JSON.parse(user) : null;
};

export const setSessionUser = (user: User | null): void => {
  if (user) {
    sessionStorage.setItem('jk_infra_logged_user', JSON.stringify(user));
  } else {
    sessionStorage.removeItem('jk_infra_logged_user');
    sessionStorage.removeItem('jk_infra_logged_user_token');
  }
};

// Careers / Job Applications
export const getApplications = async (): Promise<JobApplication[]> => {
  const res = await fetch(`${API_BASE_URL}/careers/applications`, {
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

export const addApplication = async (app: JobApplication): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/careers/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(app)
  });
  await handleResponse(res);
};

export const updateApplicationStatus = async (id: string, status: JobApplication['status']): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/careers/applications/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ status })
  });
  await handleResponse(res);
};

export const deleteApplication = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/careers/applications/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'API request failed');
  }
};

// Cities Master
export const getCities = async (): Promise<City[]> => {
  const res = await fetch(`${API_BASE_URL}/masters/cities`);
  return handleResponse(res);
};

export const addCity = async (city: City): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/masters/cities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(city)
  });
  await handleResponse(res);
};

export const deleteCity = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/masters/cities/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'API request failed');
  }
};

// Locations Master
export const getLocations = async (): Promise<LocationMaster[]> => {
  const res = await fetch(`${API_BASE_URL}/masters/locations`);
  return handleResponse(res);
};

export const addLocation = async (loc: LocationMaster): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/masters/locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(loc)
  });
  await handleResponse(res);
};

export const deleteLocation = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/masters/locations/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'API request failed');
  }
};

// User Authentication
export const loginUser = async (username: string, password: User['password']): Promise<User> => {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Login failed');
  }
  if (json.token) {
    sessionStorage.setItem('jk_infra_logged_user_token', json.token);
  }
  return json.user;
};

// ─── Forgot Password OTP Flow ───────────────────────────────────────────────

export const getUserEmailByUsername = async (username: string): Promise<string> => {
  const res = await fetch(`${API_BASE_URL}/auth/user-email/${encodeURIComponent(username.trim())}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || 'Username not found');
  return json.email;
};

export const requestPasswordOtp = async (email: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || 'Failed to send OTP');
};

export const verifyPasswordOtp = async (email: string, otp: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || 'OTP verification failed');
};

export const resetPassword = async (email: string, otp: string, newPassword: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, newPassword })
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || 'Password reset failed');
};

// Image Uploads
export const uploadImage = async (file: File, module: string = 'others'): Promise<string> => {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${API_BASE_URL}/upload?module=${encodeURIComponent(module)}`, {
    method: 'POST',
    body: formData
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Image upload failed');
  }
  return json.url;
};

export const uploadMultipleImages = async (files: FileList | File[], module: string = 'others'): Promise<string[]> => {
  const formData = new FormData();
  const fileArray = files instanceof FileList ? Array.from(files) : files;
  fileArray.forEach((file) => {
    formData.append('images', file);
  });

  const res = await fetch(`${API_BASE_URL}/upload/multiple?module=${encodeURIComponent(module)}`, {
    method: 'POST',
    body: formData
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Images upload failed');
  }
  return json.urls;
};

export const logoutUser = async (username: string, reason?: string): Promise<void> => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ username, reason })
    });
    await handleResponse(res);
  } catch (err) {
    console.warn("Logout tracking error:", err);
  }
};

// Property Types
export const getPropertyTypes = async (): Promise<PropertyType[]> => {
  const res = await fetch(`${API_BASE_URL}/masters/property-types`);
  return handleResponse(res);
};

export const addPropertyType = async (type: PropertyType): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/masters/property-types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(type)
  });
  await handleResponse(res);
};

export const deletePropertyType = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/masters/property-types/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'API request failed');
  }
};

// Facings
export const getFacings = async (): Promise<Facing[]> => {
  const res = await fetch(`${API_BASE_URL}/masters/facings`);
  return handleResponse(res);
};

export const addFacing = async (facing: Facing): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/masters/facings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(facing)
  });
  await handleResponse(res);
};

export const deleteFacing = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/masters/facings/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'API request failed');
  }
};

// Amenities
export const getAmenities = async (): Promise<Amenity[]> => {
  const res = await fetch(`${API_BASE_URL}/masters/amenities`);
  return handleResponse(res);
};

export const addAmenity = async (amenity: Amenity): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/masters/amenities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(amenity)
  });
  await handleResponse(res);
};

export const deleteAmenity = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/masters/amenities/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'API request failed');
  }
};

// Documents
export const getDocuments = async (): Promise<Document[]> => {
  const res = await fetch(`${API_BASE_URL}/documents`);
  return handleResponse(res);
};

export const addDocument = async (doc: Document): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(doc)
  });
  await handleResponse(res);
};

export const updateDocument = async (doc: Document): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/documents/${doc.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(doc)
  });
  await handleResponse(res);
};

export const deleteDocument = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/documents/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'API request failed');
  }
};

export const reorderDocuments = async (items: { id: string; sortOrder: number; category?: string }[]): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/documents/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ items })
  });
  await handleResponse(res);
};

// Site Visits
export const getSiteVisits = async (): Promise<SiteVisit[]> => {
  const res = await fetch(`${API_BASE_URL}/site-visits`, {
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

export const addSiteVisit = async (visit: Omit<SiteVisit, 'id'>): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/site-visits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(visit)
  });
  await handleResponse(res);
};

export const updateSiteVisit = async (id: string, visit: Partial<SiteVisit>): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/site-visits/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(visit)
  });
  await handleResponse(res);
};

export const deleteSiteVisit = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/site-visits/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'API request failed');
  }
};

export const processSiteVisitReminders = async (): Promise<{ totalProcessed: number; sent: number; skipped: number; failed: number }> => {
  const res = await fetch(`${API_BASE_URL}/site-visits/process-reminders`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

export const sendSiteVisitEmailNow = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/site-visits/${id}/send-now`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'API request failed');
  }
};

// Mail Config
export const getMailConfig = async (): Promise<MailConfig> => {
  const res = await fetch(`${API_BASE_URL}/mail-config`, {
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

export const updateMailConfig = async (config: Partial<MailConfig>): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/mail-config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(config)
  });
  await handleResponse(res);
};

export const sendTestEmail = async (toEmail: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/mail-config/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ toEmail })
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'API request failed');
  }
};

// Marketing Agents
export const getMarketingAgents = async (): Promise<MarketingAgent[]> => {
  const res = await fetch(`${API_BASE_URL}/marketing-agents`);
  return handleResponse(res);
};

export const addMarketingAgent = async (agent: Omit<MarketingAgent, 'id'>): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/marketing-agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(agent)
  });
  await handleResponse(res);
};

export const updateMarketingAgent = async (agent: MarketingAgent): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/marketing-agents/${agent.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(agent)
  });
  await handleResponse(res);
};

export const deleteMarketingAgent = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/marketing-agents/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  await handleResponse(res);
};

// ─── Expenses API ─────────────────────────────────────────────────────────────
export const getExpenses = async (): Promise<Expense[]> => {
  const res = await fetch(`${API_BASE_URL}/expenses`, {
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

export const addExpense = async (expense: Omit<Expense, 'id'>): Promise<Expense> => {
  const res = await fetch(`${API_BASE_URL}/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(expense)
  });
  return handleResponse(res);
};

export const updateExpense = async (expense: Expense): Promise<Expense> => {
  const res = await fetch(`${API_BASE_URL}/expenses/${expense.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(expense)
  });
  return handleResponse(res);
};

export const deleteExpense = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/expenses/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  await handleResponse(res);
};

// ─── Expense Categories Master API ────────────────────────────────────────────
export const getExpenseCategories = async (): Promise<ExpenseCategory[]> => {
  const res = await fetch(`${API_BASE_URL}/expense-categories`, {
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

export const addExpenseCategory = async (category: Omit<ExpenseCategory, 'id'>): Promise<ExpenseCategory> => {
  const res = await fetch(`${API_BASE_URL}/expense-categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(category)
  });
  return handleResponse(res);
};

export const updateExpenseCategory = async (id: string, category: { name: string }): Promise<ExpenseCategory> => {
  const res = await fetch(`${API_BASE_URL}/expense-categories/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(category)
  });
  return handleResponse(res);
};

export const deleteExpenseCategory = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/expense-categories/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  await handleResponse(res);
};

export const getAuditLogs = async (): Promise<any[]> => {
  const res = await fetch(`${API_BASE_URL}/audit-logs`, {
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

export const clearAuditLogs = async (): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/audit-logs`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  await handleResponse(res);
};

export const addAuditLog = async (log: { action: string; details: string; status?: string }): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/audit-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(log)
  });
  await handleResponse(res);
};

export interface AccountingActivityItem {
  id: string;
  module: string;
  activityType: 'INSERT' | 'UPDATE' | 'DELETE';
  recordId?: string;
  description: string;
  amount: number;
  userName: string;
  userRole: string;
  userId?: string;
  ipAddress?: string;
  dateTime: string;
  metadata?: any;
}

export const getAccountingActivities = async (params?: {
  startDate?: string;
  endDate?: string;
  module?: string;
  activityType?: string;
  search?: string;
  limit?: number;
}): Promise<AccountingActivityItem[]> => {
  const query = new URLSearchParams();
  if (params?.startDate) query.append('startDate', params.startDate);
  if (params?.endDate) query.append('endDate', params.endDate);
  if (params?.module && params.module !== 'All') query.append('module', params.module);
  if (params?.activityType && params.activityType !== 'All') query.append('activityType', params.activityType);
  if (params?.search) query.append('search', params.search);
  if (params?.limit) query.append('limit', String(params.limit));

  const res = await fetch(`${API_BASE_URL}/accounting-activities?${query.toString()}`, {
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

export const pingKeepAlive = async (): Promise<void> => {
  try {
    await fetch(`${API_BASE_URL}/auth/ping`, { headers: getAuthHeaders() });
  } catch (e) {}
};

if (typeof window !== 'undefined') {
  // Immediately ping on page load to cancel any pending tab-close logout timer
  pingKeepAlive();

  window.addEventListener('beforeunload', () => {
    const session = sessionStorage.getItem('jk_infra_logged_user');
    if (session) {
      try {
        const user = JSON.parse(session);
        if (user && user.username) {
          const blob = new Blob([JSON.stringify({ username: user.username, isBeacon: true })], { type: 'application/json' });
          navigator.sendBeacon(`${API_BASE_URL}/auth/logout`, blob);
        }
      } catch (e) {
        // Ignore
      }
    }
  });
}

// Accounting & Management API Endpoints

// Wallets
export const getWallets = async (): Promise<Wallet[]> => {
  const res = await fetch(`${API_BASE_URL}/wallets`, { headers: getAuthHeaders() });
  return handleResponse(res);
};

export const addWallet = async (wallet: Partial<Wallet>): Promise<Wallet> => {
  const res = await fetch(`${API_BASE_URL}/wallets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(wallet)
  });
  return handleResponse(res);
};

export const updateWallet = async (wallet: Partial<Wallet>): Promise<Wallet> => {
  const res = await fetch(`${API_BASE_URL}/wallets/${wallet.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(wallet)
  });
  return handleResponse(res);
};

export const deleteWallet = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/wallets/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  await handleResponse(res);
};

export const getWalletTransactions = async (walletId?: string): Promise<WalletTransaction[]> => {
  const url = walletId ? `${API_BASE_URL}/wallets/transactions?walletId=${walletId}` : `${API_BASE_URL}/wallets/transactions`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  return handleResponse(res);
};

export const addWalletMoney = async (data: any): Promise<any> => {
  const res = await fetch(`${API_BASE_URL}/wallets/add-money`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data)
  });
  return handleResponse(res);
};

export const withdrawWalletMoney = async (data: any): Promise<any> => {
  const res = await fetch(`${API_BASE_URL}/wallets/withdraw-money`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data)
  });
  return handleResponse(res);
};

export const transferWalletMoney = async (data: any): Promise<any> => {
  const res = await fetch(`${API_BASE_URL}/wallets/transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data)
  });
  return handleResponse(res);
};

// Quotations
export const getQuotations = async (): Promise<Quotation[]> => {
  const res = await fetch(`${API_BASE_URL}/quotations`, { headers: getAuthHeaders() });
  return handleResponse(res);
};

export const addQuotation = async (quotation: Partial<Quotation>): Promise<Quotation> => {
  const res = await fetch(`${API_BASE_URL}/quotations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(quotation)
  });
  return handleResponse(res);
};

export const updateQuotation = async (quotation: Partial<Quotation>): Promise<Quotation> => {
  const res = await fetch(`${API_BASE_URL}/quotations/${quotation.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(quotation)
  });
  return handleResponse(res);
};

export const deleteQuotation = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/quotations/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  await handleResponse(res);
};

// Inventory
export const getInventoryItems = async (): Promise<InventoryItem[]> => {
  const res = await fetch(`${API_BASE_URL}/inventory`, { headers: getAuthHeaders() });
  return handleResponse(res);
};

export const addInventoryItem = async (item: Partial<InventoryItem>): Promise<InventoryItem> => {
  const res = await fetch(`${API_BASE_URL}/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(item)
  });
  return handleResponse(res);
};

export const updateInventoryItem = async (item: Partial<InventoryItem>): Promise<InventoryItem> => {
  const res = await fetch(`${API_BASE_URL}/inventory/${item.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(item)
  });
  return handleResponse(res);
};

export const deleteInventoryItem = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/inventory/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  await handleResponse(res);
};

export const getStockMovements = async (): Promise<StockMovement[]> => {
  const res = await fetch(`${API_BASE_URL}/inventory/movements`, { headers: getAuthHeaders() });
  return handleResponse(res);
};

export const stockIn = async (data: any): Promise<any> => {
  const res = await fetch(`${API_BASE_URL}/inventory/stock-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data)
  });
  return handleResponse(res);
};

export const stockOut = async (data: any): Promise<any> => {
  const res = await fetch(`${API_BASE_URL}/inventory/stock-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data)
  });
  return handleResponse(res);
};

export const adjustStock = async (data: any): Promise<any> => {
  const res = await fetch(`${API_BASE_URL}/inventory/adjust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data)
  });
  return handleResponse(res);
};

// Loans
export const getLoans = async (): Promise<Loan[]> => {
  const res = await fetch(`${API_BASE_URL}/loans`, { headers: getAuthHeaders() });
  return handleResponse(res);
};

export const addLoan = async (loan: Partial<Loan>): Promise<Loan> => {
  const res = await fetch(`${API_BASE_URL}/loans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(loan)
  });
  return handleResponse(res);
};

export const updateLoan = async (loan: Partial<Loan>): Promise<Loan> => {
  const res = await fetch(`${API_BASE_URL}/loans/${loan.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(loan)
  });
  return handleResponse(res);
};

export const deleteLoan = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/loans/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  await handleResponse(res);
};

export const payLoanEMI = async (loanId: string, data: any): Promise<any> => {
  const res = await fetch(`${API_BASE_URL}/loans/${loanId}/pay-emi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data)
  });
  return handleResponse(res);
};

export const getLoanPayments = async (): Promise<LoanPayment[]> => {
  const res = await fetch(`${API_BASE_URL}/loans/payments`, { headers: getAuthHeaders() });
  return handleResponse(res);
};

// Customers
export const getCustomers = async (): Promise<Customer[]> => {
  const res = await fetch(`${API_BASE_URL}/customers`, { headers: getAuthHeaders() });
  return handleResponse(res);
};

export const addCustomer = async (customer: Partial<Customer>): Promise<Customer> => {
  const res = await fetch(`${API_BASE_URL}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(customer)
  });
  return handleResponse(res);
};

export const updateCustomer = async (customer: Partial<Customer>): Promise<Customer> => {
  const res = await fetch(`${API_BASE_URL}/customers/${customer.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(customer)
  });
  return handleResponse(res);
};

export const deleteCustomer = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/customers/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  await handleResponse(res);
};

// Suppliers
export const getSuppliers = async (): Promise<Supplier[]> => {
  const res = await fetch(`${API_BASE_URL}/suppliers`, { headers: getAuthHeaders() });
  return handleResponse(res);
};

export const addSupplier = async (supplier: Partial<Supplier>): Promise<Supplier> => {
  const res = await fetch(`${API_BASE_URL}/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(supplier)
  });
  return handleResponse(res);
};

export const updateSupplier = async (supplier: Partial<Supplier>): Promise<Supplier> => {
  const res = await fetch(`${API_BASE_URL}/suppliers/${supplier.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(supplier)
  });
  return handleResponse(res);
};

export const deleteSupplier = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/suppliers/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  await handleResponse(res);
};

// Invoices
export const getInvoices = async (): Promise<Invoice[]> => {
  const res = await fetch(`${API_BASE_URL}/invoices`, { headers: getAuthHeaders() });
  return handleResponse(res);
};

export const addInvoice = async (invoice: Partial<Invoice>): Promise<Invoice> => {
  const res = await fetch(`${API_BASE_URL}/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(invoice)
  });
  return handleResponse(res);
};

export const updateInvoice = async (id: string, invoice: Partial<Invoice>): Promise<Invoice> => {
  const res = await fetch(`${API_BASE_URL}/invoices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(invoice)
  });
  return handleResponse(res);
};

export const deleteInvoice = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/invoices/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  await handleResponse(res);
};

// Payments
export const getPaymentsIn = async (): Promise<PaymentIn[]> => {
  const res = await fetch(`${API_BASE_URL}/payments/in`, { headers: getAuthHeaders() });
  return handleResponse(res);
};

export const addPaymentIn = async (payment: Partial<PaymentIn>): Promise<PaymentIn> => {
  const res = await fetch(`${API_BASE_URL}/payments/in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payment)
  });
  return handleResponse(res);
};

export const updatePaymentIn = async (id: string, payment: Partial<PaymentIn>): Promise<PaymentIn> => {
  const res = await fetch(`${API_BASE_URL}/payments/in/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payment)
  });
  return handleResponse(res);
};

export const getPaymentsOut = async (): Promise<PaymentOut[]> => {
  const res = await fetch(`${API_BASE_URL}/payments/out`, { headers: getAuthHeaders() });
  return handleResponse(res);
};

export const addPaymentOut = async (payment: Partial<PaymentOut>): Promise<PaymentOut> => {
  const res = await fetch(`${API_BASE_URL}/payments/out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payment)
  });
  return handleResponse(res);
};

export const updatePaymentOut = async (id: string, payment: Partial<PaymentOut>): Promise<PaymentOut> => {
  const res = await fetch(`${API_BASE_URL}/payments/out/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payment)
  });
  return handleResponse(res);
};

export const deletePaymentIn = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/payments/in/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  await handleResponse(res);
};

export const deletePaymentOut = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/payments/out/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  await handleResponse(res);
};

export const getPendingPayments = async (): Promise<{ customerPending: Invoice[], supplierPending: Supplier[] }> => {
  const res = await fetch(`${API_BASE_URL}/payments/pending`, { headers: getAuthHeaders() });
  return handleResponse(res);
};

// Project Cost Analysis Database Persistence
export const getCostAnalyses = async (): Promise<ProjectCostAnalysis[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/cost-analyses`, { headers: getAuthHeaders() });
    const data = await handleResponse(res);
    if (Array.isArray(data)) {
      return data.filter(c => c.projectName && c.projectName.toLowerCase() !== 'new project analysis' && c.projectName.toLowerCase() !== 'test');
    }
    return [];
  } catch (e) {
    console.warn('Backend cost analyses fetch failed, falling back to local cache:', e);
    const localData = localStorage.getItem('jk_cost_analyses');
    return localData ? JSON.parse(localData) : [];
  }
};

export const saveCostAnalysis = async (costData: ProjectCostAnalysis): Promise<void> => {
  try {
    const res = await fetch(`${API_BASE_URL}/cost-analyses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(costData)
    });
    await handleResponse(res);
  } catch (e) {
    console.error('Error saving cost analysis to DB:', e);
    throw e;
  }
};

export const deleteCostAnalysis = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/cost-analyses/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  await handleResponse(res);
};

// Stage Checklist Database Persistence
export const getProjectInspectionRecords = async (): Promise<ProjectInspectionRecord[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/project-inspections`, { headers: getAuthHeaders() });
    const data = await handleResponse(res);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn('Backend inspections fetch failed, falling back to local cache:', e);
    const localData = localStorage.getItem('jk_project_inspections');
    return localData ? JSON.parse(localData) : [];
  }
};

export const getProjectInspection = async (projectId: string): Promise<ProjectInspectionRecord | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/project-inspections/project/${projectId}`, { headers: getAuthHeaders() });
    const data = await handleResponse(res);
    return data || null;
  } catch (e) {
    const records = await getProjectInspectionRecords();
    return records.find(r => r.projectId === projectId) || null;
  }
};

export const saveProjectInspection = async (record: ProjectInspectionRecord): Promise<void> => {
  try {
    const res = await fetch(`${API_BASE_URL}/project-inspections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(record)
    });
    await handleResponse(res);
  } catch (e) {
    console.error('Error saving project inspection to DB:', e);
    throw e;
  }
};

export const deleteProjectInspection = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/project-inspections/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  await handleResponse(res);
};

// Daily Agenda / Master Construction Follow-up Matrix Database Persistence
export const getDailyAgendaMatrices = async (): Promise<DailyAgendaMatrix[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/daily-agenda`, { headers: getAuthHeaders() });
    const data = await handleResponse(res);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn('Backend daily agenda fetch failed, falling back to local cache:', e);
    const localData = localStorage.getItem('jk_daily_agenda_matrices');
    return localData ? JSON.parse(localData) : [];
  }
};

export const saveDailyAgendaMatrix = async (matrix: DailyAgendaMatrix): Promise<void> => {
  try {
    const res = await fetch(`${API_BASE_URL}/daily-agenda`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(matrix)
    });
    await handleResponse(res);
  } catch (e) {
    console.error('Error saving daily agenda matrix to DB:', e);
    throw e;
  }
};

export const deleteDailyAgendaMatrix = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/daily-agenda/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  await handleResponse(res);
};

// Company Profile & Branding API
export const getCompanyProfile = async (): Promise<CompanyProfile> => {
  try {
    const res = await fetch(`${API_BASE_URL}/company-profile`);
    const data = await handleResponse(res);
    if (data) {
      localStorage.setItem('jk_company_profile', JSON.stringify(data));
      return data;
    }
  } catch (e) {
    console.warn('Backend company-profile fetch failed, falling back to cache:', e);
  }
  const cached = localStorage.getItem('jk_company_profile');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // ignore
    }
  }
  return {
    companyName: 'Apex Real Estate & Infra',
    tagline: 'Building Landmarks, Fulfilling Dreams',
    logoUrl: '/uploads/logo.png',
    phonePrimary: '+91 9876543210',
    phoneSecondary: '+91 9876543211',
    whatsapp: '919876543210',
    email: 'info@apexinfra.com',
    address: 'Business Towers, Tech Park Road, Visakhapatnam, Andhra Pradesh',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    pincode: '530001',
    isoCertification: 'ISO 9001:2015 Certified',
    rera1: 'AP RERA: P0123456789',
    rera2: 'TS RERA: P0987654321',
    copyrightText: '© 2026 Apex Real Estate & Infra. All rights reserved.',
  };
};

export const updateCompanyProfile = async (
  profileData: Partial<CompanyProfile>,
  logoFile?: File,
  iconFile?: File,
  signatureFile?: File
): Promise<CompanyProfile> => {
  let body: BodyInit;
  const headers = getAuthHeaders();

  if (logoFile || iconFile || signatureFile) {
    const formData = new FormData();
    Object.entries(profileData).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        formData.append(key, String(val));
      }
    });
    if (logoFile) formData.append('logo', logoFile);
    if (iconFile) formData.append('icon', iconFile);
    if (signatureFile) formData.append('signature', signatureFile);
    body = formData;
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(profileData);
  }

  const res = await fetch(`${API_BASE_URL}/company-profile`, {
    method: 'POST',
    headers,
    body,
  });
  const data = await handleResponse(res);
  if (data) {
    localStorage.setItem('jk_company_profile', JSON.stringify(data));
  }
  return data;
};

export const uploadCompanyLogo = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('logo', file);
  const res = await fetch(`${API_BASE_URL}/company-profile/upload-logo`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Logo upload failed');
  }
  return json.url;
};

