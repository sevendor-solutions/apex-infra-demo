import React from 'react';
import { Target, Eye, CheckCircle } from 'lucide-react';
import { useCompany } from '../context/CompanyContext';

export const About: React.FC = () => {
  const { profile } = useCompany();

  const team = [
    {
      name: 'LOVARAJU KALLA',
      role: 'Founder & Managing Director',
      bio: `With over 20 years of expertise in civil planning and real estate ventures across Andhra Pradesh, our leadership establishes the vision and corporate governance guidelines for ${profile.companyName}.`,
      image: '/silhouette_1.png'
    },
    {
      name: 'VAMSI KRISHNA T',
      role: 'Director - Land & Acquisitions',
      bio: 'Specializes in scouting high-potential development corridors, managing legal verifications, and securing regulatory clearances from local urban development authorities and Panchayati departments.',
      image: '/silhouette_2.png'
    },
    {
      name: 'M. Sriman',
      role: 'Chief Structural Engineer',
      bio: 'An alumnus of IIT Madras, overseeing all project designs, material testing checks, and ensuring our gated communities are built with the highest earthquake-resistant standards.',
      image: '/silhouette_3.png'
    }
  ];

  const certifications = [
    { 
      title: `${profile.isoCertified || 'ISO 9001:2015'} Quality Certificate`, 
      desc: 'Validates our structural construction processes and management standards.' 
    },
    { 
      title: `${profile.apReraNumber ? 'AP-RERA Registered Developer (' + profile.apReraNumber + ')' : 'RERA Registered Developer'}`, 
      desc: 'Ensures compliance, transparency, and timely delivery for every project.' 
    },
    { 
      title: 'CREDAI Member', 
      desc: 'Active member enforcing ethical building practices and consumer safety guidelines.' 
    }
  ];

  return (
    <div className="about-page">
      {/* Page Header Banner */}
      <section className="page-header py-4 text-center text-white" style={{ background: 'linear-gradient(rgba(11,25,44,0.65), rgba(11,25,44,0.65)), url(/page_header_hd.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="container">
          <h1 className="text-white text-4xl">About Our Company</h1>
          <p className="text-muted" style={{ color: 'rgba(255,255,255,0.75)' }}>Building excellence, security, and happy living environments since 2020</p>
        </div>
      </section>

      {/* Corporate Overview */}
      <section className="overview-section py-6">
        <div className="container grid grid-2 gap-4 align-center">
          <div className="overview-left">
            <h2 className="section-title mb-2">{profile.companyName}</h2>
            <p className="text-muted mb-2">
              {profile.companyName} has grown into one of Andhra Pradesh's most trusted property developers. Headquartered in Visakhapatnam, we specialize in high-end gated community villas, residential apartments, and premium layout plotting ventures in key locations including Vizag, Guntur, and Vijayawada.
            </p>
            <p className="text-muted mb-3">
              We understand that purchasing a home is a life-changing decision. That is why we focus heavily on clear titles, legal clearances, high construction standards, and top-tier amenities that elevate the lifestyle of our residents.
            </p>
            <div className="stats-strip flex gap-3 text-center my-2">
              <div className="stat-box flex-1 py-1 glass-card">
                <span className="stat-num text-secondary text-3xl font-bold">6+</span>
                <p className="text-sm font-semibold">Projects Completed</p>
              </div>
              <div className="stat-box flex-1 py-1 glass-card">
                <span className="stat-num text-secondary text-3xl font-bold">400+</span>
                <p className="text-sm font-semibold">Happy Families</p>
              </div>
              <div className="stat-box flex-1 py-1 glass-card">
                <span className="stat-num text-secondary text-3xl font-bold">6+ Years</span>
                <p className="text-sm font-semibold">Core Expertise</p>
              </div>
            </div>
          </div>
          <div className="overview-right">
            <img 
              src="/jk_difference_hd.png"
              alt="JK Corporate" 
              className="overview-img"
            />
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="mission-vision-section py-6" style={{ backgroundColor: 'var(--light-soft)' }}>
        <div className="container grid grid-2 gap-3">
          <div className="mv-card glass-card py-3 px-3">
            <div className="mv-icon-box mission"><Target size={36} /></div>
            <h3 className="mb-2">Our Mission</h3>
            <p className="text-muted text-sm">
              To construct top-tier housing and residential layouts that offer outstanding value, legal integrity, and architectural superiority. We aim to make the process of land and home acquisition smooth, secure, and stress-free for families across Andhra Pradesh.
            </p>
          </div>
          <div className="mv-card glass-card py-3 px-3">
            <div className="mv-icon-box vision"><Eye size={36} /></div>
            <h3 className="mb-2">Our Vision</h3>
            <p className="text-muted text-sm">
              To be recognized as the premier benchmark for high-quality development in the regional real estate sector. We envision sustainable, eco-friendly gated communities that integrate modern smart-home features while preserving nature's balance.
            </p>
          </div>
        </div>
      </section>

      {/* Leadership Team */}
      <section className="team-section py-6">
        <div className="container">
          <div className="section-title-wrapper section-title-center">
            <h2 className="section-title">Leadership Profiles</h2>
            <p className="text-muted">The core minds managing our land acquisitions, engineering, and client relationships</p>
          </div>
          <div className="grid grid-3 gap-3">
            {team.map((member, idx) => (
              <div key={idx} className="team-card text-center">
                <div className="team-img-box">
                  <img src={member.image} alt={member.name} />
                </div>
                <div className="team-body py-2 px-2">
                  <h3 className="text-lg">{member.name}</h3>
                  <span className="team-role text-secondary text-sm font-semibold">{member.role}</span>
                  <p className="text-muted text-sm my-1">{member.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Awards & Certifications */}
      <section className="awards-section py-6" style={{ backgroundColor: 'var(--light-soft)' }}>
        <div className="container">
          <div className="section-title-wrapper section-title-center">
            <h2 className="section-title">Awards & Certifications</h2>
            <p className="text-muted">Validating our promise of quality and regulatory compliance</p>
          </div>
          <div className="grid grid-3 gap-3">
            {certifications.map((cert, idx) => (
              <div key={idx} className="cert-card glass-card py-3 px-3 flex gap-2">
                <div className="cert-icon"><CheckCircle size={24} /></div>
                <div>
                  <h4>{cert.title}</h4>
                  <p className="text-muted text-sm">{cert.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        .overview-img {
          width: 100%;
          height: 450px;
          object-fit: cover;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          border: 5px solid var(--white);
        }
        .stats-strip {
          margin-top: 1.5rem;
        }
        .stat-box {
          border-radius: var(--radius-md);
        }
        .stat-num {
          display: block;
        }
        
        /* Mission Vision */
        .mv-card {
          padding: 2rem;
          border-radius: var(--radius-lg);
        }
        .mv-icon-box {
          width: 58px;
          height: 58px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.25rem;
          color: #ffffff !important;
        }
        .mv-icon-box.mission {
          background: linear-gradient(135deg, #f05a28 0%, #d97706 100%) !important;
          box-shadow: 0 8px 20px rgba(240, 90, 40, 0.4);
        }
        .mv-icon-box.vision {
          background: linear-gradient(135deg, #00baf2 0%, #002970 100%) !important;
          box-shadow: 0 8px 20px rgba(0, 186, 242, 0.4);
        }

        /* Team Cards */
        .team-card {
          background-color: var(--white);
          border-radius: var(--radius-lg);
          overflow: hidden;
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-sm);
          transition: var(--transition-normal);
        }
        .team-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-md);
        }
        .team-img-box {
          height: 280px;
          overflow: hidden;
        }
        .team-img-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        /* Certifications */
        .cert-card {
          border-radius: var(--radius-md);
        }
        .cert-icon {
          color: var(--success);
          flex-shrink: 0;
        }
        .cert-card h4 {
          font-size: 1.05rem;
          margin-bottom: 0.25rem;
        }
      `}</style>
    </div>
  );
};
