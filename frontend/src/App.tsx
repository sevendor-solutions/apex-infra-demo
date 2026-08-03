import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { pageView } from './utils/analytics';

// Pages
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Projects } from './pages/Projects';
import { ProjectDetails } from './pages/ProjectDetails';
import { Marketing } from './pages/Marketing';
import { Gallery } from './pages/Gallery';
import { BlogPage } from './pages/Blog';
import { Contact } from './pages/Contact';
import { AdminPanel } from './admin/AdminPanel';
import { initDB, getProjects, getMarketing, getBlogs, getGallery, addEnquiry, getPropertyTypes, getFacings, getCities, getLocations } from './utils/db';
import type { ProjectCategory, Project, Blog, GalleryItem, Enquiry, PropertyType, Facing, City, LocationMaster } from './types';
import { X, Send, User, Mail, Phone, MessageSquare, ShieldCheck, ChevronUp } from 'lucide-react';
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

function App() {
  // Navigation Routing States
  const [activePage, setActivePage] = useState<string>('home');
  useEffect(() => {
  pageView("/" + activePage);
}, [activePage]);

  const [activeCategory, setActiveCategory] = useState<ProjectCategory | null>(null);
  const [activeSiteCategory, setActiveSiteCategory] = useState<string | null>(null);
  const [activeParams, setActiveParams] = useState<any>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 200) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Quick Enquiry Modal States
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);
  const [enquiryProjectName, setEnquiryProjectName] = useState('General Enquiry');
  
  // Enquiry form local states
  const [enqName, setEnqName] = useState('');
  const [enqEmail, setEnqEmail] = useState('');
  const [enqPhone, setEnqPhone] = useState('');
  const [enqMessage, setEnqMessage] = useState('');
  const [captchaNum1, setCaptchaNum1] = useState(5);
  const [captchaNum2, setCaptchaNum2] = useState(4);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [modalErrors, setModalErrors] = useState<any>({});

  // Direct review dashboard shortcut
  const [selectedDashboardEnquiry, setSelectedDashboardEnquiry] = useState<Enquiry | null>(null);

  // Toast States
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Database Synchronized States
  const [projects, setProjects] = useState<Project[]>([]);
  const [marketing, setMarketing] = useState<Project[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [facings, setFacings] = useState<Facing[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [locations, setLocations] = useState<LocationMaster[]>([]);


  // Seed and fetch data & Handle Clean HTML5 Path Routing
  useEffect(() => {
    initDB();
    refreshData();

    // ⚡ Auto-refresh Google News blog feed every 60 seconds (1 minute)
    const newsInterval = setInterval(async () => {
      try {
        const blgs = await getBlogs();
        setBlogs(blgs);
      } catch (err) {
        console.error("Auto-sync blog news error:", err);
      }
    }, 60000);

    const parseCleanRoute = () => {
      let pathname = window.location.pathname || '/';
      let search = window.location.search || '';
      const hash = window.location.hash || '';

      // Clean up legacy hash if someone visits with #/ (e.g. #/blog -> /blog)
      if (hash && hash.startsWith('#/')) {
        const raw = hash.replace(/^#\//, '');
        const parts = raw.split('?');
        pathname = '/' + parts[0];
        search = parts[1] ? '?' + parts[1] : search;
        window.history.replaceState({}, '', pathname + search);
      }

      const params = new URLSearchParams(search);

      if (pathname === '/project-details') {
        const id = params.get('id');
        const showMap = params.get('showMap') === 'true';
        const isMarketing = params.get('isMarketing') === 'true';
        setActivePage('project-details');
        setActiveParams({ id, showMap, isMarketing });
      } else if (pathname === '/marketing') {
        const category = (params.get('category') || 'Flats') as ProjectCategory;
        const siteCategory = params.get('siteCategory') || null;
        setActivePage('marketing');
        setActiveCategory(category);
        setActiveSiteCategory(siteCategory);
      } else if (pathname === '/projects-ongoing') {
        setActivePage('projects-ongoing');
        setActiveParams({ status: 'Ongoing' });
      } else if (pathname === '/projects-upcoming') {
        setActivePage('projects-upcoming');
        setActiveParams({ status: 'Upcoming' });
      } else if (pathname === '/projects-completed') {
        setActivePage('projects-completed');
        setActiveParams({ status: 'Completed' });
      } else if (pathname === '/projects') {
        setActivePage('projects');
      } else if (pathname === '/about') {
        setActivePage('about');
      } else if (pathname === '/gallery') {
        setActivePage('gallery');
      } else if (pathname === '/blog-details') {
        setActivePage('blog-details');
        setActiveParams({ slug: params.get('slug') });
      } else if (pathname === '/blog') {
        setActivePage('blog');
      } else if (pathname === '/contact') {
        setActivePage('contact');
      } else if (pathname === '/jk-control-panel-99') {
        // 🔒 Secret Hidden Admin Route
        setActivePage('admin');
      } else if (pathname === '/admin' || hash.includes('admin')) {
        // 🚫 Block public guessing of /admin — Redirect to Home page!
        window.history.replaceState({}, '', '/');
        setActivePage('home');
      } else {
        // Fallback for legacy query params
        const projectId = params.get('project');
        const pageParam = params.get('page');
        if (projectId) {
          setActivePage('project-details');
          setActiveParams({ id: projectId });
        } else if (pageParam === 'marketing') {
          const cat = (params.get('category') || 'Flats') as ProjectCategory;
          const siteCat = params.get('siteCategory') || null;
          setActivePage('marketing');
          setActiveCategory(cat);
          setActiveSiteCategory(siteCat);
        } else {
          setActivePage('home');
        }
      }
    };

    parseCleanRoute(); // Check route on initial load
    window.addEventListener('popstate', parseCleanRoute);
    return () => {
      clearInterval(newsInterval);
      window.removeEventListener('popstate', parseCleanRoute);
    };
  }, []);

  // Manage body scrolling layout for admin portal session
  const isLoggedAdmin = activePage === 'admin' && sessionStorage.getItem('jk_infra_logged_user') !== null;
  useEffect(() => {
    if (isLoggedAdmin) {
      document.body.classList.add('admin-body');
    } else {
      document.body.classList.remove('admin-body');
    }
    return () => {
      document.body.classList.remove('admin-body');
    };
  }, [isLoggedAdmin]);

  const refreshData = async () => {
    try {
      const [projs, mktg, blgs, gal, pts, fcs, cts, locs] = await Promise.all([
        getProjects(),
        getMarketing(),
        getBlogs(),
        getGallery(),
        getPropertyTypes(),
        getFacings(),
        getCities(),
        getLocations()
      ]);
      setProjects(projs);
      setMarketing(mktg);
      setBlogs(blgs);
      setGallery(gal);
      setPropertyTypes(pts);
      setFacings(fcs);
      setCities(cts);
      setLocations(locs);
    } catch (err) {
      console.error("Error loading data from API:", err);
      addToast("Failed to load data from backend server.", "error");
    }
  };

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = 'toast_' + Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto remove
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const handleNavigate = (page: string, category: ProjectCategory | null = null, siteCategory: string | null = null, params: any = null) => {
    const wasAdmin = activePage === 'admin';

    setActivePage(page);
    setActiveCategory(category);
    setActiveSiteCategory(siteCategory);
    setActiveParams(params);

    // Build clean URL pathname & query string (No # symbol!)
    let newPath = '/';
    if (page === 'project-details' && params?.id) {
      newPath = `/project-details?id=${params.id}${params.showMap ? '&showMap=true' : ''}${params.isMarketing ? '&isMarketing=true' : ''}`;
    } else if (page === 'marketing') {
      newPath = `/marketing?category=${encodeURIComponent(category || 'Flats')}${siteCategory ? '&siteCategory=' + encodeURIComponent(siteCategory) : ''}`;
    } else if (page === 'projects-ongoing') {
      newPath = '/projects-ongoing';
    } else if (page === 'projects-upcoming') {
      newPath = '/projects-upcoming';
    } else if (page === 'projects-completed') {
      newPath = '/projects-completed';
    } else if (page === 'projects') {
      newPath = '/projects';
    } else if (page === 'about') {
      newPath = '/about';
    } else if (page === 'gallery') {
      newPath = '/gallery';
    } else if (page === 'blog') {
      newPath = '/blog';
    } else if (page === 'blog-details' && params?.slug) {
      newPath = `/blog-details?slug=${encodeURIComponent(params.slug)}`;
    } else if (page === 'contact') {
      newPath = '/contact';
    } else if (page === 'admin') {
      newPath = '/jk-control-panel-99';
    } else {
      newPath = '/';
    }

    window.history.pushState({}, '', newPath);

    // Only refresh data if transitioning from the admin panel (where data could be updated)
    // or if projects state is empty (initial load didn't complete).
    if (wasAdmin || projects.length === 0) {
      refreshData();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open Enquiry Modal
  const handleOpenEnquiryModal = (projectName: string = 'General Enquiry') => {
    setEnquiryProjectName(projectName);
    setEnqName('');
    setEnqEmail('');
    setEnqPhone('');
    setEnqMessage(projectName === 'General Enquiry' 
      ? 'Hi! I would like to receive details on your residential plot ventures and villa communities.' 
      : `Hi! I would like to check prices and RERA compliance data for ${projectName}.`);
    
    // Generate new captcha numbers
    setCaptchaNum1(Math.floor(Math.random() * 9) + 1);
    setCaptchaNum2(Math.floor(Math.random() * 9) + 1);
    setCaptchaAnswer('');
    setModalErrors({});
    setEnquiryModalOpen(true);
  };

  const validateModalForm = () => {
    const errors: any = {};
    if (!enqName.trim()) errors.name = 'Full name is required';
    if (!enqEmail.trim()) {
      errors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(enqEmail)) {
      errors.email = 'Please enter a valid email';
    }
    if (!enqPhone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^\+?[0-9\s-]{10,14}$/.test(enqPhone.replace(/\s+/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
    }
    
    const correctSum = captchaNum1 + captchaNum2;
    if (parseInt(captchaAnswer) !== correctSum) {
      errors.captcha = 'Incorrect sum answer';
    }
    
    setModalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateModalForm()) {
      addToast('Please fix the validation errors.', 'error');
      return;
    }

    const matchedProject = [...projects, ...marketing].find(p => p.name === enquiryProjectName);

    const newEnq: Enquiry = {
      id: 'enq_' + Date.now(),
      name: enqName,
      email: enqEmail,
      phone: enqPhone,
      message: enqMessage,
      projectAssociation: matchedProject ? matchedProject.id : 'General',
      projectName: enquiryProjectName,
      date: new Date().toISOString(),
      status: 'New',
      notes: ''
    };

    try {
      await addEnquiry(newEnq);
      addToast('Your quick enquiry has been sent to our corporate advisors.', 'success');
      setEnquiryModalOpen(false);
    } catch (err) {
      addToast('Failed to submit enquiry to backend.', 'error');
    }
  };




  return (
    <div className="app-root" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Toast notifications rendering */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Header (Hidden for active admin screen) */}
      {!isLoggedAdmin && (
        <Header 
          activePage={activePage}
          activeCategory={activeCategory}
          activeSiteCategory={activeSiteCategory}
          onNavigate={handleNavigate}
          onOpenEnquiry={() => handleOpenEnquiryModal()}
        />
      )}

      {/* Main Page Rendering Engine */}
      <div className="page-body-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activePage === 'home' && (
          <Home 
            projects={projects}
            blogs={blogs}
            onNavigate={handleNavigate}
            onOpenEnquiry={handleOpenEnquiryModal}
          />
        )}

        {activePage === 'about' && <About />}

        {activePage === 'projects' && (
          <Projects 
            projects={projects}
            initialParams={activeParams}
            onNavigate={handleNavigate}
            onOpenEnquiry={handleOpenEnquiryModal}
            propertyTypes={propertyTypes}
            facings={facings}
            cities={cities}
            locations={locations}
          />
        )}

        {/* Dynamic status listings */}
        {activePage === 'projects-ongoing' && (
          <Projects 
            projects={projects}
            initialParams={{ status: 'Ongoing' }}
            onNavigate={handleNavigate}
            onOpenEnquiry={handleOpenEnquiryModal}
            propertyTypes={propertyTypes}
            facings={facings}
            cities={cities}
            locations={locations}
          />
        )}
        {activePage === 'projects-upcoming' && (
          <Projects 
            projects={projects}
            initialParams={{ status: 'Upcoming' }}
            onNavigate={handleNavigate}
            onOpenEnquiry={handleOpenEnquiryModal}
            propertyTypes={propertyTypes}
            facings={facings}
            cities={cities}
            locations={locations}
          />
        )}
        {activePage === 'projects-completed' && (
          <Projects 
            projects={projects}
            initialParams={{ status: 'Completed' }}
            onNavigate={handleNavigate}
            onOpenEnquiry={handleOpenEnquiryModal}
            propertyTypes={propertyTypes}
            facings={facings}
            cities={cities}
            locations={locations}
          />
        )}

        {activePage === 'project-details' && (
          <ProjectDetails 
            projectId={activeParams?.id}
            projects={[...projects, ...marketing]}
            isMarketing={activeParams?.isMarketing === true || marketing.some(m => String(m.id) === String(activeParams?.id))}
            showMap={activeParams?.showMap === true}
            onBack={() => {
              const projId = activeParams?.id;
              const currentProj = [...projects, ...marketing].find(p => String(p.id) === String(projId));
              const isMktFromParams = activeParams?.isMarketing === true;

              if (isMktFromParams) {
                const cat = currentProj?.category || activeCategory || 'Flats';
                const subCat = currentProj?.subCategory || activeSiteCategory || null;
                handleNavigate('marketing', cat, subCat);
              } else if (currentProj?.status === 'Upcoming') {
                handleNavigate('projects-upcoming', null, null, { status: 'Upcoming' });
              } else if (currentProj?.status === 'Completed') {
                handleNavigate('projects-completed', null, null, { status: 'Completed' });
              } else {
                handleNavigate('projects-ongoing', null, null, { status: 'Ongoing' });
              }
            }}
            onAddToast={addToast}
          />
        )}

        {activePage === 'marketing' && (
          <Marketing 
            category={activeCategory || 'Flats'}
            siteCategory={activeSiteCategory}
            projects={marketing}
            onNavigate={handleNavigate}
            propertyTypes={propertyTypes}
            facings={facings}
            cities={cities}
            locations={locations}
            initialFilters={activeParams?.initialFilters}
          />
        )}

        {activePage === 'gallery' && (
          <Gallery 
            galleryItems={gallery}
          />
        )}



        {activePage === 'blog' && (
          <BlogPage 
            blogs={blogs}
            activeSlug={null}
            onNavigate={handleNavigate}
            onAddToast={addToast}
          />
        )}

        {activePage === 'blog-details' && (
          <BlogPage 
            blogs={blogs}
            activeSlug={activeParams?.slug}
            onNavigate={handleNavigate}
            onAddToast={addToast}
          />
        )}

        {activePage === 'contact' && (
          <Contact 
            onAddToast={addToast}
          />
        )}

        {activePage === 'admin' && (
          <AdminPanel 
            onNavigate={handleNavigate}
            onAddToast={addToast}
            selectedEnquiryFromDashboard={selectedDashboardEnquiry}
            onClearSelectedEnquiry={() => setSelectedDashboardEnquiry(null)}
          />
        )}
      </div>

      {/* Floating CTA buttons (Hidden for active admin) */}
      {!isLoggedAdmin && (
        <div className="floating-actions">
          <a 
            href="https://wa.me/919000553832?text=Hello%20JK%20Future%20Infra,%20I%20have%20an%20enquiry%20regarding%20properties." 
            target="_blank" 
            rel="noreferrer" 
            className="float-btn float-whatsapp"
            aria-label="WhatsApp Chat"
            title="Chat on WhatsApp"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M12.031 2C6.446 2 1.922 6.524 1.922 12.109c0 1.782.463 3.522 1.34 5.06l-1.424 5.201 5.322-1.396a10.05 10.05 0 0 0 4.871 1.246h.004c5.581 0 10.105-4.524 10.105-10.109C22.14 6.524 17.616 2 12.031 2zm0 18.528h-.002c-1.579 0-3.125-.424-4.473-1.226l-.32-.19-3.32.87.886-3.235-.208-.33a8.178 8.178 0 0 1-1.252-4.321c0-4.516 3.673-8.19 8.192-8.19 2.186 0 4.243.852 5.79 2.401a8.134 8.134 0 0 1 2.398 5.791c0 4.516-3.673 8.19-8.191 8.19zm4.502-6.149c-.247-.123-1.46-.72-1.685-.802-.227-.082-.392-.123-.556.123-.164.247-.638.802-.782.967-.144.164-.288.185-.535.062-.247-.123-1.04-.383-1.98-1.222-.731-.652-1.225-1.459-1.369-1.706-.144-.247-.015-.38.109-.502.112-.11.247-.288.371-.432.124-.144.165-.247.247-.412.082-.164.041-.309-.02-.432-.062-.123-.556-1.338-.762-1.833-.2-.484-.422-.412-.576-.42-.149-.008-.32-.01-.493-.01-.173 0-.456.065-.694.325-.238.26-1.002.979-1.002 2.387 0 1.408 1.025 2.766 1.168 2.955.144.189 2.016 3.078 4.885 4.316.682.295 1.215.47 1.63.603.687.218 1.312.187 1.806.114.55-.082 1.685-.688 1.921-1.353.236-.665.236-1.235.165-1.353-.07-.119-.247-.185-.494-.308z"/>
            </svg>
          </a>
          <a 
            href="tel:+919000553832" 
            className="float-btn float-call"
            aria-label="Call Us"
            title="Call Us Now"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </a>
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
            className={`float-btn float-scroll-top ${showScrollTop ? 'visible' : ''}`}
            aria-label="Scroll to Top"
            title="Scroll to Top"
          >
            <ChevronUp size={22} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Footer (Hidden for active admin) */}
      {!isLoggedAdmin && (
        <Footer 
          onNavigate={handleNavigate}
        />
      )}

      {/* Quick Enquiry Modal Pop-up */}
      {enquiryModalOpen && (
        <div className="modal-overlay" onClick={() => setEnquiryModalOpen(false)}>
          <div className="modal-content premium-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setEnquiryModalOpen(false)} aria-label="Close modal">
              <X size={20} />
            </button>
            
            {/* Modal Header */}
            <div className="premium-modal-header">
              <h3 className="modal-title">Quick Property Enquiry</h3>
              <p className="modal-subtitle">
                Target Venture: <span className="highlight-text">{enquiryProjectName}</span>
              </p>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleModalSubmit} className="premium-modal-form">
              <p className="form-info-text">
                Please leave your details below. Our property relations manager will reach out to you within 24 hours.
              </p>

              {/* Name Field */}
              <div className="form-group-premium">
                <label className="form-label-premium">Full Name *</label>
                <div className="input-with-icon">
                  <User size={18} className="input-icon" />
                  <input 
                    type="text" 
                    className="form-control-premium" 
                    placeholder="John Doe" 
                    value={enqName}
                    onChange={e => setEnqName(e.target.value)}
                    required
                  />
                </div>
                {modalErrors.name && <div className="form-error">{modalErrors.name}</div>}
              </div>

              {/* Email & Phone Grid */}
              <div className="grid grid-2 gap-2 mobile-stack">
                <div className="form-group-premium">
                  <label className="form-label-premium">Email Address *</label>
                  <div className="input-with-icon">
                    <Mail size={18} className="input-icon" />
                    <input 
                      type="email" 
                      className="form-control-premium" 
                      placeholder="name@email.com" 
                      value={enqEmail}
                      onChange={e => setEnqEmail(e.target.value)}
                      required
                    />
                  </div>
                  {modalErrors.email && <div className="form-error">{modalErrors.email}</div>}
                </div>

                <div className="form-group-premium">
                  <label className="form-label-premium">Phone Number *</label>
                  <div className="input-with-icon">
                    <Phone size={18} className="input-icon" />
                    <input 
                      type="tel" 
                      className="form-control-premium" 
                      placeholder="+91 98765 43210" 
                      value={enqPhone}
                      onChange={e => setEnqPhone(e.target.value.replace(/[^0-9\s+\-()]/g, ''))}
                      required
                    />
                  </div>
                  {modalErrors.phone && <div className="form-error">{modalErrors.phone}</div>}
                </div>
              </div>

              {/* Message Field */}
              <div className="form-group-premium">
                <label className="form-label-premium">Message / Special Request *</label>
                <div className="input-with-icon align-start">
                  <MessageSquare size={18} className="input-icon textarea-icon" />
                  <textarea 
                    className="form-control-premium textarea-premium" 
                    rows={3} 
                    placeholder="Tell us what you are looking for (e.g. price query, site visit schedule, flat size details...)"
                    value={enqMessage}
                    onChange={e => setEnqMessage(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Verification & Captcha Block */}
              <div className="form-group-premium captcha-group-premium">
                <label className="form-label-premium">Security Verification *</label>
                <div className="captcha-container-premium">
                  <div className="captcha-shield">
                    <ShieldCheck size={18} className="shield-icon" />
                    <span className="captcha-question-premium">Solve: {captchaNum1} + {captchaNum2} =</span>
                  </div>
                  <input 
                    type="number" 
                    className="form-control-premium captcha-input-premium" 
                    placeholder="Answer" 
                    value={captchaAnswer}
                    onChange={e => setCaptchaAnswer(e.target.value)}
                    required
                  />
                </div>
                {modalErrors.captcha && <div className="form-error">{modalErrors.captcha}</div>}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-1" style={{ marginTop: '0.75rem' }}>
                <button 
                  type="button" 
                  className="btn-close-premium" 
                  style={{ flex: 1, marginTop: '0.5rem' }} 
                  onClick={() => setEnquiryModalOpen(false)}
                >
                  Close
                </button>
                <button 
                  type="submit" 
                  className="btn btn-secondary-premium" 
                  style={{ flex: 2 }}
                >
                  <Send size={16} /> Submit Enquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
