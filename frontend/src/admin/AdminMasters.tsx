import React, { useState } from 'react';
import type { City, LocationMaster, PropertyType, Facing, Amenity, ExpenseCategory } from '../types';
import { Trash2, MapPin, Building, Compass, Home, Sparkles, Receipt } from 'lucide-react';
import { addCity, deleteCity, addLocation, deleteLocation, addPropertyType, deletePropertyType, addFacing, deleteFacing, addAmenity, deleteAmenity, addExpenseCategory, deleteExpenseCategory } from '../utils/db';
import { ALVGrid } from './ALVGrid';
import type { ALVColumn } from './ALVGrid';

interface AdminMastersProps {
  cities: City[];
  locations: LocationMaster[];
  propertyTypes: PropertyType[];
  facings: Facing[];
  amenities: Amenity[];
  expenseCategories?: ExpenseCategory[];
  onRefresh: () => void;
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

export const AdminMasters: React.FC<AdminMastersProps> = ({
  cities,
  locations,
  propertyTypes = [],
  facings = [],
  amenities = [],
  expenseCategories = [],
  onRefresh,
  onAddToast,
  onConfirm
}) => {
  // Tabs: 'cities' | 'locations' | 'propertyTypes' | 'facings' | 'amenities' | 'expenseCategories'
  const [activeSubTab, setActiveSubTab] = useState<'cities' | 'locations' | 'propertyTypes' | 'facings' | 'amenities' | 'expenseCategories'>('cities');

  // Modal forms states
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [cityName, setCityName] = useState('');

  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [parentCityId, setParentCityId] = useState('');

  const [propertyTypeModalOpen, setPropertyTypeModalOpen] = useState(false);
  const [propertyTypeName, setPropertyTypeName] = useState('');

  const [facingModalOpen, setFacingModalOpen] = useState(false);
  const [facingName, setFacingName] = useState('');

  const [amenityModalOpen, setAmenityModalOpen] = useState(false);
  const [amenityName, setAmenityName] = useState('');

  // Handlers for Cities
  const handleOpenAddCity = () => {
    setCityName('');
    setCityModalOpen(true);
  };

  const handleCitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityName.trim()) {
      onAddToast('Please fill out the City Name', 'error');
      return;
    }

    const cleanName = cityName.trim();
    // Avoid exact duplicate
    const duplicate = cities.find(c => c.name.toLowerCase() === cleanName.toLowerCase());
    if (duplicate) {
      onAddToast(`City "${cleanName}" already exists in the master database.`, 'error');
      return;
    }

    let nextNum = 1;
    cities.forEach(c => {
      const match = c.id.match(/^c(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num < 100000 && num >= nextNum) {
          nextNum = num + 1;
        }
      }
    });

    const newCity: City = {
      id: `c${nextNum}`,
      name: cleanName
    };

