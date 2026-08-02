import React, { useState, useMemo } from 'react';
import type { Blog, ProjectCategory, SiteCategory } from '../types';
import { Calendar, Tag, ArrowLeft, Share2, MessageSquare, Send, ExternalLink, Globe, ChevronLeft, ChevronRight, TrendingUp, Sun, Plus, Check, MoreHorizontal } from 'lucide-react';

const formatNewsTime = (dateStr: string) => {
  if (!dateStr) return '1m ago';
  if (dateStr.includes('ago') || dateStr.includes('mins') || dateStr.includes('hours')) {
    return dateStr;
  }
  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) return dateStr;
  
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return dateStr;
};

const extractArticleMetaData = (blog: Blog) => {
  const fullText = (blog.content || '') + ' ' + (blog.summary || '');
  
  // Extract URL
  let directUrl = '';
  const urlMatch = fullText.match(/(https?:\/\/[^\s\)\>\]]+)/i);
  if (urlMatch) {
    directUrl = urlMatch[1].replace(/[\)\>\]]+$/, '');
  }

  // Extract Publisher
  let publisher = 'Official Publisher';
  const pubMatch = fullText.match(/Publisher Source\*\*:\s*([^\n\-\*\.]+)/i) || 
                   fullText.match(/Publisher Source:\s*([^\n\-\*\.]+)/i) ||
                   fullText.match(/Coverage on\s*([^\n\-\*\]\.]+)/i);
  
  if (pubMatch && pubMatch[1] && pubMatch[1].trim().length > 0) {
    publisher = pubMatch[1].trim();
  } else if (blog.author && !['Editorial Team', 'JK Admin'].includes(blog.author)) {
    publisher = blog.author;
  } else {
    const knowns = ['ANI News', 'Times of India', 'Economic Times', 'ET Realty', 'The Hindu', 'Deccan Chronicle', 'Livemint', 'Moneycontrol', 'Financial Express', 'Business Standard'];
    const found = knowns.find(k => fullText.toLowerCase().includes(k.toLowerCase()));
    if (found) publisher = found;
  }

  // Filter clean summary
  let cleanSummary = (blog.summary || '')
    .replace(/Story Details[\s\S]*?Syndication/gi, '')
    .replace(/Official Publisher Link[\s\S]*/gi, '')
    .replace(/\(https?:\/\/[^\)]+\)/gi, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .trim();
  
  if (!cleanSummary && blog.title) {
    cleanSummary = blog.title;
  }

  // Clean content body paragraphs
  const cleanParagraphs = (blog.content || '').split('\n\n').filter(para => {
    const p = para.trim();
    if (!p) return false;
    if (p.includes('Story Details') || p.includes('Publisher Source') || p.includes('Official Publisher Link')) return false;
    if (p.startsWith('(http') || (p.startsWith('http') && p.includes('news.google.com'))) return false;
    return true;
  });

  return { directUrl, publisher, cleanSummary, cleanParagraphs };
};

