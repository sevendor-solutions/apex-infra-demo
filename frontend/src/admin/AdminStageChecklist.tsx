import React, { useState, useEffect, useMemo } from 'react';
import type { Project, ProjectInspectionRecord, ChecklistStageData } from '../types';
import { getProjectInspectionRecords, saveProjectInspection, deleteProjectInspection } from '../utils/db';
import { ALVGrid } from './ALVGrid';
import type { ALVColumn } from './ALVGrid';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Save, 
  Printer, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Edit,
  Layers,
  FileCheck
} from 'lucide-react';

interface AdminStageChecklistProps {
  projects: Project[];
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

// Master Template of all 21 Stages and ~130 Checkpoints matching the exact user specification
const DEFAULT_21_STAGES: { stageId: number; stageName: string; checkpoints: { id: number; item: string; purpose: string }[] }[] = [
  {
    stageId: 1,
    stageName: "Stage 1: Pre-Construction & Site Preparation",
    checkpoints: [
      { id: 101, item: "Site survey & boundary marking (total station survey)", purpose: "Confirms plot boundaries match approved layout/title deed; prevents encroachment disputes." },
      { id: 102, item: "Soil investigation / geotechnical report", purpose: "Determines safe bearing capacity, water table, soil type — governs foundation design." },
      { id: 103, item: "Approved building plan, RERA registration, statutory NOCs on site", purpose: "Legal compliance before any work starts; avoids stop-work notices later." },
      { id: 104, item: "Site fencing / hoarding & safety signage", purpose: "Public safety, restricts unauthorized entry, mandatory under labour/safety law." },
      { id: 105, item: "Temporary site office, store & labour welfare facilities", purpose: "Ensures safe storage of materials/drawings and compliance with labour welfare norms." },
      { id: 106, item: "Water & power source for construction confirmed", purpose: "Uninterrupted curing water and power avoids work stoppage and quality loss." },
      { id: 107, item: "Benchmark (reference level) fixed and protected", purpose: "All levels (plinth, floor, road) are measured from this — error here cascades to every stage." },
      { id: 108, item: "Site clearance — removal of vegetation, debris, existing structures", purpose: "Clean, stable working area; prevents organic matter under foundation causing future settlement." }
    ]
  },
  {
    stageId: 2,
    stageName: "Stage 2: Earthwork & Excavation",
    checkpoints: [
      { id: 201, item: "Excavation layout as per foundation drawing (line & level)", purpose: "Wrong excavation size/position leads to foundation misalignment with structure above." },
      { id: 202, item: "Excavation depth verified against approved founding level", purpose: "Ensures foundation rests on the soil strata assumed in design (adequate bearing capacity)." },
      { id: 203, item: "Side slopes / shoring & shuttering for deep excavation", purpose: "Prevents soil collapse, protects workers and adjacent structures." },
      { id: 204, item: "Dewatering arrangement (if water table is high)", purpose: "Keeps excavation dry so concrete isn't compromised by water ingress." },
      { id: 205, item: "Soil disposal & stacking away from excavation edge", purpose: "Prevents surcharge load causing edge collapse; keeps site organized." },
      { id: 206, item: "Base of excavation compacted and inspected before foundation", purpose: "Loose/soft soil at base causes differential settlement of the building." }
    ]
  },
  {
    stageId: 3,
    stageName: "Stage 3: Foundation Works",
    checkpoints: [
      { id: 301, item: "PCC (Plain Cement Concrete) bed laid to correct thickness & level", purpose: "Provides a clean, level, non-porous base for reinforcement — prevents contamination and uneven footing." },
      { id: 302, item: "Reinforcement as per structural drawing — bar dia, spacing, cover blocks", purpose: "Wrong reinforcement is the single biggest cause of structural failure; cover blocks prevent rebar corrosion." },
      { id: 303, item: "Reinforcement checked & approved by structural engineer before pour (RCC checklist / stage inspection)", purpose: "Third-party verification catches design-deviation errors before they're hidden in concrete." },
      { id: 304, item: "Formwork/shuttering — alignment, level, leak-proof joints", purpose: "Prevents honeycombing, bulging or mis-shaped footings." },
      { id: 305, item: "Concrete grade verified (mix design / RMC challan) & slump test", purpose: "Confirms strength (M20/M25 etc.) matches design; wrong slump causes segregation or weak concrete." },
      { id: 306, item: "Concrete cube samples cast for 7-day & 28-day testing", purpose: "Lab-verified proof that concrete strength meets design requirement — mandatory quality record." },
      { id: 307, item: "Proper compaction using needle vibrator, no segregation", purpose: "Removes air voids that would otherwise weaken concrete and expose rebar to corrosion." },
      { id: 308, item: "Curing started within stipulated time (min. 7–14 days)", purpose: "Inadequate curing causes shrinkage cracks and reduces long-term strength." },
      { id: 309, item: "Waterproofing/DPC (damp proof course) at footing/plinth level", purpose: "Blocks rising dampness from soil into the structure above." }
    ]
  },
  {
    stageId: 4,
    stageName: "Stage 4: Plinth & Backfilling",
    checkpoints: [
      { id: 401, item: "Plinth beam reinforcement, cover & concrete as per drawing", purpose: "Ties columns together at ground level; prevents differential settlement of the frame." },
      { id: 402, item: "Backfilling material — approved soil/murrum, free of debris", purpose: "Poor fill material causes future floor settlement and cracks." },
      { id: 403, item: "Backfilling done in layers with compaction (plate/roller compactor)", purpose: "Layer-wise compaction avoids voids and future subsidence under flooring." },
      { id: 404, item: "Anti-termite treatment applied before backfilling", purpose: "Protects wood/structural elements from termite damage — very difficult to treat after slab is cast." },
      { id: 405, item: "Plinth level cross-checked with benchmark", purpose: "Ensures the entire building sits at correct height relative to road/ground level (avoids flooding)." }
    ]
  },
  {
    stageId: 5,
    stageName: "Stage 5: Superstructure — RCC Framework (Columns, Beams, Slabs)",
    checkpoints: [
      { id: 501, item: "Column layout & centre lines marked from grid/reference points", purpose: "Any offset here shifts the whole floor plan above; must match architectural drawing exactly." },
      { id: 502, item: "Column reinforcement — bar dia, no. of bars, stirrup spacing, laps/development length", purpose: "Under-reinforcement or wrong lap length is a major structural safety risk." },
      { id: 503, item: "Verticality of columns checked with plumb bob/laser", purpose: "Out-of-plumb columns transfer load eccentrically, weakening the structure over floors." },
      { id: 504, item: "Shuttering — rigid, leak-proof, properly propped & de-shuttering time followed", purpose: "Premature de-shuttering can cause slab/beam collapse or sagging; leaky shuttering causes honeycombing." },
      { id: 505, item: "Beam & slab reinforcement, spacing, chairs/cover blocks maintained", purpose: "Ensures load-bearing capacity and correct concrete cover to prevent rebar corrosion." },
      { id: 506, item: "Electrical conduits/plumbing sleeves placed before concreting (coordination)", purpose: "Avoids breaking finished concrete later, which weakens the structural member." },
      { id: 507, item: "Concrete pour continuous, no cold joints in critical members", purpose: "Cold joints are weak planes that reduce structural integrity." },
      { id: 508, item: "Cube testing for each pour/grade, results recorded", purpose: "Ongoing quality assurance and legal record for each concrete batch." },
      { id: 509, item: "Curing of slab/beam for minimum specified days", purpose: "Prevents shrinkage cracking and ensures design strength is achieved." },
      { id: 510, item: "Floor-to-floor level & storey height verified before next floor", purpose: "Cumulative level errors across floors cause major problems in staircases, lifts, and finishes." },
      { id: 511, item: "Structural engineer sign-off at each floor slab before proceeding", purpose: "Independent check that loads/design intent are being followed floor by floor." }
    ]
  },
  {
    stageId: 6,
    stageName: "Stage 6: Masonry / Block Work",
    checkpoints: [
      { id: 601, item: "Block/brick type, size & strength as per specification", purpose: "Wrong material strength affects wall load-bearing and thermal/acoustic performance." },
      { id: 602, item: "Wall alignment, plumb & line verified with plumb bob/string line", purpose: "Out-of-plumb walls cause plaster thickness variation and doors/windows misfit." },
      { id: 603, item: "Mortar mix ratio correct & properly proportioned (not by eye)", purpose: "Weak mortar reduces wall strength and causes cracking." },
      { id: 604, item: "Horizontal & vertical joints filled fully, uniform thickness (~10mm)", purpose: "Gaps in joints weaken the wall and allow water seepage." },
      { id: 605, item: "Lintels provided over all door/window openings", purpose: "Prevents cracking of masonry above openings due to lack of load transfer." },
      { id: 606, item: "Chases for electrical/plumbing cut neatly (not hacked) & as per drawing", purpose: "Deep/random chases weaken the wall structurally." },
      { id: 607, item: "Curing of masonry work done regularly", purpose: "Prevents shrinkage cracks in mortar joints." }
    ]
  },
  {
    stageId: 7,
    stageName: "Stage 7: Plumbing & Sanitary (Rough-in)",
    checkpoints: [
      { id: 701, item: "Pipe routing as per approved plumbing drawing (slope for drainage lines)", purpose: "Incorrect slope causes drainage blockage/backflow later — very costly to fix post-tiling." },
      { id: 702, item: "Pipe material & pressure rating (CPVC/UPVC/GI) as specified", purpose: "Wrong material can fail under pressure or degrade over time, causing leaks inside walls." },
      { id: 703, item: "Pressure testing of water supply lines before concealing", purpose: "Confirms no leaks exist before pipes are hidden behind walls/slabs — leaks are hard to trace after." },
      { id: 704, item: "Drainage/soil pipe testing (smoke/water test) before concealment", purpose: "Ensures no leakage/blockage in sewage lines, preventing seepage and odor issues later." },
      { id: 705, item: "Sleeves & openings for pipes through slabs/beams pre-planned (not drilled later)", purpose: "Avoids cutting structural reinforcement, which would weaken the member." },
      { id: 706, item: "Provision for fixtures (WC, wash basin, kitchen sink) marked correctly", purpose: "Ensures fixtures align with tiling/counter layout — mismatch causes rework." }
    ]
  },
  {
    stageId: 8,
    stageName: "Stage 8: Electrical (Rough-in / Conduiting)",
    checkpoints: [
      { id: 801, item: "Conduit routing as per electrical drawing, proper concealment", purpose: "Ensures wiring safety and correct point locations before walls are plastered." },
      { id: 802, item: "Conduit size & material (PVC/MS) as specified, no sharp bends", purpose: "Sharp bends damage wire insulation during pulling, causing shorts later." },
      { id: 803, item: "DB (distribution board) location & circuit segregation (light/power/AC)", purpose: "Proper segregation prevents overloading and simplifies future maintenance." },
      { id: 804, item: "Earthing conductor laid and continuity verified", purpose: "Critical life-safety measure — protects against electric shock in case of fault." },
      { id: 805, item: "Junction/switch box positions match architectural/interior layout", purpose: "Avoids clashing with furniture, wardrobes, or false ceiling later." },
      { id: 806, item: "Fire-rated cable/conduit used in common areas & shafts as per code", purpose: "Life safety requirement — limits fire spread through electrical routes." }
    ]
  },
  {
    stageId: 9,
    stageName: "Stage 9: Waterproofing",
    checkpoints: [
      { id: 901, item: "Waterproofing at all wet areas — toilets, kitchen, balconies, terrace", purpose: "These are the top sources of leakage complaints; treatment must be complete and continuous." },
      { id: 902, item: "Waterproofing at terrace/roof slab — membrane, screed with slope to drain", purpose: "Prevents water ponding and seepage into top-floor ceiling." },
      { id: 903, item: "Water ponding test conducted (min. 24–48 hrs) before covering", purpose: "Physically proves the waterproofing is leak-free before tiling hides the surface." },
      { id: 904, item: "Waterproofing at expansion joints, parapets & lift pits", purpose: "These junctions are common leak points if not properly sealed." },
      { id: 905, item: "External wall waterproofing / damp-proofing where applicable", purpose: "Prevents rain penetration into walls, avoiding dampness and paint peeling." }
    ]
  },
  {
    stageId: 10,
    stageName: "Stage 10: Plastering",
    checkpoints: [
      { id: 1001, item: "Wall surface raked, cleaned & wetted before plastering", purpose: "Ensures proper bonding of plaster to masonry, preventing de-bonding/hollow sound later." },
      { id: 1002, item: "Plaster thickness uniform (internal ~12mm, external ~15-20mm) with plumb & level checked using gauges", purpose: "Uneven thickness causes cracking and poor finish for painting/tiling." },
      { id: 1003, item: "Mortar mix ratio & sand quality (sieved, free of silt) verified", purpose: "Poor sand quality causes cracking and weak plaster." },
      { id: 1004, item: "Corners, edges & ceiling junctions finished true & sharp", purpose: "Affects the quality of final finishes (paint lines, false ceiling fit)." },
      { id: 1005, item: "Curing of plaster for minimum 7 days", purpose: "Prevents shrinkage cracks — the most common visible defect in apartments." },
      { id: 1006, item: "No hollowness on tapping (hammer/sound test)", purpose: "Hollow plaster eventually de-bonds and falls — safety and durability issue." }
    ]
  },
  {
    stageId: 11,
    stageName: "Stage 11: Flooring & Tiling",
    checkpoints: [
      { id: 1101, item: "Sub-base/screed level & slope (toilets/balconies towards drain) checked", purpose: "Wrong slope causes water stagnation on floors; wrong level causes step mismatches between rooms." },
      { id: 1102, item: "Tile/stone material matches approved sample (size, shade, batch)", purpose: "Prevents shade variation across the flat, which is a common client complaint." },
      { id: 1103, item: "Tile laying pattern, joint width & alignment as per design", purpose: "Ensures uniform, professional appearance; misalignment is highly visible." },
      { id: 1104, item: "Adhesive/mortar bed full coverage (no hollow spots) — tap test after laying", purpose: "Hollow tiles crack or pop up under load/thermal movement." },
      { id: 1105, item: "Expansion/movement joints provided in large flooring areas", purpose: "Prevents tile cracking due to thermal expansion of large continuous areas." },
      { id: 1106, item: "Skirting height, straightness & finish uniform", purpose: "Cosmetic and functional (protects wall base) — visible defect if uneven." }
    ]
  },
  {
    stageId: 12,
    stageName: "Stage 12: Doors, Windows & Woodwork",
    checkpoints: [
      { id: 1201, item: "Door/window frame size, material & fixing as per specification", purpose: "Wrong size causes gaps allowing water/air infiltration and poor operation." },
      { id: 1202, item: "Frames fixed plumb & square, properly anchored to wall", purpose: "Out-of-square frames cause doors/windows to not close properly or sag over time." },
      { id: 1203, item: "Gap between frame & wall sealed (weatherproof sealant for windows)", purpose: "Prevents water seepage and drafts around openings." },
      { id: 1204, item: "Glass type/thickness for windows as per safety & wind-load spec", purpose: "Wrong glass can crack under wind load or fail safety norms." },
      { id: 1205, item: "Hardware — hinges, locks, handles installed & functioning smoothly", purpose: "Functional check for daily usability; poor hardware is an immediate defect." },
      { id: 1206, item: "Shutters aligned, no rubbing/binding, proper closing/locking", purpose: "Ensures usability and security for the resident." }
    ]
  },
  {
    stageId: 13,
    stageName: "Stage 13: Painting & Finishing",
    checkpoints: [
      { id: 1301, item: "Surface preparation — putty application, sanding, primer coat", purpose: "Smooth, well-prepared surface is essential for a durable, even paint finish." },
      { id: 1302, item: "Moisture content of wall checked before painting (moisture meter)", purpose: "Painting over damp plaster causes blistering and peeling later." },
      { id: 1303, item: "Paint brand/shade matches approved sample & number of coats as specified", purpose: "Ensures agreed quality and coverage; fewer coats than specified reduces durability." },
      { id: 1304, item: "Uniform finish — no brush marks, patches, or color variation", purpose: "Visible quality issue directly affecting handover impression." },
      { id: 1305, item: "External painting/texture — weatherproof coating applied correctly", purpose: "Protects the building envelope from weathering and UV degradation." },
      { id: 1306, item: "Protection of flooring/fittings during painting (masking, covering)", purpose: "Prevents paint splatter damage to already-finished work." }
    ]
  },
  {
    stageId: 14,
    stageName: "Stage 14: Electrical Fixtures & Fittings (Final Fix)",
    checkpoints: [
      { id: 1401, item: "Wiring pulled, tested for continuity & insulation resistance (megger test)", purpose: "Confirms no faults/damage occurred to wires during construction before energizing." },
      { id: 1402, item: "Switches, sockets, MCBs/DB installed & labelled correctly", purpose: "Ensures correct circuit protection and easy identification for future maintenance." },
      { id: 1403, item: "Earthing resistance tested & within permissible limits", purpose: "Verifies the life-safety earthing system actually works, not just installed." },
      { id: 1404, item: "Light fixtures, fans installed, tested for correct operation", purpose: "Functional verification before handover — avoids post-handover complaints." },
      { id: 1405, item: "DB legend chart provided, RCCB/ELCB functioning (test button check)", purpose: "RCCB is a critical shock-protection device; must be verified working, not just present." }
    ]
  },
  {
    stageId: 15,
    stageName: "Stage 15: Plumbing & Sanitary Fittings (Final Fix)",
    checkpoints: [
      { id: 1501, item: "CP fittings (taps, showers) & sanitary ware (WC, wash basin) installed per spec", purpose: "Ensures agreed brand/quality delivered and correctly fitted, no wobble/leaks." },
      { id: 1502, item: "All joints checked for leakage after fixture installation (running water test)", purpose: "Final proof of leak-free system under actual use conditions before handover." },
      { id: 1503, item: "Water flow & drainage checked at every fixture", purpose: "Confirms functional performance — weak flow or slow drainage is a common complaint." },
      { id: 1504, item: "Geyser/water heater point & fittings tested (if applicable)", purpose: "Electrical + plumbing interface; must be checked together for safety." },
      { id: 1505, item: "Overflow & isolation valves provided and functioning", purpose: "Enables future maintenance/repairs without shutting off the whole building's supply." }
    ]
  },
  {
    stageId: 16,
    stageName: "Stage 16: Lifts / Elevators",
    checkpoints: [
      { id: 1601, item: "Lift shaft dimensions & tolerances as per manufacturer's GA drawing", purpose: "Incorrect shaft size can prevent proper lift installation or safe operation." },
      { id: 1602, item: "Guide rail alignment, machine room equipment installation verified", purpose: "Misalignment causes vibration, noise, or unsafe operation." },
      { id: 1603, item: "Safety features tested — ARD, overload sensor, emergency alarm, door sensors", purpose: "These are life-safety systems; must be verified functional, not just installed." },
      { id: 1604, item: "Third-party lift inspection/certification obtained (as per local elevator act)", purpose: "Statutory requirement — lift cannot be legally operated without this certification." },
      { id: 1605, item: "Load test & trial run conducted with log recorded", purpose: "Confirms lift performs safely under actual rated load before use." }
    ]
  },
  {
    stageId: 17,
    stageName: "Stage 17: Fire Fighting & Fire Safety Systems",
    checkpoints: [
      { id: 1701, item: "Fire hydrant system — pump, piping, hose reels installed as per NBC/local fire code", purpose: "Life-safety system; must match the approved fire scheme, not just be present." },
      { id: 1702, item: "Fire sprinkler system coverage & functioning (if applicable)", purpose: "Automatic suppression is critical in common areas/basements — must be tested." },
      { id: 1703, item: "Smoke detectors, fire alarm panel installed & tested zone-wise", purpose: "Early warning system — false or non-functioning detection defeats its purpose." },
      { id: 1704, item: "Fire extinguishers placed as per norms (type, location, signage)", purpose: "Statutory requirement for immediate first-response fire control." },
      { id: 1705, item: "Refuge areas, fire exits, staircase pressurization (if required) verified", purpose: "Ensures safe evacuation path in case of fire — mandatory for occupancy approval." },
      { id: 1706, item: "Fire NOC inspection conducted by local fire department", purpose: "Mandatory statutory clearance — required before Occupancy Certificate can be issued." }
    ]
  },
  {
    stageId: 18,
    stageName: "Stage 18: External Development & Common Areas",
    checkpoints: [
      { id: 1801, item: "Compound wall, gate, security cabin completed as per plan", purpose: "Defines and secures the property boundary as per sanctioned layout." },
      { id: 1802, item: "Internal roads, paving, storm water drains constructed with proper slope", purpose: "Prevents water logging within the premises during rains." },
      { id: 1803, item: "Landscaping, common area lighting installed & functional", purpose: "Aesthetics and safety (well-lit common areas) for residents." },
      { id: 1804, item: "Rainwater harvesting pits/structures constructed as per approved plan", purpose: "Statutory requirement in most jurisdictions; recharges groundwater and manages runoff." },
      { id: 1805, item: "Parking layout, numbering & signage as per approved plan", purpose: "Ensures allotted parking matches sanctioned plan — avoids disputes and violations." },
      { id: 1806, item: "Common amenities (clubhouse, gym, play area) completed per specification", purpose: "Delivered as promised to buyers/RERA declaration; affects handover compliance." }
    ]
  },
  {
    stageId: 19,
    stageName: "Stage 19: STP / WTP & Environmental Compliance",
    checkpoints: [
      { id: 1901, item: "Sewage Treatment Plant (STP) capacity matches occupancy load as approved", purpose: "Undersized STP fails to treat sewage adequately, causing environmental non-compliance." },
      { id: 1902, item: "STP trial run conducted, treated water quality tested against norms", purpose: "Confirms plant actually performs to the discharge standard, not just installed." },
      { id: 1903, item: "Water Treatment Plant (WTP)/softener installed & functioning (if applicable)", purpose: "Ensures potable water quality supplied to residents meets health standards." },
      { id: 1904, item: "Solid waste management / segregation facility provided", purpose: "Statutory requirement in most municipal bylaws; supports sustainable operation." },
      { id: 1905, item: "Environmental clearance conditions (if applicable) complied with", purpose: "Legal requirement for larger projects — non-compliance can block OC/CC." }
    ]
  },
  {
    stageId: 20,
    stageName: "Stage 20: Pre-Handover Snag / Punch List Inspection",
    checkpoints: [
      { id: 2001, item: "Full flat-by-flat walkthrough with snag list documented (photos + location)", purpose: "Systematic capture of every defect before handover — basis for rectification tracking." },
      { id: 2002, item: "Doors/windows operate smoothly, no gaps, locks functional", purpose: "Final functional check from an end-user's perspective." },
      { id: 2003, item: "All electrical points, switches & fixtures tested live", purpose: "Confirms system works under real, powered conditions, not just installed." },
      { id: 2004, item: "All water points tested for flow, drainage & no leakage", purpose: "Final live-use verification before handing keys to owner." },
      { id: 2005, item: "Paint, tiling, plaster finish free of visible defects (cracks, patches, stains)", purpose: "Cosmetic quality directly affects buyer satisfaction at handover." },
      { id: 2006, item: "Common area finishes, lobby, staircases, terrace access verified", purpose: "Ensures shared spaces meet the same quality standard as individual units." },
      { id: 2007, item: "Snag rectification completed & re-verified (closed-loop sign-off)", purpose: "Ensures reported defects are actually fixed, not just noted." }
    ]
  },
  {
    stageId: 21,
    stageName: "Stage 21: Statutory Approvals & Occupancy Certificate (OC)",
    checkpoints: [
      { id: 2101, item: "Completion certificate application filed with municipal/planning authority", purpose: "Formal trigger for the authority to inspect and certify the building as complete." },
      { id: 2102, item: "As-built drawings match approved sanctioned plan (deviation check)", purpose: "Unauthorized deviations are the most common reason for OC rejection/delay." },
      { id: 2103, item: "Structural stability certificate from structural engineer obtained", purpose: "Mandatory document certifying the building is structurally safe for occupation." },
      { id: 2104, item: "Fire NOC (final) obtained from fire department", purpose: "Mandatory pre-condition for OC in most jurisdictions." },
      { id: 2105, item: "Lift certification, STP consent-to-operate, environmental clearances in place", purpose: "All service systems must be statutorily cleared before occupation is certified." },
      { id: 2106, item: "Electrical inspectorate approval / power connection (permanent) obtained", purpose: "Confirms electrical installation is safe and approved for permanent supply." },
      { id: 2107, item: "Site inspection by municipal authority conducted", purpose: "Physical verification by the authority that construction matches approved plan and is fit for occupation." },
      { id: 2108, item: "Occupancy Certificate (OC) issued and recorded with RERA/authority", purpose: "Final legal document permitting residents to occupy the building — without this, occupation is technically illegal." }
    ]
  }
];

export const AdminStageChecklist: React.FC<AdminStageChecklistProps> = ({
  projects,
  onAddToast,
  onConfirm
}) => {
  const [savedInspections, setSavedInspections] = useState<ProjectInspectionRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Header Details
  const [projectName, setProjectName] = useState('');
  const [builderName, setBuilderName] = useState('');
  const [location, setLocation] = useState('');
  const [reraNo, setReraNo] = useState('');
  const [checkedBy, setCheckedBy] = useState('');
  const [inspectionDate, setInspectionDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Modal for New Project Log
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [newProjName, setNewProjName] = useState<string>('');
  const [newBuilder, setNewBuilder] = useState<string>('');
  const [newLocation, setNewLocation] = useState<string>('');
  const [newRera, setNewRera] = useState<string>('');
  const [newInspector, setNewInspector] = useState<string>('');
  const [newLinkedProjectId, setNewLinkedProjectId] = useState<string>('');

  // Checklist Stages State - Pre-loaded with all 21 stages & ~130 checkpoints by default
  const [stages, setStages] = useState<ChecklistStageData[]>(() => {
    return DEFAULT_21_STAGES.map(s => ({
      stageId: s.stageId,
      stageName: s.stageName,
      checkpoints: s.checkpoints.map(cp => ({
        id: cp.id,
        item: cp.item,
        purpose: cp.purpose,
        status: 'Pending' as const,
        remarks: '',
        photoUrl: ''
      }))
    }));
  });

  // Filters & Active View
  const [activeStageId, setActiveStageId] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<'All' | 'OK' | 'Pending' | 'Issue'>('All');

  // Load saved inspection logs from DB
  const loadSavedInspections = async () => {
    const list = await getProjectInspectionRecords();
    setSavedInspections(list);
  };

  useEffect(() => {
    loadSavedInspections();
  }, []);

  // Handle direct selection of a system project
  const handleSelectSystemProject = (projId: string) => {
    setSelectedProjectId(projId);
    if (!projId) {
      setProjectName('');
      setLocation('');
      setBuilderName('');
      setCheckedBy('');
      setStages([]);
      setSelectedRecordId('');
      return;
    }

    const proj = projects.find(p => p.id === projId);
    if (proj) {
      setProjectName(proj.name);
      setLocation(proj.location || '');
      setBuilderName('JK Future Infra Projects');
      setCheckedBy('Er. Site Supervisor');
    }

    // Check if an inspection record already exists for this project
    const existing = savedInspections.find(r => r.projectId === projId || r.projectName === proj?.name);
    if (existing) {
      loadInspectionRecord(existing);
    } else {
      setSelectedRecordId('insp_' + projId);
      resetChecklistToTemplate();
      onAddToast(`Started 21-stage inspection checklist for "${proj?.name}".`, 'info');
    }
  };

  // Load a specific inspection log record into interactive checklist
  const loadInspectionRecord = (rec: ProjectInspectionRecord) => {
    setSelectedRecordId(rec.id);
    setSelectedProjectId(rec.projectId || '');
    setProjectName(rec.projectName || '');
    setBuilderName(rec.builderName || '');
    setLocation(rec.location || '');
    setReraNo(rec.reraNo || '');
    setCheckedBy(rec.checkedBy || '');
    setInspectionDate(rec.inspectionDate || new Date().toISOString().split('T')[0]);

    if (rec.stages && rec.stages.length > 0) {
      setStages(rec.stages);
    } else {
      resetChecklistToTemplate();
    }
    onAddToast(`Loaded inspection log for "${rec.projectName}".`, 'info');
  };

  // Helper to reset stages to default template
  const resetChecklistToTemplate = () => {
    setStages(DEFAULT_21_STAGES.map(s => ({
      stageId: s.stageId,
      stageName: s.stageName,
      checkpoints: s.checkpoints.map(cp => ({
        id: cp.id,
        item: cp.item,
        purpose: cp.purpose,
        status: 'Pending' as const,
        remarks: '',
        photoUrl: ''
      }))
    })));
  };

  // Create a brand new project inspection log
  const handleCreateNewProjectLog = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newProjName.trim()) {
      onAddToast('Please enter an Apartment or Project Name.', 'error');
      return;
    }

    const newId = 'insp_' + Date.now();
    setSelectedRecordId(newId);
    setSelectedProjectId(newLinkedProjectId || '');
    setProjectName(newProjName.trim());
    setBuilderName(newBuilder.trim());
    setLocation(newLocation.trim());
    setReraNo(newRera.trim());
    setCheckedBy(newInspector.trim());
    setInspectionDate(new Date().toISOString().split('T')[0]);

    resetChecklistToTemplate();
    setShowNewModal(false);
    onAddToast(`New inspection log started for "${newProjName.trim()}".`, 'success');
  };