    try {
      await addCity(newCity);
      onAddToast(`City "${cleanName}" added successfully to masters.`, 'success');
      setCityModalOpen(false);
      onRefresh();
    } catch (error) {
      onAddToast('Failed to add city.', 'error');
    }
  };

  const handleCityDelete = async (id: string, name: string) => {
    const counts = locations.filter(l => l.cityId === id).length;
    let confirmMsg = `Are you sure you want to remove "${name}" from Cities master?`;
    if (counts > 0) {
      confirmMsg += ` WARNING: This will also delete all ${counts} locations mapped under this city!`;
    }
    if (await onConfirm(confirmMsg)) {
      try {
        await deleteCity(id);
        onAddToast(`City "${name}" and its mapped locations have been removed.`, 'success');
        onRefresh();
      } catch (error) {
        onAddToast('Failed to delete city.', 'error');
      }
    }
  };

  // Handlers for Locations
  const handleOpenAddLocation = () => {
    if (cities.length === 0) {
      onAddToast('Please register at least one City first.', 'error');
      return;
    }
    setLocationName('');
    setParentCityId(cities[0].id);
    setLocationModalOpen(true);
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationName.trim() || !parentCityId) {
      onAddToast('Please fill out all mandatory fields.', 'error');
      return;
    }

    const cleanName = locationName.trim();
    const city = cities.find(c => c.id === parentCityId);
    
    // Check duplicate under same city
    const duplicate = locations.find(
      l => l.name.toLowerCase() === cleanName.toLowerCase() && l.cityId === parentCityId
    );
    if (duplicate) {
      onAddToast(`Location "${cleanName}" already exists under "${city?.name}".`, 'error');
      return;
    }

    let nextNum = 1;
    locations.forEach(l => {
      const match = l.id.match(/^loc(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num < 100000 && num >= nextNum) {
          nextNum = num + 1;
        }
      }
    });

    const newLoc: LocationMaster = {
      id: `loc${nextNum}`,
      name: cleanName,
      cityId: parentCityId
    };

    try {
      await addLocation(newLoc);
      onAddToast(`Location "${cleanName}" created under city "${city?.name}".`, 'success');
      setLocationModalOpen(false);
      onRefresh();
    } catch (error) {
      onAddToast('Failed to add location.', 'error');
    }
  };

  const handleLocationDelete = async (id: string, name: string) => {
    if (await onConfirm(`Are you sure you want to delete "${name}" from Locations master?`)) {
      try {
        await deleteLocation(id);
        onAddToast(`Location "${name}" removed.`, 'success');
        onRefresh();
      } catch (error) {
        onAddToast('Failed to delete location.', 'error');
      }
    }
  };

  // Handlers for Property Types
  const handleOpenAddPropertyType = () => {
    setPropertyTypeName('');
    setPropertyTypeModalOpen(true);
  };

  const handlePropertyTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyTypeName.trim()) {
      onAddToast('Please fill out the Property Type Name', 'error');
      return;
    }

    const cleanName = propertyTypeName.trim();
    const duplicate = propertyTypes.find(t => t.name.toLowerCase() === cleanName.toLowerCase());
    if (duplicate) {
      onAddToast(`Property Type "${cleanName}" already exists in the master database.`, 'error');
      return;
    }

    let nextNum = 1;
    propertyTypes.forEach(t => {
      const match = t.id.match(/^pt(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num < 100000 && num >= nextNum) {
          nextNum = num + 1;
        }
      }
    });

    const newType: PropertyType = {
      id: `pt${nextNum}`,
      name: cleanName
    };

    try {
      await addPropertyType(newType);
      onAddToast(`Property Type "${cleanName}" added successfully to masters.`, 'success');
      setPropertyTypeModalOpen(false);
      onRefresh();
    } catch (error) {
      onAddToast('Failed to add property type.', 'error');
    }
  };

  const handlePropertyTypeDelete = async (id: string, name: string) => {
    if (await onConfirm(`Are you sure you want to delete "${name}" from Property Types master?`)) {
      try {
        await deletePropertyType(id);
        onAddToast(`Property Type "${name}" removed.`, 'success');
        onRefresh();
      } catch (error) {
        onAddToast('Failed to delete property type.', 'error');
      }
    }
  };

  // Handlers for Facings
  const handleOpenAddFacing = () => {
    setFacingName('');
    setFacingModalOpen(true);
  };

  const handleFacingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facingName.trim()) {
      onAddToast('Please fill out the Facing Name', 'error');
      return;
    }

    const cleanName = facingName.trim();
    const duplicate = facings.find(f => f.name.toLowerCase() === cleanName.toLowerCase());
    if (duplicate) {
      onAddToast(`Facing "${cleanName}" already exists in the master database.`, 'error');
      return;
    }

    let nextNum = 1;
    facings.forEach(f => {
      const match = f.id.match(/^f(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num < 100000 && num >= nextNum) {
          nextNum = num + 1;
        }
      }
    });

    const newFacing: Facing = {
      id: `f${nextNum}`,
      name: cleanName
    };

    try {
      await addFacing(newFacing);
      onAddToast(`Facing "${cleanName}" added successfully to masters.`, 'success');
      setFacingModalOpen(false);
      onRefresh();
    } catch (error) {
      onAddToast('Failed to add facing.', 'error');
    }
  };

  const handleFacingDelete = async (id: string, name: string) => {
    if (await onConfirm(`Are you sure you want to delete "${name}" from Facings master?`)) {
      try {
        await deleteFacing(id);
        onAddToast(`Facing "${name}" removed.`, 'success');
        onRefresh();
      } catch (error) {
        onAddToast('Failed to delete facing.', 'error');
      }
    }
  };

  // Handlers for Amenities
  const handleOpenAddAmenity = () => {
    setAmenityName('');
    setAmenityModalOpen(true);
  };

  const handleAmenitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amenityName.trim()) {
      onAddToast('Please fill out the Amenity Name', 'error');
      return;
    }

    const cleanName = amenityName.trim();
    const duplicate = amenities.find(a => a.name.toLowerCase() === cleanName.toLowerCase());
    if (duplicate) {
      onAddToast(`Amenity "${cleanName}" already exists in the master database.`, 'error');
      return;
    }

    let nextNum = 1;
    amenities.forEach(a => {
      const match = a.id.match(/^a(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num < 100000 && num >= nextNum) {
          nextNum = num + 1;
        }
      }
    });

    const newAmenity: Amenity = {
      id: `a${nextNum}`,
      name: cleanName
    };

    try {
      await addAmenity(newAmenity);
      onAddToast(`Amenity "${cleanName}" added successfully to masters.`, 'success');
      setAmenityModalOpen(false);
      onRefresh();
    } catch (error) {
      onAddToast('Failed to add amenity.', 'error');
    }
  };

  const handleAmenityDelete = async (id: string, name: string) => {
    if (await onConfirm(`Are you sure you want to delete "${name}" from Amenities master?`)) {
      try {
        await deleteAmenity(id);
        onAddToast(`Amenity "${name}" removed.`, 'success');
        onRefresh();
      } catch (error) {
        onAddToast('Failed to delete amenity.', 'error');
      }
    }
  };

  // Handlers for Expense Categories
  const [expenseCategoryModalOpen, setExpenseCategoryModalOpen] = useState(false);
  const [expenseCategoryName, setExpenseCategoryName] = useState('');

  const handleOpenAddExpenseCategory = () => {
    setExpenseCategoryName('');
    setExpenseCategoryModalOpen(true);
  };

  const handleExpenseCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseCategoryName.trim()) {
      onAddToast('Please fill out the Category Name', 'error');
      return;
    }

    const cleanName = expenseCategoryName.trim();
    const duplicate = expenseCategories.find(c => c.name.toLowerCase() === cleanName.toLowerCase());
    if (duplicate) {
      onAddToast(`Expense Category "${cleanName}" already exists in the master database.`, 'error');
      return;
    }

    let nextNum = 1;
    expenseCategories.forEach(c => {
      const match = c.id.match(/^ec(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num < 100000 && num >= nextNum) {
          nextNum = num + 1;
        }
      }
    });

    const newCat: ExpenseCategory = {
      id: `ec${nextNum}`,
      name: cleanName
    };

    try {
      await addExpenseCategory(newCat);
      onAddToast(`Expense Category "${cleanName}" added successfully to masters.`, 'success');
      setExpenseCategoryModalOpen(false);
      onRefresh();
    } catch (error) {
      onAddToast('Failed to add expense category.', 'error');
    }
  };

  const handleExpenseCategoryDelete = async (id: string, name: string) => {
    if (await onConfirm(`Are you sure you want to delete "${name}" from Expense Categories master?`)) {
      try {
        await deleteExpenseCategory(id);
        onAddToast(`Expense Category "${name}" removed.`, 'success');
        onRefresh();
      } catch (error) {
        onAddToast('Failed to delete expense category.', 'error');
      }
    }
  };

  // Column definitions for the ALV Grids
  const cityColumns: ALVColumn[] = [
    { key: 'id', label: 'City ID', width: '100px', render: (val) => <span className="font-mono text-xs">{String(val)}</span> },
    { key: 'name', label: 'City Name', render: (val) => <span className="font-semibold text-primary">{String(val)}</span> },
    {
      key: 'locationsCount',
      label: 'Mapped Locations',
      render: (_v, row) => {
        const mappedCount = locations.filter(l => l.cityId === row.id).length;
        return <span className="badge badge-completed">{mappedCount} Locations</span>;
      }
    },
    {
      key: '__actions',
      label: 'Actions',
      sortable: false,
      width: '100px',
      align: 'center',
      render: (_v, row) => (
        <button
          onClick={() => handleCityDelete(String(row.id), String(row.name))}
          className="alv-toolbar-btn"
          style={{ color: '#dc2626', borderColor: '#dc2626' }}
          title="Delete City"
        >
          <Trash2 size={13} />
        </button>
      )
    }
  ];

  const locationColumns: ALVColumn[] = [
    { key: 'id', label: 'Location ID', width: '100px', render: (val) => <span className="font-mono text-xs">{String(val)}</span> },
    { key: 'name', label: 'Location Area', render: (val) => <span className="font-semibold text-primary">{String(val)}</span> },
    {
      key: 'cityId',
      label: 'Parent City',
      render: (val) => {
        const parentCity = cities.find(c => c.id === val);
        return (
          <span className="badge badge-ongoing" style={{ textTransform: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Building size={12} /> {parentCity ? parentCity.name : 'Unknown City'}
          </span>
        );
      }
    },
    {
      key: '__actions',
      label: 'Actions',
      sortable: false,
      width: '100px',
      align: 'center',
      render: (_v, row) => (
        <button
          onClick={() => handleLocationDelete(String(row.id), String(row.name))}
          className="alv-toolbar-btn"
          style={{ color: '#dc2626', borderColor: '#dc2626' }}
          title="Delete Location"
        >
          <Trash2 size={13} />
        </button>
      )
    }
  ];

  const propertyTypeColumns: ALVColumn[] = [
    { key: 'id', label: 'Type ID', width: '100px', render: (val) => <span className="font-mono text-xs">{String(val)}</span> },
    { key: 'name', label: 'Property Type Name', render: (val) => <span className="font-semibold text-primary">{String(val)}</span> },
    {
      key: '__actions',
      label: 'Actions',
      sortable: false,
      width: '100px',
      align: 'center',
      render: (_v, row) => (
        <button
          onClick={() => handlePropertyTypeDelete(String(row.id), String(row.name))}
          className="alv-toolbar-btn"
          style={{ color: '#dc2626', borderColor: '#dc2626' }}
          title="Delete Property Type"
        >
          <Trash2 size={13} />
        </button>
      )
    }
  ];

  const facingColumns: ALVColumn[] = [
    { key: 'id', label: 'Facing ID', width: '100px', render: (val) => <span className="font-mono text-xs">{String(val)}</span> },
    { key: 'name', label: 'Facing Name', render: (val) => <span className="font-semibold text-primary">{String(val)}</span> },
    {
      key: '__actions',
      label: 'Actions',
      sortable: false,
      width: '100px',
      align: 'center',
      render: (_v, row) => (
        <button
          onClick={() => handleFacingDelete(String(row.id), String(row.name))}
          className="alv-toolbar-btn"
          style={{ color: '#dc2626', borderColor: '#dc2626' }}
          title="Delete Facing"
        >
          <Trash2 size={13} />
        </button>
      )
    }
  ];

  const amenityColumns: ALVColumn[] = [
    { key: 'id', label: 'Amenity ID', width: '100px', render: (val) => <span className="font-mono text-xs">{String(val)}</span> },
    { key: 'name', label: 'Amenity Name', render: (val) => <span className="font-semibold text-primary">{String(val)}</span> },
    {
      key: '__actions',
      label: 'Actions',
      sortable: false,
      width: '100px',
      align: 'center',
      render: (_v, row) => (
        <button
          onClick={() => handleAmenityDelete(String(row.id), String(row.name))}
          className="alv-toolbar-btn"
          style={{ color: '#dc2626', borderColor: '#dc2626' }}
          title="Delete Amenity"
        >
          <Trash2 size={13} />
        </button>
      )
    }
  ];

  const expenseCategoryColumns: ALVColumn[] = [
    { key: 'id', label: 'Category ID', width: '120px', render: (val) => <span className="font-mono text-xs">{String(val)}</span> },
    { key: 'name', label: 'Category Name', render: (val) => <span className="font-semibold text-primary">{String(val)}</span> },
    {
      key: '__actions',
      label: 'Actions',
      sortable: false,
      width: '100px',
      align: 'center',
      render: (_v, row) => (
        <button
          onClick={() => handleExpenseCategoryDelete(String(row.id), String(row.name))}
          className="alv-toolbar-btn"
          style={{ color: '#dc2626', borderColor: '#dc2626' }}
          title="Delete Category"
        >
          <Trash2 size={13} />
        </button>
      )
    }
  ];

  return (
    <div className="admin-masters-view">
      <div className="flex justify-between align-center mb-3">
        <div>
          <h2>Masters Configuration</h2>
          <p className="text-xs text-muted">Manage system-wide dropdown variables for Cities and Micro-locations</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-light-soft p-0.5" style={{ borderRadius: '8px', padding: '0.25rem' }}>
          <button 
            className={`toggle-btn ${activeSubTab === 'cities' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('cities')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            <Building size={14} /> Cities ({cities.length})
          </button>
          <button 
            className={`toggle-btn ${activeSubTab === 'locations' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('locations')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            <MapPin size={14} /> Locations ({locations.length})
          </button>
          <button 
            className={`toggle-btn ${activeSubTab === 'propertyTypes' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('propertyTypes')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            <Home size={14} /> Property Types ({propertyTypes.length})
          </button>
          <button 
            className={`toggle-btn ${activeSubTab === 'facings' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('facings')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            <Compass size={14} /> Facings ({facings.length})
          </button>
          <button 
            className={`toggle-btn ${activeSubTab === 'amenities' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('amenities')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            <Sparkles size={14} /> Amenities ({amenities.length})
          </button>
          <button 
            className={`toggle-btn ${activeSubTab === 'expenseCategories' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('expenseCategories')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            <Receipt size={14} /> Expense Categories ({expenseCategories.length})
          </button>
        </div>
      </div>

      {/* CITIES TAB */}
      {activeSubTab === 'cities' && (
        <ALVGrid
          title="Registered Cities"
          subtitle={`${cities.length} cities in master database`}
          columns={cityColumns}
          data={cities as unknown as Record<string, unknown>[]}
          rowKey="id"
          onAdd={handleOpenAddCity}
          addLabel="Add City"
          onRefresh={onRefresh}
          searchPlaceholder="Search cities..."
        />
      )}

      {/* LOCATIONS TAB */}
      {activeSubTab === 'locations' && (
        <ALVGrid
          title="Micro Locations"
          subtitle="Locations grouped under registered cities"
          columns={locationColumns}
          data={locations as unknown as Record<string, unknown>[]}
          rowKey="id"
          onAdd={handleOpenAddLocation}
          addLabel="Create Location"
          onRefresh={onRefresh}
          searchPlaceholder="Search locations..."
        />
      )}

      {/* PROPERTY TYPES TAB */}
      {activeSubTab === 'propertyTypes' && (
        <ALVGrid
          title="Property Types Master"
          subtitle={`${propertyTypes.length} property types registered`}
          columns={propertyTypeColumns}
          data={propertyTypes as unknown as Record<string, unknown>[]}
          rowKey="id"
          onAdd={handleOpenAddPropertyType}
          addLabel="Add Property Type"
          onRefresh={onRefresh}
          searchPlaceholder="Search property types..."
        />
      )}

      {/* FACINGS TAB */}
      {activeSubTab === 'facings' && (
        <ALVGrid
          title="Facings Master"
          subtitle={`${facings.length} facings registered`}
          columns={facingColumns}
          data={facings as unknown as Record<string, unknown>[]}
          rowKey="id"
          onAdd={handleOpenAddFacing}
          addLabel="Add Facing"
          onRefresh={onRefresh}
          searchPlaceholder="Search facings..."
        />
      )}

      {/* AMENITIES TAB */}
      {activeSubTab === 'amenities' && (
        <ALVGrid
          title="Amenities Master"
          subtitle={`${amenities.length} amenities registered`}
          columns={amenityColumns}
          data={amenities as unknown as Record<string, unknown>[]}
          rowKey="id"
          onAdd={handleOpenAddAmenity}
          addLabel="Add Amenity"
          onRefresh={onRefresh}
          searchPlaceholder="Search amenities..."
        />
      )}

      {/* EXPENSE CATEGORIES TAB */}
      {activeSubTab === 'expenseCategories' && (
        <ALVGrid
          title="Expense Categories Master"
          subtitle={`${expenseCategories.length} categories registered`}
          columns={expenseCategoryColumns}
          data={expenseCategories as unknown as Record<string, unknown>[]}
          rowKey="id"
          onAdd={handleOpenAddExpenseCategory}
          addLabel="Add Category"
          onRefresh={onRefresh}
          searchPlaceholder="Search categories..."
        />
      )}

      {/* Add City Modal */}
      {cityModalOpen && (
        <div className="modal-overlay" onClick={() => setCityModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 className="p-3 bg-light-soft border-bottom-title" style={{ margin: 0 }}>Register City Master</h3>
            <form onSubmit={handleCitySubmit} className="p-3">
              <div className="form-group">
                <label className="form-label">City Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Visakhapatnam" 
                  value={cityName}
                  onChange={e => setCityName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" onClick={() => setCityModalOpen(false)} className="btn btn-outline btn-sm">Cancel</button>
                <button type="submit" className="btn btn-secondary btn-sm">Create City</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {locationModalOpen && (
        <div className="modal-overlay" onClick={() => setLocationModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <h3 className="p-3 bg-light-soft border-bottom-title" style={{ margin: 0 }}>Create Micro Location</h3>
            <form onSubmit={handleLocationSubmit} className="p-3">
              <div className="form-group">
                <label className="form-label">Parent City *</label>
                <select 
                  className="form-control" 
                  value={parentCityId}
                  onChange={e => setParentCityId(e.target.value)}
                  required
                >
                  {cities.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Location Area Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Madhurawada" 
                  value={locationName}
                  onChange={e => setLocationName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button type="button" onClick={() => setLocationModalOpen(false)} className="btn btn-outline btn-sm">Cancel</button>
                <button type="submit" className="btn btn-secondary btn-sm">Create Location</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add Property Type Modal */}
      {propertyTypeModalOpen && (
        <div className="modal-overlay" onClick={() => setPropertyTypeModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 className="p-3 bg-light-soft border-bottom-title" style={{ margin: 0 }}>Register Property Type</h3>
            <form onSubmit={handlePropertyTypeSubmit} className="p-3">
              <div className="form-group">
                <label className="form-label">Property Type Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. 3 BHK" 
                  value={propertyTypeName}
                  onChange={e => setPropertyTypeName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" onClick={() => setPropertyTypeModalOpen(false)} className="btn btn-outline btn-sm">Cancel</button>
                <button type="submit" className="btn btn-secondary btn-sm">Create Type</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Facing Modal */}
      {facingModalOpen && (
        <div className="modal-overlay" onClick={() => setFacingModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 className="p-3 bg-light-soft border-bottom-title" style={{ margin: 0 }}>Register Facing</h3>
            <form onSubmit={handleFacingSubmit} className="p-3">
              <div className="form-group">
                <label className="form-label">Facing Direction Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. East" 
                  value={facingName}
                  onChange={e => setFacingName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" onClick={() => setFacingModalOpen(false)} className="btn btn-outline btn-sm">Cancel</button>
                <button type="submit" className="btn btn-secondary btn-sm">Create Facing</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Amenity Modal */}
      {amenityModalOpen && (
        <div className="modal-overlay" onClick={() => setAmenityModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 className="p-3 bg-light-soft border-bottom-title" style={{ margin: 0 }}>Register Amenity</h3>
            <form onSubmit={handleAmenitySubmit} className="p-3">
              <div className="form-group">
                <label className="form-label">Amenity Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Swimming Pool" 
                  value={amenityName}
                  onChange={e => setAmenityName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" onClick={() => setAmenityModalOpen(false)} className="btn btn-outline btn-sm">Cancel</button>
                <button type="submit" className="btn btn-secondary btn-sm">Create Amenity</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Category Modal */}
      {expenseCategoryModalOpen && (
        <div className="modal-overlay" onClick={() => setExpenseCategoryModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 className="p-3 bg-light-soft border-bottom-title" style={{ margin: 0 }}>Register Expense Category</h3>
            <form onSubmit={handleExpenseCategorySubmit} className="p-3">
              <div className="form-group">
                <label className="form-label">Category Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Steel" 
                  value={expenseCategoryName}
                  onChange={e => setExpenseCategoryName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" onClick={() => setExpenseCategoryModalOpen(false)} className="btn btn-outline btn-sm">Cancel</button>
                <button type="submit" className="btn btn-secondary btn-sm">Create Category</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
