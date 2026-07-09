import { Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: string, category?: any | null, siteCategory?: any | null) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const currentYear = new Date().getFullYear();

  const handleLinkClick = (page: string, category: any | null = null, siteCategory: any | null = null) => {
    onNavigate(page, category, siteCategory);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="site-footer">
      <div className="container footer-content py-6">
        <div className="grid grid-4 gap-4">
          {/* Company Info */}
          <div className="footer-col">
            <h3 className="footer-logo-text mb-2">JK FUTURE INFRA</h3>
            <p className="footer-about-text mb-3">
              Your vision is our mission for a happy living. We are a premier ISO 9001:2015 certified real estate development firm in Andhra Pradesh, committed to building exceptional residential spaces.
            </p>
            <div className="footer-socials flex gap-2">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" className="social-icon">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/></svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter" className="social-icon">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="social-icon">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="social-icon">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-col">
            <h4 className="footer-col-title">Quick Links</h4>
            <ul className="footer-links">
              <li><button onClick={() => handleLinkClick('home')}>Home</button></li>
              <li><button onClick={() => handleLinkClick('about')}>About Us</button></li>
              <li><button onClick={() => handleLinkClick('projects-ongoing')}>Ongoing Projects</button></li>
              <li><button onClick={() => handleLinkClick('gallery')}>Gallery Photos & Videos</button></li>
              <li><button onClick={() => handleLinkClick('blog')}>Latest Blogs & News</button></li>
              <li><button onClick={() => handleLinkClick('contact')}>Contact Us</button></li>
            </ul>
          </div>

          {/* Categories */}
          <div className="footer-col">
            <h4 className="footer-col-title">Our Verticals</h4>
            <ul className="footer-links">
              <li><button onClick={() => handleLinkClick('marketing', 'Flats')}>Premium Flats</button></li>
              <li><button onClick={() => handleLinkClick('marketing', 'Villas')}>Luxury Gated Villas</button></li>
              <li><button onClick={() => handleLinkClick('marketing', 'Individual Houses')}>Independent Houses</button></li>
              <li><button onClick={() => handleLinkClick('marketing', 'Sites', 'VUDA Approved Sites')}>VUDA Approved Plots</button></li>
              <li><button onClick={() => handleLinkClick('marketing', 'Sites', 'Panchayati Approved Sites')}>Panchayati Approved Sites</button></li>
              <li><button onClick={() => handleLinkClick('marketing', 'Sites', 'Ventures')}>Venture Layouts</button></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="footer-col">
            <h4 className="footer-col-title">Registered Office</h4>
            <ul className="footer-contact-info">
              <li className="flex gap-2">
                <MapPin size={22} className="text-secondary shrink-0" />
                <span>DOOR No: 4-92/1/6, FLAT No: 202, LEE INFRA, TALRIVANIPALEM</span>
              </li>
              <li className="flex gap-2 align-center">
                <Phone size={18} className="text-secondary" />
                <span>9000553832, 7893963322</span>
              </li>
              <li className="flex gap-2 align-center">
                <Mail size={18} className="text-secondary" />
                <span>jkfutureinfra@gmail.com</span>
              </li>
              <li className="flex gap-2 align-center text-sm" style={{ marginTop: '0.5rem', color: '#10b981' }}>
                <ShieldCheck size={18} />
                <span>AP RERA Regd: P03290021045</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container flex justify-between align-center py-2 text-sm">
          <span>&copy; {currentYear} JK Future Infra Projects Pvt. Ltd. All rights reserved.</span>
          <div className="flex gap-2">
            {/* <button onClick={() => handleLinkClick('admin')} className="admin-portal-link">Admin Portal</button> */}
            {/* <span>|</span> */}
            <span>Privacy Policy</span>
          </div>
        </div>
      </div>

      <style>{`
        .site-footer {
          background-color: #060e19;
          color: rgba(255, 255, 255, 0.7);
          border-top: 4px solid var(--secondary);
          margin-top: auto;
        }
        .footer-content {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .footer-logo-text {
          font-size: 1.5rem;
          color: var(--white);
          font-weight: 800;
          letter-spacing: 1px;
        }
        .footer-about-text {
          font-size: 0.875rem;
          line-height: 1.6;
        }
        .social-icon {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--white);
          transition: var(--transition-fast);
        }
        .social-icon:hover {
          background: var(--secondary);
          transform: translateY(-2px);
        }
        .footer-col-title {
          color: var(--white);
          font-family: var(--font-title);
          font-size: 1.15rem;
          margin-bottom: 1.5rem;
          position: relative;
          padding-bottom: 0.5rem;
        }
        .footer-col-title::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: 0;
          width: 35px;
          height: 2px;
          background-color: var(--secondary);
        }
        .footer-links {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .footer-links button {
          color: rgba(255, 255, 255, 0.65);
          font-size: 0.9rem;
          text-align: left;
          width: 100%;
          transition: var(--transition-fast);
        }
        .footer-links button:hover {
          color: var(--secondary);
          padding-left: 0.25rem;
        }
        .footer-contact-info {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          font-size: 0.9rem;
        }
        .footer-contact-info li {
          line-height: 1.5;
        }
        .footer-bottom {
          background-color: #030810;
          color: rgba(255, 255, 255, 0.45);
        }
        .admin-portal-link {
          color: rgba(255, 255, 255, 0.5);
          font-weight: 600;
        }
        .admin-portal-link:hover {
          color: var(--secondary);
        }
        .shrink-0 {
          flex-shrink: 0;
        }
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-3 { margin-bottom: 1rem; }
      `}</style>
    </footer>
  );
};
