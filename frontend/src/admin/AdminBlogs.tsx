import React, { useState } from 'react';
import type { Blog, BlogCategory } from '../types';
import { Edit2, Trash2, User } from 'lucide-react';
import { addBlog, updateBlog, deleteBlog, uploadImage } from '../utils/db';
import { ALVGrid } from './ALVGrid';
import type { ALVColumn } from './ALVGrid';

interface AdminBlogsProps {
  blogs: Blog[];
  onRefresh: () => void;
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

export const AdminBlogs: React.FC<AdminBlogsProps> = ({
  blogs,
  onRefresh,
  onAddToast,
  onConfirm
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);

  // Upload state
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingImage(true);
    try {
      const url = await uploadImage(e.target.files[0], 'MBN');
      setImage(url);
      onAddToast('Cover image uploaded successfully!', 'success');
    } catch (err: any) {
      onAddToast(err.message || 'Image upload failed', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BlogCategory>('Real Estate News');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');
  const [author, setAuthor] = useState('');
  const [tagsText, setTagsText] = useState('');

  const handleOpenAdd = () => {
    setEditingProjectNull();
    setTitle('');
    setCategory('Real Estate News');
    setSummary('');
    setContent('');
    setImage('');
    setAuthor('J. K. Rama Rao');
    setTagsText('Real Estate, Property, AP RERA');
    setModalOpen(true);
  };

  const setEditingProjectNull = () => {
    setEditingBlog(null);
  };

  const handleOpenEdit = (blog: Blog) => {
    setEditingBlog(blog);
    setTitle(blog.title);
    setCategory(blog.category);
    setSummary(blog.summary);
    setContent(blog.content);
    setImage(blog.image);
    setAuthor(blog.author);
    setTagsText(blog.tags.join(', '));
    setModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (await onConfirm(`Are you sure you want to delete article "${name}"?`)) {
      try {
        await deleteBlog(id);
        onAddToast(`Article "${name}" deleted.`, 'success');
        onRefresh();
      } catch (error) {
        onAddToast('Failed to delete article.', 'error');
      }
    }
  };

  const generateSlug = (str: string) => {
    return str.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !summary.trim() || !author.trim()) {
      onAddToast('Please fill out all mandatory fields', 'error');
      return;
    }

    const tagsArray = tagsText.split(',').map(tag => tag.trim()).filter(Boolean);

    const blogData: Blog = {
      id: editingBlog ? editingBlog.id : 'b_' + Date.now(),
      title,
      slug: editingBlog ? editingBlog.slug : generateSlug(title),
      category,
      summary,
      content,
      image: image || '',
      author,
      tags: tagsArray,
      date: editingBlog ? editingBlog.date : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    };

    try {
      if (editingBlog) {
        await updateBlog(blogData);
        onAddToast(`Article "${title}" updated successfully.`, 'success');
      } else {
        await addBlog(blogData);
        onAddToast(`New article "${title}" published successfully.`, 'success');
      }
      setModalOpen(false);
      onRefresh();
    } catch (error) {
      onAddToast('Failed to save article.', 'error');
    }
  };

  const columns: ALVColumn[] = [
    {
      key: 'image',
      label: 'Cover',
      sortable: false,
      width: '80px',
      render: (_v, row) => (
        <div style={{ width: '60px', height: '40px', borderRadius: '4px', overflow: 'hidden' }}>
          <img src={String(row.image || '')} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ),
    },
    {
      key: 'title',
      label: 'Title',
      render: (_v, row) => (
        <span className="font-semibold" style={{ maxWidth: '300px', display: 'block' }}>{String(row.title)}</span>
      ),
    },
    { key: 'category', label: 'Category' },
    {
      key: 'author',
      label: 'Author',
      render: (_v, row) => (
        <span className="flex align-center gap-0.5 font-semibold text-muted">
          <User size={14} /> {String(row.author)}
        </span>
      ),
    },
    { key: 'date', label: 'Date' },
    {
      key: '__actions',
      label: 'Actions',
      sortable: false,
      width: '90px',
      align: 'center',
      render: (_v, row) => (
        <div className="admin-table-actions" style={{ justifyContent: 'center' }}>
          <button
            onClick={() => handleOpenEdit(row as unknown as Blog)}
            className="alv-toolbar-btn"
            title="Edit"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => handleDelete(String(row.id), String(row.title))}
            className="alv-toolbar-btn"
            title="Delete"
            style={{ color: '#dc2626', borderColor: '#dc2626' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="admin-blogs-view">
      <ALVGrid
        title="Manage Blogs & News"
        subtitle={`${blogs.length} article${blogs.length !== 1 ? 's' : ''}`}
        columns={columns}
        data={blogs as unknown as Record<string, unknown>[]}
        rowKey="id"
        onAdd={handleOpenAdd}
        addLabel="Publish Post"
        onRefresh={onRefresh}
        searchPlaceholder="Search articles..."
        emptyText="No blog articles found."
      />

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <h3 className="p-3 bg-light-soft border-bottom-title" style={{ margin: 0 }}>
              {editingBlog ? `Edit Article: ${editingBlog.title}` : 'Publish New Blog Post'}
            </h3>
            
            <form onSubmit={handleSubmit} className="p-3">
              <div className="form-group">
                <label className="form-label">Article Title *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-2 gap-2">
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select 
                    className="form-control" 
                    value={category}
                    onChange={e => setCategory(e.target.value as BlogCategory)}
                  >
                    <option value="Real Estate News">Real Estate News</option>
                    <option value="Property Updates">Property Updates</option>
                    <option value="Investment Guides">Investment Guides</option>
                    <option value="Company News">Company News</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Author Name *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={author}
                    onChange={e => setAuthor(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Cover Image</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="https://... or upload local file"
                    value={image}
                    onChange={e => setImage(e.target.value)}
                    style={{ marginBottom: 0, flex: 1 }}
                  />
                  <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    {uploadingImage ? 'Uploading...' : 'Upload'}
                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploadingImage} />
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tags (Comma-separated)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Vizag, Investment, VMRDA" 
                  value={tagsText}
                  onChange={e => setTagsText(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Summary / Short Pitch *</label>
                <textarea 
                  className="form-control" 
                  rows={2} 
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Body Content * (Markdown elements supported)</label>
                <textarea 
                  className="form-control" 
                  rows={8} 
                  placeholder="Use ### for subheadings and paragraphs for spaces..." 
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-outline btn-sm">Cancel</button>
                <button type="submit" className="btn btn-secondary btn-sm">Publish Article</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
