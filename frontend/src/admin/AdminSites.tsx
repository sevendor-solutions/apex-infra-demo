import type { Project, SiteCategory } from '../types';
import { Landmark } from 'lucide-react';

interface AdminSitesProps {
  marketing: Project[];
}

export const AdminSites: React.FC<AdminSitesProps> = ({ marketing }) => {

  const getSiteCount = (sub: SiteCategory) => {
    return marketing.filter(p => p.category === 'Sites' && p.subCategory === sub).length;
  };

  const siteCategories: { name: SiteCategory; authority: string; desc: string }[] = [
    { name: 'VUDA Approved Sites', authority: 'VMRDA / CRDA', desc: 'Urban plotting layouts verified by metropolitan development authorities. Fully compliant with zoning and public park reservations.' },
    { name: 'Panchayati Approved Sites', authority: 'Gram Panchayat', desc: 'Plotted layout coordinates approved by rural gram panchayat codes. Highly affordable buy-in targets.' },
    { name: 'Development Sites', authority: 'Land Use Board', desc: 'Large land plots set up for commercial complexes, industrial warehouses, or agricultural layouts.' },
    { name: 'Ventures', authority: 'JK Developer Layouts', desc: 'Theme-designed gated plot layouts completed with black-top roads, drainage pipes, and gate arches.' }
  ];

  return (
    <div className="admin-sites-view">
      <div className="flex justify-between align-center mb-3">
        <h2>Sites Classification</h2>
        <span className="badge badge-ongoing">RERA Regulated Codes</span>
      </div>

      <div className="grid grid-2 gap-3">
        {siteCategories.map((sub, i) => (
          <div key={i} className="admin-card flex flex-col justify-between">
            <div>
              <div className="flex justify-between align-center mb-1">
                <span className="font-bold text-lg text-primary">{sub.name}</span>
                <span className="badge badge-ongoing" style={{ fontSize: '0.8rem' }}>{getSiteCount(sub.name)} Plots Listing</span>
              </div>
              <p className="text-sm text-muted mb-1">{sub.desc}</p>
              <div className="flex align-center gap-0.5 text-xs text-secondary font-semibold">
                <Landmark size={14} /> Authority: {sub.authority}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
