import React, { useState } from 'react';
import type { Project, ProjectCategory, ProjectStatus, City, LocationMaster, PropertyType, Facing, Amenity } from '../types';
import { 
  Edit2, Trash2, CheckCircle2, XCircle, X, 
  Building2, MapPin, Compass, Layers, Home, 
  IndianRupee, Image, FileText, Sparkles, Upload, 
  Maximize2, Share2
} from 'lucide-react';
import { addProject, updateProject, deleteProject, uploadMultipleImages } from '../utils/db';
import { ALVGrid } from './ALVGrid';
import type { ALVColumn } from './ALVGrid';
import { SocialSharePreview } from './SocialSharePreview';
import { useCompany } from '../context/CompanyContext';

interface AdminProjectsProps {
  projects: Project[];
  cities: City[];
  locations: LocationMaster[];
  propertyTypes: PropertyType[];
  facings: Facing[];
  amenities: Amenity[];
  onRefresh: () => void;
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

export const AdminProjects: React.FC<AdminProjectsProps> = ({
  projects,
  cities,
  locations,
  propertyTypes,
  facings,
  amenities,
  onRefresh,
  onAddToast,
  onConfirm
}) => {
  const { profile } = useCompany();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [autoPostSocial, setAutoPostSocial] = useState(true);
  const [showSharePreview, setShowSharePreview] = useState(false);
  const [sharePreviewData, setSharePreviewData] = useState<any>(null);

  // Record Sharing States
  const [sharingProperty, setSharingProperty] = useState<Project | null>(null);
  const [shareMapEnabled, setShareMapEnabled] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<Project[]>([]);
  const [sharingSelectedModal, setSharingSelectedModal] = useState(false);
  
  // Upload states
  const [uploadingSpec, setUploadingSpec] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const handleSpecUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingSpec(true);
    try {
      const urls = await uploadMultipleImages(Array.from(e.target.files), 'MP');
      const current = specImage ? specImage.split(',').map(u => u.trim()).filter(Boolean) : [];
      setSpecImage([...current, ...urls].join(', '));
      onAddToast('Blueprint image(s) uploaded successfully!', 'success');
    } catch (err: any) {
      onAddToast(err.message || 'Blueprint upload failed', 'error');
    } finally {
      setUploadingSpec(false);
      e.target.value = '';
    }
  };

  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const currentUrls = imageUrl ? imageUrl.split(',').map(u => u.trim()).filter(Boolean) : [];
    setUploadingImages(true);
    try {
      const urls = await uploadMultipleImages(Array.from(e.target.files), 'MP');
      const combinedUrls = [...currentUrls, ...urls].join(', ');
      setImageUrl(combinedUrls);
      onAddToast(`${urls.length} Property image(s) uploaded successfully!`, 'success');
    } catch (err: any) {
      onAddToast(err.message || 'Images upload failed', 'error');
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  };

  // Helper function to parse availability string (e.g. "2 BHK: 30: 1250: 35, 3 BHK: 20: 1650: 45")
  const parseAvailabilityDetails = (details: string) => {
    const result: { [type: string]: string } = {};
    if (!details) return result;
    details.split(',').forEach(item => {
      const parts = item.split(':');
      if (parts.length >= 2) {
        const type = parts[0].trim();
        const count = parts[1].trim();
        if (type && count !== '') {
          result[type] = count;
        }
      }
    });
    return result;
  };

  const parseAvailabilitySft = (details: string) => {
    const result: { [type: string]: string } = {};
    if (!details) return result;
    details.split(',').forEach(item => {
      const parts = item.split(':');
      if (parts.length >= 4) {
        const type = parts[0].trim();
        const sftVal = parts[2].trim();
        if (type && sftVal !== '') {
          result[type] = sftVal;
        }
      } else if (parts.length === 3) {
        const type = parts[0].trim();
        const val = parts[2].trim();
        if (type && (val.toLowerCase().includes('sft') || val.toLowerCase().includes('sq.ft'))) {
          result[type] = val;
        }
      }
    });
    return result;
  };

  const parseAvailabilityUds = (details: string) => {
    const result: { [type: string]: string } = {};
    if (!details) return result;
    details.split(',').forEach(item => {
      const parts = item.split(':');
      if (parts.length >= 4) {
        const type = parts[0].trim();
        const udsVal = parts[3].trim();
        if (type && udsVal !== '') {
          result[type] = udsVal;
        }
      } else if (parts.length === 3) {
        const type = parts[0].trim();
        const val = parts[2].trim();
        if (type && val !== '' && !val.toLowerCase().includes('sft') && !val.toLowerCase().includes('sq.ft')) {
          result[type] = val;
        }
      }
    });
    return result;
  };

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProjectCategory>('Flats');
  const [subCategory, setSubCategory] = useState<string>('');
  const [classification, setClassification] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('Ongoing');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [priceValue, setPriceValue] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [highlightsText, setHighlightsText] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [lat, setLat] = useState(17.7);
  const [lng, setLng] = useState(83.3);
  const [featured, setFeatured] = useState(false);
  
  // Custom filterable fields
  const [selectedFacings, setSelectedFacings] = useState<string[]>([]);
  const [city, setCity] = useState('Visakhapatnam');
  const [microLocation, setMicroLocation] = useState('');
  const [floors, setFloors] = useState(0);
  const [unitsCount, setUnitsCount] = useState(0);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>([]);
  const [configValues, setConfigValues] = useState<{ [type: string]: string }>({});
  const [configSftValues, setConfigSftValues] = useState<{ [type: string]: string }>({});
  const [configUdsValues, setConfigUdsValues] = useState<{ [type: string]: string }>({});
  const [specImage, setSpecImage] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [brochureUrl, setBrochureUrl] = useState('');
  const [width, setWidth] = useState('');
  const [length, setLength] = useState('');
  const [uds, setUds] = useState('');



