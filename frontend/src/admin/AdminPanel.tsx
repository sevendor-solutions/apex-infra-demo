import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { User, Project, Enquiry, Blog, GalleryItem, JobApplication, City, LocationMaster, PropertyType, Facing, Amenity, Document, MarketingAgent, Expense, ExpenseCategory, Wallet, Customer, Supplier, InventoryItem, Quotation, Invoice, Loan } from '../types';
import logoImg from '../assets/logo.png';
import { 
  getProjects, 
  getMarketing,
  getEnquiries, 
  getBlogs, 
  getGallery, 
  getUsers, 
  getSessionUser, 
  setSessionUser,
  getApplications,
  getCities,
  getLocations,
  getPropertyTypes,
  getFacings,
  getAmenities,
  getDocuments,
  loginUser,
  logoutUser,
  getMarketingAgents,
  requestPasswordOtp,
  verifyPasswordOtp,
  resetPassword,
  getUserEmailByUsername,
  getExpenses,
  getExpenseCategories,
  getAuditLogs,
  clearAuditLogs,
  
  // JkFutureinfra accounting DB APIs
  getWallets,
  getQuotations,
  getInventoryItems,
  getLoans,
  getCustomers,
  getSuppliers,
  getInvoices
} from '../utils/db';

// Subcomponents
import { AdminDashboard } from './AdminDashboard';
import { AdminProjects } from './AdminProjects';
import { AdminMarketing } from './AdminMarketing';
import { AdminSites } from './AdminSites';
import { AdminGallery } from './AdminGallery';
import { AdminBlogs } from './AdminBlogs';
import { AdminDocuments } from './AdminDocuments';
import { AdminEnquiries } from './AdminEnquiries';
import { AdminUsers } from './AdminUsers';
import { AdminMasters } from './AdminMasters';
import { AdminAuditLogs } from './AdminAuditLogs';
import type { AuditLog } from './AdminAuditLogs';
import { AdminSiteVisits } from './AdminSiteVisits';
import { AdminMailConfig } from './AdminMailConfig';
import { AdminMarketingAgents } from './AdminMarketingAgents';
import { AdminExpenses } from './AdminExpenses';

// Financial & Quality Inspection Subcomponents
import { AdminCostAnalysis } from './AdminCostAnalysis';
import { AdminStageChecklist } from './AdminStageChecklist';

// JkFutureinfra accounting Subcomponents
import { AdminWallets } from './AdminWallets';
import { AdminQuotations } from './AdminQuotations';
import { AdminInventory } from './AdminInventory';
import { AdminLoans } from './AdminLoans';
import { AdminCustomers } from './AdminCustomers';
import { AdminSuppliers } from './AdminSuppliers';
import { AdminInvoices } from './AdminInvoices';
import { AdminAuditorReports } from './AdminAuditorReports';

// Icons
import { 
  LayoutDashboard, 
  Building, 
  Layers, 
  Map, 
  Image as ImageIcon, 
  FileText, 
  FolderOpen, 
  MessageSquare, 
  Users, 
  Briefcase,
  Database,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Eye,
  EyeOff,
  Search,
  ClipboardList,
  Mail,
  Settings,
  Receipt,
  
  // Accounting icons
  Landmark,
  Coins,
  Calculator,
  ClipboardCheck
} from 'lucide-react';

interface AdminPanelProps {
  onNavigate: (page: string) => void;
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  selectedEnquiryFromDashboard: Enquiry | null;
  onClearSelectedEnquiry: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onNavigate,
  onAddToast,
  selectedEnquiryFromDashboard,
  onClearSelectedEnquiry
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Session Inactivity & Expiry Reason State
  const [sessionExpiredReason, setSessionExpiredReason] = useState<string | null>(() => {
    return sessionStorage.getItem('jk_session_expired_msg') || null;
  });

