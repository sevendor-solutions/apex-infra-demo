import React, { useState, useMemo } from 'react';
import type { Blog, ProjectCategory, SiteCategory } from '../types';
import { Calendar, User, Tag, Search, ArrowLeft, ArrowRight, Share2, MessageSquare, Send } from 'lucide-react';

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
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('All');
  
  // Custom comments local storage simulator
  const [comments, setComments] = useState<Record<string, Comment[]>>({
    'why-visakhapatnam-hotbed-real-estate-investment-2026': [
      { name: 'Nageswara Rao', date: 'May 12, 2026', text: 'This article is fully spot-on. The new airport at Bhogapuram is definitely going to double land values in Bheemili.' }
    ]
  });

  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');

  const tabs = [
    { title: 'All Posts', value: 'All' },
    { title: 'Real Estate News', value: 'Real Estate News' },
    { title: 'Property Updates', value: 'Property Updates' },
    { title: 'Investment Guides', value: 'Investment Guides' },
    { title: 'Company News', value: 'Company News' }
  ];

  // If activeSlug is set, show details view
  const selectedBlog = useMemo(() => {
    if (!activeSlug) return null;
    return blogs.find(b => b.slug === activeSlug);
  }, [blogs, activeSlug]);

  // Filter list
  const filteredBlogs = useMemo(() => {
    return blogs.filter(b => {
      const matchesSearch = b.title.toLowerCase().includes(search.toLowerCase()) || 
                            b.summary.toLowerCase().includes(search.toLowerCase()) ||
                            b.content.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeTab === 'All' || b.category === activeTab;
      return matchesSearch && matchesCategory;
    });
  }, [blogs, search, activeTab]);

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

  if (selectedBlog) {
    // Reading details view
    const blogComments = comments[selectedBlog.slug] || [];
    
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
              <span className="badge-cat">{selectedBlog.category}</span>
              <h1>{selectedBlog.title}</h1>
              <div className="blog-meta-divider">
                <span className="flex align-center gap-0.5"><Calendar size={14} className="text-secondary" /> {selectedBlog.date}</span>
                <span className="flex align-center gap-0.5"><User size={14} className="text-secondary" /> By {selectedBlog.author}</span>
              </div>
            </div>

            <div className="blog-detail-img-box">
              <img src={selectedBlog.image} alt={selectedBlog.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            {/* Content Body */}
            <div className="blog-content-body">
              {/* Parse markdown headings dynamically */}
              {selectedBlog.content.split('\n\n').map((para, i) => {
                if (para.startsWith('###')) {
                  return <h3 key={i}>{para.replace('###', '').trim()}</h3>;
                }
                if (para.startsWith('##')) {
                  return <h2 key={i}>{para.replace('##', '').trim()}</h2>;
                }
                if (para.startsWith('|') || para.startsWith('-')) {
                  // Simple lists/tables rendering
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
  }

  // Listing page view
  return (
    <div className="blog-listing-page">
      {/* Header Banner */}
      <section className="page-header py-4 text-center text-white" style={{ background: 'linear-gradient(rgba(11,25,44,0.85), rgba(11,25,44,0.85)), url(https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80)', backgroundSize: 'cover' }}>
        <div className="container">
          <h1 className="text-white text-4xl">JK Insights & Guides</h1>
          <p className="text-muted" style={{ color: 'rgba(255,255,255,0.75)' }}>Latest updates, real estate laws, investment strategies, and corporate announcements</p>
        </div>
      </section>

      {/* Search and Tabs */}
      <section className="container py-3">
        <div className="blog-filters-wrapper glass-card py-2 px-2 flex justify-between align-center flex-wrap gap-2">
          {/* Tabs */}
          <div className="gallery-tabs flex gap-1 flex-wrap mb-0">
            {tabs.map((tab, idx) => (
              <button
                key={idx}
                className={`gallery-tab-btn ${activeTab === tab.value ? 'active' : ''}`}
                style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                onClick={() => setActiveTab(tab.value)}
              >
                {tab.title}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="search-bar-wrapper" style={{ width: '280px' }}>
            <Search className="search-bar-icon" size={16} />
            <input 
              type="text" 
              placeholder="Search articles..." 
              className="search-bar-input"
              style={{ padding: '0.5rem 0.75rem 0.5rem 2.25rem', fontSize: '0.9rem' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Blog listing Grid */}
      <section className="container py-4">
        {filteredBlogs.length === 0 ? (
          <div className="text-center py-6 glass-card">
            <p className="text-lg font-bold text-muted mb-1">No articles found</p>
            <p className="text-sm text-muted">Try resetting category tab filters or checking search query spelling.</p>
          </div>
        ) : (
          <div className="grid grid-3 gap-3">
            {filteredBlogs.map(blog => (
              <div 
                key={blog.id} 
                className="blog-home-card glass-card flex flex-col justify-between"
                onClick={() => onNavigate('blog-details', null, null, { slug: blog.slug })}
              >
                <div>
                  <div className="blog-home-img-box">
                    <img src={blog.image} alt={blog.title} />
                    <span className="blog-home-cat-badge">{blog.category}</span>
                  </div>
                  <div className="blog-home-body">
                    <div className="flex justify-between text-xs text-muted font-semibold mb-0.5">
                      <span className="flex align-center gap-0.5"><Calendar size={12} /> {blog.date}</span>
                      <span className="flex align-center gap-0.5"><User size={12} /> {blog.author}</span>
                    </div>
                    <h3>{blog.title}</h3>
                    <p className="text-sm text-muted">{blog.summary}</p>
                  </div>
                </div>
                
                <div style={{ padding: '0 1.25rem 1.25rem' }}>
                  <button className="read-more-link flex align-center gap-0.5 font-semibold text-secondary text-sm">
                    Read Article <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
