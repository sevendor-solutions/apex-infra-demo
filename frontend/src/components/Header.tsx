import React, { useState } from 'react';
import { Menu, X, ChevronDown, Send, Phone, Mail } from 'lucide-react';
import type { ProjectCategory } from '../types';
import logoImg from '../assets/logo.png';

interface HeaderProps {
  activePage: string;
  activeCategory: ProjectCategory | null;
  activeSiteCategory: string | null;
  onNavigate: (page: string, category?: ProjectCategory | null, siteCategory?: string | null, params?: any) => void;
  onOpenEnquiry: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePage,
  activeCategory: _activeCategory,
  activeSiteCategory: _activeSiteCategory,
  onNavigate,
  onOpenEnquiry
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const toggleDropdown = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  const handleLinkClick = (page: string, category: ProjectCategory | null = null, siteCategory: string | null = null) => {
    onNavigate(page, category, siteCategory);
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  };

  return (
    <header className="main-header">
      <div className="header-top">
        <div className="container flex justify-between align-center py-1 text-sm text-white">
          <div className="flex gap-3">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={12} className="text-secondary" /> 9000553832, 7893963322</span>
            <span className="hide-mobile" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Mail size={12} className="text-secondary" /> jkfutureinfra@gmail.com</span>
          </div>
          <div className="flex gap-2 align-center">
            <span className="hide-mobile font-semibold">ISO 9001:2015 Certified Company</span>
            <div className="rera-badges hide-mobile flex gap-1.5" style={{ marginLeft: '1rem', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '1rem' }}>
              <span style={{ fontSize: '0.75rem', opacity: 0.95, background: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>AP RERA: A150500123</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.95, background: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>TS RERA: A025000456</span>
            </div>
          </div>
        </div>
      </div>



      <div className="header-main">
        <div className="container flex justify-between align-center">
          {/* Logo Image */}
          <div className="logo-wrapper" onClick={() => handleLinkClick('home')} style={{ cursor: 'pointer', alignSelf: 'flex-start', marginTop: '4px', zIndex: 10 }}>
            <img 
              src={logoImg} 
              alt="JK Future Infra Logo" 
              className="logo-img"
              style={{ height: '128px', width: 'auto', display: 'block', objectFit: 'contain', filter: 'drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.1))' }} 
            />
          </div>

          {/* Desktop Nav */}
          <nav className="desktop-nav">
            <ul className="nav-list flex align-center">
              <li>
                <button 
                  onClick={() => handleLinkClick('about')} 
                  className={`nav-link ${activePage === 'about' ? 'active' : ''}`}
                >
                  About Us
                </button>
              </li>
              
              {/* Projects Dropdown */}
              <li className="dropdown-parent">
                <button 
                  onClick={(e) => toggleDropdown('projects', e)}
                  className={`nav-link flex align-center gap-1 ${activePage === 'projects' ? 'active' : ''}`}
                >
                  Projects <ChevronDown size={16} />
                </button>
                <ul className={`dropdown-menu ${activeDropdown === 'projects' ? 'show' : ''}`}>
                  <li>
                    <button onClick={() => handleLinkClick('projects-ongoing')}>Ongoing Projects</button>
                  </li>
                  <li>
                    <button onClick={() => handleLinkClick('projects-upcoming')}>Upcoming Projects</button>
                  </li>
                  <li>
                    <button onClick={() => handleLinkClick('projects-completed')}>Completed Projects</button>
                  </li>
                </ul>
              </li>

              {/* Marketing Dropdown */}
              <li className="dropdown-parent">
                <button 
                  onClick={(e) => toggleDropdown('marketing', e)}
                  className={`nav-link flex align-center gap-1 ${activePage === 'marketing' ? 'active' : ''}`}
                >
                  Marketing <ChevronDown size={16} />
                </button>
                <ul className={`dropdown-menu ${activeDropdown === 'marketing' ? 'show' : ''}`}>
                  <li>
                    <button onClick={() => handleLinkClick('marketing', 'Flats')}>Flats</button>
                  </li>
                  <li>
                    <button onClick={() => handleLinkClick('marketing', 'Villas')}>Villas</button>
                  </li>
                  <li>
                    <button onClick={() => handleLinkClick('marketing', 'Individual Houses')}>Individual Houses</button>
                  </li>
                  <li className="nested-dropdown-parent">
                    <span className="flex align-center justify-between" style={{ padding: '0.6rem 1.2rem', cursor: 'default' }}>
                      Sites <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} />
                    </span>
                    <ul className="nested-dropdown-menu">
                      <li>
                        <button onClick={() => handleLinkClick('marketing', 'Sites', 'Development Sites')}>Development Sites</button>
                      </li>
                      <li>
                        <button onClick={() => handleLinkClick('marketing', 'Sites', 'Panchayati Approved Sites')}>Panchayati Approved</button>
                      </li>
                      <li>
                        <button onClick={() => handleLinkClick('marketing', 'Sites', 'VUDA Approved Sites')}>VUDA Approved</button>
                      </li>
                      <li>
                        <button onClick={() => handleLinkClick('marketing', 'Sites', 'Ventures')}>Ventures</button>
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>

              <li>
                <button 
                  onClick={() => handleLinkClick('gallery')} 
                  className={`nav-link ${activePage === 'gallery' ? 'active' : ''}`}
                >
                  Gallery
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleLinkClick('careers')} 
                  className={`nav-link ${activePage === 'careers' ? 'active' : ''}`}
                >
                  Careers
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleLinkClick('blog')} 
                  className={`nav-link ${activePage === 'blog' ? 'active' : ''}`}
                >
                  Blog
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleLinkClick('contact')} 
                  className={`nav-link ${activePage === 'contact' ? 'active' : ''}`}
                >
                  Contact Us
                </button>
              </li>
            </ul>
          </nav>

          {/* CTAs */}
          <div className="header-ctas flex align-center gap-2">
            <a href="https://wa.me/919000553832?text=Hello%20JK%20Future%20Infra,%20I%20have%20an%20enquiry%20regarding%20properties." target="_blank" rel="noreferrer" className="btn btn-sm btn-accent hide-mobile" style={{ background: '#25d366', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12.031 2C6.446 2 1.922 6.524 1.922 12.109c0 1.782.463 3.522 1.34 5.06l-1.424 5.201 5.322-1.396a10.05 10.05 0 0 0 4.871 1.246h.004c5.581 0 10.105-4.524 10.105-10.109C22.14 6.524 17.616 2 12.031 2zm0 18.528h-.002c-1.579 0-3.125-.424-4.473-1.226l-.32-.19-3.32.87.886-3.235-.208-.33a8.178 8.178 0 0 1-1.252-4.321c0-4.516 3.673-8.19 8.192-8.19 2.186 0 4.243.852 5.79 2.401a8.134 8.134 0 0 1 2.398 5.791c0 4.516-3.673 8.19-8.191 8.19zm4.502-6.149c-.247-.123-1.46-.72-1.685-.802-.227-.082-.392-.123-.556.123-.164.247-.638.802-.782.967-.144.164-.288.185-.535.062-.247-.123-1.04-.383-1.98-1.222-.731-.652-1.225-1.459-1.369-1.706-.144-.247-.015-.38.109-.502.112-.11.247-.288.371-.432.124-.144.165-.247.247-.412.082-.164.041-.309-.02-.432-.062-.123-.556-1.338-.762-1.833-.2-.484-.422-.412-.576-.42-.149-.008-.32-.01-.493-.01-.173 0-.456.065-.694.325-.238.26-1.002.979-1.002 2.387 0 1.408 1.025 2.766 1.168 2.955.144.189 2.016 3.078 4.885 4.316.682.295 1.215.47 1.63.603.687.218 1.312.187 1.806.114.55-.082 1.685-.688 1.921-1.353.236-.665.236-1.235.165-1.353-.07-.119-.247-.185-.494-.308z"/>
              </svg>
              WhatsApp
            </a>
            <button onClick={onOpenEnquiry} className="btn btn-sm btn-secondary hide-mobile">
              <Send size={16} /> Quick Enquiry
            </button>
            <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <ul className="mobile-nav-list">
          <li>
            <button onClick={() => handleLinkClick('about')}>About Us</button>
          </li>
          
          <li className="mobile-dropdown-section">
            <div className="mobile-dropdown-title">Projects</div>
            <ul className="mobile-dropdown-submenu">
              <li><button onClick={() => handleLinkClick('projects-ongoing')}>Ongoing Projects</button></li>
              <li><button onClick={() => handleLinkClick('projects-upcoming')}>Upcoming Projects</button></li>
              <li><button onClick={() => handleLinkClick('projects-completed')}>Completed Projects</button></li>
            </ul>
          </li>

          <li className="mobile-dropdown-section">
            <div className="mobile-dropdown-title">Marketing</div>
            <ul className="mobile-dropdown-submenu">
              <li><button onClick={() => handleLinkClick('marketing', 'Flats')}>Flats</button></li>
              <li><button onClick={() => handleLinkClick('marketing', 'Villas')}>Villas</button></li>
              <li><button onClick={() => handleLinkClick('marketing', 'Individual Houses')}>Individual Houses</button></li>
              <li>
                <div style={{ padding: '0.4rem 0.5rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>SITES CATEGORIES</div>
                <ul style={{ listStyle: 'none', paddingLeft: '0.5rem' }}>
                  <li><button onClick={() => handleLinkClick('marketing', 'Sites', 'Development Sites')}>- Development Sites</button></li>
                  <li><button onClick={() => handleLinkClick('marketing', 'Sites', 'Panchayati Approved Sites')}>- Panchayati Approved</button></li>
                  <li><button onClick={() => handleLinkClick('marketing', 'Sites', 'VUDA Approved Sites')}>- VUDA Approved</button></li>
                  <li><button onClick={() => handleLinkClick('marketing', 'Sites', 'Ventures')}>- Ventures</button></li>
                </ul>
              </li>
            </ul>
          </li>

          <li>
            <button onClick={() => handleLinkClick('gallery')}>Gallery</button>
          </li>
          <li>
            <button onClick={() => handleLinkClick('careers')}>Careers</button>
          </li>
          <li>
            <button onClick={() => handleLinkClick('blog')}>Blog</button>
          </li>
          <li>
            <button onClick={() => handleLinkClick('contact')}>Contact Us</button>
          </li>
        </ul>
        <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'center' }}>
          <button onClick={() => { setMobileMenuOpen(false); onOpenEnquiry(); }} className="btn btn-secondary w-full" style={{ width: '100%' }}>
            <Send size={16} /> Quick Enquiry
          </button>
          <a href="tel:+919000553832" style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, padding: '0.5rem', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 'var(--radius-sm)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
            <Phone size={16} /> Call Us: 9000553832
          </a>
          <a href="https://wa.me/919000553832?text=Hello%20JK%20Future%20Infra,%20I%20have%20an%20enquiry%20regarding%20properties." target="_blank" rel="noreferrer" className="btn btn-sm" style={{ background: '#25d366', color: '#fff', width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: 'bold' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12.031 2C6.446 2 1.922 6.524 1.922 12.109c0 1.782.463 3.522 1.34 5.06l-1.424 5.201 5.322-1.396a10.05 10.05 0 0 0 4.871 1.246h.004c5.581 0 10.105-4.524 10.105-10.109C22.14 6.524 17.616 2 12.031 2zm0 18.528h-.002c-1.579 0-3.125-.424-4.473-1.226l-.32-.19-3.32.87.886-3.235-.208-.33a8.178 8.178 0 0 1-1.252-4.321c0-4.516 3.673-8.19 8.192-8.19 2.186 0 4.243.852 5.79 2.401a8.134 8.134 0 0 1 2.398 5.791c0 4.516-3.673 8.19-8.191 8.19zm4.502-6.149c-.247-.123-1.46-.72-1.685-.802-.227-.082-.392-.123-.556.123-.164.247-.638.802-.782.967-.144.164-.288.185-.535.062-.247-.123-1.04-.383-1.98-1.222-.731-.652-1.225-1.459-1.369-1.706-.144-.247-.015-.38.109-.502.112-.11.247-.288.371-.432.124-.144.165-.247.247-.412.082-.164.041-.309-.02-.432-.062-.123-.556-1.338-.762-1.833-.2-.484-.422-.412-.576-.42-.149-.008-.32-.01-.493-.01-.173 0-.456.065-.694.325-.238.26-1.002.979-1.002 2.387 0 1.408 1.025 2.766 1.168 2.955.144.189 2.016 3.078 4.885 4.316.682.295 1.215.47 1.63.603.687.218 1.312.187 1.806.114.55-.082 1.685-.688 1.921-1.353.236-.665.236-1.235.165-1.353-.07-.119-.247-.185-.494-.308z"/>
            </svg>
            WhatsApp
          </a>
        </div>
      </div>

      <style>{`
        .main-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-color);
          box-shadow: var(--shadow-sm);
        }
        .header-top {
          background-color: var(--primary);
        }
        .hide-mobile {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .header-main {
          height: var(--header-height);
          display: flex;
          align-items: center;
        }
        .desktop-nav {
          display: block;
        }
        .nav-list {
          list-style: none;
          gap: 0.5rem;
        }
        .nav-link {
          padding: 0.6rem 0.9rem;
          font-family: var(--font-title);
          font-weight: 600;
          color: var(--primary);
          border-radius: var(--radius-sm);
          position: relative;
        }
        .nav-link:hover, .nav-link.active {
          color: var(--secondary);
          background-color: var(--light-soft);
        }
        .dropdown-parent {
          position: relative;
        }
        .dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          background: var(--white);
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-lg);
          border-radius: var(--radius-md);
          min-width: 200px;
          list-style: none;
          padding: 0.5rem 0;
          opacity: 0;
          visibility: hidden;
          transform: translateY(10px);
          transition: all 0.25s ease;
          z-index: 50;
        }
        .dropdown-parent:hover .dropdown-menu {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }
        .dropdown-menu button {
          width: 100%;
          text-align: left;
          padding: 0.6rem 1.2rem;
          font-weight: 500;
          font-size: 0.9rem;
          color: var(--text-primary);
          transition: var(--transition-fast);
        }
        .dropdown-menu button:hover {
          background-color: var(--light-soft);
          color: var(--secondary);
        }
        .nested-dropdown-parent {
          position: relative;
        }
        .nested-dropdown-menu {
          position: absolute;
          left: 100%;
          top: 0;
          background: var(--white);
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-lg);
          border-radius: var(--radius-md);
          min-width: 180px;
          list-style: none;
          padding: 0.5rem 0;
          opacity: 0;
          visibility: hidden;
          transform: translateX(10px);
          transition: all 0.25s ease;
        }
        .nested-dropdown-parent:hover .nested-dropdown-menu {
          opacity: 1;
          visibility: visible;
          transform: translateX(0);
        }
        .mobile-menu-btn {
          display: none;
          color: var(--primary);
        }
        
        /* Drawer styling */
        .mobile-drawer {
          position: fixed;
          top: var(--header-height);
          left: 0;
          width: 100%;
          height: calc(100vh - var(--header-height));
          background: var(--primary);
          color: var(--white);
          z-index: 99;
          transform: translateX(-100%);
          transition: var(--transition-normal);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .mobile-drawer.open {
          transform: translateX(0);
        }
        .mobile-nav-list {
          list-style: none;
          padding: 2rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .mobile-nav-list button {
          color: rgba(255, 255, 255, 0.85);
          font-family: var(--font-title);
          font-size: 1.2rem;
          font-weight: 600;
          text-align: left;
          width: 100%;
        }
        .mobile-nav-list button:hover {
          color: var(--secondary);
        }
        .mobile-dropdown-section {
          padding-left: 0.75rem;
          border-left: 2px solid rgba(255, 255, 255, 0.15);
        }
        .mobile-dropdown-title {
          font-family: var(--font-title);
          font-weight: 700;
          font-size: 1rem;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.4);
          margin-bottom: 0.5rem;
        }
        .mobile-dropdown-submenu {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          padding-left: 0.5rem;
        }
        .mobile-dropdown-submenu button {
          font-size: 1rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.75);
        }
        .admin-login-btn-mobile {
          background-color: rgba(255, 255, 255, 0.1);
          padding: 0.6rem 1rem !important;
          border-radius: var(--radius-md);
          text-align: center !important;
          margin-top: 1rem;
        }

        @media (max-width: 1024px) {
          .header-top { display: none !important; }
          .desktop-nav { display: none; }
          .mobile-menu-btn { display: block; }
          .hide-mobile { display: none !important; }
        }
      `}</style>
    </header>
  );
};
