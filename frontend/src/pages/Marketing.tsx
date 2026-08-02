import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Project, ProjectCategory, PropertyType, Facing, City, LocationMaster } from '../types';
import { MapPin, ArrowRight, ShieldCheck, TrendingUp, Sparkles, Key, Search, ChevronDown, SlidersHorizontal, Compass, Building2, Home, LayoutGrid, List, Eye, FileText } from 'lucide-react';
import { getProjectMainImage, getSegmentFallbackSpecImage } from '../utils/image';

interface MarketingProps {
  category: ProjectCategory;
  siteCategory: string | null;
  projects: Project[];
  onNavigate: (page: string, category?: ProjectCategory | null, siteCategory?: string | null, params?: any) => void;
  propertyTypes?: PropertyType[];
  facings?: Facing[];
  cities?: City[];
  locations?: LocationMaster[];
  initialFilters?: {
    city?: string | null;
    location?: string | null;
    facing?: string | null;
    propertyType?: string | null;
    agent?: string | null;
    search?: string | null;
  };
}

export const Marketing: React.FC<MarketingProps> = ({
  category,
  siteCategory,
  projects,
  onNavigate,
  propertyTypes = [],
  facings = [],
  cities = [],
  locations = [],
  initialFilters
}) => {
  // Filter States
  const [search, setSearch] = useState<string>(() => initialFilters?.search || '');
  const [priceSort, setPriceSort] = useState<string>('default');
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>(() =>
    initialFilters?.propertyType ? [initialFilters.propertyType] : []
  );
  const [selectedFacings, setSelectedFacings] = useState<string[]>(() =>
    initialFilters?.facing ? [initialFilters.facing] : []
  );
  const [selectedCities, setSelectedCities] = useState<string[]>(() =>
    initialFilters?.city ? [initialFilters.city] : []
  );
  const [selectedLocations, setSelectedLocations] = useState<string[]>(() =>
    initialFilters?.location ? [initialFilters.location] : []
  );
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>(() =>
    initialFilters?.agent ? initialFilters.agent : ''
  );

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
    if (initialFilters) {
      if (initialFilters.search !== undefined) setSearch(initialFilters.search || '');
      if (initialFilters.propertyType) setSelectedPropertyTypes([initialFilters.propertyType]);
      if (initialFilters.facing) setSelectedFacings([initialFilters.facing]);
      if (initialFilters.city) setSelectedCities([initialFilters.city]);
      if (initialFilters.location) setSelectedLocations([initialFilters.location]);
      if (initialFilters.agent) setSelectedAgent(initialFilters.agent);
    }
  }, [initialFilters]);
  
  // View mode controls
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Dynamic filter options from master database
  const propertyTypesOptions = useMemo(() => {
    return propertyTypes.length > 0 
      ? propertyTypes.map(t => t.name) 
      : ['Plots', '1 BHK', '2 BHK', '3 BHK', '4 BHK', 'Villa'];
  }, [propertyTypes]);

  const facingsOptions = useMemo(() => {
    return facings.length > 0 
      ? facings.map(f => f.name) 
      : ['North', 'East', 'West', 'South', 'North East', 'North West'];
  }, [facings]);



  // Helper toggle selections
  const togglePropertyType = (val: string) => {
    setSelectedPropertyTypes(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };
  const toggleFacing = (val: string) => {
    setSelectedFacings(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };
  const toggleCity = (val: string) => {
    setSelectedCities(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };
  const toggleLocation = (val: string) => {
    setSelectedLocations(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };
  const toggleSubCategory = (val: string) => {
    setSelectedSubCategories(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const clearPropertyTypes = () => setSelectedPropertyTypes([]);
  const clearFacings = () => setSelectedFacings([]);
  const clearCities = () => setSelectedCities([]);
  const clearLocations = () => setSelectedLocations([]);
  const clearSubCategories = () => setSelectedSubCategories([]);

  const handleResetFilters = () => {
    setSearch('');
    setPriceSort('default');
    setSelectedPropertyTypes([]);
    setSelectedFacings([]);
    setSelectedCities([]);
    setSelectedLocations([]);
    setSelectedSubCategories([]);
    setSelectedAgent('');
  };

  // Filter projects matching this category/subcategory initially
  const matchingProjects = useMemo(() => {
    return projects.filter(p => {
      if (!p) return false;
      if (p.isActive === false) return false;
      if (p.category !== category) return false;
      if (category === 'Sites' && siteCategory) {
        if (siteCategory.includes('VUDA')) {
          return p.subCategory?.includes('VUDA') || p.subCategory === siteCategory;
        }
        return p.subCategory === siteCategory;
      }
      return true;
    });
  }, [projects, category, siteCategory]);

  // Extract unique cities dynamically from Master Data & matching projects
  const citiesList = useMemo(() => {
    const set = new Set<string>();
    cities.forEach(c => {
      if (c.name) set.add(c.name);
    });
    matchingProjects.forEach(p => {
      if (p.city) {
        set.add(p.city);
      } else {
        const parts = (p.location || '').split(',');
        const city = parts[parts.length - 1]?.trim();
        if (city) set.add(city);
      }
    });
    return Array.from(set).sort();
  }, [cities, matchingProjects]);

  // Extract unique micro-locations dynamically from Master Data & matching projects
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

    matchingProjects.forEach(p => {
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
  }, [locations, cities, matchingProjects, selectedCities]);

  // Apply checkbox/search/sort filters dynamically
  const finalFilteredProjects = useMemo(() => {
    return matchingProjects.filter(p => {
      // 1. Keyword Search
      const name = p.name || '';
      const loc = p.location || '';
      const desc = p.description || '';
      const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) || 
                            loc.toLowerCase().includes(search.toLowerCase()) ||
                            desc.toLowerCase().includes(search.toLowerCase());
      
      // 2. City Checkbox
      const matchesCity = selectedCities.length === 0 || (p.city && selectedCities.includes(p.city));
      
      // 3. Location Checkbox
      const matchesLocation = selectedLocations.length === 0 || (p.microLocation && selectedLocations.includes(p.microLocation));
      
      // 4. Facing Checkbox
      const matchesFacing = selectedFacings.length === 0 || 
        (p.facing && p.facing.split(',').map(f => f.trim()).some(f => selectedFacings.includes(f)));
      
      // 5. Site Classification (SubCategory) Checkbox
      const matchesSubCategory = selectedSubCategories.length === 0 || 
        selectedSubCategories.some(sub => p.subCategory === sub || (sub.includes('VUDA') && p.subCategory?.includes('VUDA')));

      // 6. Property Type Checkbox
      let matchesPropertyTypes = true;
      if (selectedPropertyTypes.length > 0) {
        const pTypes: string[] = [];
        if (p.category === 'Sites') pTypes.push('Plots');
        if (p.category === 'Villas' || p.category === 'Individual Houses') pTypes.push('Villa');
        
        if (p.availabilityDetails) {
          if (p.availabilityDetails.includes('1 BHK')) pTypes.push('1 BHK');
          if (p.availabilityDetails.includes('2 BHK')) pTypes.push('2 BHK');
          if (p.availabilityDetails.includes('3 BHK')) pTypes.push('3 BHK');
          if (p.availabilityDetails.includes('4 BHK')) pTypes.push('4 BHK');
          if (p.availabilityDetails.includes('Plots')) pTypes.push('Plots');
          if (p.availabilityDetails.includes('Villa')) pTypes.push('Villa');
        }
        matchesPropertyTypes = selectedPropertyTypes.some(t => pTypes.includes(t));
      }

      const matchesAgent = !selectedAgent || p.agentId === selectedAgent;

      return matchesSearch && matchesCity && matchesLocation && matchesFacing && matchesSubCategory && matchesPropertyTypes && matchesAgent;
    }).sort((a, b) => {
      if (priceSort === 'low-high') return a.priceValue - b.priceValue;
      if (priceSort === 'high-low') return b.priceValue - a.priceValue;
      if (priceSort === 'alphabetical') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [matchingProjects, search, priceSort, selectedCities, selectedLocations, selectedFacings, selectedSubCategories, selectedPropertyTypes, selectedAgent]);

  // Marketing text configs
  const marketingInfo = useMemo(() => {
    if (category === 'Flats') {
      return {
        title: 'Premium Residential Apartments',
        sub: 'Modern urban spaces designed for connectivity and community living',
        desc: 'Our premium apartments feature smart floor plans, excellent ventilation, and 24/7 security. Centrally located in high-density corridors, they represent the perfect balance of convenience and luxury.',
        bullets: [
          'No common walls ensuring total privacy',
          'Premium modular kitchen setups & luxury bathroom fittings',
          '24/7 solar power backup for common elevators and fans',
          'Dedicated double car parking slot per resident'
        ]
      };
    } else if (category === 'Villas') {
      return {
        title: 'Ultra-Luxury Gated Villas',
        sub: 'Indulge in spacious, prestigious triplex layouts with elite amenities',
        desc: 'Experience absolute grandness in our triplex villa estates. Nestled in quiet green suburbs, these homes offer private terrace gardens, home automated smart locks, individual lifts, and secure gated community facilities.',
        bullets: [
          'Private swimming pool and landscape garden setups',
          '100% Vastu compliance with East and North facing entrances',
          'Huge 20,000 sq.ft. clubhouse with fitness gym and health spa',
          'Intercom and smart multi-tier security surveillance'
        ]
      };
    } else if (category === 'Individual Houses') {
      return {
        title: 'Independent Custom Homes',
        sub: 'Classic independent duplex layouts built with traditional values',
        desc: 'Our independent individual houses provide the freedom of having your own private plot, individual walls, and exclusive terrace space, combined with the assurance of premium grade materials and timely handovers.',
        bullets: [
          'Independent compound walls and private gated entrances',
          'Municipal water tap connection and deep borewell facility',
          'Premium teakwood main doors and high-grade window panels',
          'High customization flexibility for internal rooms structure'
        ]
      };
    } else {
      // Sites
      let subTitle = siteCategory || 'Residential Plot Layouts';
      let desc = 'Secure your future with clear-titled land plots in rapid appreciation corridors. Fully developed layouts with asphalt black-top roads, electricity grids, and avenue plantation.';
      let bullets = [
        'Clear title layouts with immediate spot registration',
        'Wide 40-feet and 33-feet BT roads with lighting poles',
        'Underground sewage drainage and water lines connection',
        'High return-on-investment potential in growth paths'
      ];

      if (siteCategory && siteCategory.includes('VUDA')) {
        subTitle = 'VUDA / VMRDA Approved Plot Ventures';
        desc = 'Plots fully approved by the Visakhapatnam Metropolitan Region Development Authority (VMRDA). These layouts guarantee perfect zoning compliance, bank loan access, and planned infrastructure.';
      } else if (siteCategory === 'Panchayati Approved Sites') {
        subTitle = 'Panchayati Approved Layouts';
        desc = 'Affordable residential plots approved by local town panchayats. Offering low entry costs and excellent investment prospects for medium-term capital gains.';
      } else if (siteCategory === 'Development Sites') {
        subTitle = 'Commercial & Development Lands';
        desc = 'Prime large-scale land parcels ideal for developers, industrial warehouses, or building large farmhouses and personal venture properties.';
      } else if (siteCategory === 'Ventures') {
        subTitle = 'Gated Venture Communities';
        desc = 'Theme-based plot layouts featuring compound walls, entrance arches, landscaped children parks, and modular utility connections.';
      } else if (siteCategory === 'Agriculture Lands') {
        subTitle = 'Agriculture Lands & Farm Plots';
        desc = 'Farming lands, fertile agricultural plots, and green estates perfect for farmhouses and organic cultivation with water source connectivity.';
      } else if (siteCategory === 'Non-Agri Lands') {
        subTitle = 'Non-Agricultural Lands';
        desc = 'Converted dry lands ready for construction, commercial warehousing, or open layout plotting with clear title documentations.';
      } else if (siteCategory === 'Industrial Sites') {
        subTitle = 'Industrial Sites & Zones';
        desc = 'Specially zoned industrial parcels suitable for manufacturing plants, storage yards, heavy-duty processing, and transport corridors.';
      }

      return {
        title: 'Premium Lands & Plot Ventures',
        sub: subTitle,
        desc: desc,
        bullets: bullets
      };
    }
  }, [category, siteCategory]);



  return (
    <div className="marketing-page">
      {/* 1. HERO BANNER WITH EMBEDDED MAGICBRICKS FLOATING SEARCH CARD */}
      <section 
        className="page-header relative text-center text-white" 
        style={{ 
          background: 'linear-gradient(rgba(11,25,44,0.7), rgba(11,25,44,0.75)), url(/marketing_banner_hd.png)', 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          paddingTop: '1.5rem',
          paddingBottom: '1.5rem'
        }}
      >
        <div className="container flex flex-col align-center justify-center">
          <span className="text-secondary font-bold text-xs uppercase tracking-widest mb-1">JK Marketing Showcase</span>
          <h1 className="text-white font-extrabold mb-1" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)', fontSize: '2rem', marginBottom: '0.35rem' }}>{marketingInfo.title}</h1>
          <p className="text-muted" style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', maxWidth: '600px', marginBottom: '1rem' }}>
            {marketingInfo.sub}
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
                placeholder="Search matching properties..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
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

            {/* 5. ⚙️ More Filters Dropdown (Facings + Classification + Sort) */}
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
                  color: selectedFacings.length > 0 || selectedSubCategories.length > 0 || priceSort !== 'default' ? '#8d5da9' : '#475569',
                  background: selectedFacings.length > 0 || selectedSubCategories.length > 0 || priceSort !== 'default' ? '#f3e8ff' : 'transparent',
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
                    <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                      {facingsOptions.map((facing, idx) => (
                        <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0', fontSize: '0.82rem', color: '#1e293b', cursor: 'pointer' }}>
                          <input type="checkbox" checked={selectedFacings.includes(facing)} onChange={() => toggleFacing(facing)} style={{ accentColor: '#8d5da9' }} /> {facing}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Sites Classification Section if Sites category */}
                  {category === 'Sites' && !siteCategory && (
                    <div style={{ marginBottom: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#00a884', textTransform: 'uppercase' }}>Classification</span>
                        {selectedSubCategories.length > 0 && <button onClick={clearSubCategories} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}>Clear</button>}
                      </div>
                      <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                        {['VUDA / VMRDA Approved Sites', 'Panchayati Approved Sites', 'Development Sites', 'Ventures', 'Agriculture Lands', 'Non-Agri Lands', 'Industrial Sites'].map((sub, idx) => (
                          <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0', fontSize: '0.82rem', color: '#1e293b', cursor: 'pointer' }}>
                            <input type="checkbox" checked={selectedSubCategories.includes(sub)} onChange={() => toggleSubCategory(sub)} style={{ accentColor: '#00a884' }} /> {sub}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price / Name Sort Section */}
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0b192c', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>Sort Properties</span>
                    <select 
                      value={priceSort} 
                      onChange={e => setPriceSort(e.target.value)}
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

            {/* 6. [ Search ] Primary Action Button */}
            <button 
              onClick={() => {
                setActiveDropdown(null);
                const elem = document.querySelector('.marketing-main-layout');
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
                transition: 'all 0.25s ease',
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
              Showing <strong style={{ color: 'var(--primary)', fontWeight: 800 }}>{finalFilteredProjects.length}</strong> matching showcase properties
            </span>
            {(selectedCities.length > 0 || selectedLocations.length > 0 || selectedPropertyTypes.length > 0 || selectedFacings.length > 0 || selectedSubCategories.length > 0) && (
              <span style={{ backgroundColor: '#e6f0fa', color: '#0b2c5c', border: '1px solid #cbd5e1', fontSize: '0.73rem', padding: '0.18rem 0.55rem', borderRadius: '12px', fontWeight: 700 }}>
                {selectedCities.length + selectedLocations.length + selectedPropertyTypes.length + selectedFacings.length + selectedSubCategories.length} Active Filters
              </span>
            )}
          </div>

          {/* Right: View Mode Toggles + Clear Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            
            {/* Layout Mode Toggles */}
            <div style={{ display: 'flex', gap: '2px', backgroundColor: '#f1f5f9', padding: '2px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <button 
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '0.28rem 0.6rem',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: viewMode === 'grid' ? 'var(--primary)' : 'transparent',
                  color: viewMode === 'grid' ? '#ffffff' : '#64748b',
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
                onClick={() => setViewMode('list')}
                style={{
                  padding: '0.28rem 0.6rem',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: viewMode === 'list' ? 'var(--primary)' : 'transparent',
                  color: viewMode === 'list' ? '#ffffff' : '#64748b',
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
            </div>

            {/* Clear Filters Button */}
            {(search || priceSort !== 'default' || selectedPropertyTypes.length > 0 || selectedFacings.length > 0 || selectedCities.length > 0 || selectedLocations.length > 0 || selectedSubCategories.length > 0) && (
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
      <section className="container py-2 pb-6 marketing-main-layout">
        <div className="projects-main-content flex-1" style={{ width: '100%' }}>
            {finalFilteredProjects.length === 0 ? (
              <div className="text-center py-6 glass-card" style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                <p className="text-lg font-bold text-muted mb-2">No projects matching your current filters</p>
                <p className="text-sm text-muted">We have new developments starting soon. Contact our advisory desk for exclusive options.</p>
                <button onClick={handleResetFilters} className="btn btn-primary mt-2">Reset Filters</button>
              </div>            ) : viewMode === 'grid' ? (
              <div className="grid grid-3 gap-3">
                {finalFilteredProjects.map(project => {
                  const specPlanImage = getSegmentFallbackSpecImage(project);
                  return (
                    <div key={project.id} className="property-card flex flex-col" style={{ height: '100%', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                      <div className="property-card-img-wrapper" onClick={() => onNavigate('project-details', null, null, { id: project.id, isMarketing: true })} style={{ cursor: 'pointer', height: '200px', position: 'relative' }}>
                        <img 
                          src={getProjectMainImage(project)} 
                          alt={project.name || 'Project'} 
                          className="property-card-img" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                        <span className={`property-card-badge badge badge-${project.status ? project.status.toLowerCase() : 'ongoing'}`}>{project.status || 'Ongoing'}</span>
                        <span className="property-card-price">{project.priceRange || 'Contact Us'}</span>
                      </div>
                      <div className="property-card-content flex-1 flex flex-col justify-between p-3" style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '1.25rem' }}>
                        <div>
                          <div className="flex justify-between align-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <span className="text-xs text-secondary font-bold uppercase tracking-wider">
                              {project.category} {project.subCategory ? `| ${project.subCategory}` : ''} {project.classification ? `| ${project.classification}` : ''}
                            </span>
                            {project.availabilityDetails && (
                              <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
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
                                    <span key={idx} className="text-xxs font-bold" style={{ fontSize: '0.65rem', padding: '0.15rem 0.35rem', backgroundColor: '#e6f0fa', color: '#0b2c5c', borderRadius: '4px', border: '1px solid #d0e1f5', fontWeight: 600 }}>
                                      {type} {qty ? `(${qty})` : ''}{sftVal ? ` | ${sftVal} SFT` : ''}{udsVal ? ` | UDS: ${udsVal} Sq.Yds` : ''}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <h3 className="property-card-title my-0.5" onClick={() => onNavigate('project-details', null, null, { id: project.id, isMarketing: true })} style={{ cursor: 'pointer', fontSize: '1.15rem', lineHeight: 'tight' }}>{project.name}</h3>
                        <p className="property-card-location flex align-center gap-0.5 text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><MapPin size={12} className="text-secondary" /> {project.location}</p>
                        
                        {/* Specs stats inline */}
                        <div className="property-card-specs flex justify-between text-xs py-1" style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', margin: '0.50rem 0', color: 'var(--text-primary)', fontWeight: 600 }}>
                          {project.facing && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Compass size={13} className="text-secondary" /> {project.facing}
                            </span>
                          )}
                          {project.category !== 'Sites' && project.floors !== undefined && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Building2 size={13} className="text-secondary" /> {project.floors === 0 ? 'Plots' : `G+${project.floors}`}
                            </span>
                          )}
                          {!!project.unitsCount && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Home size={13} className="text-secondary" /> {project.unitsCount} Units
                            </span>
                          )}
                          {project.category === 'Sites' && project.uds && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <ShieldCheck size={13} className="text-secondary" /> UDS: {project.uds} Sq.Yds
                            </span>
                          )}
                          {project.width && project.length && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <SlidersHorizontal size={13} className="text-secondary" /> {project.width} x {project.length} ft
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted mb-2 line-clamp-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{project.description}</p>
                      </div>

                      <div>
                        {/* Quick action media row */}
                        <div className="mkt-card-media-bar flex" style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', paddingTop: '0.5rem', gap: '4px' }}>
                          <button onClick={() => onNavigate('project-details', null, null, { id: project.id, isMarketing: true })} className="btn btn-xs btn-primary flex-1 flex align-center justify-center gap-0.5" style={{ fontSize: '0.75rem', padding: '0.35rem' }}>
                            View Details <ArrowRight size={12} />
                          </button>
                          {specPlanImage && (
                            <button onClick={() => window.open(specPlanImage, '_blank')} className="btn btn-xs btn-outline flex align-center justify-center gap-0.5" title="Specs Sheet" style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}>
                              <FileText size={12} /> Specs
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
               })}
              </div>
            ) : (
              /* ── LIST VIEW ── */
              <div className="flex flex-col gap-3">
                {finalFilteredProjects.map(project => {
                  const specPlanImage = getSegmentFallbackSpecImage(project);
                  return (
                    <div key={project.id} className="mkt-list-card glass-card flex" style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--white)' }}>
                      {/* Left: Image Column */}
                      <div className="mkt-list-img-col relative" style={{ width: '280px', flexShrink: 0, position: 'relative' }}>
                        <div className="mkt-list-img-wrap" onClick={() => onNavigate('project-details', null, null, { id: project.id, isMarketing: true })} style={{ cursor: 'pointer', height: '100%', minHeight: '180px', position: 'relative' }}>
                          <img src={getProjectMainImage(project)} alt={project.name || 'Project'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <span className={`badge badge-${project.status ? project.status.toLowerCase() : 'ongoing'}`} style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 2 }}>{project.status || 'Ongoing'}</span>
                        </div>
                        
                        {/* Overlay quick actions on bottom of image */}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(11,25,44,0.85)', backdropFilter: 'blur(4px)', display: 'flex', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                          <button className="mkt-media-btn" onClick={() => onNavigate('project-details', null, null, { id: project.id, isMarketing: true })} style={{ flex: 1, padding: '0.45rem', fontSize: '0.68rem', fontWeight: 700, border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <Eye size={11} /> Quick View
                          </button>
                          <button className="mkt-media-btn" onClick={() => specPlanImage && window.open(specPlanImage, '_blank')} style={{ flex: 1, padding: '0.45rem', fontSize: '0.68rem', fontWeight: 700, border: 'none', borderLeft: '1px solid rgba(255,255,255,0.15)', background: '#0b2c5c', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <FileText size={11} /> Specs Sheet
                          </button>
                        </div>
                      </div>

                      {/* Right: Details Column */}
                      <div className="mkt-list-details" style={{ flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {project.category}{project.subCategory ? ` | ${project.subCategory}` : ''}
                          </span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--secondary)' }}>{project.priceRange || 'Contact Us'}</span>
                        </div>
                <h3 className="mkt-list-title" onClick={() => onNavigate('project-details', null, null, { id: project.id, isMarketing: true })} style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', margin: 0 }}>{project.name}</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} className="text-secondary" /> {project.location}</p>
                        
                        <div className="mkt-list-specs-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '0.35rem 0', margin: '0.2rem 0' }}>
                          {project.facing && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Compass size={11} className="text-secondary" /> {project.facing}</span>}
                          {project.category !== 'Sites' && project.floors !== undefined && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Building2 size={11} className="text-secondary" /> {project.floors === 0 ? 'Plots' : `G+${project.floors}`}</span>}
                          {!!project.unitsCount && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Home size={11} className="text-secondary" /> {project.unitsCount} Units</span>}
                        </div>
                        
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 }}>{project.description}</p>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.25rem' }}>
                          <button onClick={() => onNavigate('project-details', null, null, { id: project.id, isMarketing: true })} className="btn btn-xs btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>Explore Project <ArrowRight size={13} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
      </section>

      {/* Value Proposition Overview Section (Replaced below the marketing showcase listings) */}
      <section className="marketing-overview py-6" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-light, #f8fafc)' }}>
        <div className="container grid grid-2 gap-4 align-center">
          <div>
            <h2 className="section-title mb-2">Value Proposition</h2>
            <p className="text-muted mb-2">{marketingInfo.desc}</p>
            
            <div className="bullets-grid flex flex-col gap-2 my-2">
              {marketingInfo.bullets.map((bullet, i) => (
                <div key={i} className="flex gap-2 align-center">
                  <span className="bullet-icon-box flex align-center justify-center">✓</span>
                  <span className="font-semibold text-sm">{bullet}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => onNavigate('contact')} 
              className="btn btn-secondary mt-2"
            >
              Book Site Visit Now
            </button>
          </div>

          <div className="marketing-features-box grid grid-2 gap-2">
            {[
              { icon: <ShieldCheck size={28} />, title: 'RERA Compliant', desc: 'All layouts verified and approved legally.' },
              { icon: <TrendingUp size={28} />, title: 'High ROI Growth', desc: 'Situated in fast-developing urban corridors.' },
              { icon: <Sparkles size={28} />, title: 'Premium Finish', desc: 'World-class materials and planning checks.' },
              { icon: <Key size={28} />, title: 'Clear Registration', desc: 'Immediate execution and clear document titles.' }
            ].map((feat, i) => (
              <div key={i} className="glass-card py-2 px-2 text-center" style={{ border: '1px solid var(--border-color)' }}>
                <div className="feat-icon text-secondary mb-1" style={{ display: 'inline-block' }}>{feat.icon}</div>
                <h4 className="text-md">{feat.title}</h4>
                <p className="text-xs text-muted mt-0.5">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        .bullet-icon-box {
          width: 20px;
          height: 20px;
          background-color: var(--secondary);
          color: var(--white);
          border-radius: var(--radius-full);
          font-weight: 800;
          font-size: 0.75rem;
          flex-shrink: 0;
        }
        .feat-icon {
          color: var(--secondary);
        }

        /* Projects Split Layout & Sidebar Filters */
        .projects-split-layout {
          align-items: flex-start;
          position: relative;
        }

        .filters-sidebar {
          width: 280px;
          flex-shrink: 0;
          display: block;
        }

        .mobile-filters-btn {
          display: none;
        }
        .hide-desktop {
          display: none;
        }

        @media (max-width: 1024px) {
          .projects-split-layout {
            flex-direction: column !important;
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
          .grid-3 {
            grid-template-columns: 1fr !important;
          }
          .mkt-list-card {
            flex-direction: column !important;
          }
          .mkt-list-img-col {
            width: 100% !important;
          }
          .mkt-list-img-wrap {
            height: 200px !important;
          }
          .mkt-list-details {
            padding: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
};