  const handleOpenAdd = () => {
    setEditingProject(null);
    setName('');
    setCategory('Flats');
    setSubCategory('');
    setClassification('');
    setStatus('Ongoing');
    setLocation('');
    setDescription('');
    setPriceRange('₹50 L - ₹80 L');
    setPriceValue(5000000);
    setImageUrl('');
    setHighlightsText('Premium apartments\nExcellent security\n24/7 Power backup');
    setSelectedAmenities(['Clubhouse', 'Gymnasium', 'Swimming Pool', 'Gated Security']);
    setLat(17.729);
    setLng(83.303);
    setFeatured(false);
    setAutoPostSocial(true);
    
    setSelectedFacings(['East']);
    setCity(cities.length > 0 ? cities[0].name : 'Visakhapatnam');
    setMicroLocation('');
    setFloors(5);
    setUnitsCount(50);
    setSelectedPropertyTypes(['2 BHK', '3 BHK']);
    setConfigValues({ '2 BHK': '20', '3 BHK': '30' });
    setConfigSftValues({ '2 BHK': '', '3 BHK': '' });
    setConfigUdsValues({ '2 BHK': '', '3 BHK': '' });
    setSpecImage('');
    setVideoUrl('');
    setBrochureUrl('');
    setWidth('');
    setLength('');
    setUds('');
    setModalOpen(true);
  };

  const handleOpenEdit = (proj: Project) => {
    setEditingProject(proj);
    setName(proj.name);
    setCategory(proj.category);
    setSubCategory(proj.subCategory || '');
    setClassification(proj.classification || '');
    setStatus(proj.status);
    setLocation(proj.location);
    setDescription(proj.description);
    setPriceRange(proj.priceRange);
    setPriceValue(proj.priceValue);
    setImageUrl(proj.images.join(', '));
    setHighlightsText(proj.highlights.join('\n'));
    setSelectedAmenities(proj.amenities || []);
    setLat(proj.mapCoordinates.lat);
    setLng(proj.mapCoordinates.lng);
    setFeatured(proj.featured);
    setAutoPostSocial(true);
    
    const initialFacings = proj.facing 
      ? proj.facing.split(',').map(f => f.trim()).filter(Boolean) 
      : [];
    setSelectedFacings(initialFacings);
    
    setCity(proj.city || 'Visakhapatnam');
    setMicroLocation(proj.microLocation || '');
    setFloors(proj.floors || 0);
    setUnitsCount(proj.unitsCount || 0);
    
    const parsedValues = parseAvailabilityDetails(proj.availabilityDetails || '');
    const parsedSftValues = parseAvailabilitySft(proj.availabilityDetails || '');
    const parsedUdsValues = parseAvailabilityUds(proj.availabilityDetails || '');
    setSelectedPropertyTypes(Object.keys(parsedValues));
    setConfigValues(parsedValues);
    setConfigSftValues(parsedSftValues);
    setConfigUdsValues(parsedUdsValues);
    
    setSpecImage(proj.specImage || '');
    setVideoUrl(proj.videos && proj.videos.length > 0 ? proj.videos.join(', ') : '');
    setBrochureUrl(proj.brochureUrl && proj.brochureUrl !== '#' ? proj.brochureUrl : '');
    setWidth(proj.width || '');
    setLength(proj.length || '');
    setUds(proj.uds || '');
    setModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (await onConfirm(`Are you sure you want to delete "${name}"? This will also remove any related visual gallery entries.`)) {
      try {
        await deleteProject(id);
        onAddToast(`Project "${name}" has been deleted.`, 'success');
        onRefresh();
      } catch (error) {
        onAddToast('Failed to delete project.', 'error');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim() || !description.trim()) {
      onAddToast('Please fill in all mandatory fields', 'error');
      return;
    }

    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      onAddToast('Latitude must be a valid number between -90 and 90', 'error');
      return;
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      onAddToast('Longitude must be a valid number between -180 and 180', 'error');
      return;
    }

    const priceVal = Number(priceValue);
    if (isNaN(priceVal) || priceVal < 0) {
      onAddToast('Price Value must be a valid positive number', 'error');
      return;
    }

    const floorsNum = Number(floors);
    if (isNaN(floorsNum) || floorsNum < 0) {
      onAddToast('Floors must be a valid positive number', 'error');
      return;
    }

    const unitsNum = Number(unitsCount);
    if (isNaN(unitsNum) || unitsNum < 0) {
      onAddToast('Units Count must be a valid positive number', 'error');
      return;
    }

    if (category === 'Sites') {
      if (width && (isNaN(Number(width)) || Number(width) <= 0)) {
        onAddToast('Width must be a positive number', 'error');
        return;
      }
      if (length && (isNaN(Number(length)) || Number(length) <= 0)) {
        onAddToast('Length must be a positive number', 'error');
        return;
      }
    }
    if (category === 'Sites' && uds && (isNaN(Number(uds)) || Number(uds) <= 0)) {
      onAddToast('Total Sq. Yards must be a positive number', 'error');
      return;
    }

    // Split inputs
    const imagesArray = imageUrl.split(',').map(url => url.trim()).filter(Boolean);
    const highlightsArray = highlightsText.split('\n').map(h => h.trim()).filter(Boolean);

    // Serialize multi-select fields
    const facingString = selectedFacings.join(', ');
    const availabilityString = selectedPropertyTypes
      .map(type => {
        const val = configValues[type] !== undefined ? configValues[type] : '0';
        const sftVal = configSftValues[type] !== undefined ? configSftValues[type] : '';
        const udsVal = configUdsValues[type] !== undefined ? configUdsValues[type] : '';
        return `${type}: ${val}: ${sftVal}: ${udsVal}`;
      })
      .join(', ');

    const projectData: Project = {
      id: editingProject ? editingProject.id : 'p_' + Date.now(),
      name,
      category,
      subCategory: subCategory || undefined,
      status,
      location,
      description,
      images: imagesArray,
      videos: videoUrl.split(',').map(v => v.trim()).filter(Boolean),
      highlights: highlightsArray,
      amenities: selectedAmenities,
      timeline: editingProject ? editingProject.timeline : [
        { id: 't_init', date: 'Jan 2026', title: 'Project Scaffolding', desc: 'Ground breaking ceremony and excavation starting.' }
      ],
      floorPlans: (() => {
        const plans = editingProject ? [...editingProject.floorPlans] : [
          { id: 'f_init', title: 'Master Layout Plan', image: specImage || '' }
        ];
        if (plans.length > 0 && plans[0].id === 'f_init') {
          plans[0] = { ...plans[0], image: specImage || '' };
        }
        return plans;
      })(),
      priceRange,
      priceValue: Number(priceValue) || 0,
      paymentPlans: editingProject ? editingProject.paymentPlans : ['Booking Advance: 2%', 'Agreement: 25%', 'Registration: 73%'],
      mapCoordinates: { lat: Number(lat) || 17.7, lng: Number(lng) || 83.3 },
      brochureUrl: brochureUrl.trim() || '#',
      featured,
      facing: facingString,
      city,
      microLocation,
      floors: Number(floors) || 0,
      unitsCount: Number(unitsCount) || 0,
      availabilityDetails: availabilityString,
      specImage: specImage || '',
      width: category === 'Sites' ? width : undefined,
      length: category === 'Sites' ? length : undefined,
      uds: (category === 'Flats' || category === 'Sites') ? uds : undefined,
      classification: classification || undefined,
      autoPostSocial
    };

    try {
      if (editingProject) {
        await updateProject(projectData);
        onAddToast(`Project "${name}" updated successfully.`, 'success');
      } else {
        await addProject(projectData);
        onAddToast(`New project "${name}" added successfully.`, 'success');
      }
      setModalOpen(false);
      onRefresh();

      if (autoPostSocial) {
        setSharePreviewData({
          propertyName: name,
          category,
          location,
          city,
          priceRange,
          description,
          imageUrl,
          isMarketing: false
        });
        setShowSharePreview(true);
      }
    } catch (error: any) {
      onAddToast(error?.message || 'Failed to save project.', 'error');
    }
  };

