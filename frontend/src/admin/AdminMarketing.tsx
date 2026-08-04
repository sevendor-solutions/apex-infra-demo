import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Project, ProjectCategory, ProjectStatus, City, LocationMaster, PropertyType, Facing, Amenity, MarketingAgent } from '../types';
import { Edit2, Trash2, CheckCircle2, XCircle, X, Share2, ChevronDown, Image, Upload, FileText, Video } from 'lucide-react';
import { addMarketing, updateMarketing, deleteMarketing, uploadMultipleImages } from '../utils/db';
import { ALVGrid } from './ALVGrid';
import type { ALVColumn } from './ALVGrid';
import { SocialSharePreview } from './SocialSharePreview';

interface AdminMarketingProps {
  marketing: Project[];
  cities: City[];
  locations: LocationMaster[];
  propertyTypes: PropertyType[];
  facings: Facing[];
  amenities: Amenity[];
  agents?: MarketingAgent[];
  onRefresh: () => void;
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

interface MultiSelectDropdownProps {
  label: string;
  options: { label: string; value: string }[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  options,
  selectedValues,
  onChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => setIsOpen(!isOpen);

  const handleOptionToggle = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleSelectAll = () => {
    onChange(options.map(o => o.value));
  };

  const handleClear = () => {
    onChange([]);
  };

  const displayText = useMemo(() => {
    if (selectedValues.length === 0) return 'All';
    if (selectedValues.length === options.length) return 'All Selected';
    if (selectedValues.length > 1) return `${selectedValues.length} Selected`;
    const opt = options.find(o => o.value === selectedValues[0]);
    return opt ? opt.label : selectedValues[0];
  }, [selectedValues, options]);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{label}:</label>
      <div 
        onClick={handleToggle}
        className="form-control"
        style={{
          padding: '0.2rem 1.75rem 0.2rem 0.4rem',
          height: '28px',
          minWidth: '120px',
          maxWidth: '180px',
          fontSize: '0.8rem',
          display: 'inline-flex',
          alignItems: 'center',
          cursor: 'pointer',
          position: 'relative',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          backgroundColor: isOpen ? '#f1f5f9' : '#ffffff',
          borderColor: isOpen ? '#0854a0' : '#cbd5e1',
          borderRadius: '4px'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{displayText}</span>
        <ChevronDown 
          size={12} 
          style={{ 
            position: 'absolute', 
            right: '6px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)'
          }} 
        />
      </div>

      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: '32px',
            left: '45px',
            zIndex: 1000,
            minWidth: '180px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            maxHeight: '220px',
            overflowY: 'auto',
            padding: '4px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderBottom: '1px solid #f1f5f9', marginBottom: '4px' }}>
            <button 
              onClick={(e) => { e.stopPropagation(); handleSelectAll(); }}
              style={{ background: 'none', border: 'none', color: '#0854a0', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              Select All
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              Clear
            </button>
          </div>
          {options.map(opt => {
            const isChecked = selectedValues.includes(opt.value);
            return (
              <div 
                key={opt.value}
                onClick={(e) => { e.stopPropagation(); handleOptionToggle(opt.value); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: isChecked ? '#0f2b46' : '#334155',
                  backgroundColor: isChecked ? '#eff6ff' : 'transparent',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = isChecked ? '#eff6ff' : '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = isChecked ? '#eff6ff' : 'transparent'}
              >
                <input 
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}} // handled by parent onClick
                  style={{ marginRight: '8px', width: '13px', height: '13px', cursor: 'pointer' }}
                />
                <span style={{ flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const AdminMarketing: React.FC<AdminMarketingProps> = ({
  marketing,
  cities,
  locations,
  propertyTypes,
  facings,
  amenities,
  agents = [],
  onRefresh,
  onAddToast,
  onConfirm
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Project | null>(null);
  const [autoPostSocial, setAutoPostSocial] = useState(true);
  const [showSharePreview, setShowSharePreview] = useState(false);
  const [sharePreviewData, setSharePreviewData] = useState<any>(null);
  const [selectedAgentFilters, setSelectedAgentFilters] = useState<string[]>([]);
  const [selectedCityFilters, setSelectedCityFilters] = useState<string[]>([]);
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState<string[]>([]);
  const [selectedLocationFilters, setSelectedLocationFilters] = useState<string[]>([]);
  const [selectedFacingFilters, setSelectedFacingFilters] = useState<string[]>([]);
  const [selectedPropertyTypeFilters, setSelectedPropertyTypeFilters] = useState<string[]>([]);
  const [sharingProperty, setSharingProperty] = useState<Project | null>(null);
  const [shareMapEnabled, setShareMapEnabled] = useState(false);
  const [sharingFilteredLink, setSharingFilteredLink] = useState(false);
  const [filterShareMapEnabled, setFilterShareMapEnabled] = useState(false);

  const [shareImagesEnabled, setShareImagesEnabled] = useState(true);

  // Upload states
  const [uploadingElevation, setUploadingElevation] = useState(false);
  const [uploadingSpecImages, setUploadingSpecImages] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState(false);
  const [uploadingBrochure, setUploadingBrochure] = useState(false);

  const handleElevationUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const currentUrls = imageUrl.split(',').map(u => u.trim()).filter(Boolean);
    const duplicates: string[] = [];
    const validFiles: File[] = [];

    for (const file of Array.from(e.target.files)) {
      const dotIndex = file.name.lastIndexOf('.');
      const baseName = dotIndex !== -1 ? file.name.substring(0, dotIndex) : file.name;
      
      const isDuplicate = currentUrls.some(url => {
        const decodedUrl = decodeURIComponent(url);
        const urlFile = decodedUrl.split('/').pop() || '';
        return urlFile.toLowerCase().includes(baseName.toLowerCase());
      });

      if (isDuplicate) {
        duplicates.push(file.name);
      } else {
        validFiles.push(file);
      }
    }

    if (duplicates.length > 0) {
      onAddToast(`Image(s) already uploaded: ${duplicates.join(', ')}`, 'error');
      if (validFiles.length === 0) {
        e.target.value = '';
        return;
      }
    }

    setUploadingElevation(true);
    try {
      const urls = await uploadMultipleImages(validFiles, 'MMS');
      const combined = [...currentUrls, ...urls].join(', ');
      setImageUrl(combined);
      onAddToast('Property image(s) uploaded successfully!', 'success');
    } catch (err: any) {
      onAddToast(err.message || 'Images upload failed', 'error');
    } finally {
      setUploadingElevation(false);
      e.target.value = '';
    }
  };

  const handleSpecUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const currentUrls = specImage.split(',').map(u => u.trim()).filter(Boolean);
    const duplicates: string[] = [];
    const validFiles: File[] = [];

    for (const file of Array.from(e.target.files)) {
      const dotIndex = file.name.lastIndexOf('.');
      const baseName = dotIndex !== -1 ? file.name.substring(0, dotIndex) : file.name;
      
      const isDuplicate = currentUrls.some(url => {
        const decodedUrl = decodeURIComponent(url);
        const urlFile = decodedUrl.split('/').pop() || '';
        return urlFile.toLowerCase().includes(baseName.toLowerCase());
      });

      if (isDuplicate) {
        duplicates.push(file.name);
      } else {
        validFiles.push(file);
      }
    }

    if (duplicates.length > 0) {
      onAddToast(`Image(s) already uploaded: ${duplicates.join(', ')}`, 'error');
      if (validFiles.length === 0) {
        e.target.value = '';
        return;
      }
    }

    setUploadingSpecImages(true);
    try {
      const urls = await uploadMultipleImages(validFiles, 'MMS');
      const combined = [...currentUrls, ...urls].join(', ');
      setSpecImage(combined);
      onAddToast('Blueprint image(s) uploaded successfully!', 'success');
    } catch (err: any) {
      onAddToast(err.message || 'Blueprint upload failed', 'error');
    } finally {
      setUploadingSpecImages(false);
      e.target.value = '';
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const currentUrls = videoUrl.split(',').map(u => u.trim()).filter(Boolean);
    setUploadingVideos(true);
    try {
      const urls = await uploadMultipleImages(Array.from(e.target.files), 'MMS');
      const combined = [...currentUrls, ...urls].join(', ');
      setVideoUrl(combined);
      onAddToast('Video file(s) uploaded successfully!', 'success');
    } catch (err: any) {
      onAddToast(err.message || 'Video upload failed', 'error');
    } finally {
      setUploadingVideos(false);
      e.target.value = '';
    }
  };

  const handleBrochureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingBrochure(true);
    try {
      const urls = await uploadMultipleImages(Array.from(e.target.files), 'MMS');
      setBrochureUrl(urls[0] || '');
      onAddToast('Brochure PDF uploaded successfully!', 'success');
    } catch (err: any) {
      onAddToast(err.message || 'Brochure upload failed', 'error');
    } finally {
      setUploadingBrochure(false);
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
  const [uds, setUds] = useState('');
  const [width, setWidth] = useState('');
  const [length, setLength] = useState('');
  const [classification, setClassification] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [marketingResult, setMarketingResult] = useState('');
  const [agentId, setAgentId] = useState('');
  const [referredByName, setReferredByName] = useState('');
  const [referredByPhone, setReferredByPhone] = useState('');
  const [referredRemarks, setReferredRemarks] = useState('');

  // (single-page form — no tab state needed)



  const handleOpenAdd = () => {
    setEditingProperty(null);
    setName('');
    setCategory('Flats');
    setSubCategory('');
    setStatus('Ongoing');
    setLocation('');
    setDescription('');
    setPriceRange('₹65 L - ₹95 L');
    setPriceValue(6500000);
    setImageUrl('');
    setHighlightsText('Modern urban living\nRERA Approved\nPremium quality specifications');
    setSelectedAmenities(['Clubhouse', 'Gymnasium', 'Swimming Pool', 'Gated Security']);
    setLat(17.702);
    setLng(83.238);
    setFeatured(false);
    setAutoPostSocial(true);

    setSelectedFacings(['East']);
    setCity('Visakhapatnam');
    setMicroLocation('Sheela Nagar');
    setFloors(10);
    setUnitsCount(0);
    setSelectedPropertyTypes(['2 BHK', '3 BHK']);
    setConfigValues({ '2 BHK': '30', '3 BHK': '20' });
    setConfigSftValues({ '2 BHK': '', '3 BHK': '' });
    setConfigUdsValues({ '2 BHK': '', '3 BHK': '' });
    setSpecImage('');
    setVideoUrl('');
    setBrochureUrl('');
    setUds('');
    setWidth('');
    setLength('');
    setClassification('');
    setIsActive(true);
    setRemarks('');
    setMarketingResult('');
    setAgentId('');
    setReferredByName('');
    setReferredByPhone('');
    setReferredRemarks('');

    setModalOpen(true);
  };

  const handleOpenEdit = (prop: Project) => {
    setEditingProperty(prop);
    setName(prop.name);
    setCategory(prop.category);
    setSubCategory(prop.subCategory || '');
    setStatus(prop.status);
    setLocation(prop.location);
    setDescription(prop.description);
    setPriceRange(prop.priceRange);
    setPriceValue(prop.priceValue);
    setImageUrl(prop.images.join(', '));
    setHighlightsText(prop.highlights.join('\n'));
    setSelectedAmenities(prop.amenities || []);
    setLat(prop.mapCoordinates.lat);
    setLng(prop.mapCoordinates.lng);
    setFeatured(prop.featured);
    setAutoPostSocial(true);

    const initialFacings = prop.facing 
      ? prop.facing.split(',').map(f => f.trim()).filter(Boolean) 
      : [];
    setSelectedFacings(initialFacings);
    
    setCity(prop.city || 'Visakhapatnam');
    setMicroLocation(prop.microLocation || '');
    setFloors(prop.floors || 0);
    setUnitsCount(prop.unitsCount || 0);
    
    const parsedValues = parseAvailabilityDetails(prop.availabilityDetails || '');
    const parsedSftValues = parseAvailabilitySft(prop.availabilityDetails || '');
    const parsedUdsValues = parseAvailabilityUds(prop.availabilityDetails || '');
    setSelectedPropertyTypes(Object.keys(parsedValues));
    setConfigValues(parsedValues);
    setConfigSftValues(parsedSftValues);
    setConfigUdsValues(parsedUdsValues);
    
    setSpecImage(prop.specImage || '');
    setVideoUrl(prop.videos && prop.videos.length > 0 ? prop.videos.join(', ') : '');
    setBrochureUrl(prop.brochureUrl && prop.brochureUrl !== '#' ? prop.brochureUrl : '');
    setUds(prop.uds || '');
    setWidth(prop.width || '');
    setLength(prop.length || '');
    setClassification(prop.classification || '');
    setIsActive(prop.isActive !== false);
    setRemarks(prop.remarks || '');
    setMarketingResult(prop.marketingResult || '');
    setAgentId(prop.agentId || '');
    setReferredByName(prop.referredByName || '');
    setReferredByPhone(prop.referredByPhone || '');
    setReferredRemarks(prop.referredRemarks || '');

    setModalOpen(true);
  };

  const handleDeleteClick = async (id: string, name: string) => {
    if (await onConfirm(`Are you sure you want to delete "${name}" from the marketing verticals?`)) {
      try {
        await deleteMarketing(id);
        onAddToast(`Marketing property "${name}" has been deleted.`, 'success');
        onRefresh();
      } catch (error) {
        onAddToast('Failed to delete marketing property.', 'error');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim() || !description.trim()) {
      onAddToast('Please fill in all mandatory fields', 'error');
      return;
    }

    if (!agentId) {
      onAddToast('Please assign a marketing agent to this property', 'error');
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

    const propertyData: Project = {
      id: editingProperty ? editingProperty.id : 'm_' + Date.now(),
      name,
      category,
      subCategory: subCategory ? subCategory : undefined,
      status,
      location,
      description,
      images: imagesArray,
      videos: videoUrl.split(',').map(v => v.trim()).filter(Boolean),
      highlights: highlightsArray,
      amenities: selectedAmenities,
      timeline: editingProperty ? editingProperty.timeline : [
        { id: 't_init', date: 'Jan 2026', title: 'Plotting & Inception', desc: 'Venture registration and layout development.' }
      ],
      floorPlans: (() => {
        const specUrls = specImage.split(',').map(u => u.trim()).filter(Boolean);
        if (editingProperty) {
          const plans = [...editingProperty.floorPlans];
          // Replace/rebuild floor plans from specImage urls
          if (specUrls.length > 0) {
            return specUrls.map((url, i) => ({
              id: plans[i]?.id || `f_spec_${Date.now()}_${i}`,
              title: i === 0 ? 'Master Layout Plan' : `Blueprint ${i + 1}`,
              image: url
            }));
          }
          return plans;
        } else {
          if (specUrls.length > 0) {
            return specUrls.map((url, i) => ({
              id: `f_spec_${Date.now()}_${i}`,
              title: i === 0 ? 'Master Layout Plan' : `Blueprint ${i + 1}`,
              image: url
            }));
          }
          return [{ id: 'f_init', title: 'Master Layout Plan', image: '' }];
        }
      })(),
      priceRange,
      priceValue: Number(priceValue) || 0,
      paymentPlans: editingProperty ? editingProperty.paymentPlans : ['Booking Advance: 2%', 'Agreement: 25%', 'Registration: 73%'],
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
      uds: (category === 'Flats' || category === 'Sites') ? uds : undefined,
      width: category === 'Sites' ? width : undefined,
      length: category === 'Sites' ? length : undefined,
      classification: classification || undefined,
      isActive,
      remarks: remarks || undefined,
      marketingResult: !isActive ? (marketingResult || undefined) : undefined,
      agentId: agentId || undefined,
      referredByName: referredByName || undefined,
      referredByPhone: referredByPhone || undefined,
      referredRemarks: referredRemarks || undefined,
      autoPostSocial
    };

    try {
      if (editingProperty) {
        await updateMarketing(propertyData);
        onAddToast(`Marketing property "${name}" updated successfully.`, 'success');
      } else {
        await addMarketing(propertyData);
        onAddToast(`New marketing property "${name}" added successfully.`, 'success');
      }
      setModalOpen(false);
      onRefresh();

      if (autoPostSocial) {
        const assignedAgent = agents.find(a => a.id === agentId);
        setSharePreviewData({
          propertyName: name,
          category,
          location,
          city,
          priceRange,
          description,
          imageUrl,
          isMarketing: true,
          agentName: assignedAgent?.name,
          agentPhone: assignedAgent?.phone
        });
        setShowSharePreview(true);
      }
    } catch (error: any) {
      onAddToast(error?.message || 'Failed to save marketing property.', 'error');
    }
  };

  const filteredMarketingData = useMemo(() => {
    return marketing.filter(item => {
      const matchesAgent = selectedAgentFilters.length === 0 || selectedAgentFilters.includes(item.agentId || '');
      const matchesCity = selectedCityFilters.length === 0 || selectedCityFilters.includes(item.city || '');
      const matchesCategory = selectedCategoryFilters.length === 0 || selectedCategoryFilters.includes(item.category || '');
      const matchesLocation = selectedLocationFilters.length === 0 || selectedLocationFilters.includes(item.microLocation || '');
      const matchesFacing = selectedFacingFilters.length === 0 || (item.facing && item.facing.split(',').map(f => f.trim()).some(f => selectedFacingFilters.includes(f)));
      const matchesPropertyType = selectedPropertyTypeFilters.length === 0 || (item.availabilityDetails && selectedPropertyTypeFilters.some(t => item.availabilityDetails?.includes(t)));
      return matchesAgent && matchesCity && matchesCategory && matchesLocation && matchesFacing && matchesPropertyType;
    });
  }, [marketing, selectedAgentFilters, selectedCityFilters, selectedCategoryFilters, selectedLocationFilters, selectedFacingFilters, selectedPropertyTypeFilters]);

  // Extract unique cities from marketing projects
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    marketing.forEach(item => { if (item.city) set.add(item.city); });
    return Array.from(set).sort();
  }, [marketing]);

  // Extract unique locations from marketing projects
  const uniqueLocations = useMemo(() => {
    const set = new Set<string>();
    marketing.forEach(item => { if (item.microLocation) set.add(item.microLocation); });
    return Array.from(set).sort();
  }, [marketing]);

  // Helper to build the share URL params from all filters
  const buildShareParams = (includeMap = false) => {
    const params = new URLSearchParams();
    params.set('page', 'marketing');
    if (selectedCategoryFilters.length > 0) params.set('category', selectedCategoryFilters.join(','));
    if (selectedCityFilters.length > 0) params.set('city', selectedCityFilters.join(','));
    if (selectedLocationFilters.length > 0) params.set('location', selectedLocationFilters.join(','));
    if (selectedFacingFilters.length > 0) params.set('facing', selectedFacingFilters.join(','));
    if (selectedPropertyTypeFilters.length > 0) params.set('propertyType', selectedPropertyTypeFilters.join(','));
    if (selectedAgentFilters.length > 0) params.set('agent', selectedAgentFilters.join(','));
    if (includeMap) params.set('showMap', 'true');
    return `${window.location.origin}/?${params.toString()}`;
  };

  const agentFilterDropdown = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginRight: '0.5rem' }}>
      <MultiSelectDropdown 
        label="Agent"
        options={agents.map(a => ({ label: a.name, value: a.id }))}
        selectedValues={selectedAgentFilters}
        onChange={setSelectedAgentFilters}
      />

      <MultiSelectDropdown 
        label="City"
        options={uniqueCities.map(c => ({ label: c, value: c }))}
        selectedValues={selectedCityFilters}
        onChange={setSelectedCityFilters}
      />

      <MultiSelectDropdown 
        label="Location"
        options={uniqueLocations.map(l => ({ label: l, value: l }))}
        selectedValues={selectedLocationFilters}
        onChange={setSelectedLocationFilters}
      />

      <MultiSelectDropdown 
        label="Category"
        options={[
          { label: 'Flats', value: 'Flats' },
          { label: 'Villas', value: 'Villas' },
          { label: 'Individual Houses', value: 'Individual Houses' },
          { label: 'Sites', value: 'Sites' },
          { label: 'Duplex', value: 'Duplex' }
        ]}
        selectedValues={selectedCategoryFilters}
        onChange={setSelectedCategoryFilters}
      />

      <MultiSelectDropdown 
        label="Facing"
        options={facings.map(f => ({ label: f.name, value: f.name }))}
        selectedValues={selectedFacingFilters}
        onChange={setSelectedFacingFilters}
      />

      <MultiSelectDropdown 
        label="Type"
        options={propertyTypes.map(pt => ({ label: pt.name, value: pt.name }))}
        selectedValues={selectedPropertyTypeFilters}
        onChange={setSelectedPropertyTypeFilters}
      />

      <button 
        onClick={() => setSharingFilteredLink(true)}
        className="alv-toolbar-btn"
        style={{ 
          padding: '0.2rem 0.75rem', 
          fontSize: '0.8rem', 
          fontWeight: 600,
          color: '#16a34a', 
          backgroundColor: '#f0fdf4',
          borderColor: '#16a34a', 
          height: '28px', 
          width: 'auto',
          display: 'inline-flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '0.35rem',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
          flexShrink: 0
        }}
        title="Share Filtered View Link"
      >
        <Share2 size={13} /> Share
      </button>
    </div>
  );

  const marketingColumns: ALVColumn[] = [
    {
      key: 'name',
      label: 'Name',
      render: (_v, row) => (
        <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{String(row.name)}</span>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (_v, row) => {
        const r = row as any;
        return (
          <div>
            <span style={{ fontWeight: 700, color: 'var(--color-secondary, #6d28d9)' }}>{String(r.category)}</span>
            {r.subCategory && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({String(r.subCategory)})</div>
            )}
            {r.classification && (
              <div style={{ fontSize: '0.75rem', color: '#0ea5e9', fontWeight: 600, marginTop: '2px' }}>{String(r.classification)}</div>
            )}
          </div>
        );
      },
    },
    {
      key: 'location',
      label: 'Location',
      render: (_v, row) => (
        <div>
          <div>{String(row.location)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{String(row.city ?? '')}</div>
        </div>
      ),
    },
    {
      key: 'priceRange',
      label: 'Price Range',
    },
    {
      key: 'status',
      label: 'Status',
      render: (_v, row) => (
        <span className={`badge badge-${String(row.status).toLowerCase()}`}>{String(row.status)}</span>
      ),
    },
    {
      key: 'agentId',
      label: 'Assigned Agent',
      render: (_v, row) => {
        const r = row as any;
        const agent = agents.find(a => a.id === r.agentId);
        return (
          <span style={{ fontWeight: 600 }}>{agent ? agent.name : 'Unassigned'}</span>
        );
      }
    },
    {
      key: 'isActive',
      label: 'Activity Status',
      render: (_v, row) => {
        const r = row as any;
        const active = r.isActive !== false;
        return (
          <span 
            className={`badge`} 
            style={{ 
              backgroundColor: active ? '#e1f4e9' : (r.marketingResult === 'Success' ? '#e6f4ea' : '#fce8e6'), 
              color: active ? '#1e7e34' : (r.marketingResult === 'Success' ? '#137333' : '#c5221f'),
              border: `1px solid ${active ? '#c3edd5' : (r.marketingResult === 'Success' ? '#ceead6' : '#fad2cf')}`
            }}
          >
            {active ? 'Active' : `Inactive (${r.marketingResult || 'No Outcome'})`}
          </span>
        );
      }
    },
    {
      key: 'referredByName',
      label: 'Referred By',
      render: (_v, row) => {
        const r = row as any;
        if (!r.referredByName && !r.referredByPhone && !r.referredRemarks) return <span style={{ color: 'var(--text-muted)' }}>-</span>;
        return (
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{r.referredByName || 'N/A'}</div>
            {r.referredByPhone && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📞 {r.referredByPhone}</div>
            )}
            {r.referredRemarks && (
              <div style={{ fontSize: '0.75rem', color: '#0854a0', fontStyle: 'italic' }}>💬 {r.referredRemarks}</div>
            )}
          </div>
        );
      }
    },
    {
      key: 'remarks',
      label: 'Remarks',
      render: (_v, row) => {
        const r = row as any;
        return (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }} title={r.remarks}>
            {r.remarks ? (r.remarks.length > 30 ? r.remarks.substring(0, 30) + '...' : r.remarks) : '-'}
          </span>
        );
      }
    },
    {
      key: 'featured',
      label: 'Featured',
      render: (_v, row) =>
        row.featured ? (
          <span style={{ color: 'var(--color-success, #16a34a)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <CheckCircle2 size={16} /> Yes
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <XCircle size={16} /> No
          </span>
        ),
    },
    {
      key: '__actions',
      label: 'Actions',
      sortable: false,
      width: '90px',
      align: 'center',
      render: (_v, row) => (
        <div className="admin-table-actions" style={{ justifyContent: 'center' }}>
          <button
            onClick={() => setSharingProperty(row as unknown as Project)}
            className="alv-toolbar-btn"
            title="Share"
            style={{ color: '#16a34a', borderColor: '#16a34a' }}
          >
            <Share2 size={13} />
          </button>
          <button
            onClick={() => handleOpenEdit(row as unknown as Project)}
            className="alv-toolbar-btn"
            title="Edit"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => handleDeleteClick(String(row.id), String(row.name))}
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
    <div className="admin-projects-view">
      <ALVGrid
        title="Manage Marketing"
        subtitle={`${marketing.length} ${marketing.length === 1 ? 'item' : 'items'}`}
        columns={marketingColumns}
        data={filteredMarketingData as unknown as Record<string, unknown>[]}
        extraToolbarActions={agentFilterDropdown}
        rowKey="id"
        onAdd={handleOpenAdd}
        addLabel="Add Marketing"
        onRefresh={onRefresh}
        searchPlaceholder="Search marketing..."
        emptyText="No marketing properties created yet."
      />

      {/* Modal Form */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content premium-admin-modal" style={{ maxWidth: '1020px', width: '98%', maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header-premium">
              <div>
                <h3 className="modal-title">
                  {editingProperty ? 'Edit Marketing Showcase' : 'Create Marketing Showcase'}
                </h3>
                {editingProperty && <p className="modal-subtitle">Updating: <strong>{editingProperty.name}</strong></p>}
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

            <form onSubmit={handleSubmit} className="modal-form-premium">

              <div className="modal-body-premium" style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '1.25rem 1.5rem', overflowY: 'auto' }}>
                {/* Two-column layout to reduce scrolling */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                  {/* LEFT COLUMN: Basic Specs + Location + Config/Pricing */}
                  <div>
                    {/* Section 1: Basic Specifications */}
                <div className="modal-section-title">Basic Specifications</div>
                <div className="form-group">
                  <label className="form-label">Property Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. JK Whispering Pines"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-3 gap-2">
                  <div className="form-group">
                    <label className="form-label" style={{ minHeight: '34px', display: 'flex', alignItems: 'flex-end', marginBottom: '0.35rem' }}>Marketing Segment *</label>
                    <select
                      className="form-control"
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
                      <option value="Duplex">Duplex</option>
                      <option value="Sites">Sites / Plots / Land</option>
                    </select>
                  </div>

                  {category === 'Sites' ? (
                    <div className="form-group">
                      <label className="form-label" style={{ minHeight: '34px', display: 'flex', alignItems: 'flex-end', marginBottom: '0.35rem' }}>Subcategory *</label>
                      <select
                        className="form-control"
                        value={subCategory}
                        onChange={e => setSubCategory(e.target.value)}
                        required
                      >
                        <option value="">Select subCategory</option>
                        <option value="Development Sites">Development Sites</option>
                        <option value="Panchayati Approved Sites">Panchayati Approved Sites</option>
                        <option value="VUDA / VMRDA Approved Sites">VUDA / VMRDA Approved Sites</option>
                        <option value="Ventures">Ventures</option>
                        <option value="Agriculture Lands">Agriculture Lands</option>
                        <option value="Non-Agri Lands">Non-Agri Lands</option>
                        <option value="Industrial Sites">Industrial Sites</option>
                      </select>
                    </div>
                  ) : (category === 'Flats' || category === 'Villas' || category === 'Individual Houses' || category === 'Duplex') ? (
                    <div className="form-group">
                      <label className="form-label" style={{ minHeight: '34px', display: 'flex', alignItems: 'flex-end', marginBottom: '0.35rem' }}>Subcategory *</label>
                      <select
                        className="form-control"
                        value={subCategory}
                        onChange={e => setSubCategory(e.target.value)}
                        required
                      >
                        <option value="">Select subCategory</option>
                        <option value="Under Construction">Under Construction</option>
                        <option value="Ready to Move">Ready to Move</option>
                      </select>
                    </div>
                  ) : (
                    <div className="form-group">
                      <label className="form-label" style={{ minHeight: '34px', display: 'flex', alignItems: 'flex-end', marginBottom: '0.35rem' }}>Subcategory</label>
                      <input className="form-control" disabled value="N/A" />
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label" style={{ minHeight: '34px', display: 'flex', alignItems: 'flex-end', marginBottom: '0.35rem' }}>Classification *</label>
                    <select
                      className="form-control"
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

                {/* Overall UDS field removed for Flats as requested */}

                {category === 'Sites' && (
                  <>
                    <div className="grid grid-2 gap-2">
                      <div className="form-group">
                        <label className="form-label">Site Width (ft) *</label>
                        <input
                          type="text"
                          className="form-control"
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
                      <div className="form-group">
                        <label className="form-label">Site Length (ft) *</label>
                        <input
                          type="text"
                          className="form-control"
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
                    <div className="form-group">
                      <label className="form-label">Total Sq. Yards *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Calculated automatically, or enter manually"
                        value={uds}
                        onChange={e => setUds(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}


                    {/* Section 2: Location & Address */}
                    <div className="modal-section-title">Location &amp; Address</div>
                <div className="grid grid-3 gap-2">
                  <div className="form-group">
                    <label className="form-label">City Location *</label>
                    <select
                      className="form-control"
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

                  <div className="form-group">
                    <label className="form-label">Micro Location Area *</label>
                    <select
                      className="form-control"
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
                  </div>

                  <div className="form-group">
                    <label className="form-label">Detailed Address *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Bheemili Highway Road, Visakhapatnam"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Facing Directions * (Select multiple)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem', marginTop: '0.4rem', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.02)' }}>
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
                        <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem', userSelect: 'none' }}>
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

                <div className="grid grid-2 gap-2">
                  <div className="form-group">
                    <label className="form-label">Latitude Offset</label>
                    <input
                      type="number"
                      step="0.0001"
                      className="form-control"
                      value={lat}
                      onChange={e => setLat(Number(e.target.value))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Longitude Offset</label>
                    <input
                      type="number"
                      step="0.0001"
                      className="form-control"
                      value={lng}
                      onChange={e => setLng(Number(e.target.value))}
                    />
                  </div>
                </div>

                    {/* Section 3: Configurations & Pricing */}
                    <div className="modal-section-title">Configurations &amp; Pricing</div>
                {category !== 'Sites' && (
                  <div className="form-group">
                    <label className="form-label">Total Floors</label>
                    <input
                      type="number"
                      className="form-control"
                      value={floors}
                      onChange={e => setFloors(Number(e.target.value))}
                    />
                  </div>
                )}

                <div className="grid grid-2 gap-2">
                  <div className="form-group">
                    <label className="form-label">Price Range Text *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. ₹45 L - ₹90 L"
                      value={priceRange}
                      onChange={e => setPriceRange(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Numeric Price Value (Sorting) *</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 4500000"
                      value={priceValue}
                      onChange={e => setPriceValue(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">BHK / Plot Configurations * (Check config to enable quantity, SFT &amp; UDS)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem', marginTop: '0.4rem', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.02)' }}>
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
                        <div key={pt.id} style={{ display: 'flex', flexFlow: 'row wrap', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.25rem', borderBottom: '1px dashed rgba(0,0,0,0.05)' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem', minWidth: '70px', userSelect: 'none' }}>
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
                              style={{ flex: 1, minWidth: '45px', height: '28px', margin: 0, padding: '0.2rem 0.35rem', fontSize: '0.78rem' }}
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
                              style={{ flex: 1.2, minWidth: '60px', height: '28px', margin: 0, padding: '0.2rem 0.35rem', fontSize: '0.78rem' }}
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
                              style={{ flex: 1.4, minWidth: '75px', height: '28px', margin: 0, padding: '0.2rem 0.35rem', fontSize: '0.78rem' }}
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
                  </div>{/* end LEFT COLUMN */}

                  {/* RIGHT COLUMN: Media + Status/Remarks */}
                  <div>
                    {/* Section 4: Media & Details */}
                    <div className="modal-section-title">Media &amp; Details</div>

                {/* Property Images (Comma-separated URLs) */}
                <div className="form-group">
                  <label className="form-label font-bold" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Image size={15} style={{ color: 'var(--primary)' }} />
                    Property Images (Photos Upload)
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="URL1, URL2... or upload photos below"
                      value={imageUrl}
                      onChange={e => setImageUrl(e.target.value)}
                      style={{ marginBottom: 0 }}
                    />
                    <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0, alignSelf: 'flex-end', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Upload size={13} />
                      {uploadingElevation ? 'Uploading Images...' : 'Upload Photos'}
                      <input type="file" accept="image/*" multiple onChange={handleElevationUpload} style={{ display: 'none' }} disabled={uploadingElevation} />
                    </label>
                  </div>
                  {/* Property images preview grid */}
                  {imageUrl && imageUrl.split(',').map(u => u.trim()).filter(Boolean).length > 0 && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {imageUrl.split(',').map(u => u.trim()).filter(Boolean).map((url, idx) => (
                        <div key={idx} style={{ position: 'relative', display: 'inline-flex' }}>
                          <img
                            src={url}
                            alt={`Property image ${idx + 1}`}
                            style={{ height: '72px', width: '100px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }}
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

                {/* Specifications Blueprint Image & Layout PDFs */}
                <div className="form-group">
                  <label className="form-label font-bold" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileText size={15} style={{ color: 'var(--primary)' }} />
                    Specifications Blueprint Images / PDFs
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="URL1, URL2... or upload blueprint images / PDFs below"
                      value={specImage}
                      onChange={e => setSpecImage(e.target.value)}
                      style={{ marginBottom: 0 }}
                    />
                    <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0, alignSelf: 'flex-end', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Upload size={13} />
                      {uploadingSpecImages ? 'Uploading...' : 'Upload Blueprint Images / PDF'}
                      <input type="file" accept="image/*,application/pdf" multiple onChange={handleSpecUpload} style={{ display: 'none' }} disabled={uploadingSpecImages} />
                    </label>
                  </div>
                  {/* Blueprint preview grid */}
                  {specImage && specImage.split(',').map(u => u.trim()).filter(Boolean).length > 0 && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {specImage.split(',').map(u => u.trim()).filter(Boolean).map((url, idx) => {
                        const isPdf = url.toLowerCase().includes('.pdf');
                        return (
                          <div key={idx} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                            {isPdf ? (
                              <a href={url} target="_blank" rel="noreferrer" style={{ height: '72px', width: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#dc2626', textDecoration: 'none', padding: '4px' }}>
                                <FileText size={24} />
                                <span style={{ fontSize: '10px', color: '#334155', marginTop: '2px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90px', whiteSpace: 'nowrap' }}>PDF Blueprint {idx + 1}</span>
                              </a>
                            ) : (
                              <img
                                src={url}
                                alt={`Blueprint ${idx + 1}`}
                                style={{ height: '72px', width: '100px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }}
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

                {/* Property Videos & Virtual Tours (Video Upload) */}
                <div className="form-group">
                  <label className="form-label font-bold" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Video size={15} style={{ color: 'var(--primary)' }} />
                    Property Videos / Walkthroughs (MP4, WebM, MOV or Video URLs)
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="Video URL1, Video URL2... or upload video files below"
                      value={videoUrl}
                      onChange={e => setVideoUrl(e.target.value)}
                      style={{ marginBottom: 0 }}
                    />
                    <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0, alignSelf: 'flex-end', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Upload size={13} />
                      {uploadingVideos ? 'Uploading Video...' : 'Upload Video Files'}
                      <input type="file" accept="video/*,.mp4,.webm,.mov,.avi" multiple onChange={handleVideoUpload} style={{ display: 'none' }} disabled={uploadingVideos} />
                    </label>
                  </div>
                  {/* Video previews */}
                  {videoUrl && videoUrl.split(',').map(u => u.trim()).filter(Boolean).length > 0 && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {videoUrl.split(',').map(u => u.trim()).filter(Boolean).map((url, idx) => (
                        <div key={idx} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                          {url.match(/\.(mp4|webm|mov|avi)($|\?)/i) ? (
                            <video
                              src={url}
                              controls
                              style={{ height: '72px', width: '120px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: '#000' }}
                            />
                          ) : (
                            <a href={url} target="_blank" rel="noreferrer" style={{ height: '72px', width: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', borderRadius: '6px', color: '#38bdf8', textDecoration: 'none', padding: '4px' }}>
                              <Video size={22} />
                              <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px', whiteSpace: 'nowrap' }}>Video Link {idx + 1}</span>
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const newUrls = videoUrl.split(',').map(u => u.trim()).filter(Boolean).filter((_, i) => i !== idx).join(', ');
                              setVideoUrl(newUrls);
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

                {/* Property Brochure (PDF Upload) */}
                <div className="form-group">
                  <label className="form-label font-bold" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileText size={15} style={{ color: 'var(--primary)' }} />
                    Brochure PDF Document
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Brochure PDF URL or upload file..."
                      value={brochureUrl}
                      onChange={e => setBrochureUrl(e.target.value)}
                    />
                    <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Upload size={13} />
                      {uploadingBrochure ? 'Uploading PDF...' : 'Upload Brochure PDF'}
                      <input type="file" accept="application/pdf,.pdf" onChange={handleBrochureUpload} style={{ display: 'none' }} disabled={uploadingBrochure} />
                    </label>
                  </div>
                  {/* Brochure preview link */}
                  {brochureUrl && brochureUrl !== '#' && (
                    <div style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                      <FileText size={18} style={{ color: '#dc2626' }} />
                      <a href={brochureUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0284c7', textDecoration: 'underline' }}>
                        View Brochure PDF
                      </a>
                      <button
                        type="button"
                        onClick={() => setBrochureUrl('')}
                        title="Remove Brochure"
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '0 4px', fontSize: '14px', fontWeight: 700 }}
                      >✕</button>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Marketing Overview Description *</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Describe selling points, advantages, proximity details..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Highlights (One per line)</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Highlights list..."
                    value={highlightsText}
                    onChange={e => setHighlightsText(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Amenities * (Select multiple)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem', marginTop: '0.4rem', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.02)' }}>
                    {(amenities && amenities.length > 0 ? amenities : [
                      { id: 'da1', name: 'Clubhouse' },
                      { id: 'da2', name: 'Gymnasium' },
                      { id: 'da3', name: 'Swimming Pool' },
                      { id: 'da4', name: 'Gated Security' }
                    ]).map(a => {
                      const isChecked = selectedAmenities.includes(a.name);
                      return (
                        <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem', userSelect: 'none' }}>
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

                    <div className="modal-section-title">Referral Details &amp; Marketing Remarks</div>
                <div className="grid grid-3 gap-2" style={{ marginBottom: '1rem', alignItems: 'end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ minHeight: '32px', display: 'flex', alignItems: 'flex-end', marginBottom: '0.35rem' }}>Referred By Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Rahul Sharma"
                      value={referredByName}
                      onChange={e => setReferredByName(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ minHeight: '32px', display: 'flex', alignItems: 'flex-end', marginBottom: '0.35rem' }}>Referred By Phone</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="e.g. 9876543210"
                      value={referredByPhone}
                      onChange={e => setReferredByPhone(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ minHeight: '32px', display: 'flex', alignItems: 'flex-end', marginBottom: '0.35rem' }}>Referral Remarks</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Commission / referral details"
                      value={referredRemarks}
                      onChange={e => setReferredRemarks(e.target.value)}
                    />
                  </div>
                </div>

                <div className={!isActive ? "grid grid-3 gap-2" : "grid grid-2 gap-2"} style={{ alignItems: 'end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ minHeight: '32px', display: 'flex', alignItems: 'flex-end', marginBottom: '0.35rem' }}>Marketing Status</label>
                    <select
                      className="form-control"
                      value={isActive ? 'Active' : 'Inactive'}
                      onChange={e => {
                        const val = e.target.value === 'Active';
                        setIsActive(val);
                        if (val) {
                          setMarketingResult('');
                        }
                      }}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  {!isActive && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ minHeight: '32px', display: 'flex', alignItems: 'flex-end', marginBottom: '0.35rem' }}>Deal Outcome *</label>
                      <select
                        className="form-control"
                        value={marketingResult}
                        onChange={e => setMarketingResult(e.target.value)}
                        required={!isActive}
                      >
                        <option value="">Select Outcome</option>
                        <option value="Success">Success</option>
                        <option value="Failure">Failure</option>
                      </select>
                    </div>
                  )}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ minHeight: '32px', display: 'flex', alignItems: 'flex-end', marginBottom: '0.35rem' }}>Marketing Remarks</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Deal notes / marketing outcome"
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <label className="form-label font-bold">Assigned Marketing Agent <span style={{ color: 'var(--red)' }}>*</span></label>
                  <select
                    className="form-control"
                    value={agentId}
                    onChange={e => setAgentId(e.target.value)}
                    required
                  >
                    <option value="">Select Agent (Required)</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.designation || 'Agent'})</option>
                    ))}
                  </select>
                </div>

                <div className="checkbox-group-premium">
                  <input
                    type="checkbox"
                    id="chkMktFeatured"
                    checked={featured}
                    onChange={e => setFeatured(e.target.checked)}
                  />
                  <label htmlFor="chkMktFeatured">Show as Featured Project on Hero Banner</label>
                </div>

                <div className="checkbox-group-premium" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', marginTop: '1rem' }}>
                  <input 
                    type="checkbox" 
                    id="chkMktAutoPost" 
                    checked={autoPostSocial} 
                    onChange={e => setAutoPostSocial(e.target.checked)} 
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <label htmlFor="chkMktAutoPost" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none' }}>
                    Auto-publish to Facebook & Instagram Page (Trending Hashtags Included)
                  </label>
                 </div>
                  </div>{/* end RIGHT COLUMN */}
                </div>{/* end 2-col grid */}
              </div>

              <div className="modal-footer-premium" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <button type="button" onClick={() => setModalOpen(false)} className="btn btn-outline btn-sm">Cancel</button>
                </div>
                <div>
                  <button type="submit" className="btn btn-secondary btn-sm">Save Property</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {sharingProperty && (() => {
        const propImgs = (sharingProperty.images && sharingProperty.images.length > 0)
          ? sharingProperty.images
          : (sharingProperty.specImage ? sharingProperty.specImage.split(',').map(u => u.trim()).filter(Boolean) : []);

        const whatsappMessage = 
          `🏠 *${sharingProperty.name}*\n` +
          `📍 Location: ${sharingProperty.location}\n` +
          `🏗️ Segment: ${sharingProperty.category || ''}${sharingProperty.subCategory ? ' | ' + sharingProperty.subCategory : ''}\n` +
          `🏷️ Classification: ${sharingProperty.classification || 'N/A'}\n` +
          `💰 Price: ${sharingProperty.priceRange}\n` +
          (shareImagesEnabled && propImgs.length > 0
            ? `\n📸 *Property Photos (${propImgs.length}):*\n` + propImgs.map((img, i) => `${i + 1}. ${img}`).join('\n') + `\n`
            : ''
          ) +
          `\n🔗 View details: ${window.location.origin}/?project=${sharingProperty.id}&isMarketing=true${shareMapEnabled ? '&showMap=true' : ''}`;

        return (
          <div className="modal-overlay" onClick={() => { setSharingProperty(null); setShareMapEnabled(false); }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '470px' }}>
              <div className="modal-header border-bottom p-3 flex justify-between align-center">
                <h3 style={{ margin: 0 }}>Share Property Link</h3>
                <button onClick={() => { setSharingProperty(null); setShareMapEnabled(false); }} className="close-btn" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <XCircle size={20} className="text-muted" />
                </button>
              </div>
              <div className="p-3" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
                  Share the public showcase page of <strong>{sharingProperty.name}</strong> with clients or partners.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {/* Google Maps toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <input
                      type="checkbox"
                      id="chkShareMap"
                      checked={shareMapEnabled}
                      onChange={e => setShareMapEnabled(e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label htmlFor="chkShareMap" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', cursor: 'pointer', margin: 0 }}>
                      Include Google Map Location link
                    </label>
                  </div>

                  {/* Include All Images toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <input
                      type="checkbox"
                      id="chkShareImages"
                      checked={shareImagesEnabled}
                      onChange={e => setShareImagesEnabled(e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label htmlFor="chkShareImages" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', cursor: 'pointer', margin: 0 }}>
                      Include all photo links in WhatsApp ({propImgs.length} photo{propImgs.length !== 1 ? 's' : ''})
                    </label>
                  </div>
                </div>
                
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label font-bold text-xs">Direct Link</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      className="form-control" 
                      readOnly 
                      value={`${window.location.origin}/?project=${sharingProperty.id}&isMarketing=true${shareMapEnabled ? '&showMap=true' : ''}`} 
                      style={{ backgroundColor: '#f8fafc', fontSize: '0.85rem' }}
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/?project=${sharingProperty.id}&isMarketing=true${shareMapEnabled ? '&showMap=true' : ''}`);
                        onAddToast('Share link copied to clipboard!', 'success');
                      }}
                      className="btn btn-outline btn-sm"
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
                    style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#25D366', borderColor: '#25D366', color: '#fff', textDecoration: 'none', fontWeight: 700, padding: '0.55rem', borderRadius: '6px' }}
                  >
                    Share on WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {sharingFilteredLink && (
        <div className="modal-overlay" onClick={() => setSharingFilteredLink(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header border-bottom p-3 flex justify-between align-center">
              <h3 style={{ margin: 0 }}>Share Filtered Search</h3>
              <button onClick={() => setSharingFilteredLink(false)} className="close-btn" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <XCircle size={20} className="text-muted" />
              </button>
            </div>
            <div className="p-3" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
                Copy and share the link to the public website with your currently applied filters pre-configured.
              </p>

              {/* Google Maps toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <input
                  type="checkbox"
                  id="chkFilterShareMap"
                  checked={filterShareMapEnabled}
                  onChange={e => setFilterShareMapEnabled(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="chkFilterShareMap" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', cursor: 'pointer', margin: 0 }}>
                  Include Google Map Location in shared link
                </label>
              </div>
              
              <div style={{ padding: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '6px', fontSize: '0.85rem' }}>
                <strong>Active Filters:</strong>
                <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0, listStyle: 'disc' }}>
                  {selectedAgentFilters.length > 0 && <li>Agent: {selectedAgentFilters.map(id => agents.find(a => a.id === id)?.name || id).join(', ')}</li>}
                  {selectedCityFilters.length > 0 && <li>City: {selectedCityFilters.join(', ')}</li>}
                  {selectedLocationFilters.length > 0 && <li>Location: {selectedLocationFilters.join(', ')}</li>}
                  {selectedCategoryFilters.length > 0 && <li>Category: {selectedCategoryFilters.join(', ')}</li>}
                  {selectedFacingFilters.length > 0 && <li>Facing: {selectedFacingFilters.join(', ')}</li>}
                  {selectedPropertyTypeFilters.length > 0 && <li>Property Type: {selectedPropertyTypeFilters.join(', ')}</li>}
                  {selectedAgentFilters.length === 0 && selectedCityFilters.length === 0 && selectedLocationFilters.length === 0 && selectedCategoryFilters.length === 0 && selectedFacingFilters.length === 0 && selectedPropertyTypeFilters.length === 0 && <li>No filters applied (showing all)</li>}
                </ul>
              </div>

              <div className="form-group">
                <label className="form-label font-bold text-xs">Shareable URL</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    readOnly 
                    value={buildShareParams(filterShareMapEnabled)} 
                    style={{ backgroundColor: '#f8fafc', fontSize: '0.8rem' }}
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(buildShareParams(filterShareMapEnabled));
                      onAddToast('Filtered share link copied to clipboard!', 'success');
                    }}
                    className="btn btn-outline btn-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <a 
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `🏢 *J.K. Future Infra — Property Listings*\n` +
                    (selectedCategoryFilters.length > 0 ? `🏠 Segment: ${selectedCategoryFilters.join(', ')}\n` : '') +
                    (selectedCityFilters.length > 0 ? `📍 Cities: ${selectedCityFilters.join(', ')}\n` : '') +
                    (selectedLocationFilters.length > 0 ? `📌 Locations: ${selectedLocationFilters.join(', ')}\n` : '') +
                    (selectedFacingFilters.length > 0 ? `🧭 Facings: ${selectedFacingFilters.join(', ')}\n` : '') +
                    (selectedPropertyTypeFilters.length > 0 ? `🏗️ Sub-Category / Types: ${selectedPropertyTypeFilters.join(', ')}\n` : '') +
                    (selectedAgentFilters.length > 0 ? `👤 Agents: ${selectedAgentFilters.map(id => agents.find(a => a.id === id)?.name || id).join(', ')}\n` : '') +
                    `\n🔗 View listings: ${buildShareParams(filterShareMapEnabled)}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm flex-1 text-center"
                  style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#25D366', borderColor: '#25D366', color: '#fff', textDecoration: 'none', fontWeight: 600 }}
                >
                  Share on WhatsApp
                </a>
              </div>
            </div>
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
          isMarketing={sharePreviewData.isMarketing}
          agentName={sharePreviewData.agentName}
          agentPhone={sharePreviewData.agentPhone}
        />
      )}
    </div>
  );
};
