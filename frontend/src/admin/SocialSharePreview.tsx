import React, { useState, useEffect } from 'react';
import { X, Globe, ThumbsUp, MessageCircle, Share2, Heart, Bookmark, ExternalLink } from 'lucide-react';
import logo from '../assets/logo.png';
import { getMailConfig } from '../utils/db';
import { useCompany } from '../context/CompanyContext';

interface SocialSharePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  propertyName: string;
  category: string;
  location: string;
  city: string;
  priceRange: string;
  description: string;
  imageUrl?: string;
  facebookUrl?: string;
  isMarketing?: boolean;
  agentName?: string;
  agentPhone?: string;
}

export const SocialSharePreview: React.FC<SocialSharePreviewProps> = ({
  isOpen,
  onClose,
  propertyName,
  category,
  location,
  city,
  priceRange,
  description,
  imageUrl,
  facebookUrl = "https://www.facebook.com/profile.php?id=6159154908963",
  isMarketing = false,
  agentName,
  agentPhone
}) => {
  const { profile } = useCompany();
  const [activeTab, setActiveTab] = useState<'facebook' | 'instagram'>('facebook');
  const [isLiveFb, setIsLiveFb] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    const checkLiveMode = async () => {
      try {
        const config = await getMailConfig();
        if (config.facebookPageAccessToken && config.facebookPageId) {
          setIsLiveFb(true);
        }
      } catch (err) {
        console.error("Failed to check social mode:", err);
      } finally {
        setLoadingConfig(false);
      }
    };
    if (isOpen) {
      checkLiveMode();
    }
  }, [isOpen]);
  
  if (!isOpen) return null;

  // Generate hashtags based on property info
  const generateHashtags = () => {
    const companyClean = (profile.companyName || 'RealEstate').replace(/[^a-zA-Z0-9]/g, '');
    const base = ['RealEstate', 'Housing', companyClean, 'Trending', 'Investment'];
    if (city) base.push(city.replace(/\s+/g, ''));
    if (category) base.push(category.replace(/\s+/g, ''));
    base.push('LuxuryLiving', 'DreamHome');
    return base.map(tag => `#${tag}`).join(' ');
  };

  const hashtags = generateHashtags();

  const fallbackImage = "/jk_difference_hd.png";
  // If imageUrl has multiple comma-separated values, get the first one
  const firstImageUrl = imageUrl ? imageUrl.split(',')[0].trim() : '';
  const displayImage = firstImageUrl || fallbackImage;

  const websiteUrl = window.location.origin;
  const locParts = [location, city].filter(Boolean);
  const locationStr = locParts.join(", ");

  const defaultPhone = [profile.primaryPhone, profile.secondaryPhone].filter(Boolean).map(p => `+91 ${p}`).join(', ') || '+91 9000553832';

  const postTextBody = isMarketing ? (
    <>
      <p style={{ margin: '0 0 8px 0', fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>✨ FEATURED PROPERTY SHOWCASE ✨</p>
      <p style={{ margin: '0 0 6px 0' }}>🏢 <strong>Property:</strong> {propertyName}</p>
      <p style={{ margin: '0 0 6px 0' }}>🏷️ <strong>Segment:</strong> {category || 'Real Estate'}</p>
      <p style={{ margin: '0 0 6px 0' }}>📍 <strong>Location:</strong> {locationStr}</p>
      <p style={{ margin: '0 0 10px 0' }}>💰 <strong>Investment:</strong> {priceRange || 'Contact for Price'}</p>
      <p style={{ margin: '0 0 10px 0', whiteSpace: 'pre-line' }}>📝 <strong>Description:</strong><br />{description}</p>
      <p style={{ margin: '0 0 4px 0', color: '#0854a0', fontWeight: 600 }}>🌐 <strong>Website:</strong> {websiteUrl}</p>
      {agentName && <p style={{ margin: '0 0 4px 0', color: '#0f172a', fontWeight: 600 }}>👤 <strong>Marketing Agent:</strong> {agentName}</p>}
      <p style={{ margin: '0 0 12px 0', color: '#0f172a', fontWeight: 600 }}>📞 <strong>Call / WhatsApp:</strong> {agentPhone || defaultPhone}</p>
      <p style={{ margin: 0, color: '#1877f2', fontWeight: 600 }}>{hashtags}</p>
    </>
  ) : (
    <>
      <p style={{ margin: '0 0 8px 0', fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>✨ PREMIUM REAL ESTATE OPPORTUNITY ✨</p>
      <p style={{ margin: '0 0 6px 0' }}>🏢 <strong>Venture:</strong> {propertyName}</p>
      <p style={{ margin: '0 0 6px 0' }}>🏷️ <strong>Category:</strong> {category || 'Real Estate'}</p>
      <p style={{ margin: '0 0 6px 0' }}>📍 <strong>Location:</strong> {locationStr}</p>
      <p style={{ margin: '0 0 10px 0' }}>💰 <strong>Price Range:</strong> {priceRange || 'Contact for Price'}</p>
      <p style={{ margin: '0 0 10px 0', whiteSpace: 'pre-line' }}>📝 <strong>Overview:</strong><br />{description}</p>
      <p style={{ margin: '0 0 4px 0', color: '#0854a0', fontWeight: 600 }}>🌐 <strong>Website:</strong> {websiteUrl}</p>
      <p style={{ margin: '0 0 12px 0', color: '#0f172a', fontWeight: 600 }}>📞 <strong>Call / WhatsApp:</strong> {defaultPhone}</p>
      <p style={{ margin: 0, color: '#1877f2', fontWeight: 600 }}>{hashtags}</p>
    </>
  );

  const igCaptionText = isMarketing ? (
    <>
      <span style={{ fontWeight: 600, marginRight: '6px' }}>jk_future_infra</span>
      ✨ FEATURED PROPERTY SHOWCASE ✨ 🏢 <strong>{propertyName}</strong> 📍 {locationStr} 💰 {priceRange}. {description.substring(0, 80)}...
      <div style={{ color: '#00376b', marginTop: '6px', fontWeight: 600 }}>
        🌐 {websiteUrl} {agentName ? `| 👤 Agent: ${agentName} 📞 ${agentPhone || defaultPhone}` : `| 📞 ${defaultPhone}`}
      </div>
      <div style={{ color: '#00376b', marginTop: '4px' }}>
        {hashtags}
      </div>
    </>
  ) : (
    <>
      <span style={{ fontWeight: 600, marginRight: '6px' }}>jk_future_infra</span>
      ✨ PREMIUM REAL ESTATE OPPORTUNITY ✨ 🏢 <strong>{propertyName}</strong> 📍 {locationStr} 💰 {priceRange}. {description.substring(0, 80)}...
      <div style={{ color: '#00376b', marginTop: '6px', fontWeight: 600 }}>
        🌐 {websiteUrl} | 📞 {defaultPhone}
      </div>
      <div style={{ color: '#00376b', marginTop: '4px' }}>
        {hashtags}
      </div>
    </>
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '550px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh',
        overflow: 'hidden',
        border: '1px solid #e2e8f0'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                backgroundColor: '#10b981',
                color: '#ffffff',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                textTransform: 'uppercase'
              }}>
                Auto-Posted
              </span>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Social Media Auto-Publish
              </h3>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Successfully shared to connected platforms with trending real estate hashtags.
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.2s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Platform Selector Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #f1f5f9',
          backgroundColor: '#f8fafc',
          padding: '0 1rem'
        }}>
          <button
            onClick={() => setActiveTab('facebook')}
            style={{
              flex: 1,
              padding: '1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'facebook' ? '3px solid #0854a0' : '3px solid transparent',
              color: activeTab === 'facebook' ? '#0854a0' : '#64748b',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            🔵 Facebook Page Feed
          </button>
          <button
            onClick={() => setActiveTab('instagram')}
            style={{
              flex: 1,
              padding: '1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'instagram' ? '3px solid #e1306c' : '3px solid transparent',
              color: activeTab === 'instagram' ? '#e1306c' : '#64748b',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            📸 Instagram Post
          </button>
        </div>

        {/* Content Body */}
        <div style={{
          padding: '1.5rem',
          backgroundColor: '#f1f5f9',
          overflowY: 'auto',
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          {/* Simulation / Live Mode notice */}
          {!loadingConfig && (
            isLiveFb ? (
              <div style={{
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '6px',
                padding: '10px 12px',
                fontSize: '0.76rem',
                color: '#065f46',
                width: '100%',
                maxWidth: '460px',
                lineHeight: '1.4',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '1.1rem' }}>✅</span>
                <div>
                  <strong>Live Auto-Publish Mode:</strong> This post has been successfully shared directly to your live Facebook page.
                </div>
              </div>
            ) : (
              <div style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                padding: '10px 12px',
                fontSize: '0.76rem',
                color: '#1e3a8a',
                width: '100%',
                maxWidth: '460px',
                lineHeight: '1.4',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                <div>
                  <strong>Simulation Mode:</strong> This is a local mockup demonstration. Since real Facebook API keys are not connected, the post is saved to system audit logs but not published to the live Facebook page.
                </div>
              </div>
            )
          )}

          {activeTab === 'facebook' ? (
            /* Facebook Mock Post */
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '460px',
              border: '1px solid #ced0d4',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
            }}>
              {/* FB Author Info */}
              <div style={{ display: 'flex', padding: '12px', alignItems: 'center', gap: '10px' }}>
                <img 
                  src={profile.logoUrl || logo} 
                  alt={`${profile.companyName || 'Company'} Logo`} 
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    objectFit: 'contain',
                    border: '1px solid #ced0d4',
                    backgroundColor: '#ffffff',
                    padding: '3px'
                  }} 
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#050505' }}>{profile.companyName || 'Real Estate Developer'}</span>
                    <span style={{
                      backgroundColor: '#1877f2',
                      color: '#ffffff',
                      borderRadius: '50%',
                      width: '12px',
                      height: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '7px'
                    }}>✓</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#65676b', fontSize: '0.75rem' }}>
                    <span>Just now</span>
                    <span>•</span>
                    <Globe size={11} />
                  </div>
                </div>
              </div>

              {/* FB Post Body Text */}
              <div style={{ padding: '0 12px 12px 12px', fontSize: '0.88rem', color: '#050505', lineHeight: '1.4' }}>
                {postTextBody}
              </div>

              {/* FB Post Attachment Image & Link Preview Box */}
              <div style={{
                borderTop: '1px solid #ebedf0',
                borderBottom: '1px solid #ebedf0',
                backgroundColor: '#ffffff',
                overflow: 'hidden'
              }}>
                <div style={{
                  backgroundColor: '#f0f2f5',
                  maxHeight: '220px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  <img 
                    src={displayImage} 
                    alt={propertyName}
                    style={{ width: '100%', height: 'auto', maxHeight: '220px', objectFit: 'cover' }}
                  />
                </div>
                {/* Facebook Link Preview Text Area */}
                <div style={{
                  padding: '10px 12px',
                  borderTop: '1px solid #ebedf0',
                  backgroundColor: '#f2f3f5',
                  textAlign: 'left'
                }}>
                  <div style={{ fontSize: '0.72rem', color: '#606770', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>
                    {window.location.hostname}
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1d2129', marginBottom: '3px', lineHeight: '1.2' }}>
                    {profile.companyName || 'Property'} | {propertyName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#606770', lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    Explore premium property listing in {location}, {city}. Price: {priceRange}. {description}
                  </div>
                </div>
              </div>

              {/* FB Actions */}
              <div style={{
                display: 'flex',
                padding: '4px',
                borderTop: '1px solid #ced0d4',
                color: '#65676b',
                fontWeight: 600,
                fontSize: '0.82rem'
              }}>
                <div style={{ flex: 1, display: 'flex', gap: '6px', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', padding: '6px 0' }}>
                  <ThumbsUp size={16} /> <span>Like</span>
                </div>
                <div style={{ flex: 1, display: 'flex', gap: '6px', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', padding: '6px 0' }}>
                  <MessageCircle size={16} /> <span>Comment</span>
                </div>
                <div style={{ flex: 1, display: 'flex', gap: '6px', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', padding: '6px 0' }}>
                  <Share2 size={16} /> <span>Share</span>
                </div>
              </div>
            </div>
          ) : (
            /* Instagram Mock Post */
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '380px',
              border: '1px solid #dbdbdb',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
            }}>
              {/* IG Author */}
              <div style={{ display: 'flex', padding: '10px 14px', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                    padding: '2px',
                    boxSizing: 'border-box'
                  }}>
                    <img 
                      src={profile.logoUrl || logo} 
                      alt={`${profile.companyName || 'Company'} Logo`} 
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'contain',
                        backgroundColor: '#ffffff',
                        padding: '1.5px'
                      }} 
                    />
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#262626' }}>
                      {profile.instagramProfile ? profile.instagramProfile.split('/').filter(Boolean).pop() : (profile.companyName || 'realestate').toLowerCase().replace(/\s+/g, '_')}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#8e8e8e', display: 'block' }}>{city}</span>
                  </div>
                </div>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#262626' }}>•••</span>
              </div>

              {/* IG Post Image */}
              <div style={{ width: '100%', aspectRatio: '1/1', backgroundColor: '#fafafa', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                <img 
                  src={displayImage} 
                  alt={propertyName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              {/* IG Actions Bar */}
              <div style={{ display: 'flex', padding: '10px 14px', justifyContent: 'space-between', color: '#262626' }}>
                <div style={{ display: 'flex', gap: '14px' }}>
                  <Heart size={22} />
                  <MessageCircle size={22} />
                  <Share2 size={22} />
                </div>
                <Bookmark size={22} />
              </div>

              {/* IG Caption & Hashtags */}
              <div style={{ padding: '0 14px 14px 14px', fontSize: '0.82rem', color: '#262626', lineHeight: '1.4' }}>
                {igCaptionText}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          backgroundColor: '#f8fafc'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close Preview
          </button>
          
          <a
            href={facebookUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#0854a0',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              textDecoration: 'none',
              boxShadow: '0 2px 4px rgba(8, 84, 160, 0.2)'
            }}
          >
            <span>View Facebook Page</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
};
