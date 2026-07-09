import React, { useState, useMemo, useEffect } from 'react';
import type { Project, ProjectCategory, PropertyType, Facing } from '../types';
import { MapPin, ArrowRight, ShieldCheck, TrendingUp, Sparkles, Key, Search, ChevronDown, SlidersHorizontal, X, Compass, Building2, Home, LayoutGrid, List, Eye, FileText, Share2 } from 'lucide-react';

interface MarketingProps {
  category: ProjectCategory;
  siteCategory: string | null;
  projects: Project[];
  onNavigate: (page: string, category?: ProjectCategory | null, siteCategory?: string | null, params?: any) => void;
  propertyTypes?: PropertyType[];
  facings?: Facing[];
  initialFilters?: {
    city?: string | null;
    location?: string | null;
    facing?: string | null;
    propertyType?: string | null;
    agent?: string | null;
  };
}

export const Marketing: React.FC<MarketingProps> = ({
  category,
  siteCategory,
  projects,
  onNavigate,
  propertyTypes = [],
  facings = [],
  initialFilters
}) => {
  // Filter States
  const [search, setSearch] = useState<string>('');
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

  useEffect(() => {
    if (initialFilters) {
      if (initialFilters.propertyType) setSelectedPropertyTypes([initialFilters.propertyType]);
      if (initialFilters.facing) setSelectedFacings([initialFilters.facing]);
      if (initialFilters.city) setSelectedCities([initialFilters.city]);
      if (initialFilters.location) setSelectedLocations([initialFilters.location]);
      if (initialFilters.agent) setSelectedAgent(initialFilters.agent);
    }
  }, [initialFilters]);
  
  // Mobile drawer controls
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

  // Collapsible Filters Panel State
  const [panelOpen, setPanelOpen] = useState({
    propertyType: true,
    siteCategory: true,
    facing: true,
    city: true,
    location: true
  });

  const togglePanel = (key: 'propertyType' | 'siteCategory' | 'facing' | 'city' | 'location') => {
    setPanelOpen(prev => ({ ...prev, [key]: !prev[key] }));
  };

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

  const handleShareFilters = () => {
    const params = new URLSearchParams();
    params.set('page', 'marketing');
    params.set('category', category);
    if (siteCategory) params.set('siteCategory', siteCategory);
    
    if (selectedCities.length > 0) params.set('city', selectedCities[0]);
    if (selectedLocations.length > 0) params.set('location', selectedLocations[0]);
    if (selectedFacings.length > 0) params.set('facing', selectedFacings[0]);
    if (selectedPropertyTypes.length > 0) params.set('propertyType', selectedPropertyTypes[0]);
    if (selectedAgent) params.set('agent', selectedAgent);

    const shareUrl = `${window.location.origin}/?${params.toString()}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Shareable filtered search link copied to clipboard!');
  };

  // Filter projects matching this category/subcategory initially
  const matchingProjects = useMemo(() => {
    return projects.filter(p => {
      if (!p) return false;
      if (p.isActive === false) return false;
      if (p.category !== category) return false;
      if (category === 'Sites' && siteCategory) {
        return p.subCategory === siteCategory;
      }
      return true;
    });
  }, [projects, category, siteCategory]);

  // Extract unique cities dynamically from matching projects
  const citiesList = useMemo(() => {
    const set = new Set<string>();
    matchingProjects.forEach(p => {
      if (p.city) set.add(p.city);
    });
    return Array.from(set).sort();
  }, [matchingProjects]);

  // Extract unique locations dynamically from matching projects
  const locationsList = useMemo(() => {
    const set = new Set<string>();
    matchingProjects.forEach(p => {
      if (p.microLocation) set.add(p.microLocation);
    });
    return Array.from(set).sort();
  }, [matchingProjects]);

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
      const matchesSubCategory = selectedSubCategories.length === 0 || (p.subCategory && selectedSubCategories.includes(p.subCategory));

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

      if (siteCategory === 'VUDA Approved Sites') {
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
      }

      return {
        title: 'Premium Lands & Plot Ventures',
        sub: subTitle,
        desc: desc,
        bullets: bullets
      };
    }
  }, [category, siteCategory]);

  const renderFilterPanel = (
    title: string,
    key: 'propertyType' | 'siteCategory' | 'facing' | 'city' | 'location',
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
          style={{ backgroundColor: headerColor, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
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
            {options.length === 0 && <div className="text-xs text-muted text-center py-1">No options available</div>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="marketing-page">
      {/* Hero Banner */}
      <section className="marketing-hero py-6 text-white text-center" style={{ background: 'linear-gradient(rgba(11,25,44,0.9), rgba(11,25,44,0.75)), url(https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200&auto=format&fit=crop&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="container">
          <span className="text-secondary font-bold text-sm uppercase tracking-widest">JK Marketing Showcase</span>
          <h1 className="text-white text-4xl my-1">{marketingInfo.title}</h1>
          <p className="text-lg text-muted" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{marketingInfo.sub}</p>
        </div>
      </section>

      {/* Copy and Selling Points */}
      <section className="marketing-overview py-6">
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

      {/* Top Filter Bar Block */}
      <section className="filter-section container py-3">
        <div className="filter-wrapper glass-card py-2 px-2 flex flex-col gap-2" style={{ backgroundColor: 'var(--white)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          {/* Row 1: Search, Sort, Mobile button */}
          <div className="flex gap-2 justify-between flex-wrap align-center w-full" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="search-bar-wrapper flex-1 min-w-300" style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
              <Search className="search-bar-icon" size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search matching properties..." 
                className="search-bar-input"
                style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.9rem' }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex gap-1.5 align-center flex-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Sorting Select */}
              <select 
                className="form-control" 
                style={{ width: '160px', marginBottom: 0, padding: '0.55rem 0.75rem', fontSize: '0.85rem' }} 
                value={priceSort} 
                onChange={e => setPriceSort(e.target.value)}
              >
                <option value="default">Sort Properties</option>
                <option value="low-high">Price: Low to High</option>
                <option value="high-low">Price: High to Low</option>
                <option value="alphabetical">Name: A to Z</option>
              </select>

              {/* View Toggle Buttons */}
              <div className="sap-mkt-view-toggle" style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <button 
                  className={viewMode === 'grid' ? 'active' : ''} 
                  onClick={() => setViewMode('grid')} 
                  title="Grid View"
                  style={{
                    padding: '0.55rem 0.75rem', border: 'none', background: viewMode === 'grid' ? '#0b2c5c' : '#fff',
                    color: viewMode === 'grid' ? '#fff' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center'
                  }}
                >
                  <LayoutGrid size={15} />
                </button>
                <button 
                  className={viewMode === 'list' ? 'active' : ''} 
                  onClick={() => setViewMode('list')} 
                  title="List View"
                  style={{
                    padding: '0.55rem 0.75rem', border: 'none', background: viewMode === 'list' ? '#0b2c5c' : '#fff',
                    color: viewMode === 'list' ? '#fff' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center'
                  }}
                >
                  <List size={15} />
                </button>
              </div>

              {/* Mobile Filter Toggle Button */}
              <button 
                className="btn btn-outline btn-sm mobile-filters-btn flex align-center gap-0.5"
                style={{ padding: '0.55rem 0.8rem', borderRadius: '8px' }}
                onClick={() => setMobileFiltersOpen(true)}
              >
                <SlidersHorizontal size={16} /> Filters
              </button>
            </div>
          </div>

          {/* Applied filters feedback */}
          <div className="flex justify-between align-center text-sm text-muted w-full mt-1" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span>Showing {finalFilteredProjects.length} matching showcase properties</span>
            {(search || priceSort !== 'default' || selectedPropertyTypes.length > 0 || selectedFacings.length > 0 || selectedCities.length > 0 || selectedLocations.length > 0 || selectedSubCategories.length > 0) && (
              <button onClick={handleResetFilters} className="font-semibold text-secondary" style={{ background: 'none', border: 'none', color: 'var(--secondary)', cursor: 'pointer', textDecoration: 'underline', outline: 'none' }}>Clear All Filters</button>
            )}
          </div>
        </div>
      </section>

      {/* Main Split Layout: Sidebar + Grid */}
      <section className="container py-2 pb-6">
        <div className="projects-split-layout flex gap-4">
          
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

            {/* Property Types */}
            {renderFilterPanel('Property Types', 'propertyType', propertyTypesOptions, selectedPropertyTypes, togglePropertyType, clearPropertyTypes, '#d9534f')}

            {/* SubCategory Filter for Sites general view */}
            {category === 'Sites' && !siteCategory && renderFilterPanel('Site Classification', 'siteCategory', ['VUDA Approved Sites', 'Panchayati Approved Sites', 'Development Sites', 'Ventures'], selectedSubCategories, toggleSubCategory, clearSubCategories, '#00a884')}
            {renderFilterPanel('Facings', 'facing', facingsOptions, selectedFacings, toggleFacing, clearFacings, '#8d5da9')}
            {renderFilterPanel('Cities', 'city', citiesList, selectedCities, toggleCity, clearCities, '#3a9ad9')}
            {renderFilterPanel('Locations', 'location', locationsList, selectedLocations, toggleLocation, clearLocations, '#e68a00')}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.25rem', padding: '0.25rem' }}>
              <button 
                onClick={handleShareFilters} 
                className="btn btn-secondary flex align-center justify-center gap-0.5" 
                style={{ fontSize: '0.85rem', padding: '0.5rem', width: '100%' }}
              >
                <Share2 size={14} /> Share Filtered View
              </button>
              <button 
                onClick={handleResetFilters} 
                className="btn btn-outline flex align-center justify-center gap-0.5" 
                style={{ fontSize: '0.85rem', padding: '0.5rem', width: '100%', borderColor: '#cbd5e1', color: '#475569' }}
              >
                Reset Filters
              </button>
            </div>
          </aside>

          {/* Main Results Column */}
          <div className="projects-main-content flex-1" style={{ width: '100%', flex: 1 }}>
            {finalFilteredProjects.length === 0 ? (
              <div className="text-center py-6 glass-card" style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                <p className="text-lg font-bold text-muted mb-2">No projects matching your current filters</p>
                <p className="text-sm text-muted">We have new developments starting soon. Contact our advisory desk for exclusive options.</p>
                <button onClick={handleResetFilters} className="btn btn-primary mt-2">Reset Filters</button>
              </div>            ) : viewMode === 'grid' ? (
              <div className="grid grid-3 gap-3">
                {finalFilteredProjects.map(project => {
                  return (
                    <div key={project.id} className="property-card flex flex-col" style={{ height: '100%', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                      <div className="property-card-img-wrapper" onClick={() => onNavigate('project-details', null, null, { id: project.id })} style={{ cursor: 'pointer', height: '200px', position: 'relative' }}>
                        <img 
                          src={project.images && project.images[0] ? project.images[0] : 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&auto=format&fit=crop&q=60'} 
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
                                  const [type, qty] = part.split(':').map(s => s.trim());
                                  return (
                                    <span key={idx} className="text-xxs font-bold" style={{ fontSize: '0.65rem', padding: '0.15rem 0.35rem', backgroundColor: '#e6f0fa', color: '#0b2c5c', borderRadius: '4px', border: '1px solid #d0e1f5', fontWeight: 600 }}>
                                      {type} {qty ? `(${qty})` : ''}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <h3 className="property-card-title my-0.5" onClick={() => onNavigate('project-details', null, null, { id: project.id })} style={{ cursor: 'pointer', fontSize: '1.15rem', lineHeight: 'tight' }}>{project.name}</h3>
                        <p className="property-card-location flex align-center gap-0.5 text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><MapPin size={12} className="text-secondary" /> {project.location}</p>
                        
                        {/* Specs stats inline */}
                        <div className="property-card-specs flex justify-between text-xs py-1" style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', margin: '0.50rem 0', color: 'var(--text-primary)', fontWeight: 600 }}>
                          {project.facing && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Compass size={13} className="text-secondary" /> {project.facing}
                            </span>
                          )}
                          {project.floors !== undefined && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Building2 size={13} className="text-secondary" /> {project.floors === 0 ? 'Plots' : `G+${project.floors} Floors`}
                            </span>
                          )}
                          {!!project.unitsCount && (
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

                      <div>
                        <button 
                          onClick={() => onNavigate('project-details', null, null, { id: project.id })} 
                          className="btn btn-sm btn-primary w-full"
                          style={{ width: '100%' }}
                        >
                          Explore Project <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
               })}
              </div>
            ) : (
              /* ── LIST VIEW ── */
              <div className="mkt-list-col" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {finalFilteredProjects.map(project => {
                  const specPlanImage = project.specImage || (project.floorPlans && project.floorPlans[0]?.image) || '';
                  const elevationImage = (project.images && project.images[0]) || '';
                  return (
                    <div key={project.id} className="mkt-list-card" style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                      {/* Left: Image Column */}
                      <div className="mkt-list-img-col" style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                        <div className="mkt-list-img-wrap" onClick={() => onNavigate('project-details', null, null, { id: project.id })} style={{ position: 'relative', height: '180px', cursor: 'pointer', overflow: 'hidden' }}>
                          <img 
                            src={elevationImage || 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&auto=format&fit=crop&q=60'} 
                            alt={project.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                          <span className={`mkt-list-status-badge badge-${project.status ? project.status.toLowerCase() : 'ongoing'}`} style={{ position: 'absolute', top: 10, left: 10, padding: '3px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#fff', background: project.status === 'Completed' ? '#059669' : '#3b82f6' }}>
                            {project.status}
                          </span>
                        </div>
                        {/* Media Action Buttons */}
                        <div className="mkt-list-media-btns" style={{ display: 'flex', borderTop: '1px solid var(--border-color)' }}>
                          <button className="mkt-media-btn" onClick={() => elevationImage && window.open(elevationImage, '_blank')} style={{ flex: 1, padding: '0.45rem', fontSize: '0.68rem', fontWeight: 700, border: 'none', background: '#0b2c5c', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <Eye size={11} /> Render
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
                        <h3 className="mkt-list-title" onClick={() => onNavigate('project-details', null, null, { id: project.id })} style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', margin: 0 }}>{project.name}</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} className="text-secondary" /> {project.location}</p>
                        
                        <div className="mkt-list-specs-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '0.35rem 0', margin: '0.2rem 0' }}>
                          {project.facing && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Compass size={11} className="text-secondary" /> {project.facing}</span>}
                          {project.floors !== undefined && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Building2 size={11} className="text-secondary" /> {project.floors === 0 ? 'Plots' : `G+${project.floors}`}</span>}
                          {!!project.unitsCount && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Home size={11} className="text-secondary" /> {project.unitsCount} Units</span>}
                        </div>
                        
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 }}>{project.description}</p>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.25rem' }}>
                          <button onClick={() => onNavigate('project-details', null, null, { id: project.id })} className="btn btn-xs btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>Explore Project <ArrowRight size={13} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
      `}</style>
    </div>
  );
};
