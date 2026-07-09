import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LayoutGrid, List, Map, Search, MapPin, ArrowRight, ChevronDown, SlidersHorizontal, X, Compass, Building2, Home, Phone, Calendar, Sparkles } from 'lucide-react';
import type { Project, ProjectCategory, SiteCategory, PropertyType, Facing } from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ProjectsProps {
  projects: Project[];
  initialParams?: any;
  onNavigate: (page: string, category?: ProjectCategory | null, siteCategory?: SiteCategory | null, params?: any) => void;
  onOpenEnquiry: (projectName?: string) => void;
  propertyTypes: PropertyType[];
  facings: Facing[];
}

export const Projects: React.FC<ProjectsProps> = ({
  projects,
  initialParams,
  onNavigate,
  onOpenEnquiry,
  propertyTypes = [],
  facings = []
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showMap, setShowMap] = useState<boolean>(false);
  const [search, setSearch] = useState<string>(initialParams?.search || '');
  const [statusFilter, setStatusFilter] = useState<string>(initialParams?.status || 'All');
  const [categoryFilter, setCategoryFilter] = useState<string>(initialParams?.category || 'All');
  const [priceSort, setPriceSort] = useState<string>('default');
  
  // Checkbox Selection States (Honeyy Group style)
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>([]);
  const [selectedFacings, setSelectedFacings] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  
  // Mobile Filters Drawer Toggle
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);

  // Collapsible Filters Panel State
  const [panelOpen, setPanelOpen] = useState({
    propertyType: true,
    facing: true,
    city: true,
    location: true
  });

  const togglePanel = (key: 'propertyType' | 'facing' | 'city' | 'location') => {
    setPanelOpen(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 4;

  // Map state
  const [selectedMapProject, setSelectedMapProject] = useState<Project | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  // Extract unique cities dynamically from projects database
  const citiesList = useMemo(() => {
    const set = new Set<string>();
    projects.forEach(p => {
      if (p.city) {
        set.add(p.city);
      } else {
        const parts = p.location.split(',');
        const city = parts[parts.length - 1]?.trim();
        if (city) set.add(city);
      }
    });
    return Array.from(set).sort();
  }, [projects]);

  // Extract unique micro-locations dynamically from projects database
  const locationsList = useMemo(() => {
    const set = new Set<string>();
    projects.forEach(p => {
      if (p.microLocation) {
        set.add(p.microLocation);
      } else {
        const parts = p.location.split(',');
        const loc = parts[0]?.trim();
        if (loc) set.add(loc);
      }
    });
    return Array.from(set).sort();
  }, [projects]);

  // Property Type options
  const propertyTypesOptions = useMemo(() => {
    return propertyTypes.length > 0 
      ? propertyTypes.map(t => t.name) 
      : ['Plots', '1 BHK', '2 BHK', '3 BHK', '4 BHK', 'Villa'];
  }, [propertyTypes]);

  // Facing options
  const facingsOptions = useMemo(() => {
    return facings.length > 0 
      ? facings.map(f => f.name) 
      : ['North', 'East', 'West', 'South', 'North East', 'North West'];
  }, [facings]);

  // Filter projects with multi-select checkboxes
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (p.isActive === false) return false;
      // 1. Keyword search
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                            p.location.toLowerCase().includes(search.toLowerCase()) ||
                            p.description.toLowerCase().includes(search.toLowerCase());
      
      // 2. Status dropdown
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      
      // 3. Category (from navigation tabs, e.g. Flats, Villas)
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
      
      // 4. City Checkboxes
      let matchesCity = true;
      if (selectedCities.length > 0) {
        const pCity = p.city || p.location.split(',').pop()?.trim() || '';
        matchesCity = selectedCities.includes(pCity);
      }
      
      // 5. MicroLocation Checkboxes
      let matchesMicroLoc = true;
      if (selectedLocations.length > 0) {
        const pLoc = p.microLocation || p.location.split(',')[0]?.trim() || '';
        matchesMicroLoc = selectedLocations.includes(pLoc);
      }
      
      // 6. Facings Checkboxes
      let matchesFacing = true;
      if (selectedFacings.length > 0) {
        matchesFacing = p.facing 
          ? p.facing.split(',').map(f => f.trim()).some(f => selectedFacings.includes(f))
          : false;
      }
      
      // 7. Property Type Checkboxes
      let matchesPropertyTypes = true;
      if (selectedPropertyTypes.length > 0) {
        const pTypes: string[] = [];
        if (p.category === 'Sites') pTypes.push('Plots');
        if (p.category === 'Villas') pTypes.push('Villa');
        if (p.category === 'Individual Houses') pTypes.push('Villa');
        
        if (p.availabilityDetails) {
          if (p.availabilityDetails.includes('1 BHK')) pTypes.push('1 BHK');
          if (p.availabilityDetails.includes('2 BHK')) pTypes.push('2 BHK');
          if (p.availabilityDetails.includes('3 BHK')) pTypes.push('3 BHK');
          if (p.availabilityDetails.includes('4 BHK')) pTypes.push('4 BHK');
          if (p.availabilityDetails.includes('Plots')) pTypes.push('Plots');
          if (p.availabilityDetails.includes('Villa')) pTypes.push('Villa');
        } else {
          // Fallback guess logic
          if (p.name.includes('Grand')) {
            pTypes.push('Villa', '4 BHK');
          } else if (p.name.includes('Heights')) {
            pTypes.push('2 BHK', '3 BHK');
          } else if (p.name.includes('Royal')) {
            pTypes.push('3 BHK');
          } else if (p.name.includes('Pearl')) {
            pTypes.push('3 BHK');
          }
        }
        
        matchesPropertyTypes = selectedPropertyTypes.some(t => pTypes.includes(t));
      }
      
      return matchesSearch && matchesStatus && matchesCategory && 
             matchesCity && matchesMicroLoc && matchesFacing && matchesPropertyTypes;
    }).sort((a, b) => {
      if (priceSort === 'low-high') return a.priceValue - b.priceValue;
      if (priceSort === 'high-low') return b.priceValue - a.priceValue;
      if (priceSort === 'alphabetical') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [projects, search, statusFilter, categoryFilter, priceSort, selectedCities, selectedLocations, selectedFacings, selectedPropertyTypes]);

  // 1. Initialize map and manage markers
  useEffect(() => {
    if (!showMap || !mapContainerRef.current) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      return;
    }

    // Initialize Leaflet Map
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        center: [17.3850, 78.4867], // Center around Andhra Pradesh/Hyderabad
        zoom: 7,
      });

      // CartoDB Positron - Sleek, professional light tile theme
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    const bounds: L.LatLngTuple[] = [];
    const validCoordsProjects = filteredProjects.filter(
      p => p.mapCoordinates && typeof p.mapCoordinates.lat === 'number' && typeof p.mapCoordinates.lng === 'number'
    );

    const createMarkerIcon = (isActive: boolean) => L.divIcon({
      html: `<div style="
        width: 32px;
        height: 32px;
        background-color: ${isActive ? '#f2b705' : '#0b192c'};
        border: 2px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease, background-color 0.2s ease;
      ">
        <div style="
          width: 12px;
          height: 12px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>`,
      className: 'custom-leaflet-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    validCoordsProjects.forEach(proj => {
      const { lat, lng } = proj.mapCoordinates;
      const isActive = selectedMapProject?.id === proj.id;

      const marker = L.marker([lat, lng], {
        icon: createMarkerIcon(isActive)
      })
      .addTo(map)
      .on('click', () => {
        setSelectedMapProject(proj);
      });

      marker.bindTooltip(`
        <div style="font-family: var(--font-primary, sans-serif); font-size: 0.85rem; font-weight: 700; color: #0b192c;">
          ${proj.name}
        </div>
      `, {
        direction: 'top',
        offset: [0, -10],
        opacity: 0.95
      });

      markersRef.current[proj.id] = marker;
      bounds.push([lat, lng]);
    });

    // Auto-fit bounds if we have projects plotted
    if (bounds.length > 0) {
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 12
      });
    }

    // Fix for Leaflet sizing inside tab/flex containers
    const resizeTimeout = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(resizeTimeout);
    };
  }, [showMap, filteredProjects]);

  // 2. Pan to selected project when it changes
  useEffect(() => {
    if (showMap && mapRef.current && selectedMapProject?.mapCoordinates) {
      const { lat, lng } = selectedMapProject.mapCoordinates;
      if (typeof lat === 'number' && typeof lng === 'number') {
        mapRef.current.setView([lat, lng], 13, {
          animate: true,
          duration: 0.8
        });

        // Highlight marker icon when selected
        Object.keys(markersRef.current).forEach(projId => {
          const marker = markersRef.current[projId];
          const isActive = selectedMapProject.id === projId;
          const createMarkerIcon = (active: boolean) => L.divIcon({
            html: `<div style="
              width: 32px;
              height: 32px;
              background-color: ${active ? '#f2b705' : '#0b192c'};
              border: 2px solid white;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              box-shadow: 0 4px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              transition: transform 0.2s ease, background-color 0.2s ease;
            ">
              <div style="
                width: 12px;
                height: 12px;
                background-color: white;
                border-radius: 50%;
              "></div>
            </div>`,
            className: 'custom-leaflet-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
          });
          marker.setIcon(createMarkerIcon(isActive));
        });
      }
    }
  }, [selectedMapProject, showMap]);

  // 3. Clean up map on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Pagination bounds
  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProjects.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProjects, currentPage]);

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 250, behavior: 'smooth' });
  };

  const togglePropertyType = (type: string) => {
    setSelectedPropertyTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
    setCurrentPage(1);
  };

  const toggleFacing = (facing: string) => {
    setSelectedFacings(prev => 
      prev.includes(facing) ? prev.filter(f => f !== facing) : [...prev, facing]
    );
    setCurrentPage(1);
  };

  const toggleCity = (city: string) => {
    setSelectedCities(prev => 
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    );
    setCurrentPage(1);
  };

  const toggleLocation = (loc: string) => {
    setSelectedLocations(prev => 
      prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]
    );
    setCurrentPage(1);
  };
  const clearPropertyTypes = () => { setSelectedPropertyTypes([]); setCurrentPage(1); };
  const clearFacings = () => { setSelectedFacings([]); setCurrentPage(1); };
  const clearCities = () => { setSelectedCities([]); setCurrentPage(1); };
  const clearLocations = () => { setSelectedLocations([]); setCurrentPage(1); };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setCategoryFilter('All');
    setPriceSort('default');
    setSelectedPropertyTypes([]);
    setSelectedFacings([]);
    setSelectedCities([]);
    setSelectedLocations([]);
    setCurrentPage(1);
  };

  // Reusable checkbox panel renderer matching reference mock colors
  const renderFilterPanel = (
    title: string,
    key: 'propertyType' | 'facing' | 'city' | 'location',
    options: string[],
    selectedValues: string[],
    onToggle: (val: string) => void,
    onClear: () => void,
    headerColor: string
  ) => {
    const isOpen = panelOpen[key];
    return (
      <div className="filter-card-panel mb-3 shadow-sm" style={{ border: `1px solid ${headerColor}`, borderRadius: '8px', overflow: 'hidden' }}>
        <div 
          className="filter-card-header flex justify-between align-center px-2 py-1.5 cursor-pointer text-white"
          style={{ backgroundColor: headerColor }}
          onClick={() => togglePanel(key)}
        >
          <div className="flex align-center gap-0.5" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ChevronDown 
              size={18} 
              style={{ 
                transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', 
                transition: 'transform 0.2s ease' 
              }} 
            />
            <span className="font-bold text-sm uppercase tracking-wider" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>{title}</span>
          </div>
          {selectedValues.length > 0 && (
            <button 
              onClick={(e) => { e.stopPropagation(); onClear(); }} 
              className="clear-panel-btn text-xs font-semibold text-white"
              style={{ background: 'transparent', border: 'none', textDecoration: 'underline', cursor: 'pointer', outline: 'none' }}
            >
              Clear
            </button>
          )}
        </div>
        
        {isOpen && (
          <div className="filter-card-body p-2 scrollable-filter-list" style={{ maxHeight: '180px', overflowY: 'auto', borderTop: 'none', backgroundColor: 'var(--white)', padding: '0.75rem' }}>
            {options.map((opt, idx) => {
              const isChecked = selectedValues.includes(opt);
              return (
                <label key={idx} className="filter-checkbox-row flex align-center gap-0.5 py-0.5 text-sm cursor-pointer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0', userSelect: 'none' }}>
                  <input 
                    type="checkbox" 
                    checked={isChecked}
                    onChange={() => onToggle(opt)}
                    style={{ cursor: 'pointer', accentColor: headerColor, width: '16px', height: '16px' }}
                  />
                  <span className={isChecked ? 'font-bold text-primary' : 'text-text-primary'} style={{ fontSize: '0.9rem', color: isChecked ? 'var(--primary)' : 'var(--text-primary)' }}>{opt}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="projects-page">
      {/* Header Banner */}
      <section className="page-header py-4 text-center text-white" style={{ background: 'linear-gradient(rgba(11,25,44,0.85), rgba(11,25,44,0.85)), url(https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&auto=format&fit=crop&q=80)', backgroundSize: 'cover' }}>
        <div className="container">
          <h1 className="text-white text-4xl">Properties Portfolio</h1>
          <p className="text-muted" style={{ color: 'rgba(255,255,255,0.75)' }}>Explore our ongoing, upcoming, and successfully completed premium ventures</p>
        </div>
      </section>

      {/* Top Filter Bar Block */}
      <section className="filter-section container py-3">
        <div className="filter-wrapper glass-card py-2 px-2 flex flex-col gap-2">
          {/* Row 1: Search, Sorting, Status, Mobile Toggle */}
          <div className="flex gap-2 justify-between flex-wrap align-center w-full">
            <div className="search-bar-wrapper flex-1 min-w-300">
              <Search className="search-bar-icon" size={18} />
              <input 
                type="text" 
                placeholder="Search by name, location, keyword..." 
                className="search-bar-input"
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              />
            </div>
            
            <div className="flex gap-1.5 align-center flex-wrap">
              {/* Status Select inside Top Bar */}
              <select 
                className="form-control" 
                style={{ width: '160px', marginBottom: 0, padding: '0.45rem 0.75rem', fontSize: '0.85rem' }} 
                value={statusFilter} 
                onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="All">All Statuses</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Completed">Completed</option>
              </select>

              {/* Sorting Select inside Top Bar */}
              <select 
                className="form-control" 
                style={{ width: '160px', marginBottom: 0, padding: '0.45rem 0.75rem', fontSize: '0.85rem' }} 
                value={priceSort} 
                onChange={e => { setPriceSort(e.target.value); setCurrentPage(1); }}
              >
                <option value="default">Sort Properties</option>
                <option value="low-high">Price: Low to High</option>
                <option value="high-low">Price: High to Low</option>
                <option value="alphabetical">Name: A to Z</option>
              </select>

              {/* Mobile Filter Toggle Button */}
              <button 
                className="btn btn-outline btn-sm mobile-filters-btn flex align-center gap-0.5"
                style={{ padding: '0.5rem 0.8rem', borderRadius: '8px' }}
                onClick={() => setMobileFiltersOpen(true)}
              >
                <SlidersHorizontal size={16} /> Filters
              </button>

              {/* Grid/List/Map Toggles */}
              <div className="layout-toggle-btns flex gap-1 bg-light-soft p-0.5" style={{ padding: '0.25rem', borderRadius: '8px' }}>
                <button 
                  className={`toggle-btn ${!showMap && viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => { setShowMap(false); setViewMode('grid'); }}
                  title="Grid View"
                >
                  <LayoutGrid size={18} />
                </button>
                <button 
                  className={`toggle-btn ${!showMap && viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => { setShowMap(false); setViewMode('list'); }}
                  title="List View"
                >
                  <List size={18} />
                </button>
                <button 
                  className={`toggle-btn ${showMap ? 'active' : ''}`}
                  onClick={() => setShowMap(true)}
                  title="Interactive Map View"
                >
                  <Map size={18} /> Map View
                </button>
              </div>
            </div>
          </div>

          {/* Applied filters feedback */}
          <div className="flex justify-between align-center text-sm text-muted w-full mt-1">
            <span>Showing {filteredProjects.length} matching properties</span>
            {(search || statusFilter !== 'All' || categoryFilter !== 'All' || priceSort !== 'default' || selectedPropertyTypes.length > 0 || selectedFacings.length > 0 || selectedCities.length > 0 || selectedLocations.length > 0) && (
              <button onClick={handleResetFilters} className="font-semibold text-secondary" style={{ background: 'none', border: 'none', color: 'var(--secondary)', cursor: 'pointer', textDecoration: 'underline' }}>Clear All Filters</button>
            )}
          </div>
        </div>
      </section>

      {/* Main Split Layout: Sidebar + Content */}
      <section className="container py-2 pb-6">
        <div className="projects-split-layout flex gap-4" style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', position: 'relative' }}>
          
          {/* Backdrop overlay for mobile filters */}
          {mobileFiltersOpen && (
            <div 
              className="mobile-filters-backdrop" 
              onClick={() => setMobileFiltersOpen(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(15, 43, 70, 0.4)',
                backdropFilter: 'blur(4px)',
                zIndex: 140
              }}
            />
          )}

          {/* Sidebar Checkbox Filters */}
          <aside className={`filters-sidebar ${mobileFiltersOpen ? 'mobile-open' : ''}`}>
            <div className="sidebar-header flex justify-between align-center mb-2 hide-desktop" style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="text-primary font-bold">Filter Options</h3>
              <button onClick={() => setMobileFiltersOpen(false)} className="close-filters-btn" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} className="text-primary" />
              </button>
            </div>

            {renderFilterPanel('Property Type', 'propertyType', propertyTypesOptions, selectedPropertyTypes, togglePropertyType, clearPropertyTypes, '#00a884')}
            {renderFilterPanel('Facings', 'facing', facingsOptions, selectedFacings, toggleFacing, clearFacings, '#8d5da9')}
            {renderFilterPanel('Cities', 'city', citiesList, selectedCities, toggleCity, clearCities, '#3a9ad9')}
            {renderFilterPanel('Locations', 'location', locationsList, selectedLocations, toggleLocation, clearLocations, '#e68a00')}
          </aside>

          {/* Main Results Column */}
          <div className="projects-main-content flex-1" style={{ width: '100%' }}>
            {showMap ? (
              /* Map View */
              <div className="map-view-wrapper glass-card grid grid-3 gap-2 p-2" style={{ padding: '1rem', minHeight: '500px' }}>
                <div className="map-canvas-column grid-2-cols flex-2 relative" style={{ gridColumn: 'span 2', minHeight: '400px', backgroundColor: '#e2e8f0', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', zIndex: 1 }}>
                  <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '400px' }} />
                  <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(11,25,44,0.85)', color: '#fff', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', zIndex: 1000, pointerEvents: 'none' }}>
                    Interactive Venture Pins - Click markers to view details
                  </div>
                </div>

                <div className="map-sidebar-column admin-card">
                  {selectedMapProject ? (
                    <div className="flex flex-col gap-2">
                      <div className="map-proj-img-box" style={{ height: '140px', borderRadius: '8px', overflow: 'hidden' }}>
                        <img src={selectedMapProject.images[0]} alt={selectedMapProject.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <span className={`badge badge-${selectedMapProject.status.toLowerCase()}`}>{selectedMapProject.status}</span>
                      <h3>{selectedMapProject.name}</h3>
                      <p className="text-sm text-muted flex align-center gap-1"><MapPin size={14} /> {selectedMapProject.location}</p>
                      <p className="text-sm text-muted font-bold text-secondary">{selectedMapProject.priceRange}</p>
                      <p className="text-sm line-clamp-3">{selectedMapProject.description}</p>
                      <div className="flex gap-1 mt-1">
                        <button 
                          onClick={() => onNavigate('project-details', null, null, { id: selectedMapProject.id })} 
                          className="btn btn-sm btn-primary flex-1"
                        >
                          Full Details <ArrowRight size={14} />
                        </button>
                        <button 
                          onClick={() => onOpenEnquiry(selectedMapProject.name)}
                          className="btn btn-sm btn-secondary"
                        >
                          Callback
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col align-center justify-center text-center text-muted h-full py-4" style={{ minHeight: '300px' }}>
                      <Map size={48} className="mb-2" />
                      <p className="font-semibold">No Property Selected</p>
                      <p className="text-sm">Click any pin on the map view to display real estate specifications, layouts, and enquiry choices.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Listing Cards View Mode */
              <>
                {filteredProjects.length === 0 ? (
                  <div className="text-center py-8 glass-card">
                    <p className="text-lg font-bold text-muted mb-2">No matching properties found</p>
                    <p className="text-sm text-muted">Try resetting your filters or modifying your keyword searches.</p>
                    <button onClick={handleResetFilters} className="btn btn-secondary mt-2">Reset All Filters</button>
                  </div>
                ) : viewMode === 'grid' ? (
                  /* Grid Layout */
                  <div className="grid grid-2 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {paginatedProjects.map(project => (
                      <div key={project.id} className="property-card flex flex-col shadow-sm" style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div className="property-card-img-wrapper" onClick={() => onNavigate('project-details', null, null, { id: project.id })} style={{ cursor: 'pointer', height: '200px' }}>
                          <img src={project.images[0]} alt={project.name} className="property-card-img" />
                          <span className={`property-card-badge badge badge-${project.status.toLowerCase()}`}>{project.status}</span>
                          <span className="property-card-price">{project.priceRange}</span>
                        </div>
                        <div className="property-card-content flex-1 flex flex-col justify-between p-3" style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '1.25rem' }}>
                          <div>
                            <span className="text-xs text-secondary font-bold uppercase tracking-wider">
                              {project.category} {project.subCategory ? `| ${project.subCategory}` : ''} {project.classification ? `| ${project.classification}` : ''}
                            </span>
                            <h3 className="property-card-title my-0.5" onClick={() => onNavigate('project-details', null, null, { id: project.id })} style={{ cursor: 'pointer', fontSize: '1.2rem' }}>{project.name}</h3>
                            <p className="property-card-location flex align-center gap-0.5 text-xs text-muted" style={{ display: 'flex', alignItems: 'center' }}><MapPin size={12} className="text-secondary" /> {project.location}</p>
                            
                            {/* Specs line */}
                            <div className="property-card-specs flex justify-between text-xs py-1" style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', margin: '0.50rem 0', color: 'var(--text-primary)', fontWeight: 600 }}>
                              {project.facing && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Compass size={13} className="text-secondary" /> {project.facing}
                                </span>
                              )}
                              {project.floors !== undefined && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Building2 size={13} className="text-secondary" /> {project.floors === 0 ? 'Plots Layout' : `G+${project.floors} Floors`}
                                </span>
                              )}
                              {project.unitsCount !== undefined && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Home size={13} className="text-secondary" /> {project.unitsCount} Units
                                </span>
                              )}
                              {project.uds && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Sparkles size={13} className="text-secondary" /> UDS: {project.uds} Sq.Yds
                                </span>
                              )}
                              {project.width && project.length && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <SlidersHorizontal size={13} className="text-secondary" /> {project.width} x {project.length} ft
                                </span>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted line-clamp-3 mb-2" style={{ fontSize: '0.85rem' }}>{project.description}</p>
                          </div>
                          
                          <div className="flex gap-2">
                            <button 
                              onClick={() => onNavigate('project-details', null, null, { id: project.id })} 
                              className="btn btn-sm btn-primary flex-1"
                            >
                              View Details <ArrowRight size={14} />
                            </button>
                            <button 
                              onClick={() => onOpenEnquiry(project.name)} 
                              className="btn btn-sm btn-outline btn-icon-only flex align-center justify-center"
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Quick Callback"
                            >
                              <Phone size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* List Layout - Side-by-Side Images Specification Cards */
                  <div className="flex flex-col gap-3" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {paginatedProjects.map(project => {
                      const specPlanImage = project.specImage || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60';
                      return (
                        <div key={project.id} className="premium-spec-card flex shadow-sm" style={{ display: 'flex', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', backgroundColor: 'var(--white)' }}>
                          {/* Left Block: Render elevation & specs side by side */}
                          <div className="card-visual-images flex" style={{ display: 'flex', flex: 1, minWidth: '360px', position: 'relative' }}>
                            <div className="visual-img-box" style={{ flex: 1, height: '240px', position: 'relative', overflow: 'hidden' }}>
                              <img src={project.images[0]} alt={project.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <div className="img-overlay-label">Render Elevation</div>
                            </div>
                            <div className="visual-img-box" style={{ flex: 1, height: '240px', position: 'relative', overflow: 'hidden', borderLeft: '2px solid var(--white)' }}>
                              <img src={specPlanImage} alt="Specification Blueprint" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <div className="img-overlay-label">Specs Sheet / Plan</div>
                            </div>
                            <span className={`property-card-badge badge badge-${project.status.toLowerCase()}`} style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
                              {project.status}
                            </span>
                          </div>

                          {/* Right Block: Content details & Specs stats */}
                          <div className="card-details-content flex flex-col justify-between p-3" style={{ flex: 1.2, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                            <div>
                              <div className="flex justify-between align-center mb-0.5" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="text-xs text-secondary font-bold uppercase tracking-wider">
                                  {project.category} {project.subCategory ? `| ${project.subCategory}` : ''} {project.classification ? `| ${project.classification}` : ''}
                                </span>
                                <span className="text-xl font-extrabold text-secondary">{project.priceRange}</span>
                              </div>
                              <h3 className="my-0.5 text-primary text-xl font-bold cursor-pointer hover-text-secondary" onClick={() => onNavigate('project-details', null, null, { id: project.id })}>
                                {project.name}
                              </h3>
                              <p className="property-card-location flex align-center gap-0.5 text-muted text-sm my-0.5" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <MapPin size={14} className="text-secondary" /> {project.location}
                              </p>
                              
                              {/* Specs row stats */}
                              <div className="highlights-row flex gap-2 my-1 text-sm font-semibold text-primary" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '0.75rem 0' }}>
                                {project.floors !== undefined && (
                                  <span className="flex align-center gap-0.5 bg-light-soft px-1 py-0.5" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                                    <Building2 size={13} className="text-secondary" /> {project.floors === 0 ? 'Open Plots Layout' : `Floors: G+${project.floors}`}
                                  </span>
                                )}
                                {project.unitsCount !== undefined && (
                                  <span className="flex align-center gap-0.5 bg-light-soft px-1 py-0.5" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                                    <Home size={13} className="text-secondary" /> Plots/Flats: {project.unitsCount}
                                  </span>
                                )}
                                {project.facing && (
                                  <span className="flex align-center gap-0.5 bg-light-soft px-1 py-0.5" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                                    <Compass size={13} className="text-secondary" /> Facing: {project.facing}
                                  </span>
                                )}
                                {project.uds && (
                                  <span className="flex align-center gap-0.5 bg-light-soft px-1 py-0.5" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                                    <Sparkles size={13} className="text-secondary" /> UDS: {project.uds} Sq.Yds
                                  </span>
                                )}
                                {project.width && project.length && (
                                  <span className="flex align-center gap-0.5 bg-light-soft px-1 py-0.5" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                                    <SlidersHorizontal size={13} className="text-secondary" /> Size: {project.width} x {project.length} ft
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="pt-1.5" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                              {project.availabilityDetails && (
                                <div className="availability-badges-row flex align-center gap-0.5 text-sm mb-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                                  <span className="font-bold text-primary flex align-center gap-0.5" style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Calendar size={13} className="text-secondary" /> Availability:
                                  </span>
                                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {project.availabilityDetails.split(',').map((part, idx) => {
                                      const [type, qty] = part.split(':').map(s => s.trim());
                                      return (
                                        <span key={idx} className="badge badge-ongoing" style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', backgroundColor: '#e6f0fa', color: '#0b2c5c', border: '1px solid #d0e1f5', borderRadius: '4px', fontWeight: 600 }}>
                                          {type} {qty ? `(${qty} units)` : ''}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex gap-1" style={{ display: 'flex', gap: '0.5rem' }}>
                                <button 
                                  onClick={() => onNavigate('project-details', null, null, { id: project.id })} 
                                  className="btn btn-sm btn-primary flex-1"
                                  style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                                >
                                  Know More
                                </button>
                                <button 
                                  onClick={() => onOpenEnquiry(project.name)} 
                                  className="btn btn-sm btn-secondary flex-1"
                                  style={{ padding: '0.5rem', background: '#dc2626', color: 'var(--white)', border: 'none' }}
                                >
                                  Get Callback
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="pagination-wrapper flex justify-center align-center gap-1 py-4">
                    <button 
                      className="btn btn-sm btn-outline" 
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                    >
                      Previous
                    </button>
                    
                    {Array(totalPages).fill(0).map((_, i) => (
                      <button 
                        key={i} 
                        className={`pagination-number ${currentPage === i + 1 ? 'active' : ''}`}
                        onClick={() => handlePageChange(i + 1)}
                      >
                        {i + 1}
                      </button>
                    ))}

                    <button 
                      className="btn btn-sm btn-outline" 
                      disabled={currentPage === totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <style>{`
        .min-w-300 { min-width: 300px; }
        .search-bar-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .search-bar-icon {
          position: absolute;
          left: 1rem;
          color: var(--text-muted);
        }
        .search-bar-input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.75rem;
          border: 1.5px solid var(--border-color);
          border-radius: var(--radius-md);
          font-size: 0.95rem;
          transition: var(--transition-fast);
        }
        .search-bar-input:focus {
          border-color: var(--secondary);
          box-shadow: 0 0 0 3px rgba(242, 183, 5, 0.15);
        }
        
        .toggle-btn {
          padding: 0.4rem 0.8rem;
          border-radius: var(--radius-sm);
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--text-muted);
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }
        .toggle-btn.active {
          background-color: var(--white);
          color: var(--primary);
          box-shadow: var(--shadow-sm);
        }

        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Pagination style */
        .pagination-number {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          color: var(--text-primary);
          transition: var(--transition-fast);
        }
        .pagination-number.active, .pagination-number:hover {
          background-color: var(--secondary);
          color: var(--white);
          border-color: var(--secondary);
        }

        /* Map Pin Markers */
        .map-marker-btn {
          background: none;
          border: none;
          font-size: 2.5rem;
          line-height: 1;
        }
        .marker-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(-5px);
          background-color: var(--primary);
          color: var(--white);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: var(--shadow-md);
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .map-marker-btn:hover .marker-tooltip {
          opacity: 1;
        }
        .pulse-active {
          animation: mapPinPulse 1s infinite alternate;
        }
        @keyframes mapPinPulse {
          from { transform: translate(-50%, -100%) scale(1); }
          to { transform: translate(-50%, -100%) scale(1.25); }
        }

        /* Filters Sidebar styling */
        .filters-sidebar {
          width: 280px;
          flex-shrink: 0;
          display: block;
        }

        .scrollable-filter-list::-webkit-scrollbar {
          width: 6px;
        }
        .scrollable-filter-list::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .scrollable-filter-list::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 3px;
        }

        /* Spec Cards details labels */
        .img-overlay-label {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          background: rgba(15, 43, 70, 0.85);
          color: #fff;
          font-size: 0.75rem;
          font-weight: 700;
          text-align: center;
          padding: 0.35rem 0;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .hover-text-secondary:hover {
          color: var(--secondary) !important;
        }

        /* Mobile filters elements */
        .mobile-filters-btn {
          display: none;
        }
        .hide-desktop {
          display: none;
        }

        @media (max-width: 1024px) {
          .projects-split-layout {
            flex-direction: column;
          }
          .mobile-filters-btn {
            display: flex !important;
          }
          .hide-desktop {
            display: flex !important;
          }
          .filters-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            width: 290px;
            height: 100vh;
            z-index: 150;
            background: var(--white);
            padding: 1.5rem;
            box-shadow: var(--shadow-xl);
            overflow-y: auto;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            display: block;
          }
          .filters-sidebar.mobile-open {
            transform: translateX(0);
          }
        }

        @media (max-width: 768px) {
          .premium-spec-card {
            flex-direction: column !important;
          }
          .card-visual-images {
            min-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};