  const projectColumns: ALVColumn[] = [
    { key: 'name',       label: 'Project Name', render: (_v, row) => <strong style={{color:'#1d2d3e'}}>{String(row.name)}</strong> },
    { key: 'category',  label: 'Category',     render: (_v, row) => {
      const r = row as any;
      return (
        <span>
          <span style={{fontWeight:600, color:'var(--secondary)'}}>{String(r.category)}</span>
          {r.subCategory && <span style={{fontSize:'0.72rem',color:'#888',marginLeft:'4px'}}>({String(r.subCategory)})</span>}
          {r.classification && (
            <div style={{ fontSize: '0.75rem', color: '#0ea5e9', fontWeight: 600, marginTop: '2px' }}>{String(r.classification)}</div>
          )}
        </span>
      );
    }},
    { key: 'location',  label: 'Location' },
    { key: 'priceRange',label: 'Price Range' },
    { key: 'status',    label: 'Status', render: (_v, row) => (
      <span className={`badge badge-${String(row.status).toLowerCase()}`}>{String(row.status)}</span>
    )},
    { key: 'featured',  label: 'Featured', align: 'center', render: (_v, row) => (
      row.featured
        ? <span style={{color:'#1e7e34',display:'flex',alignItems:'center',gap:'4px',justifyContent:'center'}}><CheckCircle2 size={14}/> Yes</span>
        : <span style={{color:'#888',display:'flex',alignItems:'center',gap:'4px',justifyContent:'center'}}><XCircle size={14}/> No</span>
    )},
    { key: '__actions', label: 'Actions', sortable: false, width: '120px', align: 'center', render: (_v, row) => (
      <div className="admin-table-actions" style={{justifyContent:'center', display: 'flex', gap: '4px'}}>
        <button onClick={() => { setSharingProperty(row as unknown as Project); setShareMapEnabled(false); }} className="alv-toolbar-btn" title="Share Property Link" style={{ color: '#2563eb', borderColor: '#2563eb' }}><Share2 size={13}/></button>
        <button onClick={() => handleOpenEdit(row as unknown as Project)} className="alv-toolbar-btn" title="Edit"><Edit2 size={13}/></button>
        <button onClick={() => handleDelete(String(row.id), String(row.name))} className="alv-toolbar-btn" title="Delete" style={{color:'#dc2626',borderColor:'#dc2626'}}><Trash2 size={13}/></button>
      </div>
    )},
  ];

