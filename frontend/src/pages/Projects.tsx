import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LayoutGrid, List, Map, Search, MapPin, ArrowRight, ChevronDown, SlidersHorizontal, Compass, Building2, Home, Phone, Calendar, Sparkles } from 'lucide-react';
import type { Project, ProjectCategory, SiteCategory, PropertyType, Facing, City, LocationMaster } from '../types';
import { getProjectMainImage } from '../utils/image';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ProjectsProps {
  projects: Project[];
  initialParams?: any;
  onNavigate: (page: string, category?: ProjectCategory | null, siteCategory?: SiteCategory | null, params?: any) => void;
  onOpenEnquiry: (projectName?: string) => void;
  propertyTypes: PropertyType[];
  facings: Facing[];
  cities?: City[];
  locations?: LocationMaster[];
}

export const Projects: React.FC<ProjectsProps> = ({
  projects,
  initialParams,
  onNavigate,
  onOpenEnquiry,
  propertyTypes = [],
  facings = [],
  cities = [],
  locations = []
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
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
  
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const filterNavRef = useRef<HTMLDivElement>(null);
  const heroSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const inFilterNav = filterNavRef.current && filterNavRef.current.contains(e.target as Node);
      const inHeroSearch = heroSearchRef.current && heroSearchRef.current.contains(e.target as Node);
      if (!inFilterNav && !inHeroSearch) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (initialParams) {
      if (initialParams.search !== undefined) setSearch(initialParams.search || '');
      if (initialParams.status !== undefined) setStatusFilter(initialParams.status || 'All');
      if (initialParams.category !== undefined) setCategoryFilter(initialParams.category || 'All');
    }
  }, [initialParams]);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 4;

  // Map state
  const [selectedMapProject, setSelectedMapProject] = useState<Project | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  // Extract unique cities dynamically from Master Data & projects database
  const citiesList = useMemo(() => {
    const set = new Set<string>();
    cities.forEach(c => {
      if (c.name) set.add(c.name);
    });
    projects.forEach(p => {
      if (p.city) {
        set.add(p.city);
      } else {
        const parts = (p.location || '').split(',');
        const city = parts[parts.length - 1]?.trim();
        if (city) set.add(city);
      }
    });
    return Array.from(set).sort();
  }, [cities, projects]);

  // Extract unique micro-locations dynamically from Master Data & projects database
  const locationsList = useMemo(() => {
    const set = new Set<string>();
    const selectedCitySet = new Set(selectedCities.map(c => c.toLowerCase()));

    locations.forEach(loc => {
      const parentCityName = loc.city?.name || loc.parentCity || cities.find(c => c.id === loc.cityId)?.name || '';
      const areaName = loc.name || loc.locationArea || '';
      if (selectedCitySet.size === 0 || selectedCitySet.has(parentCityName.toLowerCase())) {
        if (areaName) set.add(areaName);
      }
    });

    projects.forEach(p => {
      const pCity = (p.city || (p.location || '').split(',').pop()?.trim() || '').toLowerCase();
      if (selectedCitySet.size === 0 || (pCity && selectedCitySet.has(pCity))) {
        if (p.microLocation) {
          set.add(p.microLocation);
        } else {
          const parts = (p.location || '').split(',');
          const locName = parts[0]?.trim();
          if (locName) set.add(locName);
        }
      }
    });
    return Array.from(set).sort();
  }, [locations, cities, projects, selectedCities]);

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

  return (
    <div className="projects-page">
      {/* 1. HERO BANNER WITH EMBEDDED MAGICBRICKS FLOATING SEARCH CARD */}
      <section 
        className="page-header relative text-center text-white" 
        style={{ 
          background: 'linear-gradient(rgba(11,25,44,0.7), rgba(11,25,44,0.75)), url(/page_header_hd.png)', 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          paddingTop: '1.5rem',
          paddingBottom: '1.5rem'
        }}
      >
        <div className="container flex flex-col align-center justify-center">
          <h1 className="text-white text-4xl font-extrabold mb-1" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)', fontSize: '2rem', marginBottom: '0.35rem' }}>Properties Portfolio</h1>
          <p className="text-muted" style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', maxWidth: '600px', marginBottom: '1rem' }}>
            Explore our ongoing, upcoming, and successfully completed premium ventures
          </p>

          {/* Hero Floating Search Widget Card */}
          <div 
            ref={heroSearchRef}
            className="hero-search-widget-card"
            style={{
              width: '100%',
              maxWidth: '1120px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '0.4rem 0.6rem',
              boxShadow: '0 12px 35px rgba(0,0,0,0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              flexWrap: 'wrap',
              margin: '0 auto',
              border: '2px solid var(--secondary)'
            }}
          >
            {/* 1. 🔍 Search Projects Input */}
            <div style={{ flex: '2 1 200px', minWidth: '180px', display: 'flex', alignItems: 'center', padding: '0 0.5rem', position: 'relative' }}>
              <Search size={18} style={{ color: 'var(--primary)', marginRight: '0.5rem' }} />
              <input 
                type="text" 
                placeholder="Search Projects..." 
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  backgroundColor: 'transparent'
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 700 }}>✕</button>
              )}
            </div>

            <div style={{ width: '1px', height: '32px', backgroundColor: '#e2e8f0' }} />

            {/* 2. 📍 City Dropdown */}
            <div className="relative" style={{ flex: '1 1 120px', minWidth: '120px', position: 'relative' }}>
              <button 
                onClick={() => setActiveDropdown(activeDropdown === 'city' ? null : 'city')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.6rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: selectedCities.length > 0 ? '#0b2c5c' : '#475569',
                  background: selectedCities.length > 0 ? '#e6f0fa' : 'transparent',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                <span className="flex align-center gap-0.5 text-ellipsis overflow-hidden whitespace-nowrap" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MapPin size={15} style={{ color: '#0284c7' }} /> 
                  {selectedCities.length > 0 ? selectedCities.join(', ') : 'City'}
                </span>
                <ChevronDown size={14} />
              </button>

              {activeDropdown === 'city' && (
                <div className="filter-popover shadow-lg" style={{ position: 'absolute', top: '130%', left: 0, width: '220px', background: '#ffffff', borderRadius: '12px', padding: '0.75rem', zIndex: 100, boxShadow: '0 10px 25px rgba(0,0,0,0.3)', border: '1px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>City</span>
                    {selectedCities.length > 0 && <button onClick={clearCities} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}>Clear</button>}
                  </div>
                  {citiesList.map((city, idx) => (
                    <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', fontSize: '0.85rem', color: '#1e293b', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedCities.includes(city)} onChange={() => toggleCity(city)} style={{ accentColor: '#0284c7' }} /> {city}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div style={{ width: '1px', height: '32px', backgroundColor: '#e2e8f0' }} />

            {/* 3. 📍 Location Dropdown */}
            <div className="relative" style={{ flex: '1 1 130px', minWidth: '130px', position: 'relative' }}>
              <button 
                onClick={() => setActiveDropdown(activeDropdown === 'location' ? null : 'location')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.6rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: selectedLocations.length > 0 ? '#0b2c5c' : '#475569',
                  background: selectedLocations.length > 0 ? '#fef3c7' : 'transparent',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                <span className="flex align-center gap-0.5 text-ellipsis overflow-hidden whitespace-nowrap" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MapPin size={15} style={{ color: '#d97706' }} /> 
                  {selectedLocations.length > 0 ? selectedLocations.join(', ') : 'Location'}
                </span>
                <ChevronDown size={14} />
              </button>

              {activeDropdown === 'location' && (
                <div className="filter-popover shadow-lg" style={{ position: 'absolute', top: '130%', left: 0, width: '220px', background: '#ffffff', borderRadius: '12px', padding: '0.75rem', zIndex: 100, boxShadow: '0 10px 25px rgba(0,0,0,0.3)', border: '1px solid #cbd5e1', maxHeight: '220px', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase' }}>Location</span>
                    {selectedLocations.length > 0 && <button onClick={clearLocations} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}>Clear</button>}
                  </div>
                  {locationsList.map((loc, idx) => (
                    <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', fontSize: '0.85rem', color: '#1e293b', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedLocations.includes(loc)} onChange={() => toggleLocation(loc)} style={{ accentColor: '#d97706' }} /> {loc}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div style={{ width: '1px', height: '32px', backgroundColor: '#e2e8f0' }} />

            {/* 4. 🏠 Property Type Dropdown */}
            <div className="relative" style={{ flex: '1 1 140px', minWidth: '140px', position: 'relative' }}>
              <button 
                onClick={() => setActiveDropdown(activeDropdown === 'propertyType' ? null : 'propertyType')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.6rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: selectedPropertyTypes.length > 0 ? '#00a884' : '#475569',
                  background: selectedPropertyTypes.length > 0 ? '#e6f4f1' : 'transparent',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                <span className="flex align-center gap-0.5 text-ellipsis overflow-hidden whitespace-nowrap" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Home size={15} style={{ color: '#00a884' }} /> 
                  {selectedPropertyTypes.length > 0 ? `${selectedPropertyTypes.length} Types` : 'Property Type'}
                </span>
                <ChevronDown size={14} />
              </button>

              {activeDropdown === 'propertyType' && (
                <div className="filter-popover shadow-lg" style={{ position: 'absolute', top: '130%', left: 0, width: '220px', background: '#ffffff', borderRadius: '12px', padding: '0.75rem', zIndex: 100, boxShadow: '0 10px 25px rgba(0,0,0,0.3)', border: '1px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#00a884', textTransform: 'uppercase' }}>Property Type</span>
                    {selectedPropertyTypes.length > 0 && <button onClick={clearPropertyTypes} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}>Clear</button>}
                  </div>
                  {propertyTypesOptions.map((type, idx) => (
                    <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', fontSize: '0.85rem', color: '#1e293b', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedPropertyTypes.includes(type)} onChange={() => togglePropertyType(type)} style={{ accentColor: '#00a884' }} /> {type}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div style={{ width: '1px', height: '32px', backgroundColor: '#e2e8f0' }} />

            {/* 5. Status Select Dropdown */}
            <div style={{ flex: '1 1 110px', minWidth: '110px' }}>
              <select 
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.5rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#475569',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="All" style={{ color: '#000' }}>All Status</option>
                <option value="Ongoing" style={{ color: '#000' }}>Ongoing</option>
                <option value="Upcoming" style={{ color: '#000' }}>Upcoming</option>
                <option value="Completed" style={{ color: '#000' }}>Completed</option>
              </select>
            </div>

            <div style={{ width: '1px', height: '32px', backgroundColor: '#e2e8f0' }} />

            {/* 6. More Filters Popover (Facing + Sorting) */}
            <div className="relative" style={{ flex: '1 1 130px', minWidth: '120px', position: 'relative' }}>
              <button 
                onClick={() => setActiveDropdown(activeDropdown === 'moreFilters' ? null : 'moreFilters')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.6rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: selectedFacings.length > 0 || priceSort !== 'default' ? '#8d5da9' : '#475569',
                  background: selectedFacings.length > 0 || priceSort !== 'default' ? '#f3e8ff' : 'transparent',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                <span className="flex align-center gap-0.5" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <SlidersHorizontal size={14} style={{ color: '#8d5da9' }} /> 
                  More Filters
                </span>
                <ChevronDown size={14} />
              </button>

              {activeDropdown === 'moreFilters' && (
                <div className="filter-popover shadow-lg" style={{ position: 'absolute', top: '130%', right: 0, width: '250px', background: '#ffffff', borderRadius: '12px', padding: '0.85rem', zIndex: 100, boxShadow: '0 10px 25px rgba(0,0,0,0.3)', border: '1px solid #cbd5e1' }}>
                  
                  {/* Facings Section */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#8d5da9', textTransform: 'uppercase' }}>Facings</span>
                      {selectedFacings.length > 0 && <button onClick={clearFacings} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}>Clear</button>}
                    </div>
                    <div style={{ maxHeight: '140px', overflowY: 'auto' }}>
                      {facingsOptions.map((facing, idx) => (
                        <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0', fontSize: '0.82rem', color: '#1e293b', cursor: 'pointer' }}>
                          <input type="checkbox" checked={selectedFacings.includes(facing)} onChange={() => toggleFacing(facing)} style={{ accentColor: '#8d5da9' }} /> {facing}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Price / Name Sort Section */}
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0b192c', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>Sort Properties</span>
                    <select 
                      value={priceSort} 
                      onChange={e => { setPriceSort(e.target.value); setCurrentPage(1); }}
                      style={{ width: '100%', padding: '0.4rem', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="default">Default Sorting</option>
                      <option value="low-high">Price: Low to High</option>
                      <option value="high-low">Price: High to Low</option>
                      <option value="alphabetical">Name: A to Z</option>
                    </select>
                  </div>

                </div>
              )}
            </div>

            {/* 7. [ Search ] Primary Action Button */}
            <button 
              onClick={() => {
                setActiveDropdown(null);
                const elem = document.querySelector('.projects-main-layout');
                if (elem) elem.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                backgroundColor: 'steelblue',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '0.55rem 1.4rem',
                fontSize: '0.88rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(70, 130, 180, 0.4)',
                transition: 'all 0.2s ease',
                marginLeft: 'auto'
              }}
            >
              <Search size={16} /> Search
            </button>

          </div>

        </div>
      </section>

      {/* 2. SLEEK LIGHT STICKY RESULTS BAR (Pinned under header when scrolling) */}
      <div 
        ref={filterNavRef}
        className="sticky-light-filter-navbar"
        style={{
          position: 'sticky',
          top: 'var(--header-height, 62px)',
          zIndex: 90,
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
          padding: '0.3rem 0',
          transition: 'all 0.25s ease'
        }}
      >
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          
          {/* Left: Results Count + Active Filters Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
              Showing <strong style={{ color: 'var(--primary)', fontWeight: 800 }}>{filteredProjects.length}</strong> Properties
            </span>
            {(selectedCities.length > 0 || selectedLocations.length > 0 || selectedPropertyTypes.length > 0 || selectedFacings.length > 0) && (
              <span style={{ backgroundColor: '#e6f0fa', color: '#0b2c5c', border: '1px solid #cbd5e1', fontSize: '0.73rem', padding: '0.18rem 0.55rem', borderRadius: '12px', fontWeight: 700 }}>
                {selectedCities.length + selectedLocations.length + selectedPropertyTypes.length + selectedFacings.length} Active Filters
              </span>
            )}
          </div>

          {/* Right: View Mode Toggles + Clear Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            
            {/* Layout Mode Toggles */}
            <div style={{ display: 'flex', gap: '2px', backgroundColor: '#f1f5f9', padding: '2px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <button 
                onClick={() => { setShowMap(false); setViewMode('grid'); }}
                style={{
                  padding: '0.28rem 0.6rem',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: !showMap && viewMode === 'grid' ? 'var(--primary)' : 'transparent',
                  color: !showMap && viewMode === 'grid' ? '#ffffff' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
                title="Grid View"
              >
                <LayoutGrid size={14} /> Grid
              </button>
              <button 
                onClick={() => { setShowMap(false); setViewMode('list'); }}
                style={{
                  padding: '0.28rem 0.6rem',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: !showMap && viewMode === 'list' ? 'var(--primary)' : 'transparent',
                  color: !showMap && viewMode === 'list' ? '#ffffff' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
                title="List View"
              >
                <List size={14} /> List
              </button>
              <button 
                onClick={() => setShowMap(true)}
                style={{
                  padding: '0.28rem 0.6rem',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: showMap ? 'var(--primary)' : 'transparent',
                  color: showMap ? '#ffffff' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
                title="Map View"
              >
                <Map size={14} /> Map
              </button>
            </div>

            {/* Clear Filters Button */}
            {(search || statusFilter !== 'All' || priceSort !== 'default' || selectedPropertyTypes.length > 0 || selectedFacings.length > 0 || selectedCities.length > 0 || selectedLocations.length > 0) && (
              <button 
                onClick={handleResetFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textDecoration: 'underline'
                }}
              >
                Clear Filters
              </button>
            )}

          </div>

        </div>
      </div>

      {/* Main Full-Width Content Container */}
      <section className="container py-4 pb-6">
        <div className="projects-main-layout" style={{ width: '100%' }}>
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
                        <img src={getProjectMainImage(selectedMapProject)} alt={selectedMapProject.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                          <img src={getProjectMainImage(project)} alt={project.name} className="property-card-img" />
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
                              {project.category !== 'Sites' && project.floors !== undefined && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Building2 size={13} className="text-secondary" /> {project.floors === 0 ? 'Plots Layout' : `G+${project.floors}`}
                                </span>
                              )}
                              {project.unitsCount !== undefined && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Home size={13} className="text-secondary" /> {project.unitsCount} Units
                                </span>
                              )}
                              {project.category === 'Sites' && project.uds && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Sparkles size={13} className="text-secondary" /> Total Yards: {project.uds} Sq.Yds
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
                                {project.category !== 'Sites' && project.floors !== undefined && (
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
                                {project.category === 'Sites' && project.uds && (
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
                                      const parts = part.split(':').map(s => s.trim());
                                      const type = parts[0];
                                      const qty = parts[1];
                                      let sftVal = '';
                                      let udsVal = '';
                                      if (parts.length >= 4) {
                                        sftVal = parts[2];
                                        udsVal = parts[3];
                                      } else if (parts.length === 3) {
                                        if (parts[2].toLowerCase().includes('sft') || parts[2].toLowerCase().includes('sq.ft')) {
                                          sftVal = parts[2];
                                        } else {
                                          udsVal = parts[2];
                                        }
                                      }
                                      return (
                                        <span key={idx} className="badge badge-ongoing" style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', backgroundColor: '#e6f0fa', color: '#0b2c5c', border: '1px solid #d0e1f5', borderRadius: '4px', fontWeight: 600 }}>
                                          {type} {qty ? `(${qty} units)` : ''}{sftVal ? ` | ${sftVal} SFT` : ''}{udsVal ? ` | UDS: ${udsVal} Sq.Yds` : ''}
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
            width: 85vw;
            max-width: 320px;
            height: 100vh;
            z-index: 150;
            background: var(--white);
            padding: 1.25rem 1rem;
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
          .min-w-300 {
            min-width: 100% !important;
          }
          .search-bar-wrapper {
            width: 100% !important;
          }
          .search-bar-input {
            font-size: 0.85rem !important;
            padding: 0.6rem 0.75rem 0.6rem 2.4rem !important;
          }
          .search-bar-icon {
            left: 0.75rem !important;
          }
          .layout-toggle-btns {
            width: 100% !important;
            display: flex !important;
            justify-content: space-between !important;
          }
          .layout-toggle-btns .toggle-btn {
            flex: 1 !important;
            justify-content: center !important;
            font-size: 0.78rem !important;
            padding: 0.4rem 0.2rem !important;
          }
          .premium-spec-card {
            flex-direction: column !important;
            border-radius: 12px !important;
          }
          .card-visual-images {
            min-width: 100% !important;
            flex-direction: column !important;
          }
          .visual-img-box {
            height: 170px !important;
            border-left: none !important;
            border-top: 1px solid var(--white) !important;
          }
          .card-details-content {
            padding: 1rem !important;
          }
          .highlights-row span {
            font-size: 0.75rem !important;
            padding: 0.2rem 0.4rem !important;
          }
          .availability-badges-row {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.35rem !important;
          }
        }
      `}</style>
    </div>
  );
};