  // Login credentials states
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password modal states
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotShowNewPass, setForgotShowNewPass] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);


  // Database states
  const [projects, setProjects] = useState<Project[]>([]);
  const [marketing, setMarketing] = useState<Project[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [locations, setLocations] = useState<LocationMaster[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [facings, setFacings] = useState<Facing[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [marketingAgents, setMarketingAgents] = useState<MarketingAgent[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);

  // JkFutureinfra accounting state variables
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Multi-Tab routing state
  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    const session = getSessionUser();
    if (session) {
      const saved = localStorage.getItem(`admin_open_tabs_${session.username}`);
      return saved ? JSON.parse(saved) : ['dashboard'];
    }
    return ['dashboard'];
  });
  const [activeTab, setActiveTab] = useState<string>(() => {
    const session = getSessionUser();
    if (session) {
      return localStorage.getItem(`admin_active_tab_${session.username}`) || 'dashboard';
    }
    return 'dashboard';
  });

  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Collapsible groups state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    overview: true,
    projectPortfolio: false,
    marketingCampaigns: false,
    landPlotting: false,
    mediaGallery: false,
    blogsArticles: false,
    documentArchive: false,
    leadsManagement: false,
    talentAcquisition: false,
    siteVisits: false,
    communicationConfig: false,
    accounting: false,
    systemGovernance: false,
  });

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const tabToGroupMap = useMemo(() => {
    const map: Record<string, string> = {
      dashboard: 'overview',
      projects: 'projectPortfolio',
      marketing: 'marketingCampaigns',
      marketing_agents: 'marketingCampaigns',
      sites: 'landPlotting',
      project_gallery: 'mediaGallery',
      marketing_gallery: 'mediaGallery',
      blogs: 'blogsArticles',
      documents: 'documentArchive',
      project_enquiries: 'leadsManagement',
      marketing_enquiries: 'leadsManagement',
      careers: 'talentAcquisition',
      site_visits: 'siteVisits',
      mail_config: 'communicationConfig',
      expenses: 'accounting',
      wallets: 'accounting',
      customers: 'accounting',
      suppliers: 'accounting',
      inventory: 'accounting',
      quotations: 'accounting',
      invoices: 'accounting',
      payments_in: 'accounting',
      payments_out: 'accounting',
      payments_pending: 'accounting',
      loans: 'accounting',
      auditor_reports: 'accounting',
      cost_analysis: 'accounting',
      stage_checklist: 'siteVisits',
      users: 'systemGovernance',
      masters: 'systemGovernance',
      audit_logs: 'systemGovernance',
    };
    return map;
  }, []);

  // Auto-expand group when activeTab changes
  useEffect(() => {
    if (activeTab) {
      const group = tabToGroupMap[activeTab];
      if (group) {
        setExpandedGroups(prev => {
          if (!prev[group]) {
            return { ...prev, [group]: true };
          }
          return prev;
        });
      }
    }
  }, [activeTab, tabToGroupMap]);

  // Triggered review from main dashboard click
  const [focusedEnquiry, setFocusedEnquiry] = useState<Enquiry | null>(null);

  // Custom confirmation dialog states
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmResolver, setConfirmResolver] = useState<((val: boolean) => void) | null>(null);

  // SAP Fiori top bar actions popovers
  const [profileOpen, setProfileOpen] = useState(false);

  // Theme variable controls
  const theme = 'belize';

  // Search query states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{ id: string; name: string; desc: string; type: string; tab: string }>>([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const profilePopoverRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const [draggedTabIdx, setDraggedTabIdx] = useState<number | null>(null);



  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Log system action
  const logAction = (action: string, details: string, status: 'Success' | 'Warning' | 'Failed' = 'Success') => {
    console.log(`[Client LogAction] ${action} - ${details} - Status: ${status}`);
    // Sync audit logs asynchronously only if viewing audit logs
    if (activeTab === 'audit_logs' && sessionStorage.getItem('jk_infra_logged_user_token')) {
      (async () => {
        try {
          const logs = await getAuditLogs();
          setAuditLogs(logs);
        } catch (err) {
          console.error("Failed to sync audit logs on action:", err);
        }
      })();
    }
  };

  // Load audit logs from backend database
  useEffect(() => {
    const loadLogs = async () => {
      try {
        if (currentUser && sessionStorage.getItem('jk_infra_logged_user_token')) {
          const dbLogs = await getAuditLogs();
          setAuditLogs(dbLogs);
        }
      } catch (err) {
        console.error("Failed to load audit logs from backend:", err);
      }
    };
    loadLogs();
  }, [currentUser]);

  // Apply Fiori theme colors variables dynamically on select
  useEffect(() => {
    const root = document.querySelector('.admin-layout') as HTMLElement;
    if (!root) return;

    if (theme === 'belize') {
      root.style.setProperty('--sap-shell-bg', '#0f2b46');
      root.style.setProperty('--sap-sidebar-bg', '#081625');
      root.style.setProperty('--sap-sidebar-active', '#1a436b');
    } else if (theme === 'quartz') {
      root.style.setProperty('--sap-shell-bg', '#18181b');
      root.style.setProperty('--sap-sidebar-bg', '#27272a');
      root.style.setProperty('--sap-sidebar-active', '#dc2626');
    } else if (theme === 'gold') {
      root.style.setProperty('--sap-shell-bg', '#3b0764');
      root.style.setProperty('--sap-sidebar-bg', '#1e1b4b');
      root.style.setProperty('--sap-sidebar-active', '#f2b705');
    }
  }, [theme]);

  // Handle global search input change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchSuggestions([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const suggestions: Array<{ id: string; name: string; desc: string; type: string; tab: string }> = [];

    // Search Projects
    projects.forEach(p => {
      if (p.name.toLowerCase().includes(query) || p.location.toLowerCase().includes(query)) {
        suggestions.push({
          id: p.id,
          name: p.name,
          desc: `Project: ${p.location}`,
          type: 'Project',
          tab: 'projects'
        });
      }
    });

    // Search Marketing
    marketing.forEach(m => {
      if (m.name.toLowerCase().includes(query) || m.location.toLowerCase().includes(query)) {
        suggestions.push({
          id: m.id,
          name: m.name,
          desc: `Marketing: ${m.location}`,
          type: 'Marketing',
          tab: 'marketing'
        });
      }
    });

    // Search Enquiries
    enquiries.forEach(e => {
      if (e.name.toLowerCase().includes(query) || (e.projectName && e.projectName.toLowerCase().includes(query))) {
        suggestions.push({
          id: e.id,
          name: e.name,
          desc: `Lead: Interested in ${e.projectName || 'General'}`,
          type: 'Lead',
          tab: e.projectAssociation?.startsWith('m') ? 'marketing_enquiries' : 'project_enquiries'
        });
      }
    });

    // Search Blogs
    blogs.forEach(b => {
      if (b.title.toLowerCase().includes(query)) {
        suggestions.push({
          id: b.id,
          name: b.title,
          desc: `Blog by ${b.author}`,
          type: 'Blog',
          tab: 'blogs'
        });
      }
    });

    setSearchSuggestions(suggestions.slice(0, 8));
  }, [searchQuery, projects, marketing, enquiries, blogs]);

  // Handle click outside global search dropdown to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Handle click outside profile popover to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        profileOpen &&
        profilePopoverRef.current &&
        !profilePopoverRef.current.contains(e.target as Node) &&
        profileButtonRef.current &&
        !profileButtonRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [profileOpen]);

  const handleConfirmAction = (message: string): Promise<boolean> => {
    setConfirmMessage(message);
    setConfirmOpen(true);
    return new Promise((resolve) => {
      setConfirmResolver(() => resolve);
    });
  };

  const handleConfirmChoice = (choice: boolean) => {
    setConfirmOpen(false);
    if (confirmResolver) {
      confirmResolver(choice);
    }
  };

  // Sync DB records
  const syncDBData = async () => {
    try {
      const [projs, mktg, enqs, blgs, gal, docs, usrs, apps, cts, locs, pts, fcs, ams, ags, exps, exCats, logs, wals, quotes, items, lns, custs, sups, invs] = await Promise.all([
        getProjects(),
        getMarketing(),
        getEnquiries(),
        getBlogs(),
        getGallery(),
        getDocuments(),
        getUsers(),
        getApplications(),
        getCities(),
        getLocations(),
        getPropertyTypes(),
        getFacings(),
        getAmenities(),
        getMarketingAgents(),
        getExpenses(),
        getExpenseCategories(),
        getAuditLogs(),
        
        // JkFutureinfra accounting API calls
        getWallets(),
        getQuotations(),
        getInventoryItems(),
        getLoans(),
        getCustomers(),
        getSuppliers(),
        getInvoices()
      ]);
      setProjects(projs);
      setMarketing(mktg);
      setEnquiries(enqs);
      setBlogs(blgs);
      setGallery(gal);
      setDocuments(docs);
      setUsers(usrs);
      setApplications(apps);
      setCities(cts);
      setLocations(locs);
      setPropertyTypes(pts);
      setFacings(fcs);
      setAmenities(ams);
      setMarketingAgents(ags);
      setExpenses(exps);
      setExpenseCategories(exCats);
      setAuditLogs(logs);
      
      // Set JkFutureinfra accounting states
      setWallets(wals);
      setQuotations(quotes);
      setInventoryItems(items);
      setLoans(lns);
      setCustomers(custs);
      setSuppliers(sups);
      setInvoices(invs);

      // Automatically sync/update current session if user details changed in database
      const cached = sessionStorage.getItem('jk_infra_logged_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        const latestUser = usrs.find(u => u.username === parsed.username);
        if (latestUser) {
          if (latestUser.name !== parsed.name || latestUser.email !== parsed.email || JSON.stringify(latestUser.allowedScreens) !== JSON.stringify(parsed.allowedScreens)) {
            const updated = { ...parsed, ...latestUser };
            setSessionUser(updated);
            setCurrentUser(updated);
          }
        }
      }
    } catch (err) {
      console.error("Error syncing data from backend:", err);
      onAddToast("Failed to fetch records from backend server.", "error");
    }
  };

  const refreshProjectsAndMarketing = async () => {
    try {
      const [projs, mktg] = await Promise.all([
        getProjects(),
        getMarketing()
      ]);
      setProjects(projs);
      setMarketing(mktg);
    } catch (err) {
      console.error("Error refreshing projects/marketing:", err);
    }
  };

  useEffect(() => {
    const session = getSessionUser();
    const token = sessionStorage.getItem('jk_infra_logged_user_token');
    const lastActivity = sessionStorage.getItem('jk_last_activity_time');
    const INACTIVITY_LIMIT_MS = 45 * 60 * 1000; // 45 minutes inactivity threshold

    if (session && token) {
      if (lastActivity && Date.now() - parseInt(lastActivity, 10) >= INACTIVITY_LIMIT_MS) {
        const reason = "Your session expired due to 45 minutes of inactivity. Please log in again to continue.";
        sessionStorage.setItem('jk_session_expired_msg', reason);
        setSessionExpiredReason(reason);
        logoutUser(session.username, 'Inactivity (45 minutes)');
        setSessionUser(null);
        setCurrentUser(null);
        return;
      }
      setCurrentUser(session);
      sessionStorage.setItem('jk_last_activity_time', String(Date.now()));
      syncDBData();
    } else if (session) {
      // Clear legacy session that has no token, force re-login
      setSessionUser(null);
      setCurrentUser(null);
    }
  }, []);

  // 45-Minutes User Inactivity Auto-Logout Tracker
  useEffect(() => {
    if (!currentUser) return;

    const INACTIVITY_LIMIT_MS = 45 * 60 * 1000; // 45 minutes inactivity threshold (2,700,000 ms)

    const updateActivity = () => {
      sessionStorage.setItem('jk_last_activity_time', String(Date.now()));
    };

    const checkInactivity = () => {
      const lastStr = sessionStorage.getItem('jk_last_activity_time');
      if (lastStr) {
        const lastTime = parseInt(lastStr, 10);
        if (Date.now() - lastTime >= INACTIVITY_LIMIT_MS) {
          const reason = "Your session expired due to 45 minutes of inactivity. Please log in again to continue.";
          sessionStorage.setItem('jk_session_expired_msg', reason);
          setSessionExpiredReason(reason);
          logoutUser(currentUser.username, 'Inactivity (45 minutes)');
          setSessionUser(null);
          setCurrentUser(null);
          onAddToast(reason, 'error');
        }
      }
    };

    // User activity listeners
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    // Throttle activity updates so we don't spam storage
    let lastRecorded = 0;
    const throttledUpdate = () => {
      const now = Date.now();
      if (now - lastRecorded > 2000) {
        lastRecorded = now;
        updateActivity();
      }
    };

    activityEvents.forEach(evt => window.addEventListener(evt, throttledUpdate, { passive: true }));

    // Periodic check every 15 seconds
    const interval = setInterval(checkInactivity, 15000);

    // Also check immediately when tab/window gains focus or visibility (e.g. returning to tab)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    if (!sessionStorage.getItem('jk_last_activity_time')) {
      updateActivity();
    }

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, throttledUpdate));
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [currentUser, onAddToast]);

  // Helper for screen permissions
  const hasScreenAccess = (screenId: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'Admin') return true;
    
    if (currentUser.allowedScreens) {
      return currentUser.allowedScreens.includes(screenId);
    }
    
    // Fallback defaults
    switch (screenId) {
      case 'dashboard':
        return true;
      case 'projects':
        return currentUser.role === 'ProjectOwner';
      case 'marketing':
      case 'sites':
        return currentUser.role === 'MarketingOwner';
      case 'project_gallery':
      case 'blogs':
      case 'careers':
      case 'audit_logs':
      case 'documents':
        return true;
      case 'marketing_gallery':
        return currentUser.role === 'MarketingOwner';
      case 'marketing_agents':
        return currentUser.role === 'MarketingOwner' || currentUser.role === 'MarketingAgent';
      case 'project_enquiries':
        return currentUser.role === 'ProjectOwner';
      case 'marketing_enquiries':
        return currentUser.role === 'MarketingOwner';
      case 'users':
      case 'masters':
        return false;
      case 'site_visits':
        return true;
      case 'mail_config':
        return false;
      case 'expenses':
        return currentUser.role === 'ProjectOwner' || currentUser.role === 'MarketingOwner' || currentUser.role === 'Accountant';
      case 'wallets':
      case 'payments_in':
      case 'payments_out':
      case 'payments_pending':
      case 'auditor_reports':
      case 'loans':
      case 'borrowings':
        return currentUser.role === 'Accountant';
      case 'quotations':
      case 'invoices':
      case 'customers':
        return currentUser.role === 'SalesUser';
      case 'inventory':
      case 'suppliers':
        return currentUser.role === 'InventoryManager';
      case 'cost_analysis':
      case 'stage_checklist':
        return true;
      default:
        return false;
    }
  };

  // 1. Load saved tabs only when currentUser session changes or loads
  useEffect(() => {
    if (currentUser) {
      const savedTabs = localStorage.getItem(`admin_open_tabs_${currentUser.username}`);
      const savedActive = localStorage.getItem(`admin_active_tab_${currentUser.username}`);
      
      const allTabs = ['dashboard', 'projects', 'marketing', 'sites', 'project_gallery', 'marketing_gallery', 'blogs', 'documents', 'project_enquiries', 'marketing_enquiries', 'careers', 'users', 'masters', 'audit_logs', 'site_visits', 'mail_config', 'marketing_agents', 'expenses', 'wallets', 'quotations', 'inventory', 'loans', 'borrowings', 'auditor_reports', 'invoices', 'customers', 'suppliers', 'cost_analysis', 'stage_checklist'];
      const allowed = allTabs.filter(tab => hasScreenAccess(tab));

      let loadedTabs = savedTabs ? JSON.parse(savedTabs) : ['dashboard'];
      let loadedActive = savedActive || 'dashboard';

      let finalTabs = loadedTabs.filter((t: string) => allowed.includes(t));
      if (finalTabs.length === 0) {
        finalTabs = allowed.length > 0 ? [allowed[0]] : ['dashboard'];
      }
      
      let finalActive = allowed.includes(loadedActive) ? loadedActive : (finalTabs[0] || 'dashboard');

      setOpenTabs(finalTabs);
      setActiveTab(finalActive);
    }
  }, [currentUser]);

  // 2. Persist openTabs and activeTab when they change during session
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`admin_open_tabs_${currentUser.username}`, JSON.stringify(openTabs));
    }
  }, [openTabs, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`admin_active_tab_${currentUser.username}`, activeTab);
    }
  }, [activeTab, currentUser]);

  // Handle direct enquiries clicks from main dashboard
  useEffect(() => {
    if (selectedEnquiryFromDashboard) {
      setFocusedEnquiry(selectedEnquiryFromDashboard);
      const isMarketing = selectedEnquiryFromDashboard.projectAssociation?.startsWith('m');
      const targetTab = isMarketing ? 'marketing_enquiries' : 'project_enquiries';
      handleOpenTab(targetTab);
      onClearSelectedEnquiry();
    }
  }, [selectedEnquiryFromDashboard, onClearSelectedEnquiry]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const loggedUser = await loginUser(usernameInput, passwordInput);
      sessionStorage.setItem('jk_last_activity_time', String(Date.now()));
      sessionStorage.removeItem('jk_session_expired_msg');
      setSessionExpiredReason(null);
      setSessionUser(loggedUser);
      setCurrentUser(loggedUser);
      await syncDBData();
      
      onAddToast(`Logged in successfully as ${loggedUser.name} (${loggedUser.role}).`, 'success');
      logAction('User Login', `Logged in successfully as ${loggedUser.name} (${loggedUser.role})`, 'Success');
    } catch (err: any) {
      onAddToast(err.message || 'Invalid username or password.', 'error');
      logAction('User Login', `Failed login attempt for username: ${usernameInput}`, 'Failed');
    }
  };

  const handleLogout = async () => {
    try {
      if (currentUser) {
        logAction('User Logout', `Logged out from session: ${currentUser.name}`, 'Success');
        await logoutUser(currentUser.username);
      }
    } catch (err) {
      console.error("Failed to track logout session:", err);
    }
    sessionStorage.removeItem('jk_session_expired_msg');
    sessionStorage.removeItem('jk_last_activity_time');
    setSessionExpiredReason(null);
    setSessionUser(null);
    setCurrentUser(null);
    onAddToast('Logged out from Admin Session.', 'info');
  };

  const handleSelectEnquiryReview = (enq: Enquiry) => {
    setFocusedEnquiry(enq);
    const isMarketing = enq.projectAssociation?.startsWith('m');
    handleOpenTab(isMarketing ? 'marketing_enquiries' : 'project_enquiries');
  };

  // Tabs Management
  const handleOpenTab = (tabKey: string) => {
    if (!hasScreenAccess(tabKey)) return;
    
    if (!openTabs.includes(tabKey)) {
      setOpenTabs([...openTabs, tabKey]);
    }
    setActiveTab(tabKey);
    setAdminMenuOpen(false);
  };

  const handleCloseTab = (tabKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabKey === 'dashboard') return; // Pinned tab
    
    const newTabs = openTabs.filter(t => t !== tabKey);
    setOpenTabs(newTabs);
    
    if (activeTab === tabKey) {
      setActiveTab(newTabs[newTabs.length - 1] || 'dashboard');
    }
  };

  // Drag and Drop Tabs reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedTabIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, _index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedTabIdx === null || draggedTabIdx === targetIndex) return;

    const reorderedTabs = [...openTabs];
    const [removed] = reorderedTabs.splice(draggedTabIdx, 1);
    reorderedTabs.splice(targetIndex, 0, removed);

    setOpenTabs(reorderedTabs);
    setDraggedTabIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedTabIdx(null);
  };

  // Click handler on search recommendation
  const handleSuggestionClick = (sug: { id: string; name: string; tab: string }) => {
    handleOpenTab(sug.tab);
    setSearchQuery(sug.name);
    setSearchSuggestions([]);
    
    // Seed enquiry review if suggestion clicked was a lead
    if (sug.tab === 'project_enquiries' || sug.tab === 'marketing_enquiries') {
      const match = enquiries.find(e => e.id === sug.id);
      if (match) {
        setFocusedEnquiry(match);
      }
    }
    
    logAction('Global Search', `Navigated to ${sug.tab} and filtered by "${sug.name}"`, 'Success');
  };



  // Format Tab Display Name
  const getTabLabel = (tabKey: string): string => {
    switch (tabKey) {
      case 'dashboard': return 'Launchpad Overview';
      case 'projects': return 'Manage Projects';
      case 'marketing': return 'Manage Marketing';
      case 'sites': return 'Plot Layouts';
      case 'project_gallery': return 'Project Gallery';
      case 'marketing_gallery': return 'Marketing Gallery';
      case 'blogs': return 'Blogs & News';
      case 'documents': return 'Document Storage';
      case 'project_enquiries': return 'Project Leads';
      case 'marketing_enquiries': return 'Marketing Leads';
      case 'careers': return 'Job Applications';
      case 'users': return 'Staff Logins';
      case 'masters': return 'Masters Config';
      case 'audit_logs': return 'System Audit Trail';
      case 'site_visits': return 'Site Visit Emails';
      case 'mail_config': return 'System Settings';
      case 'marketing_agents': return 'Marketing Agents';
      case 'expenses': return 'Expenses Ledger';
      case 'wallets': return 'Digital Wallets';
      case 'quotations': return 'Quotations Ledger';
      case 'inventory': return 'Stock & Inventory';
      case 'loans': return 'Loans & Borrowings';
      case 'borrowings': return 'Borrowings Tracker';
      case 'auditor_reports': return 'Auditor Reports';
      case 'invoices': return 'Sales Invoices';
      case 'payments_in': return 'Payments Received (In)';
      case 'payments_out': return 'Payments Made (Out)';
      case 'payments_pending': return 'Pending Collections';
      case 'customers': return 'Customer Accounts';
      case 'suppliers': return 'Supplier Accounts';
      case 'cost_analysis': return 'Project Cost Analysis';
      case 'stage_checklist': return 'Stage Work Checklist';
      default: return tabKey;
    }
  };

  // Filter states based on global search query
  const searchedProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.location.toLowerCase().includes(query) || 
      p.category.toLowerCase().includes(query) ||
      (p.subCategory && p.subCategory.toLowerCase().includes(query))
    );
  }, [projects, searchQuery]);

  const searchedMarketing = useMemo(() => {
    let filtered = marketing;
    if (currentUser && currentUser.role !== 'Admin') {
      if (currentUser.agentId) {
        filtered = marketing.filter(m => m.agentId === currentUser.agentId);
      } else {
        filtered = [];
      }
    }
    if (!searchQuery.trim()) return filtered;
    const query = searchQuery.toLowerCase();
    return filtered.filter(m => 
      m.name.toLowerCase().includes(query) || 
      m.location.toLowerCase().includes(query) || 
      m.category.toLowerCase().includes(query)
    );
  }, [marketing, searchQuery, currentUser]);

  const searchedEnquiries = useMemo(() => {
    if (!searchQuery.trim()) return enquiries;
    const query = searchQuery.toLowerCase();
    return enquiries.filter(e => 
      e.name.toLowerCase().includes(query) || 
      e.phone.includes(query) || 
      e.email.toLowerCase().includes(query) || 
      (e.projectName && e.projectName.toLowerCase().includes(query))
    );
  }, [enquiries, searchQuery]);

  const visibleEnquiries = useMemo(() => {
    if (currentUser?.role === 'MarketingAgent' && currentUser.agentId) {
      const agentPropertyIds = marketing.filter(m => m.agentId === currentUser.agentId).map(m => m.id);
      return searchedEnquiries.filter(e => e.projectAssociation && agentPropertyIds.includes(e.projectAssociation));
    }
    return searchedEnquiries;
  }, [currentUser, searchedEnquiries, marketing]);

  const searchedBlogs = useMemo(() => {
    if (!searchQuery.trim()) return blogs;
    const query = searchQuery.toLowerCase();
    return blogs.filter(b => 
      b.title.toLowerCase().includes(query) || 
      b.author.toLowerCase().includes(query) || 
      b.summary.toLowerCase().includes(query)
    );
  }, [blogs, searchQuery]);


  // Render Login Gate Screen
  if (!currentUser) {
    return (
      <>
        <div className="login-screen-wrapper">
          <div className="login-bg-slide" style={{ backgroundImage: "url('/login_bg1_hd.png')" }}></div>
          <div className="login-bg-slide" style={{ backgroundImage: "url('/login_bg2_hd.png')" }}></div>
          <div className="login-bg-slide" style={{ backgroundImage: "url('/login_bg3_hd.png')" }}></div>
          <div className="login-card">
            <div className="login-card-header">
              <img 
                src={logoImg} 
                alt="JK Future Infra Logo" 
                style={{ height: '130px', width: 'auto', display: 'block', margin: '0 auto 0.75rem', objectFit: 'contain' }} 
              />
              <h2>Log In <span style={{ fontWeight: 300 }}>to your account</span></h2>
            </div>
            
            <div className="login-card-body">
              {sessionExpiredReason && (
                <div style={{
                  background: '#fff1f2',
                  border: '1px solid #fda4af',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#9f1239',
                  fontSize: '0.84rem',
                  fontWeight: 500,
                  lineHeight: 1.4
                }}>
                  <AlertTriangle size={18} style={{ color: '#e11d48', flexShrink: 0 }} />
                  <span>{sessionExpiredReason}</span>
                </div>
              )}
              <form onSubmit={handleLoginSubmit}>
                <div className="login-form-group">
                  <input 
                    type="text" 
                    className="login-form-control" 
                    placeholder="Username" 
                    value={usernameInput}
                    onChange={e => setUsernameInput(e.target.value)}
                    required
                  />
                </div>
                
                <div className="login-form-group" style={{ position: 'relative' }}>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="login-form-control" 
                    placeholder="Password" 
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    required
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="login-actions-wrapper">
                  <button 
                    type="button" 
                    onClick={() => onNavigate('home')} 
                    className="login-btn-back-link"
                  >
                    ← Back to site
                  </button>
                  <button type="submit" className="login-btn-submit">
                    Log In
                  </button>
                </div>

                {/* Forgot Password link */}
                <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => { setForgotOpen(true); setForgotStep(1); setForgotError(''); setForgotSuccess(''); setForgotUsername(usernameInput); setForgotEmail(''); setForgotOtp(''); setForgotNewPassword(''); setForgotConfirmPassword(''); }}
                    style={{ background: 'none', border: 'none', color: '#0f2b46', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline', opacity: 0.7 }}
                  >
                    Forgot password?
                  </button>
                </div>
              </form>
            </div>

            <div className="login-card-footer-copyright">
              <div>© 2026 JK Future Infra</div>
            </div>
          </div>
        </div>

        {/* ── Forgot Password Modal ── */}
        {forgotOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '420px', margin: '1rem', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>

              {/* Modal Header */}
              <div style={{ background: 'linear-gradient(135deg, #0f2b46 0%, #1a436b 100%)', padding: '1.5rem', color: 'white', position: 'relative' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🔐</div>
                <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '1.15rem', color: 'white' }}>
                  {forgotStep === 1 && 'Reset your password'}
                  {forgotStep === 2 && 'Enter the OTP'}
                  {forgotStep === 3 && 'Set new password'}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', opacity: 0.75, color: 'white' }}>
                  {forgotStep === 1 && 'Enter your registered email to receive a one-time password.'}
                  {forgotStep === 2 && `A 6-digit OTP was sent to ${forgotEmail}. Enter it below.`}
                  {forgotStep === 3 && 'Create a strong new password for your account.'}
                </p>
                {/* Step indicator */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '1rem' }}>
                  {[1,2,3].map(s => (
                    <div key={s} style={{ flex: 1, height: '3px', borderRadius: '99px', background: forgotStep >= s ? '#f2b705' : 'rgba(255,255,255,0.25)' }} />
                  ))}
                </div>
                <button onClick={() => setForgotOpen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>

              <div style={{ padding: '1.5rem' }}>
                {forgotError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                    ⚠️ {forgotError}
                  </div>
                )}
                {forgotSuccess && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                    ✅ {forgotSuccess}
                  </div>
                )}

                {/* STEP 1: Enter Username & Fetch Email */}
                {forgotStep === 1 && (
                  !forgotEmail ? (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!forgotUsername.trim()) { setForgotError('Please enter a username.'); return; }
                      setForgotError(''); setForgotLoading(true);
                      try {
                        const email = await getUserEmailByUsername(forgotUsername);
                        setForgotEmail(email);
                      } catch(err: any) {
                        setForgotError(err.message || 'Username not found.');
                      } finally { setForgotLoading(false); }
                    }}>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0f2b46', marginBottom: '6px' }}>Username</label>
                        <input
                          type="text"
                          className="login-form-control"
                          placeholder="Enter your staff username"
                          value={forgotUsername}
                          onChange={e => setForgotUsername(e.target.value)}
                          required
                          autoFocus
                        />
                      </div>
                      <button type="submit" className="login-btn-submit" style={{ width: '100%', marginTop: '0.5rem', opacity: forgotLoading ? 0.7 : 1 }} disabled={forgotLoading}>
                        {forgotLoading ? 'Verifying username...' : 'Find Account →'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      setForgotError(''); setForgotLoading(true);
                      try {
                        await requestPasswordOtp(forgotEmail);
                        setForgotStep(2);
                        setOtpResendCountdown(60);
                        const timer = setInterval(() => setOtpResendCountdown(c => { if (c <= 1) { clearInterval(timer); return 0; } return c - 1; }), 1000);
                      } catch(err: any) {
                        setForgotError(err.message || 'Failed to send OTP. Try again.');
                      } finally { setForgotLoading(false); }
                    }}>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0f2b46', marginBottom: '6px' }}>Username</label>
                        <input
                          type="text"
                          className="login-form-control"
                          value={forgotUsername}
                          disabled
                          style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }}
                        />
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0f2b46', marginBottom: '6px' }}>Registered Email Address</label>
                        <input
                          type="email"
                          className="login-form-control"
                          value={forgotEmail}
                          disabled
                          style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                        <button 
                          type="button" 
                          onClick={() => { setForgotEmail(''); setForgotError(''); }} 
                          className="login-btn-back-link" 
                          style={{ flex: 1, padding: '0.65rem', border: '1.5px solid #cbd5e1', borderRadius: '8px', background: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#475569' }}
                        >
                          ← Change User
                        </button>
                        <button 
                          type="submit" 
                          className="login-btn-submit" 
                          style={{ flex: 2, opacity: forgotLoading ? 0.7 : 1 }} 
                          disabled={forgotLoading}
                        >
                          {forgotLoading ? 'Sending OTP...' : 'Send OTP →'}
                        </button>
                      </div>
                    </form>
                  )
                )}

                {/* STEP 2: Enter OTP */}
                {forgotStep === 2 && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setForgotError(''); setForgotLoading(true);
                    try {
                      await verifyPasswordOtp(forgotEmail, forgotOtp);
                      setForgotStep(3);
                    } catch(err: any) {
                      setForgotError(err.message || 'Invalid OTP. Please try again.');
                    } finally { setForgotLoading(false); }
                  }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0f2b46', marginBottom: '6px' }}>6-Digit OTP</label>
                      <input
                        type="text"
                        className="login-form-control"
                        placeholder="_ _ _ _ _ _"
                        value={forgotOtp}
                        onChange={e => setForgotOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                        maxLength={6}
                        required
                        autoFocus
                        style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px', fontFamily: 'monospace' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>OTP valid for 10 minutes</span>
                        {otpResendCountdown > 0 ? (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Resend in {otpResendCountdown}s</span>
                        ) : (
                          <button type="button" style={{ background: 'none', border: 'none', color: '#0f2b46', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={async () => {
                              setForgotError('');
                              try { await requestPasswordOtp(forgotEmail); setOtpResendCountdown(60); const t = setInterval(() => setOtpResendCountdown(c => { if (c<=1){clearInterval(t);return 0;} return c-1; }), 1000); }
                              catch(err:any) { setForgotError(err.message); }
                            }}
                          >Resend OTP</button>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button type="button" onClick={() => { setForgotStep(1); setForgotOtp(''); setForgotError(''); }} style={{ flex: 1, padding: '0.65rem', border: '1.5px solid #cbd5e1', borderRadius: '8px', background: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#475569' }}>← Back</button>
                      <button type="submit" className="login-btn-submit" style={{ flex: 2, opacity: forgotLoading ? 0.7 : 1 }} disabled={forgotLoading || forgotOtp.length < 6}>
                        {forgotLoading ? 'Verifying...' : 'Verify OTP →'}
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 3: Set New Password */}
                {forgotStep === 3 && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (forgotNewPassword !== forgotConfirmPassword) { setForgotError('Passwords do not match.'); return; }
                    if (forgotNewPassword.length < 6) { setForgotError('Password must be at least 6 characters.'); return; }
                    setForgotError(''); setForgotLoading(true);
                    try {
                      await resetPassword(forgotEmail, forgotOtp, forgotNewPassword);
                      setForgotSuccess('Password reset successfully! You can now log in with your new password.');
                      setTimeout(() => setForgotOpen(false), 2500);
                    } catch(err: any) {
                      setForgotError(err.message || 'Reset failed. Please try again.');
                    } finally { setForgotLoading(false); }
                  }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0f2b46', marginBottom: '6px' }}>New Password</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={forgotShowNewPass ? 'text' : 'password'}
                          className="login-form-control"
                          placeholder="Minimum 6 characters"
                          value={forgotNewPassword}
                          onChange={e => setForgotNewPassword(e.target.value)}
                          required
                          autoFocus
                          style={{ paddingRight: '40px' }}
                        />
                        <button type="button" onClick={() => setForgotShowNewPass(!forgotShowNewPass)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                          {forgotShowNewPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                        </button>
                      </div>
                    </div>
                    <div style={{ marginBottom: '1.25rem' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0f2b46', marginBottom: '6px' }}>Confirm Password</label>
                      <input
                        type={forgotShowNewPass ? 'text' : 'password'}
                        className="login-form-control"
                        placeholder="Re-enter new password"
                        value={forgotConfirmPassword}
                        onChange={e => setForgotConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    <button type="submit" className="login-btn-submit" style={{ width: '100%', opacity: forgotLoading ? 0.7 : 1 }} disabled={forgotLoading}>
                      {forgotLoading ? 'Resetting...' : '✓ Reset Password'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }



  return (
    <div className={`admin-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile Backdrop Overlay for Sidebar */}
      {adminMenuOpen && (
        <div 
          className="admin-mobile-backdrop" 
          onClick={() => setAdminMenuOpen(false)} 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(3px)',
            zIndex: 998
          }}
        />
      )}
      
      {/* Collapsible Left Sidebar */}
      <aside className={`admin-sidebar ${adminMenuOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        
        <div className="admin-sidebar-header">
          <img 
            src={logoImg} 
            alt="JK Logo" 
            onClick={() => {
              handleOpenTab('dashboard');
              setExpandedGroups({
                overview: true,
                projectPortfolio: false,
                marketingCampaigns: false,
                landPlotting: false,
                mediaGallery: false,
                blogsArticles: false,
                documentArchive: false,
                leadsManagement: false,
                talentAcquisition: false,
                siteVisits: false,
                communicationConfig: false,
                accounting: false,
                systemGovernance: false,
              });
            }}
            style={{
              marginTop: '10px',
              height: '119px',
              width: '205px',
              objectFit: 'contain',
              backgroundColor: 'rgb(255, 255, 255)',
              padding: '4px 12px',
              borderRadius: '44px',
              display: 'block',
              cursor: 'pointer'
            }} 
          />
          <button 
            type="button"
            className="sidebar-collapse-btn hide-mobile"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <ul className="admin-sidebar-menu">
          
          {/* Group 1: Overview & Dashboard */}
          <div className="admin-sidebar-group">
            <div 
              className="admin-sidebar-group-header" 
              onClick={() => toggleGroup('overview')}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                cursor: 'pointer',
                paddingRight: '1.25rem',
                userSelect: 'none'
              }}
            >
              <div className="admin-sidebar-group-title" style={{ flex: 1, paddingRight: 0 }}>Overview & Dashboard</div>
              {!sidebarCollapsed && (
                <ChevronDown 
                  size={14} 
                  className="group-arrow-icon"
                  style={{ 
                    transform: expandedGroups.overview ? 'rotate(0deg)' : 'rotate(-90deg)', 
                    transition: 'transform 0.2s ease',
                    color: 'rgba(255, 255, 255, 0.4)',
                    flexShrink: 0
                  }} 
                />
              )}
            </div>
            {(expandedGroups.overview || sidebarCollapsed) && (
              <>
                {hasScreenAccess('dashboard') && (
                  <li className="admin-sidebar-item">
                    <button 
                      onClick={() => handleOpenTab('dashboard')} 
                      className={`admin-sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                      data-tooltip="Launchpad Overview"
                    >
                      <LayoutDashboard size={16} /> <span className="admin-sidebar-link-text">Dashboard</span>
                    </button>
                  </li>
                )}
              </>
            )}
          </div>

          {/* Group 2: Project Portfolio */}
          {hasScreenAccess('projects') && (
            <div className="admin-sidebar-group">
              <div 
                className="admin-sidebar-group-header" 
                onClick={() => toggleGroup('projectPortfolio')}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  cursor: 'pointer',
                  paddingRight: '1.25rem',
                  userSelect: 'none'
                }}
              >
                <div className="admin-sidebar-group-title" style={{ flex: 1, paddingRight: 0 }}>Project Portfolio</div>
                {!sidebarCollapsed && (
                  <ChevronDown 
                    size={14} 
                    className="group-arrow-icon"
                    style={{ 
                      transform: expandedGroups.projectPortfolio ? 'rotate(0deg)' : 'rotate(-90deg)', 
                      transition: 'transform 0.2s ease',
                      color: 'rgba(255, 255, 255, 0.4)',
                      flexShrink: 0
                    }} 
                  />
                )}
              </div>
              {(expandedGroups.projectPortfolio || sidebarCollapsed) && (
                <>
                  <li className="admin-sidebar-item">
                    <button 
                      onClick={() => handleOpenTab('projects')} 
                      className={`admin-sidebar-link ${activeTab === 'projects' ? 'active' : ''}`}
                      data-tooltip="Manage Projects"
                    >
                      <Building size={16} /> <span className="admin-sidebar-link-text">Manage Projects</span>
                    </button>
                  </li>
                </>
              )}
            </div>
          )}

          {/* Group 3: Marketing Campaigns */}
          {(hasScreenAccess('marketing') || hasScreenAccess('marketing_agents')) && (
            <div className="admin-sidebar-group">
              <div 
                className="admin-sidebar-group-header" 
                onClick={() => toggleGroup('marketingCampaigns')}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  cursor: 'pointer',
                  paddingRight: '1.25rem',
                  userSelect: 'none'
                }}
              >
                <div className="admin-sidebar-group-title" style={{ flex: 1, paddingRight: 0 }}>Marketing Campaigns</div>
                {!sidebarCollapsed && (
                  <ChevronDown 
                    size={14} 
                    className="group-arrow-icon"
                    style={{ 
                      transform: expandedGroups.marketingCampaigns ? 'rotate(0deg)' : 'rotate(-90deg)', 
                      transition: 'transform 0.2s ease',
                      color: 'rgba(255, 255, 255, 0.4)',
                      flexShrink: 0
                    }} 
                  />
                )}
              </div>
              {(expandedGroups.marketingCampaigns || sidebarCollapsed) && (
                <>
                  {hasScreenAccess('marketing') && (
                    <li className="admin-sidebar-item">
                      <button 
                        onClick={() => handleOpenTab('marketing')} 
                        className={`admin-sidebar-link ${activeTab === 'marketing' ? 'active' : ''}`}
                        data-tooltip="Manage Marketing"
                      >
                        <Layers size={16} /> <span className="admin-sidebar-link-text">Manage Marketing</span>
                      </button>
                    </li>
                  )}
                  {hasScreenAccess('marketing_agents') && (
                    <li className="admin-sidebar-item">
                      <button 
                        onClick={() => handleOpenTab('marketing_agents')} 
                        className={`admin-sidebar-link ${activeTab === 'marketing_agents' ? 'active' : ''}`}
                        data-tooltip="Marketing Agents"
                      >
                        <Users size={16} /> <span className="admin-sidebar-link-text">Marketing Agents</span>
                      </button>
                    </li>
                  )}
                </>
              )}
            </div>
          )}

          {/* Group 4: Land Plotting */}
          {hasScreenAccess('sites') && (
            <div className="admin-sidebar-group">
              <div 
                className="admin-sidebar-group-header" 
                onClick={() => toggleGroup('landPlotting')}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  cursor: 'pointer',
                  paddingRight: '1.25rem',
                  userSelect: 'none'
                }}
              >
                <div className="admin-sidebar-group-title" style={{ flex: 1, paddingRight: 0 }}>Land Plotting</div>
                {!sidebarCollapsed && (
                  <ChevronDown 
                    size={14} 
                    className="group-arrow-icon"
                    style={{ 
                      transform: expandedGroups.landPlotting ? 'rotate(0deg)' : 'rotate(-90deg)', 
                      transition: 'transform 0.2s ease',
                      color: 'rgba(255, 255, 255, 0.4)',
                      flexShrink: 0
                    }} 
                  />
                )}
              </div>
              {(expandedGroups.landPlotting || sidebarCollapsed) && (
                <>
                  <li className="admin-sidebar-item">
                    <button 
                      onClick={() => handleOpenTab('sites')} 
                      className={`admin-sidebar-link ${activeTab === 'sites' ? 'active' : ''}`}
                      data-tooltip="Plot Layouts"
                    >
                      <Map size={16} /> <span className="admin-sidebar-link-text">Plot Layouts</span>
                    </button>
                  </li>
                </>
              )}
            </div>
          )}

          {/* Group 5: Media Gallery */}
          {(hasScreenAccess('project_gallery') || hasScreenAccess('marketing_gallery')) && (
            <div className="admin-sidebar-group">
              <div 
                className="admin-sidebar-group-header" 
                onClick={() => toggleGroup('mediaGallery')}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  cursor: 'pointer',
                  paddingRight: '1.25rem',
                  userSelect: 'none'
                }}
              >
                <div className="admin-sidebar-group-title" style={{ flex: 1, paddingRight: 0 }}>Media Gallery</div>
                {!sidebarCollapsed && (
                  <ChevronDown 
                    size={14} 
                    className="group-arrow-icon"
                    style={{ 
                      transform: expandedGroups.mediaGallery ? 'rotate(0deg)' : 'rotate(-90deg)', 
                      transition: 'transform 0.2s ease',
                      color: 'rgba(255, 255, 255, 0.4)',
                      flexShrink: 0
                    }} 
                  />
                )}
              </div>
              {(expandedGroups.mediaGallery || sidebarCollapsed) && (
                <>
                  {hasScreenAccess('project_gallery') && (
                    <li className="admin-sidebar-item">
                      <button 
                        onClick={() => handleOpenTab('project_gallery')} 
                        className={`admin-sidebar-link ${activeTab === 'project_gallery' ? 'active' : ''}`}
                        data-tooltip="Project Gallery"
                      >
                        <ImageIcon size={16} /> <span className="admin-sidebar-link-text">Project Gallery</span>
                      </button>
                    </li>
                  )}
                  {hasScreenAccess('marketing_gallery') && (
                    <li className="admin-sidebar-item">
                      <button 
                        onClick={() => handleOpenTab('marketing_gallery')} 
                        className={`admin-sidebar-link ${activeTab === 'marketing_gallery' ? 'active' : ''}`}
                        data-tooltip="Marketing Gallery"
                      >
                        <ImageIcon size={16} /> <span className="admin-sidebar-link-text">Marketing Gallery</span>
                      </button>
                    </li>
                  )}
                </>
              )}
            </div>
          )}

          {/* Group 6: Blogs & Articles */}
          {hasScreenAccess('blogs') && (
            <div className="admin-sidebar-group">
              <div 
                className="admin-sidebar-group-header" 
                onClick={() => toggleGroup('blogsArticles')}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  cursor: 'pointer',
                  paddingRight: '1.25rem',
                  userSelect: 'none'
                }}
              >
                <div className="admin-sidebar-group-title" style={{ flex: 1, paddingRight: 0 }}>Blogs & Articles</div>
                {!sidebarCollapsed && (
                  <ChevronDown 
                    size={14} 
                    className="group-arrow-icon"
                    style={{ 
                      transform: expandedGroups.blogsArticles ? 'rotate(0deg)' : 'rotate(-90deg)', 
                      transition: 'transform 0.2s ease',
                      color: 'rgba(255, 255, 255, 0.4)',
                      flexShrink: 0
                    }} 
                  />
                )}
              </div>
              {(expandedGroups.blogsArticles || sidebarCollapsed) && (
                <>
                  <li className="admin-sidebar-item">
                    <button 
                      onClick={() => handleOpenTab('blogs')} 
                      className={`admin-sidebar-link ${activeTab === 'blogs' ? 'active' : ''}`}
                      data-tooltip="Blogs & News"
                    >
                      <FileText size={16} /> <span className="admin-sidebar-link-text">Blogs & News</span>
                    </button>
                  </li>
                </>
              )}
            </div>
          )}

          {/* Group 7: Document Archive */}
          {hasScreenAccess('documents') && (
            <div className="admin-sidebar-group">
              <div 
                className="admin-sidebar-group-header" 
                onClick={() => toggleGroup('documentArchive')}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  cursor: 'pointer',
                  paddingRight: '1.25rem',
                  userSelect: 'none'
                }}
              >
                <div className="admin-sidebar-group-title" style={{ flex: 1, paddingRight: 0 }}>Document Archive</div>
                {!sidebarCollapsed && (
                  <ChevronDown 
                    size={14} 
                    className="group-arrow-icon"
                    style={{ 
                      transform: expandedGroups.documentArchive ? 'rotate(0deg)' : 'rotate(-90deg)', 
                      transition: 'transform 0.2s ease',
                      color: 'rgba(255, 255, 255, 0.4)',
                      flexShrink: 0
                    }} 
                  />
                )}
              </div>
              {(expandedGroups.documentArchive || sidebarCollapsed) && (
                <>
                  <li className="admin-sidebar-item">
                    <button 
                      onClick={() => handleOpenTab('documents')} 
                      className={`admin-sidebar-link ${activeTab === 'documents' ? 'active' : ''}`}
                      data-tooltip="Document Storage"
                    >
                      <FolderOpen size={16} /> <span className="admin-sidebar-link-text">Document Storage</span>
                    </button>
                  </li>
                </>
              )}
            </div>
          )}

          {/* Group 8: Leads Management */}
          {(hasScreenAccess('project_enquiries') || hasScreenAccess('marketing_enquiries')) && (
            <div className="admin-sidebar-group">
              <div 
                className="admin-sidebar-group-header" 
                onClick={() => toggleGroup('leadsManagement')}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  cursor: 'pointer',
                  paddingRight: '1.25rem',
                  userSelect: 'none'
                }}
              >
                <div className="admin-sidebar-group-title" style={{ flex: 1, paddingRight: 0 }}>Leads Management</div>
                {!sidebarCollapsed && (
                  <ChevronDown 
                    size={14} 
                    className="group-arrow-icon"
                    style={{ 
                      transform: expandedGroups.leadsManagement ? 'rotate(0deg)' : 'rotate(-90deg)', 
                      transition: 'transform 0.2s ease',
                      color: 'rgba(255, 255, 255, 0.4)',
                      flexShrink: 0
                    }} 
                  />
                )}
              </div>
              {(expandedGroups.leadsManagement || sidebarCollapsed) && (
                <>
                  {hasScreenAccess('project_enquiries') && (
                    <li className="admin-sidebar-item">
                      <button 
                        onClick={() => handleOpenTab('project_enquiries')} 
                        className={`admin-sidebar-link ${activeTab === 'project_enquiries' ? 'active' : ''}`}
                        data-tooltip="Project Leads"
                      >
                        <MessageSquare size={16} /> <span className="admin-sidebar-link-text">Project Leads</span>
                      </button>
                    </li>
                  )}
                  {hasScreenAccess('marketing_enquiries') && (
                    <li className="admin-sidebar-item">
                      <button 
                        onClick={() => handleOpenTab('marketing_enquiries')} 
                        className={`admin-sidebar-link ${activeTab === 'marketing_enquiries' ? 'active' : ''}`}
                        data-tooltip="Marketing Leads"
                      >
                        <MessageSquare size={16} /> <span className="admin-sidebar-link-text">Marketing Leads</span>
                      </button>
                    </li>
                  )}
                </>
              )}
            </div>
          )}



          {/* Group 10: Site Visits */}
          {hasScreenAccess('site_visits') && (
            <div className="admin-sidebar-group">
              <div 
                className="admin-sidebar-group-header" 
                onClick={() => toggleGroup('siteVisits')}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  cursor: 'pointer',
                  paddingRight: '1.25rem',
                  userSelect: 'none'
                }}
              >
                <div className="admin-sidebar-group-title" style={{ flex: 1, paddingRight: 0 }}>Site Visits</div>
                {!sidebarCollapsed && (
                  <ChevronDown 
                    size={14} 
                    className="group-arrow-icon"
                    style={{ 
                      transform: expandedGroups.siteVisits ? 'rotate(0deg)' : 'rotate(-90deg)', 
                      transition: 'transform 0.2s ease',
                      color: 'rgba(255, 255, 255, 0.4)',
                      flexShrink: 0
                    }} 
                  />
                )}
              </div>
              {(expandedGroups.siteVisits || sidebarCollapsed) && (
                <>
                  <li className="admin-sidebar-item">
                    <button 
                      onClick={() => handleOpenTab('site_visits')} 
                      className={`admin-sidebar-link ${activeTab === 'site_visits' ? 'active' : ''}`}
                      data-tooltip="Site Visit Emails"
                    >
                      <Mail size={16} /> <span className="admin-sidebar-link-text">Site Visit Emails</span>
                    </button>
                  </li>
                  {hasScreenAccess('stage_checklist') && (
                    <li className="admin-sidebar-item">
                      <button 
                        onClick={() => handleOpenTab('stage_checklist')} 
                        className={`admin-sidebar-link ${activeTab === 'stage_checklist' ? 'active' : ''}`}
                        data-tooltip="Daily Agenda Matrix"
                      >
                        <ClipboardCheck size={16} /> <span className="admin-sidebar-link-text">Daily Agenda Matrix</span>
                      </button>
                    </li>
                  )}
                </>
              )}
            </div>
          )}

          {/* Group 11: Communication Config */}
          {hasScreenAccess('mail_config') && (
            <div className="admin-sidebar-group">
              <div 
                className="admin-sidebar-group-header" 
                onClick={() => toggleGroup('communicationConfig')}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  cursor: 'pointer',
                  paddingRight: '1.25rem',
                  userSelect: 'none'
                }}
              >
                <div className="admin-sidebar-group-title" style={{ flex: 1, paddingRight: 0 }}>Communication Config</div>
                {!sidebarCollapsed && (
                  <ChevronDown 
                    size={14} 
                    className="group-arrow-icon"
                    style={{ 
                      transform: expandedGroups.communicationConfig ? 'rotate(0deg)' : 'rotate(-90deg)', 
                      transition: 'transform 0.2s ease',
                      color: 'rgba(255, 255, 255, 0.4)',
                      flexShrink: 0
                    }} 
                  />
                )}
              </div>
              {(expandedGroups.communicationConfig || sidebarCollapsed) && (
                <>
                  <li className="admin-sidebar-item">
                    <button 
                      onClick={() => handleOpenTab('mail_config')} 
                      className={`admin-sidebar-link ${activeTab === 'mail_config' ? 'active' : ''}`}
                      data-tooltip="System Settings"
                    >
                      <Settings size={16} /> <span className="admin-sidebar-link-text">System Settings</span>
                    </button>
                  </li>
                </>
              )}
            </div>
          )}

          {/* Consolidated Group: Accounting */}
          {(hasScreenAccess('expenses') || hasScreenAccess('wallets') || 
            hasScreenAccess('customers') || hasScreenAccess('suppliers') || 
            hasScreenAccess('inventory') || hasScreenAccess('quotations') || 
            hasScreenAccess('invoices') || hasScreenAccess('payments_in') || 
            hasScreenAccess('payments_out') || hasScreenAccess('payments_pending') || 
            hasScreenAccess('loans') || hasScreenAccess('auditor_reports')) && (
            <div className="admin-sidebar-group">
              <div 
                className="admin-sidebar-group-header" 
                onClick={() => toggleGroup('accounting')}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  cursor: 'pointer',
                  paddingRight: '1.25rem',
                  userSelect: 'none'
                }}
              >
                <div className="admin-sidebar-group-title" style={{ flex: 1, paddingRight: 0 }}>Accounting</div>
                {!sidebarCollapsed && (
                  <ChevronDown 
                    size={14} 
                    className="group-arrow-icon"
                    style={{ 
                      transform: expandedGroups.accounting ? 'rotate(0deg)' : 'rotate(-90deg)', 
                      transition: 'transform 0.2s ease',
                      color: 'rgba(255, 255, 255, 0.4)',
                      flexShrink: 0
                    }} 
                  />
                )}
              </div>
              {(expandedGroups.accounting || sidebarCollapsed) && (
                <>
                  {hasScreenAccess('expenses') && (
                    <li className="admin-sidebar-item">
                      <button 
                        onClick={() => handleOpenTab('expenses')} 
                        className={`admin-sidebar-link ${activeTab === 'expenses' ? 'active' : ''}`}
                        data-tooltip="Expenses Ledger"
                      >
                        <Receipt size={16} /> <span className="admin-sidebar-link-text">Expenses Ledger</span>
                      </button>
                    </li>
                  )}
                  {hasScreenAccess('wallets') && (
                    <li className="admin-sidebar-item">
                      <button 
                        onClick={() => handleOpenTab('wallets')} 
                        className={`admin-sidebar-link ${activeTab === 'wallets' ? 'active' : ''}`}
                        data-tooltip="Digital Wallets"
                      >
                        <Landmark size={16} /> <span className="admin-sidebar-link-text">Digital Wallets</span>
                      </button>
                    </li>
                  )}
                  {hasScreenAccess('customers') && (
                    <li className="admin-sidebar-item">
                      <button 
                        onClick={() => handleOpenTab('customers')} 
                        className={`admin-sidebar-link ${activeTab === 'customers' ? 'active' : ''}`}
                        data-tooltip="Customer Accounts"
                      >
                        <Users size={16} /> <span className="admin-sidebar-link-text">Customers</span>
                      </button>
                    </li>
                  )}
                  {hasScreenAccess('suppliers') && (
                    <li className="admin-sidebar-item">
                      <button 
                        onClick={() => handleOpenTab('suppliers')} 
                        className={`admin-sidebar-link ${activeTab === 'suppliers' ? 'active' : ''}`}
                        data-tooltip="Supplier Accounts"
                      >
                        <Briefcase size={16} /> <span className="admin-sidebar-link-text">Suppliers</span>
                      </button>
                    </li>
                  )}
                  {hasScreenAccess('inventory') && (
                    <li className="admin-sidebar-item">
                      <button 
                        onClick={() => handleOpenTab('inventory')} 
                        className={`admin-sidebar-link ${activeTab === 'inventory' ? 'active' : ''}`}
                        data-tooltip="Stock & Inventory"
                      >
                        <Layers size={16} /> <span className="admin-sidebar-link-text">Stock & Inventory</span>
                      </button>
                    </li>
                  )}
                  {hasScreenAccess('quotations') && (
                    <li className="admin-sidebar-item">
                      <button 
                        onClick={() => handleOpenTab('quotations')} 
                        className={`admin-sidebar-link ${activeTab === 'quotations' ? 'active' : ''}`}
                        data-tooltip="Quotations"
                      >
                        <ClipboardList size={16} /> <span className="admin-sidebar-link-text">Quotations</span>
                      </button>
                    </li>
                  )}
                  {hasScreenAccess('invoices') && (
                    <li className="admin-sidebar-item">
                      <button 
                        onClick={() => handleOpenTab('invoices')} 
                        className={`admin-sidebar-link ${activeTab === 'invoices' ? 'active' : ''}`}
                        data-tooltip="Sales Invoices"
                      >
                        <FileText size={16} /> <span className="admin-sidebar-link-text">Sales Invoices</span>
                      </button>
                    </li>
                  )}
                  {hasScreenAccess('loans') && (
                    <li className="admin-sidebar-item">
                      <button 
                        onClick={() => handleOpenTab('loans')} 
                        className={`admin-sidebar-link ${activeTab === 'loans' ? 'active' : ''}`}
                        data-tooltip="Loans & Borrowings"
                      >
                        <Coins size={16} /> <span className="admin-sidebar-link-text">Loans & Borrowings</span>
                      </button>
                    </li>
                  )}
                  {hasScreenAccess('auditor_reports') && (
                    <li className="admin-sidebar-item">
                      <button 
                        onClick={() => handleOpenTab('auditor_reports')} 
                        className={`admin-sidebar-link ${activeTab === 'auditor_reports' ? 'active' : ''}`}
                        data-tooltip="Auditor Reports"
                      >
                        <FileText size={16} /> <span className="admin-sidebar-link-text">Auditor Reports</span>
                      </button>
                    </li>
                  )}
                  {hasScreenAccess('cost_analysis') && (
                    <li className="admin-sidebar-item">
                      <button 
                        onClick={() => handleOpenTab('cost_analysis')} 
                        className={`admin-sidebar-link ${activeTab === 'cost_analysis' ? 'active' : ''}`}
                        data-tooltip="Project Cost Sheet"
                      >
                        <Calculator size={16} /> <span className="admin-sidebar-link-text">Project Cost Sheet</span>
                      </button>
                    </li>
                  )}
                </>
              )}
            </div>
          )}

          {/* Group 15: System Governance */}
          {(hasScreenAccess('users') || hasScreenAccess('masters') || hasScreenAccess('audit_logs')) && (
            <div className="admin-sidebar-group">
              <div 
                className="admin-sidebar-group-header" 
                onClick={() => toggleGroup('systemGovernance')}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  cursor: 'pointer',
                  paddingRight: '1.25rem',
                  userSelect: 'none'
                }}
              >
                <div className="admin-sidebar-group-title" style={{ flex: 1, paddingRight: 0 }}>System Governance</div>
                {!sidebarCollapsed && (
                  <ChevronDown 
                    size={14} 
                    className="group-arrow-icon"
                    style={{ 
                      transform: expandedGroups.systemGovernance ? 'rotate(0deg)' : 'rotate(-90deg)', 
                      transition: 'transform 0.2s ease',
                      color: 'rgba(255, 255, 255, 0.4)',
                      flexShrink: 0
                    }} 
                  />
                )}
              </div>
              {(expandedGroups.systemGovernance || sidebarCollapsed) && (
                <>
                  {hasScreenAccess('users') && (
                    <li className="admin-sidebar-item">
                      <button 
                        onClick={() => handleOpenTab('users')} 
                        className={`admin-sidebar-link ${activeTab === 'users' ? 'active' : ''}`}
                        data-tooltip="Staff Logins"
                      >
                        <Users size={16} /> <span className="admin-sidebar-link-text">Staff Logins</span>
                      </button>
                    </li>
                  )}
                  {hasScreenAccess('masters') && (
                    <li className="admin-sidebar-item">
                      <button 
                        onClick={() => handleOpenTab('masters')} 
                        className={`admin-sidebar-link ${activeTab === 'masters' ? 'active' : ''}`}
                        data-tooltip="Masters Config"
                      >
                        <Database size={16} /> <span className="admin-sidebar-link-text">Masters Config</span>
                      </button>
                    </li>
                  )}
                  {hasScreenAccess('audit_logs') && (
                    <li className="admin-sidebar-item">
                      <button 
                        onClick={() => handleOpenTab('audit_logs')} 
                        className={`admin-sidebar-link ${activeTab === 'audit_logs' ? 'active' : ''}`}
                        data-tooltip="System Audit Trail"
                      >
                        <ClipboardList size={16} /> <span className="admin-sidebar-link-text">Audit Trail</span>
                      </button>
                    </li>
                  )}
                </>
              )}
            </div>
          )}
        </ul>


      </aside>

      {/* Workspace Panel Rendering Container */}
      <div className="admin-workspace">
        
        {/* Top SAP Shell Bar */}
        <header className="sap-shellbar">
          <div className="sap-shellbar-left">
            <button 
              className="sidebar-collapse-btn show-mobile"
              onClick={() => setAdminMenuOpen(!adminMenuOpen)}
              style={{ padding: '8px' }}
            >
              <Menu size={20} />
            </button>
          </div>

          {/* Global Smart Search */}
          <div className="sap-shellbar-center" ref={searchContainerRef}>
            <div className="sap-shellbar-search-wrapper">
              <input 
                type="text"
                placeholder="Global search projects, leads, blogs..."
                className="sap-shellbar-search-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    setSearchSuggestions([]);
                  }
                }}
              />
              <Search size={16} className="search-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.45)' }} />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSearchSuggestions([]); }}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'rgba(255, 255, 255, 0.6)',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Suggestions dropdown list */}
            {searchSuggestions.length > 0 && (
              <div className="sap-search-suggestions">
                <div className="sap-suggestion-group-title">Recommendations matching "{searchQuery}"</div>
                {searchSuggestions.map((sug, i) => (
                  <div key={i} className="sap-suggestion-item" onClick={() => handleSuggestionClick(sug)}>
                    <div className="flex flex-col">
                      <span className="sap-suggestion-name">{sug.name}</span>
                      <span className="sap-suggestion-desc">{sug.desc}</span>
                    </div>
                    <span className="badge badge-ongoing" style={{ fontSize: '0.65rem', borderRadius: '4px', textTransform: 'uppercase' }}>
                      {sug.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sap-shellbar-right">
            {/* User Profile */}
            <button 
              ref={profileButtonRef}
              className="sap-shellbar-action-btn"
              onClick={() => setProfileOpen(!profileOpen)}
              style={{ padding: '4px' }}
              title="My Account"
            >
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--secondary)', color: 'var(--primary)', display: 'flex', alignItems: 'center', fontWeight: 'bold', fontSize: '0.85rem', justifyContent: 'center' }}>
                {currentUser.name.charAt(0)}
              </div>
            </button>
          </div>
        </header>

        {/* Dynamic Action Popovers */}
        


        {/* 4. User Profile Profile Popover */}
        {profileOpen && (
          <div ref={profilePopoverRef} className="sap-popover" style={{ width: '280px' }}>
            <div className="sap-popover-body" style={{ padding: '1.25rem' }}>
              <div 
                className="flex flex-col align-center text-center gap-0.75 profile-block-hover"
                onClick={() => {
                  setProfileOpen(false);
                  if (hasScreenAccess('users')) {
                    handleOpenTab('users');
                  } else {
                    onAddToast('Staff logins management is restricted to Administrators.', 'error');
                  }
                }}
                style={{ cursor: 'pointer', padding: '0.5rem', borderRadius: '6px', transition: 'background-color 0.2s' }}
                title="Go to Manage Staff Logins"
              >
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--secondary)', color: 'var(--primary)', display: 'flex', alignItems: 'center', fontWeight: 'bold', fontSize: '1.8rem', justifyContent: 'center', margin: '0 auto' }}>
                  {currentUser.name.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-md text-dark leading-tight">{currentUser.name}</span>
                  <span className="text-xs text-muted" style={{ marginTop: '0.1rem' }}>{currentUser.email}</span>
                  <span className="text-xxs text-secondary font-bold uppercase mt-0.5" style={{ color: 'var(--sap-fiori-blue)', fontSize: '0.65rem' }}>
                    Staff ID: JK-{currentUser.id.substring(0, 5).toUpperCase()}
                  </span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '1rem', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }} className="text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Authorization Level:</span>
                  <strong>{currentUser.role}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Staff Status:</span>
                  <span className="text-success font-semibold">Active Session</span>
                </div>
              </div>
            </div>
            <div className="sap-popover-footer" style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  if (hasScreenAccess('users')) {
                    handleOpenTab('users');
                  } else {
                    onAddToast('Staff logins management is restricted to Administrators.', 'error');
                  }
                }}
                className="btn btn-outline btn-sm flex-1"
                style={{ fontSize: '0.75rem', borderColor: 'var(--sap-border-color)' }}
              >
                Profile
              </button>
              <button 
                type="button"
                onClick={() => { setProfileOpen(false); handleLogout(); }}
                className="btn btn-secondary btn-sm flex-1"
                style={{ fontSize: '0.75rem', backgroundColor: '#ef4444', borderColor: '#ef4444' }}
              >
                Log Out
              </button>
            </div>
          </div>
        )}

        {/* Multi-Tab Navigation Bar */}
        <nav className="sap-tabbar">
          {openTabs.map((tabKey, index) => (
            <div 
              key={tabKey}
              className={`sap-tab ${activeTab === tabKey ? 'active' : ''} ${draggedTabIdx === index ? 'dragging' : ''}`}
              onClick={() => setActiveTab(tabKey)}
              title={getTabLabel(tabKey)}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <span className="sap-tab-title">{getTabLabel(tabKey)}</span>
              {tabKey !== 'dashboard' && (
                <button 
                  type="button"
                  onClick={(e) => handleCloseTab(tabKey, e)}
                  className="sap-tab-close"
                  title="Close tab"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          ))}
        </nav>

        {/* Main Panel Content Render Area */}
        <main className="admin-main">
          {activeTab === 'dashboard' && hasScreenAccess('dashboard') && (
            <AdminDashboard 
              projects={searchedProjects}
              marketing={searchedMarketing}
              enquiries={searchedEnquiries}
              blogs={searchedBlogs}
              expenses={expenses}
              hasExpenseAccess={hasScreenAccess('expenses')}
              onSetTab={handleOpenTab}
              onSelectEnquiry={handleSelectEnquiryReview}
              role={currentUser.role}
              hasScreenAccess={hasScreenAccess}
              onRefresh={syncDBData}
              onAddToast={onAddToast}
              users={users}
              applications={applications}
              
              // Accounting props
              wallets={wallets}
              invoices={invoices}
              customers={customers}
              suppliers={suppliers}
              inventoryItems={inventoryItems}
              loans={loans}
              quotations={quotations}
              marketingAgents={marketingAgents}
            />
          )}
          
          {activeTab === 'projects' && hasScreenAccess('projects') && (
            <AdminProjects 
              projects={searchedProjects}
              cities={cities}
              locations={locations}
              propertyTypes={propertyTypes}
              facings={facings}
              amenities={amenities}
              onRefresh={() => { refreshProjectsAndMarketing(); logAction('Data Sync', 'Refreshed project lists from SQL database', 'Success'); }}
              onAddToast={(msg, type) => {
                onAddToast(msg, type);
                if (type === 'success') logAction('Project Update', msg, 'Success');
              }}
              onConfirm={handleConfirmAction}
            />
          )}
          
          {activeTab === 'marketing' && hasScreenAccess('marketing') && (
            <AdminMarketing 
              marketing={searchedMarketing}
              cities={cities}
              locations={locations}
              propertyTypes={propertyTypes}
              facings={facings}
              amenities={amenities}
              agents={marketingAgents}
              onRefresh={() => { refreshProjectsAndMarketing(); logAction('Data Sync', 'Refreshed marketing lists from SQL database', 'Success'); }}
              onAddToast={(msg, type) => {
                onAddToast(msg, type);
                if (type === 'success') logAction('Marketing Update', msg, 'Success');
              }}
              onConfirm={handleConfirmAction}
            />
          )}

          {activeTab === 'marketing_agents' && hasScreenAccess('marketing_agents') && (
            <AdminMarketingAgents 
              agents={currentUser?.role === 'MarketingAgent' && currentUser.agentId ? marketingAgents.filter(a => a.id === currentUser.agentId) : marketingAgents}
              currentUser={currentUser}
              onRefresh={() => { syncDBData(); logAction('Data Sync', 'Refreshed marketing agents list from SQL database', 'Success'); }}
              onAddToast={(msg, type) => {
                onAddToast(msg, type);
                if (type === 'success') logAction('Marketing Agent Update', msg, 'Success');
              }}
              onConfirm={handleConfirmAction}
            />
          )}

          {activeTab === 'sites' && hasScreenAccess('sites') && (
            <AdminSites 
              marketing={searchedMarketing}
            />
          )}

          {activeTab === 'project_gallery' && hasScreenAccess('project_gallery') && (
            <AdminGallery 
              gallery={gallery}
              projects={searchedProjects}
              marketing={searchedMarketing}
              mediaType="projects"
              onRefresh={() => { syncDBData(); logAction('Gallery Sync', 'Synced projects photo gallery', 'Success'); }}
              onAddToast={(msg, type) => {
                onAddToast(msg, type);
                if (type === 'success') logAction('Gallery Update', msg, 'Success');
              }}
              onConfirm={handleConfirmAction}
            />
          )}

          {activeTab === 'marketing_gallery' && hasScreenAccess('marketing_gallery') && (
            <AdminGallery 
              gallery={gallery}
              projects={searchedProjects}
              marketing={searchedMarketing}
              mediaType="marketing"
              onRefresh={() => { syncDBData(); logAction('Gallery Sync', 'Synced marketing photo gallery', 'Success'); }}
              onAddToast={(msg, type) => {
                onAddToast(msg, type);
                if (type === 'success') logAction('Gallery Update', msg, 'Success');
              }}
              onConfirm={handleConfirmAction}
            />
          )}

          {activeTab === 'blogs' && hasScreenAccess('blogs') && (
            <AdminBlogs 
              blogs={searchedBlogs}
              onRefresh={() => { syncDBData(); logAction('Blogs Sync', 'Synced blogs and company updates list', 'Success'); }}
              onAddToast={(msg, type) => {
                onAddToast(msg, type);
                if (type === 'success') logAction('Blogs Update', msg, 'Success');
              }}
              onConfirm={handleConfirmAction}
            />
          )}

          {activeTab === 'documents' && hasScreenAccess('documents') && (
            <AdminDocuments 
              documents={documents}
              projects={searchedProjects}
              marketing={searchedMarketing}
              onRefresh={() => { syncDBData(); logAction('Documents Sync', 'Synced document storage repository', 'Success'); }}
              onAddToast={(msg, type) => {
                onAddToast(msg, type);
                if (type === 'success') logAction('Documents Update', msg, 'Success');
              }}
              onConfirm={handleConfirmAction}
            />
          )}

          {activeTab === 'project_enquiries' && hasScreenAccess('project_enquiries') && (
            <AdminEnquiries 
              enquiries={visibleEnquiries}
              type="projects"
              selectedEnquiry={focusedEnquiry}
              onClearSelected={() => setFocusedEnquiry(null)}
              onRefresh={() => { syncDBData(); logAction('Leads Sync', 'Synced project enquiries', 'Success'); }}
              onAddToast={(msg, type) => {
                onAddToast(msg, type);
                if (type === 'success') logAction('Leads Update', msg, 'Success');
              }}
              onConfirm={handleConfirmAction}
            />
          )}

          {activeTab === 'marketing_enquiries' && hasScreenAccess('marketing_enquiries') && (
            <AdminEnquiries 
              enquiries={visibleEnquiries}
              type="marketing"
              selectedEnquiry={focusedEnquiry}
              onClearSelected={() => setFocusedEnquiry(null)}
              onRefresh={() => { syncDBData(); logAction('Leads Sync', 'Synced marketing enquiries', 'Success'); }}
              onAddToast={(msg, type) => {
                onAddToast(msg, type);
                if (type === 'success') logAction('Leads Update', msg, 'Success');
              }}
              onConfirm={handleConfirmAction}
            />
          )}



          {activeTab === 'users' && hasScreenAccess('users') && (
            <AdminUsers 
              users={users}
              currentUser={currentUser}
              agents={marketingAgents}
              onRefresh={async () => {
                await syncDBData();
                logAction('Staff Sync', 'Refreshed staff configurations', 'Success');
                if (currentUser) {
                  try {
                    const dbUsers = await getUsers();
                    const freshSession = dbUsers.find(u => u.id === currentUser.id);
                    if (freshSession) {
                      setSessionUser(freshSession);
                      setCurrentUser(freshSession);
                    }
                  } catch (err) {
                    console.error("Error refreshing current user session:", err);
                  }
                }
              }}
              onAddToast={(msg, type) => {
                onAddToast(msg, type);
                if (type === 'success') logAction('Staff Update', msg, 'Success');
              }}
              onConfirm={handleConfirmAction}
            />
          )}

          {activeTab === 'masters' && hasScreenAccess('masters') && (
            <AdminMasters 
              cities={cities}
              locations={locations}
              propertyTypes={propertyTypes}
              facings={facings}
              amenities={amenities}
              expenseCategories={expenseCategories}
              onRefresh={() => { syncDBData(); logAction('Masters Sync', 'Synced Masters configuration matrices', 'Success'); }}
              onAddToast={(msg, type) => {
                onAddToast(msg, type);
                if (type === 'success') logAction('Masters Update', msg, 'Success');
              }}
              onConfirm={handleConfirmAction}
            />
          )}

          {activeTab === 'expenses' && hasScreenAccess('expenses') && (
            <AdminExpenses 
              expenses={expenses}
              expenseCategories={expenseCategories}
              projects={projects}
              locations={locations}
              wallets={wallets}
              suppliers={suppliers}
              onRefresh={() => { syncDBData(); logAction('Expenses Sync', 'Synced Expenses records ledger', 'Success'); }}
              onAddToast={(msg, type) => {
                onAddToast(msg, type);
                if (type === 'success') logAction('Expenses Update', msg, 'Success');
              }}
              onConfirm={handleConfirmAction}
            />
          )}

          {activeTab === 'wallets' && hasScreenAccess('wallets') && (
            <AdminWallets 
              onAddToast={onAddToast}
              onConfirm={handleConfirmAction}
            />
          )}

          {activeTab === 'quotations' && hasScreenAccess('quotations') && (
            <AdminQuotations 
              onAddToast={onAddToast}
              onConfirm={handleConfirmAction}
            />
          )}

          {activeTab === 'inventory' && hasScreenAccess('inventory') && (
            <AdminInventory 
              onAddToast={onAddToast}
              onConfirm={handleConfirmAction}
            />
          )}

          {activeTab === 'loans' && hasScreenAccess('loans') && (
            <AdminLoans 
              wallets={wallets}
              onAddToast={onAddToast}
              onConfirm={handleConfirmAction}
            />
          )}

          {activeTab === 'customers' && hasScreenAccess('customers') && (
            <AdminCustomers 
              onAddToast={onAddToast}
              onConfirm={handleConfirmAction}
            />
          )}

          {activeTab === 'suppliers' && hasScreenAccess('suppliers') && (
            <AdminSuppliers 
              onAddToast={onAddToast}
              onConfirm={handleConfirmAction}
            />
          )}

          {activeTab === 'invoices' && hasScreenAccess('invoices') && (
            <AdminInvoices 
              onAddToast={onAddToast}
              onConfirm={handleConfirmAction}
            />
          )}



          {activeTab === 'auditor_reports' && hasScreenAccess('auditor_reports') && (
            <AdminAuditorReports />
          )}

          {activeTab === 'audit_logs' && hasScreenAccess('audit_logs') && (
            <AdminAuditLogs 
              logs={auditLogs}
              onClearLogs={async () => {
                try {
                  await clearAuditLogs();
                  setAuditLogs([]);
                  onAddToast('System audit trail log has been cleared.', 'info');
                } catch (err) {
                  onAddToast('Failed to clear audit logs.', 'error');
                }
              }}
              onRefresh={async () => {
                try {
                  const refreshed = await getAuditLogs();
                  setAuditLogs(refreshed);
                  onAddToast('Audit logs trail refreshed.', 'success');
                } catch (err) {
                  onAddToast('Failed to refresh audit logs.', 'error');
                }
              }}
            />
          )}

          {activeTab === 'site_visits' && hasScreenAccess('site_visits') && (
            <AdminSiteVisits 
              projects={projects}
              marketing={marketing}
              onAddToast={onAddToast}
              onConfirm={handleConfirmAction}
            />
          )}

          {activeTab === 'mail_config' && hasScreenAccess('mail_config') && (
            <AdminMailConfig 
              onAddToast={onAddToast}
            />
          )}

          {activeTab === 'cost_analysis' && hasScreenAccess('cost_analysis') && (
            <AdminCostAnalysis 
              projects={projects}
              onAddToast={onAddToast}
              onConfirm={handleConfirmAction}
            />
          )}

          {activeTab === 'stage_checklist' && hasScreenAccess('stage_checklist') && (
            <AdminStageChecklist 
              projects={projects}
              onAddToast={onAddToast}
              onConfirm={handleConfirmAction}
            />
          )}
        </main>

        {/* Custom Confirmation Modal */}
        {confirmOpen && (() => {
          const isDeleteAction = confirmMessage.toLowerCase().includes('delete');
          const isConvertAction = confirmMessage.toLowerCase().includes('convert');
          const btnText = isDeleteAction ? 'Delete' : (isConvertAction ? 'Convert' : 'Confirm');
          const headerBg = isDeleteAction ? '#fce8e6' : '#eff6ff';
          const headerBorder = isDeleteAction ? '#f5c2c2' : '#bfdbfe';
          const headerColor = isDeleteAction ? '#c93b3b' : '#1d4ed8';
          const btnBg = isDeleteAction ? 'var(--danger)' : 'var(--primary, #0f2b46)';

          return (
            <div className="modal-overlay" style={{ zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="modal-content confirm-modal" onClick={e => e.stopPropagation()} style={{ width: '400px', borderRadius: '8px', overflow: 'hidden' }}>
                <div className="confirm-modal-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: headerBg, borderBottom: `1px solid ${headerBorder}`, color: headerColor, fontWeight: 'bold' }}>
                  <AlertTriangle size={20} />
                  <span>Confirm Action Request</span>
                </div>
                <div className="confirm-modal-body" style={{ padding: '1.25rem', fontSize: '0.9rem', color: '#333' }}>
                  {confirmMessage}
                </div>
                <div className="confirm-modal-footer" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', padding: '1rem', borderTop: '1px solid #eee' }}>
                  <button 
                    type="button"
                    onClick={() => handleConfirmChoice(false)} 
                    className="btn btn-outline btn-sm"
                    style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleConfirmChoice(true)} 
                    className="btn btn-secondary btn-sm"
                    style={{ 
                      backgroundColor: btnBg, 
                      borderColor: btnBg, 
                      color: 'white',
                      padding: '0.45rem 1rem', 
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    {btnText}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