  const handleDeleteInspection = async (id: string) => {
    const target = savedInspections.find(r => r.id === id || r.projectId === id);
    const name = target ? target.projectName : 'this inspection log';
    if (await onConfirm(`Are you sure you want to delete "${name}"?`)) {
      await deleteProjectInspection(id);
      onAddToast('Inspection log deleted.', 'info');
      if (selectedRecordId === id) {
        setSelectedRecordId('');
        setStages([]);
      }
      await loadSavedInspections();
    }
  };

  // Overall Stats Calculation
  const totalCheckpoints = useMemo(() => {
    return stages.reduce((acc, st) => acc + st.checkpoints.length, 0);
  }, [stages]);

  const okCheckpointsCount = useMemo(() => {
    return stages.reduce((acc, st) => acc + st.checkpoints.filter(c => c.status === 'OK').length, 0);
  }, [stages]);

  const issueCheckpointsCount = useMemo(() => {
    return stages.reduce((acc, st) => acc + st.checkpoints.filter(c => c.status === 'Issue').length, 0);
  }, [stages]);

  const pendingCheckpointsCount = useMemo(() => {
    return stages.reduce((acc, st) => acc + st.checkpoints.filter(c => c.status === 'Pending').length, 0);
  }, [stages]);

  const overallProgressPct = Math.round((okCheckpointsCount / (totalCheckpoints || 1)) * 100);