  return (
    <div className="admin-projects-view">
      <ALVGrid
        title="Manage Projects"
        subtitle={`${projects.length} property listing${projects.length !== 1 ? 's' : ''}`}
        columns={projectColumns}
        data={projects as unknown as Record<string, unknown>[]}
        rowKey="id"
        onAdd={handleOpenAdd}
        addLabel="Add Project"
        onRefresh={onRefresh}
        onSelectionChange={(rows) => setSelectedProjects(rows as unknown as Project[])}
        extraToolbarActions={
          selectedProjects.length > 0 ? (
            <button 
              className="alv-toolbar-btn active" 
              onClick={() => setSharingSelectedModal(true)}
              title="Share Selected Projects"
              style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0 10px', height: '28px', fontSize: '0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
            >
              <Share2 size={13} /> Share Selected ({selectedProjects.length})
            </button>
          ) : undefined
        }
        searchPlaceholder="Search by name, location, status..."
        emptyText="No projects found. Click + Add Project to create one."
      />

      {/* Modal Form */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content premium-admin-modal" style={{ maxWidth: '1020px', width: '98%', maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header-premium">
              <div>
                <h3 className="modal-title">
                  {editingProject ? 'Edit Property Details' : 'Create New Property'}
                </h3>
                {editingProject && <p className="modal-subtitle">Updating: <strong>{editingProject.name}</strong></p>}
              </div>
              <button 
                type="button"
                className="btn-close-modal" 
                onClick={() => setModalOpen(false)} 
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form-premium" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>

              <div className="modal-body-premium" style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Two-column layout: left = core fields, right = media/details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                  {/* LEFT COLUMN */}
                  <div>
                {/* Section 1: Basic Specifications */}
                <div className="modal-section-title" style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.3rem', marginBottom: '1.25rem' }}>Basic Specifications</div>
                
                <div className="grid grid-2 gap-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label font-bold" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.75px', marginBottom: '6px' }}>Project Name *</label>
                    <div style={{ position: 'relative' }}>
                      <Building2 size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input 
                        type="text" 
                        className="form-control" 
                        style={{ paddingLeft: '2.5rem', width: '100%', padding: '0.65rem 0.9rem 0.65rem 2.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', boxSizing: 'border-box' }}
                        placeholder="Enter project name..." 
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label font-bold" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.75px', marginBottom: '6px' }}>Status *</label>
                    <div style={{ position: 'relative' }}>
                      <Compass size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 10 }} />
                      <select 
                        className="form-control" 
                        style={{ paddingLeft: '2.5rem', width: '100%', padding: '0.65rem 0.9rem 0.65rem 2.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', boxSizing: 'border-box' }}
                        value={status}
                        onChange={e => setStatus(e.target.value as ProjectStatus)}
                      >
                        <option value="Ongoing">Ongoing</option>
                        <option value="Upcoming">Upcoming</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-3 gap-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label font-bold" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.75px', marginBottom: '6px' }}>Main Category *</label>
                    <select 
                      className="form-control" 
                      style={{ width: '100%', padding: '0.65rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', boxSizing: 'border-box' }}
                      value={category}
                      onChange={e => {
                        const newCat = e.target.value as ProjectCategory;
                        setCategory(newCat);
                        setSubCategory('');
                        setSelectedPropertyTypes([]);
                        setConfigValues({});
                        setConfigUdsValues({});
                      }}
                    >
                      <option value="Flats">Flats</option>
                      <option value="Villas">Villas</option>
                      <option value="Individual Houses">Individual Houses</option>
                      <option value="Sites">Sites / Plots</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label font-bold" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.75px', marginBottom: '6px' }}>Sub-category *</label>
                    {category === 'Sites' ? (
                      <select 
                        className="form-control" 
                        style={{ width: '100%', padding: '0.65rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', boxSizing: 'border-box' }}
                        value={subCategory}
                        onChange={e => setSubCategory(e.target.value)}
                        required
                      >
                        <option value="">Select Sub-category</option>
                        <option value="Development Sites">Development Sites</option>
                        <option value="Panchayati Approved Sites">Panchayati Approved Sites</option>
                        <option value="VUDA / VMRDA Approved Sites">VUDA / VMRDA Approved Sites</option>
                        <option value="Ventures">Ventures</option>
                      </select>
                    ) : (category === 'Flats' || category === 'Villas' || category === 'Individual Houses' || category === 'Duplex') ? (
                      <select 
                        className="form-control" 
                        style={{ width: '100%', padding: '0.65rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', boxSizing: 'border-box' }}
                        value={subCategory}
                        onChange={e => setSubCategory(e.target.value)}
                        required
                      >
                        <option value="">Select Sub-category</option>
                        <option value="Under Construction">Under Construction</option>
                        <option value="Ready to Move">Ready to Move</option>
                      </select>
                    ) : (
                      <input className="form-control" style={{ width: '100%', padding: '0.65rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#e2e8f0', color: '#94a3b8', cursor: 'not-allowed', boxSizing: 'border-box' }} disabled value="N/A" />
                    )}
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label font-bold" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.75px', marginBottom: '6px' }}>Classification *</label>
                    <select
                      className="form-control"
                      style={{ width: '100%', padding: '0.65rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', boxSizing: 'border-box' }}
                      value={classification}
                      onChange={e => setClassification(e.target.value)}
                      required
                    >
                      <option value="">Select Classification</option>
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Semi Commercial">Semi Commercial</option>
                    </select>
                  </div>
                </div>

