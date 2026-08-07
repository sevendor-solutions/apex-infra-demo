import React, { useState, useEffect } from 'react';
import type { Project, ProjectCostAnalysis } from '../types';
import { getCostAnalyses, saveCostAnalysis, deleteCostAnalysis } from '../utils/db';
import { ALVGrid } from './ALVGrid';
import type { ALVColumn } from './ALVGrid';
import { 
  Calculator, 
  Save, 
  Printer, 
  Plus, 
  Trash2, 
  PieChart, 
  DollarSign, 
  Building2, 
  ShieldCheck, 
  ArrowRightLeft, 
  Edit
} from 'lucide-react';

interface AdminCostAnalysisProps {
  projects: Project[];
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

export const AdminCostAnalysis: React.FC<AdminCostAnalysisProps> = ({
  projects: _projects,
  onAddToast,
  onConfirm
}) => {
  const [costSheets, setCostSheets] = useState<ProjectCostAnalysis[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Form Field Inputs
  const [projectName, setProjectName] = useState('');
  const [location, setLocation] = useState('');
  
  // Section 1: Land Cost
  const [siteAreaSqYards, setSiteAreaSqYards] = useState<number>(0);
  const [outRateCostPerSqYard, setOutRateCostPerSqYard] = useState<number>(0);
  const [govtMarketValuePerSqYard, setGovtMarketValuePerSqYard] = useState<number>(0);
  const [registrationCost, setRegistrationCost] = useState<number>(0);
  const [lrsVudaPercentage, setLrsVudaPercentage] = useState<number>(0);

  // Section 2: TDR & Plan
  const [gvmcPlanApprovalCost, setGvmcPlanApprovalCost] = useState<number>(0);
  const [tdrPercentage, setTdrPercentage] = useState<number>(0);
  const [tdrAreaSft, setTdrAreaSft] = useState<number>(0);
  const [tdrTotalCost, setTdrTotalCost] = useState<number>(0);

  // Section 3: Construction Cost
  const [totalFlatsAreaSft, setTotalFlatsAreaSft] = useState<number>(0);
  const [constructionCostPerSft, setConstructionCostPerSft] = useState<number>(0);

  // Share Ratio
  const [ownerSharePercent, setOwnerSharePercent] = useState<number>(40);
  const [builderSharePercent, setBuilderSharePercent] = useState<number>(60);

  // Section 5: Saluable Cost
  const [totalSaluableAreaSft, setTotalSaluableAreaSft] = useState<number>(0);
  const [sellingPricePerSft, setSellingPricePerSft] = useState<number>(0);
  const [amenitiesCostPerUnit, setAmenitiesCostPerUnit] = useState<number>(0);
  const [numberOfUnits, setNumberOfUnits] = useState<number>(0);

  // Load persisted cost sheets
  const loadCostSheets = async () => {
    const data = await getCostAnalyses();
    setCostSheets(data);
  };

  useEffect(() => {
    loadCostSheets();
  }, []);



  const loadSheetData = (sheet: ProjectCostAnalysis) => {
    setSelectedSheetId(sheet.id);
    setSelectedProjectId(sheet.projectId || '');
    setProjectName(sheet.projectName || '');
    setLocation(sheet.location || '');
    
    setSiteAreaSqYards(sheet.siteAreaSqYards || 0);
    setOutRateCostPerSqYard(sheet.outRateCostPerSqYard || 0);
    setGovtMarketValuePerSqYard(sheet.govtMarketValuePerSqYard || 0);
    setRegistrationCost(sheet.registrationCost || 0);
    setLrsVudaPercentage(sheet.lrsVudaPercentage ?? 14);

    setGvmcPlanApprovalCost(sheet.gvmcPlanApprovalCost || 0);
    setTdrPercentage(sheet.tdrPercentage ?? 1);
    setTdrAreaSft(sheet.tdrAreaSft || 0);
    setTdrTotalCost(sheet.tdrTotalCost || 0);

    setTotalFlatsAreaSft(sheet.totalFlatsAreaSft || 0);
    setConstructionCostPerSft(sheet.constructionCostPerSft || 0);
    
    setOwnerSharePercent(sheet.ownerSharePercent ?? 40);
    setBuilderSharePercent(sheet.builderSharePercent ?? 60);

    setTotalSaluableAreaSft(sheet.totalSaluableAreaSft || 0);
    setSellingPricePerSft(sheet.sellingPricePerSft || 0);
    setAmenitiesCostPerUnit(sheet.amenitiesCostPerUnit || 0);
    setNumberOfUnits(sheet.numberOfUnits || 0);

    onAddToast(`Loaded cost sheet for "${sheet.projectName}".`, 'info');
  };

  // Real-time Calculations
  const outRateCostTotal = (siteAreaSqYards || 0) * (outRateCostPerSqYard || 0);
  const lrsVudaCost = Math.round((outRateCostTotal * ((lrsVudaPercentage || 0) / 100)));
  const totalLandCost = outRateCostTotal + (registrationCost || 0) + lrsVudaCost;
  const landCostInCr = (totalLandCost / 10000000).toFixed(2);

  const totalTdrPlanCost = (gvmcPlanApprovalCost || 0) + (tdrTotalCost || 0);

  const totalConstructionCost = (totalFlatsAreaSft || 0) * (constructionCostPerSft || 0);
  const constructionCostInCr = (totalConstructionCost / 10000000).toFixed(2);

  const ownerConstructionShareCost = (totalConstructionCost * (ownerSharePercent || 0)) / 100;
  const builderConstructionShareCost = (totalConstructionCost * (builderSharePercent || 0)) / 100;
  const ownerConstructionAreaSft = ((totalFlatsAreaSft || 0) * (ownerSharePercent || 0)) / 100;
  const builderConstructionAreaSft = ((totalFlatsAreaSft || 0) * (builderSharePercent || 0)) / 100;

  const totalProjectCost = totalLandCost + totalTdrPlanCost + totalConstructionCost;
  const totalProjectCostInCr = (totalProjectCost / 10000000).toFixed(2);

  const totalAreaSaluableCost = (totalSaluableAreaSft || 0) * (sellingPricePerSft || 0);
  const totalAmenitiesCost = (amenitiesCostPerUnit || 0) * (numberOfUnits || 0);
  const totalSaleValue = totalAreaSaluableCost + totalAmenitiesCost;
  const totalSaleValueInCr = (totalSaleValue / 10000000).toFixed(2);

  const ownerSaleShareValue = (totalSaleValue * (ownerSharePercent || 0)) / 100;
  const builderSaleShareValue = (totalSaleValue * (builderSharePercent || 0)) / 100;

  const costPerOneSft = (totalSaluableAreaSft || 0) > 0 ? Math.round(totalProjectCost / totalSaluableAreaSft) : 0;
  const netMarginTotal = totalSaleValue - totalProjectCost;
  const netMarginInCr = (netMarginTotal / 10000000).toFixed(2);

  const ownerMarginShare = (netMarginTotal * (ownerSharePercent || 0)) / 100;
  const builderMarginShare = (netMarginTotal * (builderSharePercent || 0)) / 100;

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val || 0);
  };