  // Update Remarks of a single checkpoint
  const handleRemarksChange = (stageId: number, cpId: number | string, remarksVal: string) => {
    setStages(prevStages => 
      prevStages.map(st => {
        if (st.stageId !== stageId) return st;
        return {
          ...st,
          checkpoints: st.checkpoints.map(cp => {
            if (cp.id !== cpId) return cp;
            return { ...cp, remarks: remarksVal };
          })
        };
      })
    );
  };

  // Modal for Add New Checkpoint
  const [showAddCpModal, setShowAddCpModal] = useState<boolean>(false);
  const [newCpItem, setNewCpItem] = useState<string>('');
  const [newCpPurpose, setNewCpPurpose] = useState<string>('');
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowDateObj = new Date();
  tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1);
  const tomorrowStr = tomorrowDateObj.toISOString().split('T')[0];
  const [newCpDate, setNewCpDate] = useState<string>(todayStr);

  // Update Verified Date of a single checkpoint (Datepicker change)
  const handleVerifiedDateChange = (stageId: number, cpId: number | string, newDate: string) => {
    setStages(prevStages => 
      prevStages.map(st => {
        if (st.stageId !== stageId) return st;
        return {
          ...st,
          checkpoints: st.checkpoints.map(cp => {
            if (cp.id !== cpId) return cp;
            return {
              ...cp,
              verifiedDate: newDate,
              status: newDate ? 'OK' : 'Pending',
              verifiedBy: checkedBy
            };
          })
        };
      })
    );
  };

  // Add new custom checkpoint item to active stage
  const handleAddCheckpoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCpItem.trim()) {
      onAddToast('Please enter Checkpoint / Work Item description.', 'error');
      return;
    }

    const newId = Date.now();
    const workDateToUse = newCpDate || todayStr;
    setStages(prevStages => 
      prevStages.map(st => {
        if (st.stageId !== activeStageId) return st;
        return {
          ...st,
          checkpoints: [
            ...st.checkpoints,
            {
              id: newId,
              item: newCpItem.trim(),
              purpose: newCpPurpose.trim() || 'Custom monitoring purpose.',
              status: workDateToUse ? 'OK' : ('Pending' as const),
              verifiedDate: workDateToUse,
              remarks: ''
            }
          ]
        };
      })
    );

    setNewCpItem('');
    setNewCpPurpose('');
    setShowAddCpModal(false);
    onAddToast(`Work item recorded for date ${workDateToUse}.`, 'success');
  };

  // Delete a single checkpoint item from a stage
  const handleDeleteCheckpoint = (stageId: number, cpId: number | string) => {
    setStages(prevStages => 
      prevStages.map(st => {
        if (st.stageId !== stageId) return st;
        return {
          ...st,
          checkpoints: st.checkpoints.filter(cp => cp.id !== cpId)
        };
      })
    );
    onAddToast('Checkpoint item deleted.', 'info');
  };

  // Mark all in current active stage as OK
  const handleMarkStageAllOk = (stageId: number) => {
    const today = new Date().toISOString().split('T')[0];
    setStages(prevStages => 
      prevStages.map(st => {
        if (st.stageId !== stageId) return st;
        return {
          ...st,
          checkpoints: st.checkpoints.map(cp => ({
            ...cp,
            status: 'OK',
            verifiedBy: checkedBy,
            verifiedDate: cp.verifiedDate || today
          }))
        };
      })
    );
    onAddToast(`All items in Stage ${stageId} marked as verified (OK).`, 'success');
  };

  // Reset current stage to pending
  const handleResetStage = (stageId: number) => {
    setStages(prevStages => 
      prevStages.map(st => {
        if (st.stageId !== stageId) return st;
        return {
          ...st,
          checkpoints: st.checkpoints.map(cp => ({
            ...cp,
            status: 'Pending',
            verifiedDate: '',
            remarks: '',
            photoUrl: ''
          }))
        };
      })
    );
    onAddToast(`Stage ${stageId} reset to pending status.`, 'info');
  };

  // Save Record
  const handleSaveRecord = async () => {
    if (!projectName.trim()) {
      onAddToast('Please select or enter an Apartment / Project Name before saving.', 'error');
      return;
    }

    const recId = selectedRecordId || 'insp_' + (selectedProjectId || Date.now());
    const record: ProjectInspectionRecord = {
      id: recId,
      projectId: selectedProjectId || '',
      projectName: projectName.trim(),
      builderName: builderName.trim(),
      location: location.trim(),
      reraNo: reraNo.trim(),
      checkedBy: checkedBy.trim(),
      inspectionDate,
      stages,
      overallProgress: overallProgressPct
    };

    try {
      await saveProjectInspection(record);
      setSelectedRecordId(recId);
      onAddToast(`Construction Inspection Log for "${projectName}" saved successfully (${overallProgressPct}% complete).`, 'success');
      await loadSavedInspections();
    } catch (e) {
      onAddToast('Failed to save inspection record.', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Active Stage Object
  const currentStage = useMemo(() => {
    return stages.find(s => s.stageId === activeStageId) || stages[0];
  }, [stages, activeStageId]);

  // Filtered checkpoints for active stage
  const filteredCheckpoints = useMemo(() => {
    if (!currentStage) return [];
    return currentStage.checkpoints.filter(cp => {
      const matchesStatus = statusFilter === 'All' || cp.status === statusFilter;
      return matchesStatus;
    });
  }, [currentStage, statusFilter]);

  // ALV Columns definition for Saved Inspection Records Table
  const columns: ALVColumn[] = [
    {
      key: 'projectName',
      label: 'Project / Apartment Name',
      sortable: true,
      render: (_v, row) => {
        const rec = row as unknown as ProjectInspectionRecord;
        const isActive = selectedRecordId === rec.id;
        return (
          <div>
            <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
              {rec.projectName}
              {isActive && (
                <span className="badge badge-completed" style={{ marginLeft: '6px', fontSize: '0.65rem' }}>Active Log</span>
              )}
            </div>
            {rec.builderName && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rec.builderName}</div>}
          </div>
        );
      }
    },
    {
      key: 'location',
      label: 'Location',
      sortable: true,
      width: '140px',
      render: (v) => <span className="text-xs text-muted">{String(v || '-')}</span>
    },
    {
      key: 'checkedBy',
      label: 'Checked By',
      sortable: true,
      width: '150px',
      render: (v) => <span className="text-xs font-semibold">{String(v || '-')}</span>
    },
    {
      key: 'inspectionDate',
      label: 'Date',
      sortable: true,
      width: '120px',
      render: (v) => <span className="text-xs text-muted">{String(v || '-')}</span>
    },
    {
      key: 'overallProgress',
      label: 'Overall Progress',
      sortable: true,
      align: 'center',
      width: '160px',
      render: (_v, row) => {
        const rec = row as unknown as ProjectInspectionRecord;
        const totalCp = rec.stages ? rec.stages.reduce((acc, st) => acc + st.checkpoints.length, 0) : 0;
        const okCp = rec.stages ? rec.stages.reduce((acc, st) => acc + st.checkpoints.filter(c => c.status === 'OK').length, 0) : 0;
        const pct = rec.overallProgress ?? (totalCp > 0 ? Math.round((okCp / totalCp) * 100) : 0);
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span className="font-bold text-dark">{pct}%</span>
            <div style={{ width: '60px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--primary)' }}></div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'issues',
      label: 'Issues Found',
      align: 'center',
      width: '120px',
      render: (_v, row) => {
        const rec = row as unknown as ProjectInspectionRecord;
        const issueCp = rec.stages ? rec.stages.reduce((acc, st) => acc + st.checkpoints.filter(c => c.status === 'Issue').length, 0) : 0;
        return issueCp > 0 ? (
          <span className="badge badge-new" style={{ color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
            {issueCp} Issues
          </span>
        ) : (
          <span className="text-xs text-muted">0 Issues</span>
        );
      }
    },
    {
      key: '__actions',
      label: 'Actions',
      align: 'center',
      width: '110px',
      render: (_v, row) => {
        const rec = row as unknown as ProjectInspectionRecord;
        return (
          <div className="admin-table-actions" style={{ justifyContent: 'center' }}>
            <button
              onClick={() => loadInspectionRecord(rec)}
              className="alv-toolbar-btn"
              title="Load inspection log into interactive checklist"
            >
              <Edit size={13} />
            </button>
            <button
              onClick={() => handleDeleteInspection(rec.id)}
              className="alv-toolbar-btn"
              title="Delete log"
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
    <div className="admin-stage-checklist-container">
      {/* Document Description Banner matching official specification */}
      <div className="admin-card mb-3" style={{ borderLeft: '4px solid var(--primary)' }}>
        <div className="flex justify-between align-center flex-wrap gap-2">
          <div>
            <h2 className="border-bottom-title mb-0.5 flex align-center gap-1" style={{ fontSize: '1.25rem' }}>
              <ClipboardCheck size={22} className="text-secondary" />
              Apartment Construction — Daily Site Work & Stage-wise Monitoring Schedule
            </h2>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>
              Sequence: Site Preparation → Foundation → Structure → Finishing → Services → Completion & OC
            </div>
            <p className="text-xs text-muted" style={{ margin: 0, maxWidth: '900px', lineHeight: 1.4 }}>
              Monitor today's active site work, track quality compliance, and plan tomorrow's construction activities stage-by-stage — from initial site handover up to obtaining the Occupancy Certificate (OC).
            </p>
          </div>

          <div className="flex align-center gap-1 flex-wrap">
            <button 
              onClick={() => {
                setNewProjName('');
                setNewLinkedProjectId('');
                setShowNewModal(true);
              }} 
              className="btn btn-outline btn-sm flex align-center gap-0.5"
            >
              <Plus size={14} /> New Project Log
            </button>

            <button 
              onClick={handleSaveRecord} 
              className="btn btn-secondary btn-sm flex align-center gap-0.5"
            >
              <Save size={14} /> Save Inspection Log
            </button>

            <button 
              onClick={handlePrint} 
              className="btn btn-outline btn-sm flex align-center gap-0.5"
            >
              <Printer size={14} /> Print Report
            </button>
          </div>
        </div>
      </div>

      {/* Compact 1-Line Horizontal Summary Strip */}
      <div className="admin-card mb-3 p-2" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '10px', fontSize: '0.8rem' }}>
          <div className="flex align-center gap-0.5">
            <ShieldCheck size={16} className="text-primary" />
            <span className="text-muted font-bold">Progress:</span>
            <span className="font-bold text-dark">{overallProgressPct}%</span>
          </div>

          <div style={{ width: '1px', height: '16px', backgroundColor: '#cbd5e1' }}></div>

          <div className="flex align-center gap-0.5">
            <CheckCircle2 size={16} className="text-success" />
            <span className="text-muted font-bold">Verified OK:</span>
            <span className="font-bold text-success">{okCheckpointsCount}</span>
            <span className="text-xxs text-muted">/ {totalCheckpoints}</span>
          </div>

          <div style={{ width: '1px', height: '16px', backgroundColor: '#cbd5e1' }}></div>

          <div className="flex align-center gap-0.5">
            <AlertTriangle size={16} className="text-danger" />
            <span className="text-muted font-bold">Issues:</span>
            <span className="font-bold text-danger">{issueCheckpointsCount}</span>
          </div>

          <div style={{ width: '1px', height: '16px', backgroundColor: '#cbd5e1' }}></div>

          <div className="flex align-center gap-0.5">
            <Clock size={16} style={{ color: '#d97706' }} />
            <span className="text-muted font-bold">Pending:</span>
            <span className="font-bold" style={{ color: '#d97706' }}>
              {okCheckpointsCount > 0 || issueCheckpointsCount > 0 ? pendingCheckpointsCount : 0}
            </span>
          </div>

          <div style={{ width: '1px', height: '16px', backgroundColor: '#cbd5e1' }}></div>

          <div className="flex align-center gap-0.5">
            <Layers size={16} style={{ color: '#7e22ce' }} />
            <span className="text-muted font-bold">Stages:</span>
            <span className="font-bold" style={{ color: '#7e22ce' }}>21 Stages</span>
          </div>
        </div>
      </div>

      {/* Project Site Metadata Information Card */}
      <div className="admin-card mb-3">
        <div className="grid grid-3 gap-2 mobile-stack mb-2">
          <div className="form-group mb-0">
            <label className="form-label font-bold">Select Project / Apartment *</label>
            <select 
              className="form-control font-bold"
              value={selectedProjectId}
              onChange={e => handleSelectSystemProject(e.target.value)}
            >
              <option value="">-- Select Project / Apartment --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.location || 'Visakhapatnam'})</option>
              ))}
            </select>
          </div>

          <div className="form-group mb-0">
            <label className="form-label font-bold">Project Name</label>
            <input 
              type="text" 
              className="form-control font-bold"
              value={projectName}
              placeholder="Project Name"
              onChange={e => setProjectName(e.target.value)}
            />
          </div>

          <div className="form-group mb-0">
            <label className="form-label font-bold">Builder / Contractor</label>
            <input 
              type="text" 
              className="form-control"
              value={builderName}
              placeholder="Builder / PMC Name"
              onChange={e => setBuilderName(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-3 gap-2 mobile-stack">
          <div className="form-group mb-0">
            <label className="form-label font-bold">Site Location</label>
            <input 
              type="text" 
              className="form-control"
              value={location}
              placeholder="Site Location"
              onChange={e => setLocation(e.target.value)}
            />
          </div>

          <div className="form-group mb-0">
            <label className="form-label font-bold">RERA No.</label>
            <input 
              type="text" 
              className="form-control"
              value={reraNo}
              placeholder="RERA Registration No."
              onChange={e => setReraNo(e.target.value)}
            />
          </div>

          <div className="form-group mb-0">
            <label className="form-label font-bold">Checked By / Inspector</label>
            <input 
              type="text" 
              className="form-control"
              value={checkedBy}
              placeholder="Site Engineer / PMC"
              onChange={e => setCheckedBy(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Saved Inspection Logs Table via ALVGrid */}
      <div className="mb-4">
        <ALVGrid
          title="Saved Construction Inspection Logs"
          subtitle={`${savedInspections.length} site inspection record${savedInspections.length === 1 ? '' : 's'} saved`}
          columns={columns}
          data={savedInspections as any}
          rowKey="id"
          onAdd={() => setShowNewModal(true)}
          addLabel="New Inspection Log"
          onRefresh={loadSavedInspections}
          pageSize={5}
          searchable={true}
          searchPlaceholder="Search saved inspections by project name, builder, or inspector..."
          emptyText="No saved inspection records found. Click '+ New Inspection Log' or complete the checklist below and click 'Save Inspection Log'."
        />
      </div>

      {/* Interactive 21-Stage Checklist Area */}
      <div className="grid grid-4 gap-3 mobile-stack">
        {/* Left Drawer: 21 Stages Navigation */}
        <div className="admin-card p-2" style={{ maxHeight: '680px', display: 'flex', flexDirection: 'column' }}>
          <div className="font-bold text-xs text-dark uppercase tracking-wider mb-2 border-bottom-title">
            21 Work Stages
          </div>

          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
            {stages.map(st => {
              const stageOkCount = st.checkpoints.filter(c => c.status === 'OK').length;
              const stageIssueCount = st.checkpoints.filter(c => c.status === 'Issue').length;
              const stagePct = Math.round((stageOkCount / st.checkpoints.length) * 100);
              const isActive = st.stageId === activeStageId;

              return (
                <button
                  key={st.stageId}
                  onClick={() => setActiveStageId(st.stageId)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    border: '1px solid #e2e8f0',
                    backgroundColor: isActive ? 'var(--primary)' : '#ffffff',
                    color: isActive ? '#ffffff' : '#334155',
                    marginBottom: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                      {st.stageName}
                    </span>
                    <span 
                      className="badge" 
                      style={{ 
                        backgroundColor: isActive ? 'var(--secondary)' : '#f1f5f9', 
                        color: isActive ? 'var(--primary)' : '#475569',
                        fontWeight: 700
                      }}
                    >
                      {stagePct}%
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: isActive ? 'rgba(255,255,255,0.7)' : '#94a3b8', marginTop: '4px' }}>
                    <span>{st.checkpoints.length} Checkpoints</span>
                    {stageIssueCount > 0 && (
                      <span style={{ color: isActive ? '#fca5a5' : '#dc2626', fontWeight: 'bold' }}>
                        ⚠️ {stageIssueCount} Issues
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Area: Stage Checkpoint Items Table */}
        <div className="admin-card p-0" style={{ gridColumn: 'span 3', overflow: 'hidden' }}>
          <div className="admin-card-header" style={{ padding: '0.8rem 1.25rem', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--secondary)', fontWeight: 700 }} className="flex align-center gap-0.5">
                <FileCheck size={18} />
                {currentStage?.stageName}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)' }}>
                Verify each work item's specific purpose below. Tick OK once verified on site.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => {
                  setNewCpDate(todayStr);
                  setShowAddCpModal(true);
                }}
                className="btn btn-outline btn-xs flex align-center gap-0.5"
                style={{ backgroundColor: '#059669', borderColor: '#059669', color: 'white', fontSize: '0.75rem', padding: '4px 10px', fontWeight: 700 }}
                title="Log work executed / verified today on site"
              >
                <Plus size={13} /> Log Today's Work ({todayStr})
              </button>

              <button 
                onClick={() => {
                  setNewCpDate(tomorrowStr);
                  setShowAddCpModal(true);
                }}
                className="btn btn-outline btn-xs flex align-center gap-0.5"
                style={{ backgroundColor: '#2563eb', borderColor: '#2563eb', color: 'white', fontSize: '0.75rem', padding: '4px 10px', fontWeight: 700 }}
                title="Schedule / plan work items for tomorrow"
              >
                <Plus size={13} /> Plan Tomorrow's Work ({tomorrowStr})
              </button>

              <button 
                onClick={() => handleMarkStageAllOk(activeStageId)}
                className="btn btn-outline btn-xs"
                style={{ backgroundColor: '#10b981', borderColor: '#10b981', color: 'white', fontSize: '0.75rem', padding: '4px 10px' }}
                title="Mark all checkpoints in this stage as verified OK"
              >
                <CheckCircle2 size={13} /> Mark Stage Complete
              </button>

              <button 
                onClick={() => handleResetStage(activeStageId)}
                className="btn btn-outline btn-xs"
                style={{ backgroundColor: '#64748b', borderColor: '#64748b', color: 'white', fontSize: '0.75rem', padding: '4px 10px' }}
                title="Reset all checkpoints in this stage to Pending"
              >
                Reset Stage
              </button>

              <select 
                className="form-control text-xs"
                style={{ width: '120px', padding: '3px 6px' }}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
              >
                <option value="All">All Statuses</option>
                <option value="OK">OK Only</option>
                <option value="Issue">Issues Only</option>
                <option value="Pending">Pending Only</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table text-xs" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', color: '#1e293b', fontWeight: 'bold' }}>
                  <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center', width: '45px' }}>#</th>
                  <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1', width: '28%' }}>CHECKPOINT / WORK ITEM</th>
                  <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1', width: '34%' }}>WHAT TO VERIFY (MONITORING PURPOSE)</th>
                  <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center', width: '140px' }}>VERIFICATION DATE</th>
                  <th style={{ padding: '8px', borderRight: '1px solid #cbd5e1', width: '22%' }}>REMARKS & REMEDIATION</th>
                  <th style={{ padding: '8px', textAlign: 'center', width: '50px' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredCheckpoints.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                      No checkpoints match the selected status filter. Click "+ Add Checkpoint" above to add a new work item.
                    </td>
                  </tr>
                ) : (
                  filteredCheckpoints.map(cp => {
                    return (
                      <tr 
                        key={cp.id} 
                        style={{ 
                          borderBottom: '1px solid #e2e8f0',
                          backgroundColor: cp.status === 'OK' ? '#f0fdf4' : cp.status === 'Issue' ? '#fef2f2' : 'white'
                        }}
                      >
                        <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                          {cp.id}
                        </td>

                        <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', fontWeight: 600, color: '#0f172a' }}>
                          {cp.item}
                        </td>

                        <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', color: '#475569', lineHeight: 1.4 }}>
                          {cp.purpose}
                        </td>

                        <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>
                          <input
                            type="date"
                            className="form-control"
                            style={{ width: '130px', padding: '2px 4px', fontSize: '0.75rem' }}
                            value={cp.verifiedDate || ''}
                            onChange={e => handleVerifiedDateChange(activeStageId, cp.id, e.target.value)}
                            title="Select date checkpoint was verified / scheduled"
                          />
                        </td>

                        <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>
                          <input
                            type="text"
                            className="form-control"
                            style={{ width: '100%', padding: '4px 6px', fontSize: '0.75rem' }}
                            placeholder="Observations or remediation notes..."
                            value={cp.remarks || ''}
                            onChange={e => handleRemarksChange(activeStageId, cp.id, e.target.value)}
                          />
                        </td>

                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteCheckpoint(activeStageId, cp.id)}
                            style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: '2px' }}
                            title="Delete checkpoint item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal for New Project Log */}
      {showNewModal && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '480px' }}>
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <h3 className="modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                Start New Project Construction Inspection Log
              </h3>
            </div>

            <form onSubmit={handleCreateNewProjectLog}>
              <div className="modal-body" style={{ padding: '1.25rem 1.5rem' }}>
                <div className="form-group">
                  <label className="form-label font-bold">Select System Project (Optional)</label>
                  <select 
                    className="form-control text-xs"
                    value={newLinkedProjectId}
                    onChange={e => {
                      setNewLinkedProjectId(e.target.value);
                      const matched = projects.find(p => p.id === e.target.value);
                      if (matched) {
                        setNewProjName(matched.name);
                        setNewLocation(matched.location || 'Visakhapatnam');
                      }
                    }}
                  >
                    <option value="">-- Enter Custom Apartment Name --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.location})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label font-bold">Apartment / Project Name *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Lee Infra Heights Block B"
                    value={newProjName}
                    onChange={e => setNewProjName(e.target.value)}
                    required 
                  />
                </div>

                <div className="grid grid-2 gap-2 mobile-stack mb-2">
                  <div className="form-group mb-0">
                    <label className="form-label font-bold">Builder / Contractor</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={newBuilder}
                      onChange={e => setNewBuilder(e.target.value)}
                    />
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label font-bold">Location</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={newLocation}
                      onChange={e => setNewLocation(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-2 gap-2 mobile-stack">
                  <div className="form-group mb-0">
                    <label className="form-label font-bold">RERA Registration No</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={newRera}
                      onChange={e => setNewRera(e.target.value)}
                    />
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label font-bold">Inspector / Checked By</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={newInspector}
                      onChange={e => setNewInspector(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowNewModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-secondary">
                  Create Inspection Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Add New Checkpoint */}
      {showAddCpModal && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '480px' }}>
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <h3 className="modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                Add New Checkpoint to Stage {activeStageId}
              </h3>
            </div>

            <form onSubmit={handleAddCheckpoint}>
              <div className="modal-body" style={{ padding: '1.25rem 1.5rem' }}>
                <div className="form-group">
                  <label className="form-label font-bold">Scheduled / Work Date *</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={newCpDate}
                    onChange={e => setNewCpDate(e.target.value)}
                    required 
                  />
                  <div className="text-xxs text-muted mt-1">
                    Set today's date for current work, or tomorrow/future date for planned site activities.
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label font-bold">Checkpoint / Work Item Description *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Boundary wall Total Station survey verification"
                    value={newCpItem}
                    onChange={e => setNewCpItem(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group mb-0">
                  <label className="form-label font-bold">What to Verify (Monitoring Purpose)</label>
                  <textarea 
                    className="form-control"
                    rows={3}
                    placeholder="e.g. Confirms plot boundary matches approved layout and title deed."
                    value={newCpPurpose}
                    onChange={e => setNewCpPurpose(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddCpModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-secondary">
                  Add Checkpoint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