interface BlogProps {
  blogs: Blog[];
  activeSlug: string | null;
  onNavigate: (page: string, category?: ProjectCategory | null, siteCategory?: SiteCategory | null, params?: any) => void;
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface Comment {
  name: string;
  date: string;
  text: string;
}

export const BlogPage: React.FC<BlogProps> = ({
  blogs,
  activeSlug,
  onNavigate,
  onAddToast
}) => {
  const [activeTab, setActiveTab] = useState<string>('All');
  
  // Custom comments local storage simulator
  const [comments, setComments] = useState<Record<string, Comment[]>>({
    'why-visakhapatnam-hotbed-real-estate-investment-2026': [
      { name: 'Nageswara Rao', date: 'May 12, 2026', text: 'This article is fully spot-on. The new airport at Bhogapuram is definitely going to double land values in Bheemili.' }
    ]
  });

  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');

  const [heroIdx, setHeroIdx] = useState(0);

  // LocalStorage persistence for followed news publishers
  const [followedPublishers, setFollowedPublishers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('jk_followed_publishers');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load followed publishers', e);
    }
    return ['The Times of India', 'The Economic Times'];
  });

  const toggleFollowPublisher = (pubName: string) => {
    setFollowedPublishers(prev => {
      let next: string[];
      if (prev.includes(pubName)) {
        next = prev.filter(p => p !== pubName);
        onAddToast(`Unfollowed ${pubName}`, 'info');
      } else {
        next = [...prev, pubName];
        onAddToast(`Following ${pubName} news channel! Related news updated.`, 'success');
      }
      try {
        localStorage.setItem('jk_followed_publishers', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const tabs = useMemo(() => [
    { title: 'All News', value: 'All' },
    { title: `⭐ Followed (${followedPublishers.length})`, value: 'Followed' },
    { title: 'Real Estate News', value: 'Real Estate News' },
    { title: 'Property Updates', value: 'Property Updates' },
    { title: 'Investment Guides', value: 'Investment Guides' }
  ], [followedPublishers.length]);

  // Filter and prioritize news list based on followed publishers
  const filteredBlogs = useMemo(() => {
    return blogs.filter(b => {
      let matchesCategory = true;
      if (activeTab === 'Followed') {
        const { publisher } = extractArticleMetaData(b);
        const fullText = (b.title + ' ' + b.summary + ' ' + publisher).toLowerCase();
        matchesCategory = followedPublishers.some(pub => fullText.includes(pub.toLowerCase()));
      } else if (activeTab !== 'All') {
        matchesCategory = b.category === activeTab;
      }
      
      return matchesCategory;
    }).sort((a, b) => {
      // 1. Sort by Date descending (Newest date & timestamp first on top!)
      const parseNewsDate = (dStr: string): number => {
        if (!dStr) return 0;
        const sanitized = dStr.replace('•', '').replace(/\s+/g, ' ').trim();
        const parsedFull = Date.parse(sanitized);
        if (!isNaN(parsedFull)) return parsedFull;

        const dateOnly = dStr.split('•')[0].trim();
        const parsedDate = Date.parse(dateOnly);
        return isNaN(parsedDate) ? 0 : parsedDate;
      };

      const timeA = parseNewsDate(a.date);
      const timeB = parseNewsDate(b.date);

      if (timeA !== timeB) {
        return timeB - timeA; // Newest first!
      }

      // 2. Secondary sort: Followed publishers first if dates are identical
      const aMeta = extractArticleMetaData(a);
      const bMeta = extractArticleMetaData(b);
      const aText = (a.title + ' ' + a.summary + ' ' + aMeta.publisher).toLowerCase();
      const bText = (b.title + ' ' + b.summary + ' ' + bMeta.publisher).toLowerCase();

      const aFollowed = followedPublishers.some(pub => aText.includes(pub.toLowerCase()));
      const bFollowed = followedPublishers.some(pub => bText.includes(pub.toLowerCase()));

      if (aFollowed && !bFollowed) return -1;
      if (!aFollowed && bFollowed) return 1;
      return 0;
    });
  }, [blogs, activeTab, followedPublishers]);

  const featuredStory = useMemo(() => {
    if (!filteredBlogs || filteredBlogs.length === 0) return null;
    return filteredBlogs[heroIdx % filteredBlogs.length];
  }, [filteredBlogs, heroIdx]);

  const handleCardClick = (blog: Blog) => {
    const { directUrl } = extractArticleMetaData(blog);
    if (directUrl) {
      window.open(directUrl, '_blank', 'noopener,noreferrer');
    } else {
      onNavigate('blog-details', null, null, { slug: blog.slug });
    }
  };

  const handleShareClick = (platform: string, title: string) => {
    const shareUrl = window.location.href;
    if (platform === 'copy') {
      navigator.clipboard.writeText(shareUrl);
      onAddToast('Article URL copied to clipboard!', 'success');
      return;
    }
    
    let url = '';
    if (platform === 'facebook') url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    if (platform === 'twitter') url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`;
    if (platform === 'linkedin') url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    
    window.open(url, '_blank', 'width=600,height=400');
    onAddToast(`Opening share page for ${platform}`, 'info');
  };

  const handleCommentSubmit = (e: React.FormEvent, slug: string) => {
    e.preventDefault();
    if (!commentName.trim() || !commentText.trim()) {
      onAddToast('Please fill out your name and write a comment', 'error');
      return;
    }

    const newComment: Comment = {
      name: commentName,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      text: commentText
    };

    setComments(prev => {
      const existing = prev[slug] || [];
      return {
        ...prev,
        [slug]: [...existing, newComment]
      };
    });

    onAddToast('Comment posted successfully!', 'success');
    setCommentName('');
    setCommentText('');
  };

  // If activeSlug is set, show details view
  const selectedBlog = useMemo(() => {
    if (!activeSlug) return null;
    return blogs.find(b => b.slug === activeSlug);
  }, [blogs, activeSlug]);

  if (selectedBlog) {
    // Reading details view
    const blogComments = comments[selectedBlog.slug] || [];
    const { directUrl, publisher, cleanParagraphs } = extractArticleMetaData(selectedBlog);
    
    return (
      <div className="blog-detail-view py-4">
        <div className="container">
          <button 
            onClick={() => onNavigate('blog')} 
            className="btn-back-blog flex align-center gap-1 font-bold mb-3"
          >
            <ArrowLeft size={16} /> Back to Blog List
          </button>

          <article className="premium-article mb-4">
            <div className="blog-detail-header">
              <span className="badge-cat mb-1">{selectedBlog.category}</span>
              <h1>{selectedBlog.title}</h1>
              <div className="blog-meta-divider flex justify-between align-center flex-wrap gap-2">
                <div className="flex align-center gap-2">
                  <span className="flex align-center gap-0.5"><Calendar size={14} className="text-secondary" /> {selectedBlog.date}</span>
                  <span className="flex align-center gap-0.5"><Globe size={14} className="text-secondary" /> Source: {publisher}</span>
                </div>
                {directUrl && (
                  <a 
                    href={directUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex align-center gap-0.5 text-secondary font-bold text-sm hover-underline"
                    style={{ textDecoration: 'none' }}
                  >
                    <span>Read Original Article</span>
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>

            <div className="blog-detail-img-box">
              <img src={selectedBlog.image} alt={selectedBlog.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            {/* Content Body - Clean & Readable */}
            <div className="blog-content-body">
              {cleanParagraphs.map((para, i) => {
                if (para.startsWith('###')) {
                  return <h3 key={i}>{para.replace('###', '').trim()}</h3>;
                }
                if (para.startsWith('##')) {
                  return <h2 key={i}>{para.replace('##', '').trim()}</h2>;
                }
                if (para.startsWith('|') || para.startsWith('-')) {
                  if (para.startsWith('-')) {
                    return (
                      <ul key={i}>
                        {para.split('\n').map((li, liIdx) => (
                          <li key={liIdx}>{li.replace('-', '').trim()}</li>
                        ))}
                      </ul>
                    );
                  }
                  return <pre key={i} style={{ backgroundColor: 'var(--light-soft)', padding: '1rem', borderRadius: '6px', overflowX: 'auto', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{para}</pre>;
                }
                return <p key={i}>{para}</p>;
              })}
            </div>

            {/* Tags & Sharing */}
            <div className="blog-detail-footer flex justify-between align-center flex-wrap gap-2 pt-2" style={{ borderTop: '1px solid var(--border-color)', marginTop: '2rem' }}>
              <div className="flex gap-1 align-center">
                <Tag size={16} className="text-secondary" />
                <div className="flex gap-0.5 flex-wrap">
                  {selectedBlog.tags.map((tag, idx) => (
                    <span key={idx} style={{ backgroundColor: 'var(--light-soft)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{tag}</span>
                  ))}
                </div>
              </div>

              {/* Share links */}
              <div className="flex align-center gap-1">
                <span className="font-semibold text-sm flex align-center gap-0.5"><Share2 size={16} /> Share Post:</span>
                <div className="flex gap-0.5">
                  <button onClick={() => handleShareClick('facebook', selectedBlog.title)} className="share-icon fb" title="Share on Facebook">
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/></svg>
                  </button>
                  <button onClick={() => handleShareClick('twitter', selectedBlog.title)} className="share-icon tw" title="Share on Twitter">
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                  </button>
                  <button onClick={() => handleShareClick('linkedin', selectedBlog.title)} className="share-icon ln" title="Share on LinkedIn">
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                  </button>
                  <button onClick={() => handleShareClick('copy', selectedBlog.title)} className="share-icon cp" title="Copy Article URL">🔗</button>
                </div>
              </div>
            </div>
          </article>

          {/* Comments section */}
          <div className="blog-comments-section comment-card-wrapper mb-4">
            <h3 className="border-bottom-title mb-2 flex align-center gap-1" style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem' }}><MessageSquare size={20} /> Comments ({blogComments.length})</h3>
            
            {blogComments.length === 0 ? (
              <p className="text-sm text-muted mb-3">No comments written yet. Be the first to express your thoughts!</p>
            ) : (
              <div className="flex flex-col gap-2 mb-3">
                {blogComments.map((com, i) => {
                  const initials = com.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  return (
                    <div key={i} className="comment-bubble-premium">
                      <div className="avatar-circle">{initials}</div>
                      <div className="comment-text-box">
                        <div className="comment-header">
                          <span className="comment-author-name">{com.name}</span>
                          <span className="comment-date-stamp">{com.date}</span>
                        </div>
                        <p className="text-sm text-muted" style={{ margin: 0 }}>{com.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Leave a comment form */}
            <form onSubmit={(e) => handleCommentSubmit(e, selectedBlog.slug)} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <h4 className="mb-2">Leave a Comment</h4>
              <div className="grid grid-2 gap-2">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Enter name..." 
                    value={commentName}
                    onChange={e => setCommentName(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Comment Message</label>
                <textarea 
                  className="form-control" 
                  rows={4} 
                  placeholder="Write your review or questions..." 
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-secondary btn-sm flex align-center gap-0.5">
                <Send size={14} /> Submit Comment
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }  // Listing page view
  return (
    <div className="blog-listing-page" style={{ minHeight: 'calc(100vh - 80px)', backgroundColor: '#f3f4f6', padding: '1rem 0' }}>
      <div className="container">
        {/* Top Bar: Brand, Category Filter Pills & Search */}
        <div className="news-top-bar flex justify-between align-center flex-wrap gap-2 mb-3 shadow-sm">
          <div className="flex align-center gap-1.5 flex-wrap">
            <div style={{ backgroundColor: 'var(--primary)', color: '#ffffff', padding: '0.35rem 0.75rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
              JK NEWS
            </div>
            <span className="text-xs font-bold text-slate-700" style={{ fontSize: '0.78rem' }}>Real Estate & Urban Property Hub</span>
          </div>

          <div className="flex align-center gap-2">
            <div className="flex align-center gap-1 text-xs" style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
              <span>Live News Feed • Syncs every 60s</span>
            </div>
          </div>

          {/* Touch-Scrollable Filter Pills on Mobile */}
          <div className="news-tabs-scroll">
            {tabs.map((tab, idx) => {
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={idx}
                  type="button"
                  className={`gallery-tab-btn ${isActive ? 'active' : ''}`}
                  style={{ 
                    padding: '0.35rem 0.85rem', 
                    fontSize: '0.78rem', 
                    borderRadius: '20px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    border: isActive ? '1.5px solid #0b2544' : '1px solid #d1d5db',
                    backgroundColor: isActive ? '#0b2544' : '#ffffff',
                    color: isActive ? '#ffffff' : '#374151',
                    fontWeight: isActive ? 700 : 500,
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? '0 2px 8px rgba(11,37,68,0.25)' : 'none'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab(tab.value);
                    setHeroIdx(0);
                  }}
                >
                  {tab.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3-Column MSN News Portal Layout (Responsive grid/flex) */}
        <div className="msn-portal-grid">
          
          {/* COLUMN 1 (LEFT): Suggested Publishers */}
          <div className="msn-col-left flex flex-col gap-3">
            <div className="bg-white p-3 shadow-sm" style={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}>
              <div className="flex justify-between align-center mb-1">
                <h4 className="my-0 text-xs font-bold flex align-center gap-0.5" style={{ color: '#2563eb', fontSize: '0.82rem' }}>
                  <span>⭐ Suggested for you</span>
                </h4>
                <MoreHorizontal size={15} className="text-muted cursor-pointer" />
              </div>
              <p className="text-xs text-muted mb-2.5" style={{ fontSize: '0.72rem', lineHeight: '1.3' }}>Follow real estate news publishers for tailored updates</p>

              <div className="flex flex-col gap-2">
                {[
                  { name: 'The Times of India', code: 'TOI', color: '#dc2626' },
                  { name: 'The Economic Times', code: 'ET', color: '#b91c1c' },
                  { name: 'India Today', code: 'IT', color: '#ea580c' },
                  { name: 'Hindustan Times', code: 'HT', color: '#0284c7' },
                  { name: 'Livemint Property', code: 'LM', color: '#0d9488' }
                ].map((pub, idx) => {
                  const isFollowing = followedPublishers.includes(pub.name);
                  return (
                    <div 
                      key={idx} 
                      className="flex justify-between align-center p-1.5 cursor-pointer" 
                      onClick={() => toggleFollowPublisher(pub.name)}
                      style={{ borderRadius: '8px', border: isFollowing ? '1px solid #a7f3d0' : '1px solid #f3f4f6', backgroundColor: isFollowing ? '#ecfdf5' : '#fafafa', transition: 'all 0.15s ease' }}
                    >
                      <div className="flex align-center gap-1.5">
                        <span style={{ backgroundColor: pub.color, color: '#fff', fontSize: '0.62rem', fontWeight: 800, padding: '0.15rem 0.35rem', borderRadius: '4px' }}>
                          {pub.code}
                        </span>
                        <span className="text-xs font-semibold" style={{ fontSize: '0.76rem', color: '#1f2937' }}>{pub.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFollowPublisher(pub.name);
                        }}
                        style={{
                          border: isFollowing ? '1px solid #10b981' : '1px solid #d1d5db',
                          backgroundColor: isFollowing ? '#10b981' : '#ffffff',
                          color: isFollowing ? '#ffffff' : '#374151',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        title={isFollowing ? 'Following' : 'Follow Source'}
                      >
                        {isFollowing ? <Check size={13} strokeWidth={3} /> : <Plus size={13} strokeWidth={2.5} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AP Market Index Widget */}
            <div className="bg-white p-3 shadow-sm" style={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}>
              <h4 className="my-0 text-xs font-bold text-primary flex align-center gap-1" style={{ fontSize: '0.82rem' }}>
                <TrendingUp size={15} color="#059669" /> AP Real Estate Index
              </h4>
              <div className="my-2 p-2" style={{ background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div className="flex justify-between text-xs font-bold mb-0.5" style={{ fontSize: '0.75rem' }}>
                  <span>Visakhapatnam Hub</span>
                  <span style={{ color: '#059669' }}>+18.4% YoY</span>
                </div>
                <p className="text-muted my-0" style={{ fontSize: '0.7rem', lineHeight: '1.3' }}>Bhogapuram & Bheemili corridor showing highest capital growth</p>
              </div>
            </div>
          </div>

          {/* COLUMN 2 (CENTER): Featured Hero Card & Medium News Cards */}
          <div className="msn-col-center flex flex-col gap-3">
            {/* Featured Story Hero Banner */}
            {featuredStory && (
              <div 
                className="msn-hero-card relative shadow-md"
                style={{ 
                  minHeight: '220px',
                  maxHeight: '260px', 
                  borderRadius: '12px', 
                  overflow: 'hidden', 
                  backgroundImage: `linear-gradient(to top, rgba(11,25,44,0.95) 0%, rgba(11,25,44,0.5) 55%, rgba(11,25,44,0.15) 100%), url(${featuredStory.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.2rem',
                  color: '#ffffff',
                  position: 'relative'
                }}
              >
                {/* Navigation Arrows */}
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHeroIdx(prev => (prev === 0 ? Math.max(0, filteredBlogs.length - 1) : prev - 1));
                  }}
                  style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 5 }}
                >
                  <ChevronLeft size={18} />
                </button>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHeroIdx(prev => (prev + 1) % Math.max(1, filteredBlogs.length));
                  }}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 5 }}
                >
                  <ChevronRight size={18} />
                </button>

                {/* Top Badge */}
                <div className="flex align-center gap-1 flex-wrap" style={{ zIndex: 2 }}>
                  <span style={{ backgroundColor: '#dc2626', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.45rem', borderRadius: '4px', textTransform: 'uppercase' }}>
                    TOP NEWS
                  </span>
                  <span style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.45rem', borderRadius: '4px' }}>
                    {extractArticleMetaData(featuredStory).publisher} • {formatNewsTime(featuredStory.date)}
                  </span>
                </div>

                {/* Headline & Engagement Bar */}
                <div style={{ zIndex: 2 }}>
                  <h2 
                    onClick={() => handleCardClick(featuredStory)} 
                    style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: '0.3rem 0', cursor: 'pointer', lineHeight: '1.35', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  >
                    {featuredStory.title}
                  </h2>

                  <div className="flex justify-between align-center mt-1.5 pt-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <span className="text-xs text-white opacity-90 font-semibold" style={{ fontSize: '0.72rem' }}>
                      Click story to read full coverage
                    </span>

                    {/* Dots indicator */}
                    <div className="flex gap-1 align-center">
                      {filteredBlogs.slice(0, 5).map((_, i) => (
                        <span 
                          key={i} 
                          onClick={(e) => { e.stopPropagation(); setHeroIdx(i); }}
                          style={{ 
                            width: i === heroIdx ? '14px' : '5px', 
                            height: '5px', 
                            borderRadius: '3px', 
                            backgroundColor: i === heroIdx ? '#f2b705' : 'rgba(255,255,255,0.5)',
                            cursor: 'pointer',
                            transition: 'all 0.3s'
                          }} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Medium News Cards (Responsive grid: 2 col desktop, 1 col mobile) */}
            {filteredBlogs.length === 0 ? (
              <div className="bg-white p-4 text-center" style={{ borderRadius: '12px' }}>
                <p className="text-muted text-sm my-0 font-bold">No articles found matching search query.</p>
              </div>
            ) : (
              <div className="msn-medium-news-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                {filteredBlogs.filter(b => b.id !== featuredStory?.id).slice(0, 4).map(blog => {
                  const { publisher, cleanSummary } = extractArticleMetaData(blog);
                  return (
                    <div 
                      key={blog.id} 
                      className="bg-white shadow-sm flex flex-col justify-between cursor-pointer"
                      onClick={() => handleCardClick(blog)}
                      style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb', height: '100%' }}
                    >
                      <div>
                        <div style={{ height: '120px', position: 'relative' }}>
                          <img src={blog.image} alt={blog.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <span style={{ position: 'absolute', bottom: '6px', left: '6px', backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '0.62rem', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                            {blog.category}
                          </span>
                        </div>
                        <div style={{ padding: '0.65rem' }}>
                          <div className="flex align-center gap-1 text-xs text-muted mb-0.5" style={{ fontSize: '0.7rem' }}>
                            <span style={{ color: '#2563eb', fontWeight: 700 }}>{publisher}</span>
                            <span>• {formatNewsTime(blog.date)}</span>
                          </div>
                          <h4 
                            style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary)', margin: '0.2rem 0', lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.3em' }}
                          >
                            {blog.title}
                          </h4>
                          <p className="text-xs text-muted my-0.5" style={{ fontSize: '0.74rem', lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{cleanSummary}</p>
                        </div>
                      </div>

                      {/* Clean Card Footer */}
                      <div className="flex justify-end align-center px-2.5 py-1.5" style={{ borderTop: '1px solid #f3f4f6', backgroundColor: '#f8fafc' }}>
                        <span className="text-xs font-bold text-secondary flex align-center gap-0.5" style={{ fontSize: '0.72rem' }}>
                          Read Story →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* COLUMN 3 (RIGHT): MSN Weather Card & Hot News Flash Stack */}
          <div className="msn-col-right flex flex-col gap-3">
            {/* MSN Style Weather Widget */}
            <div 
              className="msn-weather-card p-3 text-white shadow-md relative"
              style={{ 
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', 
                borderRadius: '12px', 
                boxShadow: '0 4px 15px rgba(30,64,175,0.25)' 
              }}
            >
              <div className="flex justify-between align-center text-xs mb-1" style={{ opacity: 0.9, fontSize: '0.75rem' }}>
                <span className="font-bold flex align-center gap-0.5">📍 Manoharabad / Vizag ▾</span>
                <MoreHorizontal size={14} />
              </div>

              <div className="flex align-center justify-between my-1">
                <div className="flex align-center gap-2">
                  <Sun size={34} color="#f2b705" />
                  <div>
                    <h2 className="my-0 text-white" style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>28°C</h2>
                    <span className="text-xs" style={{ opacity: 0.85, fontSize: '0.7rem' }}>Humidity 68%</span>
                  </div>
                </div>
              </div>

              {/* Hourly Chips */}
              <div className="flex justify-between align-center mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.2)', fontSize: '0.68rem' }}>
                {['12 PM', '1 PM', '2 PM', '3 PM', '4 PM'].map((time, idx) => (
                  <div key={idx} className="text-center">
                    <div style={{ opacity: 0.8 }}>{time}</div>
                    <div className="font-bold my-0.5">{29 + (idx % 2)}°</div>
                    <div style={{ fontSize: '0.62rem', color: '#fef08a' }}>▲ {(idx + 3)}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trending Hot Flashes Stack */}
            <div className="bg-white p-3 shadow-sm" style={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}>
              <h4 className="my-0 text-xs font-bold text-primary mb-2 flex align-center gap-1" style={{ fontSize: '0.82rem' }}>
                <TrendingUp size={14} color="#dc2626" /> Hot Property Headlines
              </h4>

              <div className="flex flex-col gap-2">
                {blogs.slice(0, 3).map((b, i) => (
                  <div key={i} onClick={() => onNavigate('blog-details', null, null, { slug: b.slug })} className="flex gap-2 align-center p-1.5 hover-bg-light" style={{ cursor: 'pointer', borderRadius: '6px', border: '1px solid #f3f4f6', backgroundColor: '#fafafa' }}>
                    <img src={b.image} alt={b.title} style={{ width: '44px', height: '44px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <h5 className="my-0 text-xs font-bold text-primary line-clamp-2" style={{ fontSize: '0.75rem', lineHeight: '1.25' }}>{b.title}</h5>
                      <span className="text-xxs text-muted" style={{ fontSize: '0.65rem' }}>{formatNewsTime(b.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        /* Share icon circles */
        .share-icon {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-full);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--white);
          font-weight: 800;
        }
        .share-icon.fb { background-color: #1877f2; }
        .share-icon.tw { background-color: #1da1f2; }
        .share-icon.ln { background-color: #0a66c2; }
        .share-icon.cp { background-color: var(--primary); }
        .share-icon:hover {
          opacity: 0.9;
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
};
