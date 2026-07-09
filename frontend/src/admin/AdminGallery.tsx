import React, { useState } from 'react';
import type { GalleryItem, GalleryCategory, Project } from '../types';
import { Plus, Trash2, Edit2, FileVideo, ImageIcon } from 'lucide-react';
import { addGalleryItem, updateGalleryItem, deleteGalleryItem, uploadImage } from '../utils/db';

interface AdminGalleryProps {
  gallery: GalleryItem[];
  projects: Project[];
  marketing: Project[];
  mediaType: 'projects' | 'marketing';
  onRefresh: () => void;
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

export const AdminGallery: React.FC<AdminGalleryProps> = ({
  gallery,
  projects,
  marketing,
  mediaType,
  onRefresh,
  onAddToast,
  onConfirm
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GalleryCategory>('Project Photos');
  const [type, setType] = useState<'image' | 'video'>('image');
  const [url, setUrl] = useState('');
  const [projectAssociation, setProjectAssociation] = useState('');
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);

  // Upload state
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingMedia(true);
    try {
      const moduleName = mediaType === 'marketing' ? 'MVA' : 'PVA';
      const uploadedUrl = await uploadImage(file, moduleName);
      setUrl(uploadedUrl);
      
      // Auto-detect video vs image type
      const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(file.name);
      if (isVideo) {
        setType('video');
        setCategory('Project Videos');
      } else {
        setType('image');
      }

      onAddToast('Media file uploaded successfully!', 'success');
    } catch (err: any) {
      onAddToast(err.message || 'Media file upload failed', 'error');
    } finally {
      setUploadingMedia(false);
    }
  };

  // Filter gallery by type
  const isMarketing = mediaType === 'marketing';
  const associatedIds = new Set(
    (isMarketing ? marketing : projects).map(p => p.id)
  );

  const filteredGallery = gallery.filter(item => {
    if (isMarketing) {
      return item.projectAssociation === 'marketing_general' || associatedIds.has(item.projectAssociation || '');
    } else {
      return !item.projectAssociation || item.projectAssociation === 'project_general' || associatedIds.has(item.projectAssociation);
    }
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setTitle('');
    setCategory(isMarketing ? 'Event Photos' : 'Project Photos');
    setType('image');
    setUrl('');
    setProjectAssociation(isMarketing ? 'marketing_general' : 'project_general');
    setModalOpen(true);
  };

  const handleOpenEdit = (item: GalleryItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setCategory(item.category as GalleryCategory);
    setType(item.type);
    setUrl(item.url);
    setProjectAssociation(item.projectAssociation || (isMarketing ? 'marketing_general' : 'project_general'));
    setModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (await onConfirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteGalleryItem(id);
        onAddToast(`Media "${name}" deleted.`, 'success');
        onRefresh();
      } catch (error) {
        onAddToast('Failed to delete gallery item.', 'error');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) {
      onAddToast('Please fill out all mandatory fields', 'error');
      return;
    }

    const itemData: GalleryItem = {
      id: editingItem ? editingItem.id : 'g_' + Date.now(),
      title,
      category,
      type,
      url,
      thumbnail: type === 'video' ? '' : undefined,
      projectAssociation: projectAssociation || (isMarketing ? 'marketing_general' : 'project_general'),
      date: editingItem ? editingItem.date : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    };

    try {
      if (editingItem) {
        await updateGalleryItem(itemData);
        onAddToast(`Media "${title}" updated successfully.`, 'success');
      } else {
        await addGalleryItem(itemData);
        onAddToast(`Media "${title}" added successfully.`, 'success');
      }
      setModalOpen(false);
      onRefresh();
    } catch (error) {
      onAddToast(editingItem ? 'Failed to update media.' : 'Failed to upload media.', 'error');
    }
  };

  const sectionTitle = isMarketing ? 'Marketing Visual Assets' : 'Project Visual Assets';
  const associatedProjects = isMarketing ? marketing : projects;

  const projectCategories: GalleryCategory[] = isMarketing
    ? ['Event Photos', 'Project Photos', 'Project Videos', 'Construction Progress Updates']
    : ['Project Photos', 'Project Videos', 'Construction Progress Updates', 'Event Photos'];

  return (
    <div className="admin-gallery-view">
      <div className="flex justify-between align-center mb-3">
        <h2>{sectionTitle}</h2>
        <button onClick={handleOpenAdd} className="btn btn-secondary btn-sm flex align-center gap-0.5">
          <Plus size={16} /> Upload Media
        </button>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table text-sm">
          <thead>
            <tr>
              <th>Preview</th>
              <th>Title</th>
              <th>Category</th>
              <th>Type</th>
              <th>Uploaded Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredGallery.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No media found for {sectionTitle}.
                </td>
              </tr>
            ) : (
              filteredGallery.map(item => (
                <tr key={item.id}>
                  <td>
                    <div style={{ width: '60px', height: '40px', borderRadius: '4px', overflow: 'hidden' }}>
                      {item.type === 'video' && !item.thumbnail ? (
                        <video src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} preload="metadata" muted playsInline />
                      ) : (
                        <img src={item.type === 'video' ? item.thumbnail : item.url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                    </div>
                  </td>
                  <td className="font-semibold">{item.title}</td>
                  <td>{item.category}</td>
                  <td>
                    <span className="flex align-center gap-0.5 font-bold uppercase text-secondary">
                      {item.type === 'video' ? <FileVideo size={14} /> : <ImageIcon size={14} />} {item.type}
                    </span>
                  </td>
                  <td>{item.date}</td>
                  <td>
                    <button 
                      onClick={() => handleOpenEdit(item)}
                      className="btn btn-sm btn-outline btn-icon-only"
                      style={{ marginRight: '0.4rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id, item.title)}
                      className="btn btn-sm btn-outline btn-icon-only"
                      style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="p-3 bg-light-soft border-bottom-title" style={{ margin: 0 }}>
              {editingItem ? 'Edit' : 'Add'} {isMarketing ? 'Marketing' : 'Project'} Media
            </h3>
            <form onSubmit={handleSubmit} className="p-3">
              <div className="form-group">
                <label className="form-label">Media Title *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Grand Entrance View..." 
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
                    onChange={e => setCategory(e.target.value as GalleryCategory)}
                  >
                    {projectCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Media Type *</label>
                  <select 
                    className="form-control" 
                    value={type}
                    onChange={e => setType(e.target.value as 'image' | 'video')}
                  >
                    <option value="image">Photograph (Image)</option>
                    <option value="video">Drone Walkthrough (Video MP4)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Media URL *</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="https://... or upload local file" 
                    value={url}
                    onChange={e => {
                      const val = e.target.value;
                      setUrl(val);
                      if (/\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i.test(val)) {
                        setType('video');
                        setCategory('Project Videos');
                      }
                    }}
                    required
                    style={{ marginBottom: 0, flex: 1 }}
                  />
                  <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    {uploadingMedia ? 'Uploading...' : 'Upload'}
                    <input type="file" accept="image/*,video/*" onChange={handleMediaUpload} style={{ display: 'none' }} disabled={uploadingMedia} />
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Associated {isMarketing ? 'Marketing Project' : 'Project'}
                </label>
                <select 
                  className="form-control" 
                  value={projectAssociation}
                  onChange={e => setProjectAssociation(e.target.value)}
                >
                  <option value={isMarketing ? 'marketing_general' : 'project_general'}>None / General</option>
                  {associatedProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-outline btn-sm">Cancel</button>
                <button type="submit" className="btn btn-secondary btn-sm">{editingItem ? 'Update Media' : 'Save Media'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
