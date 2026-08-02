import React, { useState, useMemo, useEffect } from 'react';
import type { Blog, ProjectCategory, SiteCategory } from '../types';
import { Calendar, Tag, ArrowLeft, Share2, MessageSquare, Send, ExternalLink, Globe } from 'lucide-react';

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
  const [activeSection, setActiveSection] = useState<'all' | 'live' | 'blogs'>('all');
  const [activeTab, setActiveTab] = useState<string>('All');
  
  // Custom comments local storage simulator
  const [comments, setComments] = useState<Record<string, Comment[]>>({
    'why-visakhapatnam-hotbed-real-estate-investment-2026': [
      { name: 'Nageswara Rao', date: 'May 12, 2026', text: 'This article is fully spot-on. The new airport at Bhogapuram is definitely going to double land values in Bheemili.' }
    ]
  });

  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');

  // Live Online RSS News (Fetched in browser from entire India, for display/show purpose only, NEVER saved to DB)
  const [liveRssBlogs, setLiveRssBlogs] = useState<Blog[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchLiveOnlineNews = async () => {
      try {
        // Nationwide India Real Estate RSS Queries
        const feeds = [
          { cat: 'Real Estate News', query: 'real+estate+india+property+news' },
          { cat: 'Property Updates', query: 'india+housing+market+rera+updates' },
          { cat: 'Investment Guides', query: 'real+estate+investment+india+land' },
          { cat: 'Company News', query: 'property+developers+india+infrastructure' }
        ];

        const fetchedItems: Blog[] = [];
        const stockImages = [
          'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'
        ];

        for (const feed of feeds) {
          const targetUrl = `https://news.google.com/rss/search?q=${feed.query}&hl=en-IN&gl=IN&ceid=IN:en`;
          const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(targetUrl)}`;
          
          const res = await fetch(proxyUrl);
          const data = await res.json();

          if (data && data.items && Array.isArray(data.items)) {
            data.items.slice(0, 4).forEach((item: any, idx: number) => {
              const title = item.title || '';
              const link = item.link || '';
              const pubDate = item.pubDate || new Date().toISOString();
              
              let publisher = 'Official Publisher';
              let cleanTitle = title;
              if (title.includes(' - ')) {
                const parts = title.split(' - ');
                publisher = parts.pop() || 'Official Publisher';
                cleanTitle = parts.join(' - ');
              }

              const cleanDesc = (item.description || item.content || cleanTitle)
                .replace(/<[^>]*>?/gm, '')
                .trim();

              fetchedItems.push({
                id: `live_rss_${feed.cat}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
                title: cleanTitle,
                slug: `live-news-${idx}-${Math.random().toString(36).substr(2, 5)}`,
                summary: cleanDesc.slice(0, 165) + '...',
                content: `${cleanDesc}\n\nPublisher Source: ${publisher}\n\nOfficial Publisher Link: (${link})`,
                category: feed.cat as any,
                image: item.thumbnail || stockImages[idx % stockImages.length],
                date: pubDate,
                author: publisher,
                tags: ['India News', publisher, 'Real Estate']
              });
            });
          }
        }

        if (isMounted && fetchedItems.length > 0) {
          setLiveRssBlogs(fetchedItems);
        }
      } catch (e) {
        console.log('Live RSS fetch error fallback:', e);
      }
    };

    fetchLiveOnlineNews();
    
    // Auto-refresh live online news every 1 hour (3,600,000ms)
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const interval = setInterval(() => {
      fetchLiveOnlineNews();
    }, ONE_HOUR_MS);

    return () => { 
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const tabs = useMemo(() => [
    { title: 'All News & Blogs', value: 'All' },
    { title: 'Real Estate News', value: 'Real Estate News' },
    { title: 'Property Updates', value: 'Property Updates' },
    { title: 'Investment Guides', value: 'Investment Guides' },
    { title: 'Company News', value: 'Company News' }
  ], []);

  // Section 1: Filtered Live Online RSS Real Estate News (Times of India, ET, IT, HT, Livemint)
  const filteredLiveNews = useMemo(() => {
    return liveRssBlogs.filter(b => {
      if (activeTab === 'All') return true;
      return b.category === activeTab;
    });
  }, [liveRssBlogs, activeTab]);

  // Section 2: Filtered Database Company Blogs
  const filteredDbBlogs = useMemo(() => {
    return blogs.filter(b => {
      if (activeTab === 'All') return true;
      return b.category === activeTab;
    });
  }, [blogs, activeTab]);

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
    return blogs.find((b: Blog) => b.slug === activeSlug);
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
                  {selectedBlog.tags?.map((tag: string, idx: number) => (
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
    <div className="blog-listing-page" style={{ minHeight: 'calc(100vh - 80px)', backgroundColor: '#f3f4f6', padding: '1.5rem 0' }}>
      <div className="container">
        {/* Top Header Bar: Mode Switcher Tabs (JK NEWS & BLOGS vs Live News Feed) */}
        <div className="news-top-bar flex justify-between align-center flex-wrap gap-2 mb-4 shadow-sm" style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <div className="flex align-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveSection('all')}
              style={{
                backgroundColor: activeSection === 'all' ? 'var(--primary)' : '#f1f5f9',
                color: activeSection === 'all' ? '#ffffff' : '#334155',
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.88rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activeSection === 'all' ? '0 2px 8px rgba(11,37,68,0.25)' : 'none'
              }}
            >
              JK NEWS & BLOGS
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('live')}
              style={{
                backgroundColor: activeSection === 'live' ? '#dc2626' : '#f1f5f9',
                color: activeSection === 'live' ? '#ffffff' : '#334155',
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.88rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activeSection === 'live' ? '0 2px 8px rgba(220,38,38,0.25)' : 'none'
              }}
            >
              📡 Live News Feed
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('blogs')}
              style={{
                backgroundColor: activeSection === 'blogs' ? '#059669' : '#f1f5f9',
                color: activeSection === 'blogs' ? '#ffffff' : '#334155',
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.88rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activeSection === 'blogs' ? '0 2px 8px rgba(5,150,105,0.25)' : 'none'
              }}
            >
              ✍️ Company Blogs
            </button>
          </div>

          {/* Touch-Scrollable Category Filter Pills */}
          <div className="news-tabs-scroll w-full mt-2">
            {tabs.map((tab, idx) => {
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={idx}
                  type="button"
                  className={`gallery-tab-btn ${isActive ? 'active' : ''}`}
                  style={{ 
                    padding: '0.4rem 0.95rem', 
                    fontSize: '0.8rem', 
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
                  onClick={() => setActiveTab(tab.value)}
                >
                  {tab.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 1: 📰 LIVE ONLINE REAL ESTATE NEWS */}
        {(activeSection === 'all' || activeSection === 'live') && (
          <section className="mb-5">
            <div className="flex justify-between align-center mb-3 flex-wrap gap-1">
              <div>
                <h3 className="my-0 flex align-center gap-1.5 text-primary" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                  📰 Live Real Estate News Articles
                </h3>
                <span className="text-xs text-muted" style={{ fontSize: '0.74rem' }}>
                  Coverage from Times of India, Economic Times, India Today, Hindustan Times, Livemint Property
                </span>
              </div>
              <span className="text-xs text-muted font-bold" style={{ backgroundColor: '#e2e8f0', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                {filteredLiveNews.length} Live Stories
              </span>
            </div>

            {filteredLiveNews.length === 0 ? (
              <div className="bg-white p-4 text-center" style={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                <p className="text-muted text-sm my-0 font-bold">No live news stories found matching this category.</p>
              </div>
            ) : (
              <div className="grid grid-3 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {filteredLiveNews.map(news => {
                  const { publisher } = extractArticleMetaData(news);
                  return (
                    <div 
                      key={news.id}
                      className="bg-white shadow-sm flex flex-col justify-between cursor-pointer"
                      style={{ borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s' }}
                      onClick={() => handleCardClick(news)}
                    >
                      <div>
                        <div 
                          style={{ 
                            height: '150px', 
                            backgroundImage: `url(${news.image})`, 
                            backgroundSize: 'cover', 
                            backgroundPosition: 'center', 
                            position: 'relative' 
                          }}
                        >
                          <span style={{ position: 'absolute', top: '8px', left: '8px', backgroundColor: '#dc2626', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                            {publisher}
                          </span>
                          <span style={{ position: 'absolute', bottom: '8px', right: '8px', backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '0.62rem', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                            {formatNewsTime(news.date)}
                          </span>
                        </div>

                        <div className="p-3">
                          <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: '0 0 0.4rem 0', color: '#111827', lineHeight: '1.35', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.5em' }}>
                            {news.title}
                          </h4>
                          <p style={{ fontSize: '0.76rem', color: '#4b5563', margin: 0, lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.8em' }}>
                            {news.summary}
                          </p>
                        </div>
                      </div>

                      <div className="px-3 py-2 flex justify-between align-center" style={{ borderTop: '1px solid #f3f4f6', backgroundColor: '#fafafa' }}>
                        <span className="text-xs text-muted font-semibold" style={{ fontSize: '0.7rem' }}>{news.category}</span>
                        <span className="text-xs font-bold text-primary flex align-center gap-0.5" style={{ fontSize: '0.74rem' }}>
                          Read Story <ExternalLink size={12} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* SECTION 2: ✍️ COMPANY BLOGS & INSIGHTS (FROM DATABASE) */}
        {(activeSection === 'all' || activeSection === 'blogs') && (
          <section className="mb-4">
            <div className="flex justify-between align-center mb-3 flex-wrap gap-1">
              <div>
                <h3 className="my-0 flex align-center gap-1.5 text-primary" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                  ✍️ Company Blogs & Insights
                </h3>
                <span className="text-xs text-muted" style={{ fontSize: '0.74rem' }}>
                  Articles and announcements from JK Future Infra database
                </span>
              </div>
              <span className="text-xs text-muted font-bold" style={{ backgroundColor: '#e2e8f0', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                {filteredDbBlogs.length} Articles
              </span>
            </div>

            {filteredDbBlogs.length === 0 ? (
              <div className="bg-white p-4 text-center" style={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                <p className="text-muted text-sm my-0 font-bold">No company blogs available in this category.</p>
              </div>
            ) : (
              <div className="grid grid-3 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {filteredDbBlogs.map(blog => (
                  <div 
                    key={blog.id}
                    className="bg-white shadow-sm flex flex-col justify-between cursor-pointer"
                    style={{ borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s' }}
                    onClick={() => onNavigate('blog-details', null, null, { slug: blog.slug })}
                  >
                    <div>
                      <div 
                        style={{ 
                          height: '150px', 
                          backgroundImage: `url(${blog.image || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80'})`, 
                          backgroundSize: 'cover', 
                          backgroundPosition: 'center', 
                          position: 'relative' 
                        }}
                      >
                        <span style={{ position: 'absolute', top: '8px', left: '8px', backgroundColor: 'var(--primary)', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                          {blog.category}
                        </span>
                      </div>

                      <div className="p-3">
                        <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: '0 0 0.4rem 0', color: '#111827', lineHeight: '1.35', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.5em' }}>
                          {blog.title}
                        </h4>
                        <p style={{ fontSize: '0.76rem', color: '#4b5563', margin: 0, lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.8em' }}>
                          {blog.summary}
                        </p>
                      </div>
                    </div>

                    <div className="px-3 py-2 flex justify-between align-center" style={{ borderTop: '1px solid #f3f4f6', backgroundColor: '#fafafa' }}>
                      <span className="text-xs text-muted font-semibold" style={{ fontSize: '0.7rem' }}>{formatNewsTime(blog.date)}</span>
                      <span className="text-xs font-bold text-primary flex align-center gap-0.5" style={{ fontSize: '0.74rem' }}>
                        Read Article →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
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