  const handleSave = async () => {
    if (!projectName.trim()) {
      onAddToast('Please enter a Project Name for the cost sheet.', 'error');
      return;
    }

    const sheetId = selectedSheetId || 'cost_' + Date.now();
    const sheetData: ProjectCostAnalysis = {
      id: sheetId,
      projectId: selectedProjectId || undefined,
      projectName: projectName.trim(),
      location: location.trim(),
      date: new Date().toISOString().split('T')[0],

      siteAreaSqYards,
      outRateCostPerSqYard,
      outRateCostTotal,
      govtMarketValuePerSqYard,
      registrationCost,
      lrsVudaPercentage,
      lrsVudaCost,
      totalLandCost,

      gvmcPlanApprovalCost,
      tdrPercentage,
      tdrAreaSft,
      tdrTotalCost,
      totalTdrPlanCost,

      totalFlatsAreaSft,
      constructionCostPerSft,
      totalConstructionCost,

      ownerSharePercent,
      builderSharePercent,

      totalProjectCost,

      totalSaluableAreaSft,
      sellingPricePerSft,
      totalAreaSaluableCost,
      amenitiesCostPerUnit,
      numberOfUnits,
      totalAmenitiesCost,
      totalSaleValue,

      costPerOneSft,
      netMarginTotal
    };

    try {
      await saveCostAnalysis(sheetData);
      setSelectedSheetId(sheetId);
      onAddToast(`Cost Analysis for "${projectName}" saved successfully.`, 'success');
      await loadCostSheets();
    } catch (e) {
      onAddToast('Failed to save cost analysis sheet.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const target = costSheets.find(c => c.id === id);
    const title = target ? target.projectName : 'this cost sheet';
    if (await onConfirm(`Are you sure you want to delete "${title}"?`)) {
      await deleteCostAnalysis(id);
      onAddToast('Cost sheet deleted.', 'info');
      if (selectedSheetId === id) {
        handleNewSheet();
      }
      await loadCostSheets();
    }
  };

  const handleNewSheet = () => {
    setSelectedSheetId('');
    setSelectedProjectId('');
    setProjectName('');
    setLocation('');
    setSiteAreaSqYards(0);
    setOutRateCostPerSqYard(0);
    setGovtMarketValuePerSqYard(0);
    setRegistrationCost(0);
    setLrsVudaPercentage(0);
    setGvmcPlanApprovalCost(0);
    setTdrPercentage(0);
    setTdrAreaSft(0);
    setTdrTotalCost(0);
    setTotalFlatsAreaSft(0);
    setConstructionCostPerSft(0);
    setOwnerSharePercent(40);
    setBuilderSharePercent(60);
    setTotalSaluableAreaSft(0);
    setSellingPricePerSft(0);
    setAmenitiesCostPerUnit(0);
    setNumberOfUnits(0);
    onAddToast('New blank analysis sheet created.', 'info');
  };

  const handlePrint = () => {
    window.print();
  };

  // Columns definition for ALVGrid Saved Records Table
  const columns: ALVColumn[] = [
    {
      key: 'projectName',
      label: 'Project Title / Model',
      sortable: true,
      render: (_v, row) => {
        const s = row as unknown as ProjectCostAnalysis;
        const isActive = selectedSheetId === s.id;
        return (
          <div>
            <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
              {s.projectName}
              {isActive && (
                <span className="badge badge-completed" style={{ marginLeft: '6px', fontSize: '0.65rem' }}>Active</span>
              )}
            </div>
            {s.location && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.location}</div>}
          </div>
        );
      }
    },
    {
      key: 'date',
      label: 'Date Saved',
      sortable: true,
      width: '120px',
      render: (v) => <span className="text-xs text-muted">{String(v || '-')}</span>
    },
    {
      key: 'totalProjectCost',
      label: 'Total Cost (Cr)',
      sortable: true,
      align: 'right',
      width: '140px',
      render: (v) => {
        const num = Number(v) || 0;
        return <span className="font-bold text-dark">₹{(num / 10000000).toFixed(2)} Cr</span>;
      }
    },
    {
      key: 'totalSaleValue',
      label: 'Sales Value (Cr)',
      sortable: true,
      align: 'right',
      width: '140px',
      render: (v) => {
        const num = Number(v) || 0;
        return <span className="font-bold text-success">₹{(num / 10000000).toFixed(2)} Cr</span>;
      }
    },
    {
      key: 'netMarginTotal',
      label: 'Net Margin (Cr)',
      sortable: true,
      align: 'right',
      width: '140px',
      render: (v) => {
        const num = Number(v) || 0;
        return (
          <span className={`font-bold ${num >= 0 ? 'text-success' : 'text-danger'}`}>
            ₹{(num / 10000000).toFixed(2)} Cr
          </span>
        );
      }
    },
    {
      key: 'ownerSharePercent',
      label: 'Share Split',
      align: 'center',
      width: '130px',
      render: (_v, row) => {
        const s = row as unknown as ProjectCostAnalysis;
        return (
          <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>
            {s.ownerSharePercent || 40}% / {s.builderSharePercent || 60}%
          </span>
        );
      }
    },
    {
      key: '__actions',
      label: 'Actions',
      align: 'center',
      width: '110px',
      render: (_v, row) => {
        const s = row as unknown as ProjectCostAnalysis;
        return (
          <div className="admin-table-actions" style={{ justifyContent: 'center' }}>
            <button
              onClick={() => loadSheetData(s)}
              className="alv-toolbar-btn"
              title="Load sheet into calculator"
            >
              <Edit size={13} />
            </button>
            <button
              onClick={() => handleDelete(s.id)}
              className="alv-toolbar-btn"
              title="Delete sheet"
              style={{ color: '#dc2626', borderColor: '#dc2626' }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="admin-cost-analysis-container">
      {/* Top Header Card */}
      <div className="admin-card mb-3">
        <div className="flex justify-between align-center flex-wrap gap-2">
          <div>
            <h2 className="border-bottom-title mb-0.5 flex align-center gap-1">
              <Calculator size={22} className="text-secondary" />
              Project Cost & Profitability Analysis
            </h2>
            <p className="text-xs text-muted">
              Real estate financial estimation model & 40%/60% landowner-builder split analysis
            </p>
          </div>

          <div className="flex align-center gap-1 flex-wrap">
            <button onClick={handleNewSheet} className="btn btn-outline btn-sm flex align-center gap-0.5">
              <Plus size={14} /> New Sheet
            </button>

            <button onClick={handleSave} className="btn btn-secondary btn-sm flex align-center gap-0.5">
              <Save size={14} /> Save Analysis
            </button>

            <button onClick={handlePrint} className="btn btn-outline btn-sm flex align-center gap-0.5">
              <Printer size={14} /> Print Report
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-4 gap-2 mb-3 mobile-stack">
        <div className="admin-card p-2 flex align-center gap-2">
          <div className="p-1.5 rounded" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <Building2 size={22} />
          </div>
          <div>
            <div className="text-xs text-muted font-bold">Total Project Cost</div>
            <div className="text-lg font-bold text-dark">₹{totalProjectCostInCr} CR</div>
            <div className="text-xxs text-muted">₹{formatINR(totalProjectCost)}</div>
          </div>
        </div>

        <div className="admin-card p-2 flex align-center gap-2">
          <div className="p-1.5 rounded" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div className="text-xs text-muted font-bold">Total Sales Realization</div>
            <div className="text-lg font-bold text-success">₹{totalSaleValueInCr} CR</div>
            <div className="text-xxs text-muted">₹{formatINR(totalSaleValue)}</div>
          </div>
        </div>

        <div className="admin-card p-2 flex align-center gap-2">
          <div className="p-1.5 rounded" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
            <PieChart size={22} />
          </div>
          <div>
            <div className="text-xs text-muted font-bold">Project Net Margin</div>
            <div className={`text-lg font-bold ${netMarginTotal >= 0 ? 'text-success' : 'text-danger'}`}>
              ₹{netMarginInCr} CR
            </div>
            <div className="text-xxs text-muted">₹{formatINR(netMarginTotal)}</div>
          </div>
        </div>

        <div className="admin-card p-2 flex align-center gap-2">
          <div className="p-1.5 rounded" style={{ backgroundColor: '#faf5ff', color: '#9333ea' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="text-xs text-muted font-bold">Cost per 1 SFT</div>
            <div className="text-lg font-bold" style={{ color: '#7e22ce' }}>₹{formatINR(costPerOneSft)} / SFT</div>
            <div className="text-xxs text-muted">Selling Price: ₹{formatINR(sellingPricePerSft)} / SFT</div>
          </div>
        </div>
      </div>

      {/* Project Details Bar */}
      <div className="admin-card mb-3">
        <div className="grid grid-2 gap-2 mobile-stack">
          <div className="form-group mb-0">
            <label className="form-label font-bold">Project / Sheet Title *</label>
            <input 
              type="text" 
              className="form-control" 
              value={projectName}
              placeholder="Enter Project Title"
              onChange={e => setProjectName(e.target.value)}
            />
          </div>

          <div className="form-group mb-0">
            <label className="form-label font-bold">Site Location</label>
            <input 
              type="text" 
              className="form-control" 
              value={location}
              placeholder="Enter Location"
              onChange={e => setLocation(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Saved Records Table via ALVGrid */}
      <div className="mb-4">
        <ALVGrid
          title="Saved Analysis Sheets History"
          subtitle={`${costSheets.length} cost sheet record${costSheets.length === 1 ? '' : 's'} stored in database`}
          columns={columns}
          data={costSheets as any}
          rowKey="id"
          onAdd={handleNewSheet}
          addLabel="New Sheet"
          onRefresh={loadCostSheets}
          pageSize={5}
          searchable={true}
          searchPlaceholder="Search saved cost sheets by title or location..."
          emptyText="No saved cost analysis sheets found. Fill out the calculator below and click 'Save Analysis' to save a record."
        />
      </div>

      {/* Excel Table Calculator Grid */}
      <div className="admin-card mb-4 p-0" style={{ overflow: 'hidden' }}>
        <div className="admin-card-header" style={{ padding: '0.8rem 1.25rem', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-0" style={{ margin: 0 }}>
            COST ANALYSIS OF PROJECT (CALCULATOR SHEET)
          </h3>
          {selectedSheetId && (
            <button onClick={() => handleDelete(selectedSheetId)} className="btn btn-outline btn-xs" style={{ color: '#ef4444', borderColor: '#ef4444' }} title="Delete Saved Sheet">
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table text-xs" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', color: '#1e293b', fontWeight: 'bold' }}>
                <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center', width: '50px' }}>S.NO</th>
                <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>PARTICULARS</th>
                <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>SITE AREA SFT / SFT</th>
                <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>RATE / COST PER SFT</th>
                <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>TOTAL COST (RS)</th>
                <th style={{ padding: '8px', textAlign: 'center', width: '250px' }}>OWNER / BUILDER SHARE SPLIT ({ownerSharePercent}% / {builderSharePercent}%)</th>
              </tr>
            </thead>
            <tbody>
              {/* SECTION 1: LAND COST */}
              <tr style={{ backgroundColor: '#fef3c7', fontWeight: 'bold', color: '#78350f' }}>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>1</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }} colSpan={5}>LAND COST</td>
              </tr>

              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>A</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>SITE AREA (SQ YARD)</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>
                  <input 
                    type="number" 
                    className="form-control"
                    style={{ width: '100px', margin: '0 auto', textAlign: 'center', padding: '4px', fontSize: '0.8rem' }}
                    value={siteAreaSqYards || ''} 
                    onChange={e => setSiteAreaSqYards(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                  />
                </td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>
                  <input 
                    type="number" 
                    className="form-control"
                    style={{ width: '110px', margin: '0 auto', textAlign: 'center', padding: '4px', fontSize: '0.8rem' }}
                    value={outRateCostPerSqYard || ''} 
                    onChange={e => setOutRateCostPerSqYard(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                  />
                </td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 'bold', color: '#1e293b' }}>
                  ₹{formatINR(outRateCostTotal)}
                </td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#f8fafc' }}>-</td>
              </tr>

              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>B</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>GOVT MARKET VALUE (PER SQ YARD)</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>-</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>
                  <input 
                    type="number" 
                    className="form-control"
                    style={{ width: '110px', margin: '0 auto', textAlign: 'center', padding: '4px', fontSize: '0.8rem' }}
                    value={govtMarketValuePerSqYard || ''} 
                    onChange={e => setGovtMarketValuePerSqYard(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                  />
                </td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'right', color: '#64748b' }}>
                  -
                </td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#f8fafc' }}>-</td>
              </tr>

              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>C</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>REGISTRATION COST</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>-</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>-</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>
                  <input 
                    type="number" 
                    className="form-control"
                    style={{ width: '130px', marginLeft: 'auto', textAlign: 'right', padding: '4px', fontSize: '0.8rem' }}
                    value={registrationCost || ''} 
                    onChange={e => setRegistrationCost(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                  />
                </td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#f8fafc' }}>-</td>
              </tr>

              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>D</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>LRS & VUDA / MUNICIPAL CHARGES</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <input 
                      type="number" 
                      className="form-control"
                      style={{ width: '60px', textAlign: 'center', padding: '4px', fontSize: '0.8rem' }}
                      value={lrsVudaPercentage || ''} 
                      onChange={e => setLrsVudaPercentage(parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                    />
                    <span>%</span>
                  </div>
                </td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>-</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                  ₹{formatINR(lrsVudaCost)}
                </td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#f8fafc' }}>-</td>
              </tr>

              <tr style={{ backgroundColor: '#fffbeb', fontWeight: 'bold', borderBottom: '1px solid #cbd5e1' }}>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>RS IN CR</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }} colSpan={3}>TOTAL LAND COST</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 900, color: '#92400e' }}>
                  ₹{formatINR(totalLandCost)}
                </td>
                <td style={{ padding: '8px', backgroundColor: '#fef3c7', textAlign: 'center', fontWeight: 900, color: '#78350f' }}>
                  {landCostInCr} CR
                </td>
              </tr>

              {/* SECTION 2: TDR & PLAN */}
              <tr style={{ backgroundColor: '#fef3c7', fontWeight: 'bold', color: '#78350f' }}>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>2</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }} colSpan={5}>TDR & PLAN APPROVAL COST</td>
              </tr>

              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>A</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>GVMC / MUNICIPAL PLAN APPROVAL FEE</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>-</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>-</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>
                  <input 
                    type="number" 
                    className="form-control"
                    style={{ width: '130px', marginLeft: 'auto', textAlign: 'right', padding: '4px', fontSize: '0.8rem' }}
                    value={gvmcPlanApprovalCost || ''} 
                    onChange={e => setGvmcPlanApprovalCost(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                  />
                </td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#f8fafc' }}>-</td>
              </tr>

              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>B</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>TDR AREA & COST</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <input 
                      type="number" 
                      className="form-control"
                      style={{ width: '50px', textAlign: 'center', padding: '4px', fontSize: '0.8rem' }}
                      value={tdrPercentage || ''} 
                      onChange={e => setTdrPercentage(parseFloat(e.target.value) || 0)}
                    />
                    <span>%</span>
                    <input 
                      type="number" 
                      className="form-control"
                      style={{ width: '80px', textAlign: 'center', padding: '4px', fontSize: '0.8rem' }}
                      placeholder="SFT"
                      value={tdrAreaSft || ''} 
                      onChange={e => setTdrAreaSft(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>-</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>
                  <input 
                    type="number" 
                    className="form-control"
                    style={{ width: '130px', marginLeft: 'auto', textAlign: 'right', padding: '4px', fontSize: '0.8rem' }}
                    value={tdrTotalCost || ''} 
                    onChange={e => setTdrTotalCost(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                  />
                </td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#f8fafc' }}>-</td>
              </tr>

              <tr style={{ backgroundColor: '#fffbeb', fontWeight: 'bold', borderBottom: '1px solid #cbd5e1' }}>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>RS IN CR</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }} colSpan={3}>TOTAL TDR & PLAN COST</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 900, color: '#92400e' }}>
                  ₹{formatINR(totalTdrPlanCost)}
                </td>
                <td style={{ padding: '8px', backgroundColor: '#fef3c7', textAlign: 'center', fontWeight: 900, color: '#78350f' }}>
                  {((totalTdrPlanCost) / 10000000).toFixed(2)} CR
                </td>
              </tr>

              {/* SECTION 3: CONSTRUCTION COST */}
              <tr style={{ backgroundColor: '#fef3c7', fontWeight: 'bold', color: '#78350f' }}>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>3</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }} colSpan={5}>CONSTRUCTION COST</td>
              </tr>

              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>A</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>TOTAL FLAT AREA SFT & CONSTRUCTION RATE</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>
                  <input 
                    type="number" 
                    className="form-control"
                    style={{ width: '110px', margin: '0 auto', textAlign: 'center', padding: '4px', fontSize: '0.8rem' }}
                    value={totalFlatsAreaSft || ''} 
                    onChange={e => setTotalFlatsAreaSft(parseFloat(e.target.value) || 0)}
                    placeholder="SFT Area"
                    min="0"
                  />
                </td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>
                  <input 
                    type="number" 
                    className="form-control"
                    style={{ width: '110px', margin: '0 auto', textAlign: 'center', padding: '4px', fontSize: '0.8rem' }}
                    value={constructionCostPerSft || ''} 
                    onChange={e => setConstructionCostPerSft(parseFloat(e.target.value) || 0)}
                    placeholder="Rate / SFT"
                    min="0"
                  />
                </td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 'bold', color: '#1e293b' }}>
                  ₹{formatINR(totalConstructionCost)}
                </td>
                <td style={{ padding: '8px', backgroundColor: '#fef3c7', textAlign: 'center', fontWeight: 'bold', fontSize: '0.78rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                    <div style={{ borderRight: '1px solid #fde68a' }}>
                      <div>₹{formatINR(ownerConstructionShareCost)}</div>
                      <div style={{ fontSize: '0.7rem', color: '#78350f', fontWeight: 'normal' }}>{ownerConstructionAreaSft} SFT</div>
                    </div>
                    <div>
                      <div>₹{formatINR(builderConstructionShareCost)}</div>
                      <div style={{ fontSize: '0.7rem', color: '#78350f', fontWeight: 'normal' }}>{builderConstructionAreaSft} SFT</div>
                    </div>
                  </div>
                </td>
              </tr>

              <tr style={{ backgroundColor: '#fffbeb', fontWeight: 'bold', borderBottom: '1px solid #cbd5e1' }}>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>RS IN CR</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }} colSpan={3}>TOTAL CONSTRUCTION COST</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 900, color: '#92400e' }}>
                  ₹{formatINR(totalConstructionCost)}
                </td>
                <td style={{ padding: '8px', backgroundColor: '#fef3c7', textAlign: 'center', fontWeight: 900, color: '#78350f' }}>
                  {constructionCostInCr} CR
                </td>
              </tr>

              {/* SECTION 4: TOTAL PROJECT COST */}
              <tr style={{ backgroundColor: '#fde047', fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #cbd5e1' }}>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>4</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }} colSpan={3}>TOTAL PROJECT COST (LAND + TDR + CONSTRUCTION)</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 900 }}>
                  ₹{formatINR(totalProjectCost)}
                </td>
                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 900, fontSize: '0.9rem' }}>
                  {totalProjectCostInCr} CR
                </td>
              </tr>

              {/* SECTION 5: SALUABLE REALIZATION */}
              <tr style={{ backgroundColor: '#d1fae5', fontWeight: 'bold', color: '#065f46' }}>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>5</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }} colSpan={5}>SALUABLE COST & REVENUE REALIZATION</td>
              </tr>

              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>A</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>SALES AREA SFT & SELLING PRICE PER SFT</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>
                  <input 
                    type="number" 
                    className="form-control"
                    style={{ width: '110px', margin: '0 auto', textAlign: 'center', padding: '4px', fontSize: '0.8rem' }}
                    value={totalSaluableAreaSft || ''} 
                    onChange={e => setTotalSaluableAreaSft(parseFloat(e.target.value) || 0)}
                    placeholder="Sales SFT"
                    min="0"
                  />
                </td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>
                  <input 
                    type="number" 
                    className="form-control"
                    style={{ width: '110px', margin: '0 auto', textAlign: 'center', padding: '4px', fontSize: '0.8rem' }}
                    value={sellingPricePerSft || ''} 
                    onChange={e => setSellingPricePerSft(parseFloat(e.target.value) || 0)}
                    placeholder="Price / SFT"
                    min="0"
                  />
                </td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>
                  ₹{formatINR(totalAreaSaluableCost)}
                </td>
                <td style={{ padding: '8px', backgroundColor: '#ecfdf5', textAlign: 'center', fontWeight: 'bold', fontSize: '0.78rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                    <div style={{ borderRight: '1px solid #a7f3d0' }}>
                      <div>₹{formatINR(ownerSaleShareValue)}</div>
                      <div style={{ fontSize: '0.7rem', color: '#065f46', fontWeight: 'normal' }}>{(ownerSaleShareValue / 10000000).toFixed(2)} CR</div>
                    </div>
                    <div>
                      <div>₹{formatINR(builderSaleShareValue)}</div>
                      <div style={{ fontSize: '0.7rem', color: '#065f46', fontWeight: 'normal' }}>{(builderSaleShareValue / 10000000).toFixed(2)} CR</div>
                    </div>
                  </div>
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>B</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>AMENITIES & OTHER COLLECTION FEE</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <input 
                      type="number" 
                      className="form-control"
                      style={{ width: '60px', textAlign: 'center', padding: '4px', fontSize: '0.8rem' }}
                      placeholder="Units"
                      value={numberOfUnits || ''} 
                      onChange={e => setNumberOfUnits(parseFloat(e.target.value) || 0)}
                      min="0"
                    />
                    <span>Flats</span>
                  </div>
                </td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>
                  <input 
                    type="number" 
                    className="form-control"
                    style={{ width: '110px', margin: '0 auto', textAlign: 'center', padding: '4px', fontSize: '0.8rem' }}
                    placeholder="Fee / Unit"
                    value={amenitiesCostPerUnit || ''} 
                    onChange={e => setAmenitiesCostPerUnit(parseFloat(e.target.value) || 0)}
                    min="0"
                  />
                </td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                  ₹{formatINR(totalAmenitiesCost)}
                </td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#f8fafc' }}>-</td>
              </tr>

              <tr style={{ backgroundColor: '#ecfdf5', fontWeight: 'bold', borderBottom: '1px solid #cbd5e1' }}>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>RS IN CR</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }} colSpan={3}>TOTAL SALES REALIZATION VALUE</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 900, color: '#065f46' }}>
                  ₹{formatINR(totalSaleValue)}
                </td>
                <td style={{ padding: '8px', backgroundColor: '#a7f3d0', textAlign: 'center', fontWeight: 900, color: '#064e3b' }}>
                  {totalSaleValueInCr} CR
                </td>
              </tr>

              {/* SECTION 6: COST PER SFT & NET PROFIT MARGIN */}
              <tr style={{ backgroundColor: '#a7f3d0', fontWeight: 'bold', color: '#064e3b' }}>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>6</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }} colSpan={5}>COST PER 1 SFT & NET PROFIT MARGIN ANALYSIS</td>
              </tr>

              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>A</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>COST PER 1 SFT (TOTAL COST / TOTAL SFT)</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>{totalSaluableAreaSft} SFT</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 'bold', color: '#7e22ce' }}>₹{formatINR(costPerOneSft)} / SFT</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 'bold', color: '#1e293b' }}>₹{formatINR(totalProjectCost)}</td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#f8fafc' }}>-</td>
              </tr>

              <tr style={{ backgroundColor: '#d1fae5', fontWeight: 900, color: '#064e3b' }}>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>RS IN CR</td>
                <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }} colSpan={3}>NET PROFIT MARGIN IN CRORES</td>
                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 900, fontSize: '0.9rem', color: '#047857', borderRight: '1px solid #cbd5e1' }}>
                  ₹{netMarginInCr} CR
                </td>
                <td style={{ padding: '8px', backgroundColor: '#fef08a', textAlign: 'center', color: '#0f172a', fontWeight: 'bold' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                    <div style={{ borderRight: '1px solid #fde047' }}>₹{(ownerMarginShare / 10000000).toFixed(2)} CR</div>
                    <div>₹{(builderMarginShare / 10000000).toFixed(2)} CR</div>
                  </div>
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      {/* Share Ratio Adjuster Slider */}
      <div className="admin-card">
        <h4 className="border-bottom-title mb-2 flex align-center gap-1">
          <ArrowRightLeft size={16} className="text-secondary" />
          Customize Landowner / Developer Profit Sharing Ratio
        </h4>

        <div className="grid grid-3 gap-3 align-center mobile-stack">
          <div>
            <label className="form-label font-bold">Landowner Share Ratio (%)</label>
            <div className="flex align-center gap-1">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={ownerSharePercent}
                onChange={e => {
                  const val = Number(e.target.value);
                  setOwnerSharePercent(val);
                  setBuilderSharePercent(100 - val);
                }}
                style={{ flex: 1, accentColor: '#d97706' }}
              />
              <span className="font-bold text-amber-700 text-sm" style={{ width: '40px' }}>{ownerSharePercent}%</span>
            </div>
          </div>

          <div>
            <label className="form-label font-bold">Builder / Developer Share Ratio (%)</label>
            <div className="flex align-center gap-1">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={builderSharePercent}
                onChange={e => {
                  const val = Number(e.target.value);
                  setBuilderSharePercent(val);
                  setOwnerSharePercent(100 - val);
                }}
                style={{ flex: 1, accentColor: '#2563eb' }}
              />
              <span className="font-bold text-blue-700 text-sm" style={{ width: '40px' }}>{builderSharePercent}%</span>
            </div>
          </div>

          <div className="p-2 rounded border" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
            <div className="font-bold text-dark text-xs mb-0.5">Net Margin Split:</div>
            <div className="flex justify-between text-xs text-muted">
              <span>Owner Share ({ownerSharePercent}%):</span>
              <span className="font-bold text-dark">₹{(ownerMarginShare / 10000000).toFixed(2)} CR</span>
            </div>
            <div className="flex justify-between text-xs text-muted mt-0.5">
              <span>Builder Share ({builderSharePercent}%):</span>
              <span className="font-bold text-dark">₹{(builderMarginShare / 10000000).toFixed(2)} CR</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