                {category === 'Sites' && (
                  <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem', marginTop: '0.5rem' }}>
                    <legend style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '0 6px' }}>Plot Dimension Specs</legend>
                    <div className="grid grid-2 gap-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label font-bold" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>Site Width (ft) *</label>
                        <div style={{ position: 'relative' }}>
                          <Maximize2 size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                          <input
                            type="text"
                            className="form-control"
                            style={{ paddingLeft: '2.25rem', width: '100%', padding: '0.45rem 0.65rem 0.45rem 2.25rem', border: '1.5px solid #e2e8f0', borderRadius: '6px', fontSize: '0.82rem', boxSizing: 'border-box' }}
                            placeholder="e.g. 30"
                            value={width}
                            onChange={e => {
                              const newWidth = e.target.value;
                              setWidth(newWidth);
                              const w = parseFloat(newWidth);
                              const l = parseFloat(length);
                              if (!isNaN(w) && !isNaN(l)) {
                                setUds(String(Math.round((w * l / 9) * 100) / 100));
                              }
                            }}
                            required
                          />
                        </div>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label font-bold" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>Site Length (ft) *</label>
                        <div style={{ position: 'relative' }}>
                          <Maximize2 size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                          <input
                            type="text"
                            className="form-control"
                            style={{ paddingLeft: '2.25rem', width: '100%', padding: '0.45rem 0.65rem 0.45rem 2.25rem', border: '1.5px solid #e2e8f0', borderRadius: '6px', fontSize: '0.82rem', boxSizing: 'border-box' }}
                            placeholder="e.g. 40"
                            value={length}
                            onChange={e => {
                              const newLength = e.target.value;
                              setLength(newLength);
                              const w = parseFloat(width);
                              const l = parseFloat(newLength);
                              if (!isNaN(w) && !isNaN(l)) {
                                setUds(String(Math.round((w * l / 9) * 100) / 100));
                              }
                            }}
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, marginTop: '0.75rem' }}>
                      <label className="form-label font-bold" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>Total Sq. Yards *</label>
                      <div style={{ position: 'relative' }}>
                        <Layers size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                          type="text"
                          className="form-control"
                          style={{ paddingLeft: '2.25rem', width: '100%', padding: '0.45rem 0.65rem 0.45rem 2.25rem', border: '1.5px solid #e2e8f0', borderRadius: '6px', fontSize: '0.82rem', boxSizing: 'border-box' }}
                          placeholder="Calculated automatically, or enter manually"
                          value={uds}
                          onChange={e => setUds(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </fieldset>
                )}

                {/* Overall UDS field removed for Flats as requested */}

                    {/* Section 2: Location & Address */}
                    <div className="modal-section-title" style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.3rem', marginBottom: '1rem', marginTop: '1rem' }}>Location & Address</div>
                
                <div className="grid grid-2 gap-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label font-bold" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.75px', marginBottom: '6px' }}>City Location *</label>
                    <select 
                      className="form-control" 
                      style={{ width: '100%', padding: '0.65rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', boxSizing: 'border-box' }}
                      value={city}
                      onChange={e => {
                        setCity(e.target.value);
                        setMicroLocation('');
                      }}
                      required
                    >
                      <option value="">Select City</option>
                      {cities.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label font-bold" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.75px', marginBottom: '6px' }}>Micro Location Area *</label>
                    <select 
                      className="form-control" 
                      style={{ width: '100%', padding: '0.65rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: city ? '#f8fafc' : '#e2e8f0', color: city ? 'inherit' : '#94a3b8', cursor: city ? 'pointer' : 'not-allowed', boxSizing: 'border-box' }}
                      value={microLocation}
                      onChange={e => setMicroLocation(e.target.value)}
                      required
                      disabled={!city}
                    >
                      <option value="">Select Location</option>
                      {locations
                        .filter(l => {
                          const cityObj = cities.find(c => c.name === city);
                          return cityObj ? l.cityId === cityObj.id : false;
                        })
                        .map(l => (
                          <option key={l.id} value={l.name}>{l.name}</option>
                        ))}
                    </select>
                    {!city && <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '4px' }}>Select city first</div>}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label font-bold" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.75px', marginBottom: '6px' }}>Facing Directions * (Select multiple)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem', marginTop: '0.4rem', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                    {(facings && facings.length > 0 ? facings : [
                      { id: 'df1', name: 'East' },
                      { id: 'df2', name: 'West' },
                      { id: 'df3', name: 'North' },
                      { id: 'df4', name: 'South' },
                      { id: 'df5', name: 'North East' },
                      { id: 'df6', name: 'North West' }
                    ]).map(f => {
                      const isChecked = selectedFacings.includes(f.name);
                      return (
                        <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#374151', userSelect: 'none' }}>
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFacings(prev => [...prev, f.name]);
                              } else {
                                setSelectedFacings(prev => prev.filter(item => item !== f.name));
                              }
                            }}
                            style={{ width: '16px', height: '16px', margin: 0 }}
                          />
                          {f.name}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label font-bold" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.75px', marginBottom: '6px' }}>Location Address *</label>
                  <div style={{ position: 'relative' }}>
                    <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ paddingLeft: '2.5rem', width: '100%', padding: '0.65rem 0.9rem 0.65rem 2.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', boxSizing: 'border-box' }}
                      placeholder="e.g. Madhurawada, Visakhapatnam" 
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-2 gap-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label font-bold" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.75px', marginBottom: '6px' }}>Latitude Offset</label>
                    <div style={{ position: 'relative' }}>
                      <Compass size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input 
                        type="number" 
                        step="0.0001" 
                        className="form-control" 
                        style={{ paddingLeft: '2.5rem', width: '100%', padding: '0.65rem 0.9rem 0.65rem 2.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', boxSizing: 'border-box' }}
                        value={lat}
                        onChange={e => setLat(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label font-bold" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.75px', marginBottom: '6px' }}>Longitude Offset</label>
                    <div style={{ position: 'relative' }}>
                      <Compass size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input 
                        type="number" 
                        step="0.0001" 
                        className="form-control" 
                        style={{ paddingLeft: '2.5rem', width: '100%', padding: '0.65rem 0.9rem 0.65rem 2.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', boxSizing: 'border-box' }}
                        value={lng}
                        onChange={e => setLng(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                    {/* Section 3: Configurations & Pricing */}
                    <div className="modal-section-title" style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.3rem', marginBottom: '1rem', marginTop: '1rem' }}>Configurations & Pricing</div>
                
                <div className="grid grid-2 gap-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label font-bold" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.75px', marginBottom: '6px' }}>Total Floors</label>
                    <div style={{ position: 'relative' }}>
                      <Layers size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input 
                        type="number" 
                        className="form-control" 
                        style={{ paddingLeft: '2.5rem', width: '100%', padding: '0.65rem 0.9rem 0.65rem 2.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', boxSizing: 'border-box' }}
                        placeholder="e.g. 5" 
                        value={floors}
                        onChange={e => setFloors(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label font-bold" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.75px', marginBottom: '6px' }}>Total Units Count</label>
                    <div style={{ position: 'relative' }}>
                      <Home size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input 
                        type="number" 
                        className="form-control" 
                        style={{ paddingLeft: '2.5rem', width: '100%', padding: '0.65rem 0.9rem 0.65rem 2.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', boxSizing: 'border-box' }}
                        placeholder="e.g. 120" 
                        value={unitsCount}
                        onChange={e => setUnitsCount(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label font-bold" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.75px', marginBottom: '6px' }}>BHK / Plot Configurations * (Check config to enable quantity, SFT &amp; UDS)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem', marginTop: '0.4rem', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                    {(propertyTypes && propertyTypes.length > 0 ? propertyTypes : [
                      { id: 'dpt1', name: '1 BHK' },
                      { id: 'dpt2', name: '2 BHK' },
                      { id: 'dpt3', name: '3 BHK' },
                      { id: 'dpt4', name: '4 BHK' },
                      { id: 'dpt5', name: 'Plots' },
                      { id: 'dpt6', name: 'Villa' }
                    ]).filter(pt => category === 'Sites' ? pt.name === 'Plots' : pt.name !== 'Plots').map(pt => {
                      const isChecked = selectedPropertyTypes.includes(pt.name);
                      const countValue = configValues[pt.name] !== undefined ? configValues[pt.name] : '';
                      return (
                        <div key={pt.id} style={{ display: 'flex', flexFlow: 'row wrap', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.25rem', borderBottom: '1px dashed rgba(0,0,0,0.05)' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#374151', minWidth: '70px', userSelect: 'none' }}>
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPropertyTypes(prev => [...prev, pt.name]);
                                  setConfigValues(prev => ({ ...prev, [pt.name]: '0' }));
                                  setConfigSftValues(prev => ({ ...prev, [pt.name]: '' }));
                                  setConfigUdsValues(prev => ({ ...prev, [pt.name]: '' }));
                                } else {
                                  setSelectedPropertyTypes(prev => prev.filter(item => item !== pt.name));
                                  setConfigValues(prev => {
                                    const next = { ...prev };
                                    delete next[pt.name];
                                    return next;
                                  });
                                  setConfigSftValues(prev => {
                                    const next = { ...prev };
                                    delete next[pt.name];
                                    return next;
                                  });
                                  setConfigUdsValues(prev => {
                                    const next = { ...prev };
                                    delete next[pt.name];
                                    return next;
                                  });
                                }
                              }}
                              style={{ width: '16px', height: '16px', margin: 0 }}
                            />
                            {pt.name}
                          </label>
                          <div style={{ display: 'flex', gap: '0.35rem', flex: 1, minWidth: '210px' }}>
                            <input 
                              type="number"
                              placeholder="Qty"
                              className="form-control"
                              style={{ flex: 1, minWidth: '45px', height: '28px', margin: 0, padding: '0.2rem 0.35rem', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: isChecked ? '#fff' : '#e2e8f0' }}
                              value={countValue}
                              disabled={!isChecked}
                              onChange={(e) => {
                                const val = e.target.value;
                                setConfigValues(prev => ({ ...prev, [pt.name]: val }));
                              }}
                              min="0"
                            />
                            <input 
                              type="text"
                              placeholder="SFT"
                              className="form-control"
                              style={{ flex: 1.2, minWidth: '60px', height: '28px', margin: 0, padding: '0.2rem 0.35rem', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: isChecked ? '#fff' : '#e2e8f0' }}
                              value={configSftValues[pt.name] !== undefined ? configSftValues[pt.name] : ''}
                              disabled={!isChecked}
                              onChange={(e) => {
                                const val = e.target.value;
                                setConfigSftValues(prev => ({ ...prev, [pt.name]: val }));
                              }}
                            />
                            <input 
                              type="text"
                              placeholder="UDS (Sq.Yds)"
                              className="form-control"
                              style={{ flex: 1.4, minWidth: '75px', height: '28px', margin: 0, padding: '0.2rem 0.35rem', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: isChecked ? '#fff' : '#e2e8f0' }}
                              value={configUdsValues[pt.name] !== undefined ? configUdsValues[pt.name] : ''}
                              disabled={!isChecked}
                              onChange={(e) => {
                                const val = e.target.value;
                                setConfigUdsValues(prev => ({ ...prev, [pt.name]: val }));
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-2 gap-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label font-bold" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.75px', marginBottom: '6px' }}>Price Range Text *</label>
                    <div style={{ position: 'relative' }}>
                      <IndianRupee size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input 
                        type="text" 
                        className="form-control" 
                        style={{ paddingLeft: '2.5rem', width: '100%', padding: '0.65rem 0.9rem 0.65rem 2.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', boxSizing: 'border-box' }}
                        placeholder="e.g. ₹55 L - ₹90 L" 
                        value={priceRange}
                        onChange={e => setPriceRange(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label font-bold" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.75px', marginBottom: '6px' }}>Sort Value (Price Number) *</label>
                    <div style={{ position: 'relative' }}>
                      <IndianRupee size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input 
                        type="number" 
                        className="form-control" 
                        style={{ paddingLeft: '2.5rem', width: '100%', padding: '0.65rem 0.9rem 0.65rem 2.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', boxSizing: 'border-box' }}
                        placeholder="e.g. 5500000" 
                        value={priceValue}
                        onChange={e => setPriceValue(Number(e.target.value))}
                        required
                      />
                    </div>
                  </div>
                </div>
                  </div>{/* end LEFT COLUMN */}

                  {/* RIGHT COLUMN */}
                  <div>
                    {/* Section 4: Media & Details */}
                    <div className="modal-section-title" style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.3rem', marginBottom: '1rem', marginTop: '0' }}>Media & Details</div>
                
                {/* Property Images (Photos Upload) */}
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label font-bold" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.75px', marginBottom: '6px' }}>
                    <Image size={15} style={{ color: 'var(--primary)' }} />
                    Property Images (Photos Upload)
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ position: 'relative' }}>
                      <Image size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} />
                      <textarea 
                        className="form-control" 
                        rows={2} 
                        style={{ paddingLeft: '2.5rem', width: '100%', padding: '0.65rem 0.9rem 0.65rem 2.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', boxSizing: 'border-box' }}
                        placeholder="URL1, URL2, URL3... or upload photos below" 
                        value={imageUrl}
                        onChange={e => setImageUrl(e.target.value)}
                      />
                    </div>
                    <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0, alignSelf: 'flex-end', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.45rem 0.85rem', fontSize: '0.8rem', border: '1.5px solid var(--border-color)', borderRadius: '6px', background: 'transparent', color: '#374151' }}>
                      <Upload size={14} />
                      {uploadingImages ? 'Uploading Images...' : 'Upload Photos'}
                      <input type="file" accept="image/*" multiple onChange={handleImagesUpload} style={{ display: 'none' }} disabled={uploadingImages} />
                    </label>
                  </div>
                  {/* Property images preview grid */}
                  {imageUrl && imageUrl.split(',').map(u => u.trim()).filter(Boolean).length > 0 && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {imageUrl.split(',').map(u => u.trim()).filter(Boolean).map((url, idx) => (
                        <div key={idx} style={{ position: 'relative', display: 'inline-flex' }}>
                          <img
                            src={url}
                            alt={`Property image ${idx + 1}`}
                            style={{ height: '72px', width: '100px', objectFit: 'cover', borderRadius: '6px', border: '1.5px solid #e2e8f0' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newUrls = imageUrl.split(',').map(u => u.trim()).filter(Boolean).filter((_, i) => i !== idx).join(', ');
                              setImageUrl(newUrls);
                            }}
                            title="Remove"
                            style={{
                              position: 'absolute', top: '-6px', right: '-6px',
                              background: '#dc2626', color: '#fff', border: 'none',
                              borderRadius: '50%', width: '18px', height: '18px',
                              cursor: 'pointer', fontSize: '10px', display: 'flex',
                              alignItems: 'center', justifyContent: 'center', lineHeight: 1
                            }}
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Blueprint / Specifications Image, Layout PDFs & Videos */}
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label font-bold" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.75px', marginBottom: '6px' }}>
                    <FileText size={15} style={{ color: 'var(--primary)' }} />
                    Blueprint &amp; Floor Layout Images / PDFs / Videos
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ position: 'relative' }}>
                      <FileText size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} />
                      <textarea 
                        className="form-control" 
                        rows={2} 
                        style={{ paddingLeft: '2.5rem', width: '100%', padding: '0.65rem 0.9rem 0.65rem 2.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', boxSizing: 'border-box' }}
                        placeholder="URL1, URL2... or upload blueprint images, PDFs or videos below" 
                        value={specImage}
                        onChange={e => setSpecImage(e.target.value)}
                      />
                    </div>
                    <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0, alignSelf: 'flex-end', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.45rem 0.85rem', fontSize: '0.8rem', border: '1.5px solid var(--border-color)', borderRadius: '6px', background: 'transparent', color: '#374151' }}>
                      <Upload size={14} />
                      {uploadingSpec ? 'Uploading...' : 'Upload Blueprint Images / PDF / Video'}
                      <input type="file" accept="image/*,application/pdf,video/*,.mp4,.webm,.mov,.avi" multiple onChange={handleSpecUpload} style={{ display: 'none' }} disabled={uploadingSpec} />
                    </label>
                  </div>
                  {/* Blueprint preview grid */}
                  {specImage && specImage.split(',').map(u => u.trim()).filter(Boolean).length > 0 && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {specImage.split(',').map(u => u.trim()).filter(Boolean).map((url, idx) => {
                        const isPdf = url.toLowerCase().includes('.pdf');
                        const isVideo = url.match(/\.(mp4|webm|mov|avi)($|\?)/i);
                        return (
                          <div key={idx} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                            {isVideo ? (
                              <video
                                src={url}
                                controls
                                style={{ height: '72px', width: '120px', borderRadius: '6px', border: '1.5px solid #e2e8f0', backgroundColor: '#000' }}
                              />
                            ) : isPdf ? (
                              <a href={url} target="_blank" rel="noreferrer" style={{ height: '72px', width: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#dc2626', textDecoration: 'none', padding: '4px' }}>
                                <FileText size={24} />
                                <span style={{ fontSize: '10px', color: '#334155', marginTop: '2px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90px', whiteSpace: 'nowrap' }}>PDF Blueprint {idx + 1}</span>
                              </a>
                            ) : (
                              <img
                                src={url}
                                alt={`Blueprint ${idx + 1}`}
                                style={{ height: '72px', width: '100px', objectFit: 'cover', borderRadius: '6px', border: '1.5px solid #e2e8f0' }}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const newUrls = specImage.split(',').map(u => u.trim()).filter(Boolean).filter((_, i) => i !== idx).join(', ');
                                setSpecImage(newUrls);
                              }}
                              title="Remove"
                              style={{
                                position: 'absolute', top: '-6px', right: '-6px',
                                background: '#dc2626', color: '#fff', border: 'none',
                                borderRadius: '50%', width: '18px', height: '18px',
                                cursor: 'pointer', fontSize: '10px', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', lineHeight: 1
                              }}
                            >✕</button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>



                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label font-bold" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.75px', marginBottom: '6px' }}>Detailed Overview *</label>
                  <div style={{ position: 'relative' }}>
                    <FileText size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} />
                    <textarea 
                      className="form-control" 
                      rows={3} 
                      style={{ paddingLeft: '2.5rem', width: '100%', padding: '0.65rem 0.9rem 0.65rem 2.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', boxSizing: 'border-box' }}
                      placeholder="Describe the property, builders specifications, and environment..." 
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label font-bold" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.75px', marginBottom: '6px' }}>Highlights (One per line)</label>
                  <div style={{ position: 'relative' }}>
                    <Sparkles size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} />
                    <textarea 
                      className="form-control" 
                      rows={3} 
                      style={{ paddingLeft: '2.5rem', width: '100%', padding: '0.65rem 0.9rem 0.65rem 2.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', boxSizing: 'border-box' }}
                      placeholder="Highlight 1&#10;Highlight 2..." 
                      value={highlightsText}
                      onChange={e => setHighlightsText(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label font-bold" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.75px', marginBottom: '6px' }}>Amenities * (Select multiple)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem', marginTop: '0.4rem', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                    {(amenities && amenities.length > 0 ? amenities : [
                      { id: 'da1', name: 'Clubhouse' },
                      { id: 'da2', name: 'Gymnasium' },
                      { id: 'da3', name: 'Swimming Pool' },
                      { id: 'da4', name: 'Gated Security' }
                    ]).map(a => {
                      const isChecked = selectedAmenities.includes(a.name);
                      return (
                        <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#374151', userSelect: 'none' }}>
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAmenities(prev => [...prev, a.name]);
                              } else {
                                setSelectedAmenities(prev => prev.filter(item => item !== a.name));
                              }
                            }}
                            style={{ width: '16px', height: '16px', margin: 0 }}
                          />
                          {a.name}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="checkbox-group-premium" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', marginTop: '1rem' }}>
                  <input 
                    type="checkbox" 
                    id="chkFeatured" 
                    checked={featured} 
                    onChange={e => setFeatured(e.target.checked)} 
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <label htmlFor="chkFeatured" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none' }}>Show as Featured Project on Hero Banner</label>
                </div>

                <div className="checkbox-group-premium" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', marginTop: '1rem' }}>
                  <input 
                    type="checkbox" 
                    id="chkAutoPost" 
                    checked={autoPostSocial} 
                    onChange={e => setAutoPostSocial(e.target.checked)} 
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <label htmlFor="chkAutoPost" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none' }}>
                    Auto-publish to Facebook & Instagram Page (Trending Hashtags Included)
                  </label>
                </div>
                  </div>{/* end RIGHT COLUMN */}
                </div>{/* end 2-col grid */}
              </div>

              <div className="modal-footer-premium" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <div>
                  <button type="button" onClick={() => setModalOpen(false)} className="btn btn-outline btn-sm" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, border: '1.5px solid #cbd5e1', borderRadius: '6px', background: '#fff', color: '#374151', cursor: 'pointer' }}>Cancel</button>
                </div>
                <div>
                  <button type="submit" className="btn btn-secondary btn-sm" style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem', fontWeight: 700, border: 'none', borderRadius: '6px', background: 'var(--secondary)', color: 'var(--primary)', cursor: 'pointer' }}>Save Property</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSharePreview && sharePreviewData && (
        <SocialSharePreview
          isOpen={showSharePreview}
          onClose={() => setShowSharePreview(false)}
          propertyName={sharePreviewData.propertyName}
          category={sharePreviewData.category}
          location={sharePreviewData.location}
          city={sharePreviewData.city}
          priceRange={sharePreviewData.priceRange}
          description={sharePreviewData.description}
          imageUrl={sharePreviewData.imageUrl}
          isMarketing={false}
        />
      )}

      {/* Single Property Share Modal */}
      {sharingProperty && (() => {
        const whatsappMessage = 
          `🏢 *${sharingProperty.name}*\n` +
          `📍 Location: ${sharingProperty.location}\n` +
          `🏷️ Category: ${sharingProperty.category || ''}${sharingProperty.subCategory ? ' | ' + sharingProperty.subCategory : ''}\n` +
          `📌 Status: ${sharingProperty.status}\n` +
          `💰 Price: ${sharingProperty.priceRange}\n` +
          `\n🔗 View details: ${window.location.origin}/?project=${sharingProperty.id}${shareMapEnabled ? '&showMap=true' : ''}`;

        return (
          <div className="modal-overlay" onClick={() => { setSharingProperty(null); setShareMapEnabled(false); }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
              <div className="modal-header border-bottom p-3 flex justify-between align-center" style={{ borderBottom: '1px solid #e2e8f0', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Share Property Link</h3>
                <button onClick={() => { setSharingProperty(null); setShareMapEnabled(false); }} className="close-btn" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <XCircle size={20} className="text-muted" />
                </button>
              </div>
              <div className="p-3" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
                  Share the direct showcase link for <strong>{sharingProperty.name}</strong> with customers or partners.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {/* Google Maps toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <input
                      type="checkbox"
                      id="chkProjShareMap"
                      checked={shareMapEnabled}
                      onChange={e => setShareMapEnabled(e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label htmlFor="chkProjShareMap" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', cursor: 'pointer', margin: 0 }}>
                      Include Map Location link
                    </label>
                  </div>
                </div>
                
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label font-bold text-xs" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px', display: 'block' }}>Direct Link</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      className="form-control" 
                      readOnly 
                      value={`${window.location.origin}/?project=${sharingProperty.id}${shareMapEnabled ? '&showMap=true' : ''}`} 
                      style={{ backgroundColor: '#f8fafc', fontSize: '0.82rem', padding: '0.45rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px', flex: 1 }}
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/?project=${sharingProperty.id}${shareMapEnabled ? '&showMap=true' : ''}`);
                        onAddToast('Share link copied to clipboard!', 'success');
                      }}
                      className="btn btn-outline btn-sm"
                      style={{ padding: '0.45rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <a 
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm flex-1 text-center"
                    style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#25D366', borderColor: '#25D366', color: '#fff', textDecoration: 'none', fontWeight: 700, padding: '0.55rem', borderRadius: '6px', fontSize: '0.85rem' }}
                  >
                    Share on WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Selected Records Bulk Share Modal */}
      {sharingSelectedModal && (
        <div className="modal-overlay" onClick={() => setSharingSelectedModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
            <div className="modal-header border-bottom p-3 flex justify-between align-center" style={{ borderBottom: '1px solid #e2e8f0', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Share Selected Projects ({selectedProjects.length})</h3>
              <button onClick={() => setSharingSelectedModal(false)} className="close-btn" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <XCircle size={20} className="text-muted" />
              </button>
            </div>
            <div className="p-3" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
                You have selected <strong>{selectedProjects.length}</strong> project record{selectedProjects.length !== 1 ? 's' : ''}. Share them together as a curated list with your customers.
              </p>

              <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem', background: '#f8fafc' }}>
                {selectedProjects.map((p, idx) => (
                  <div key={p.id} style={{ padding: '6px 8px', borderBottom: idx === selectedProjects.length - 1 ? 'none' : '1px solid #f1f5f9', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{idx + 1}. {p.name}</span>
                    <span style={{ color: '#64748b', fontSize: '0.78rem' }}>{p.location} ({p.priceRange})</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => {
                    const text = selectedProjects.map((p, idx) => 
                      `${idx + 1}. ${p.name} | ${p.location} (${p.priceRange})\nLink: ${window.location.origin}/?project=${p.id}`
                    ).join('\n\n');
                    navigator.clipboard.writeText(text);
                    onAddToast('Selected projects list copied to clipboard!', 'success');
                  }}
                  className="btn btn-outline btn-sm"
                  style={{ flex: 1, padding: '0.55rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Copy All Links
                </button>

                <a 
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `🏢 *${profile.companyName || 'Real Estate'} - Selected Projects List* (${selectedProjects.length} Properties):\n\n` +
                    selectedProjects.map((p, idx) => 
                      `*${idx + 1}. ${p.name}*\n` +
                      `📍 Location: ${p.location}\n` +
                      `💰 Price: ${p.priceRange}\n` +
                      `🔗 Link: ${window.location.origin}/?project=${p.id}`
                    ).join('\n\n')
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm flex-1 text-center"
                  style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#25D366', borderColor: '#25D366', color: '#fff', textDecoration: 'none', fontWeight: 700, padding: '0.55rem', borderRadius: '6px', fontSize: '0.85rem' }}
                >
                  Share Selected via WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
