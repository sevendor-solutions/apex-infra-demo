import type { Project } from '../types';

export const getProjectGalleryImages = (project: Project): string[] => {
  const specFiles = project.specImage ? project.specImage.split(',').map(u => u.trim()).filter(Boolean) : [];
  // Filter out PDFs and videos from image gallery list
  const isMediaFile = (url: string) => url.match(/\.(pdf|mp4|webm|mov|avi)($|\?)/i);
  const specImages = specFiles.filter(url => !isMediaFile(url));
  const propImages = (project.images || []).filter(url => !isMediaFile(url));
  
  let list: string[] = [];
  if (project.isMarketing) {
    // Marketing projects:
    // Elevation Render Image (propImages[0]) is the main image.
    // Spec images are shown next in the hero banner.
    if (propImages.length > 0) {
      list.push(propImages[0]);
    }
    list.push(...specImages);
    if (propImages.length > 1) {
      list.push(...propImages.slice(1));
    }
  } else {
    // Standard projects:
    // Blueprint/Specifications Image (specImages[0]) is the main image.
    // Property images follow.
    list.push(...specImages);
    list.push(...propImages);
  }
  
  // Deduplicate and filter empty
  return Array.from(new Set(list)).filter(Boolean);
};

export const getProjectMainImage = (project: Project): string => {
  const imgs = getProjectGalleryImages(project);
  if (imgs.length > 0) return imgs[0];
  
  // Fallback
  return project.isMarketing
    ? '/marketing_banner_hd.png'
    : '/jk_difference_hd.png';
};

export const getSegmentFallbackSpecImage = (project: Project): string => {
  if (project.specImage && project.specImage.trim().length > 0) {
    return project.specImage.split(',')[0].trim();
  }
  if (project.floorPlans && project.floorPlans.length > 0 && project.floorPlans[0].image) {
    return project.floorPlans[0].image;
  }

  const category = project.category || 'Flats';
  const subCat = project.subCategory || '';

  // 1. Flats Segment
  if (category === 'Flats') {
    if (project.availabilityDetails?.includes('3 BHK') || project.name.includes('3 BHK')) {
      return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1000&auto=format&fit=crop&q=80';
  }

  // 2. Villas Segment
  if (category === 'Villas') {
    return 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1000&auto=format&fit=crop&q=80';
  }

  // 3. Individual Houses Segment
  if (category === 'Individual Houses') {
    return 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1000&auto=format&fit=crop&q=80';
  }

  // 4. Sites & Lands Segment (VUDA/VMRDA Approved, Panchayati Approved, Ventures, Agriculture, Industrial, etc.)
  if (category === 'Sites' || subCat.includes('Sites') || subCat.includes('Ventures') || subCat.includes('Lands')) {
    if (subCat.includes('Agriculture')) {
      return 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1000&auto=format&fit=crop&q=80';
    }
    if (subCat.includes('Industrial')) {
      return 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1000&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1524813686514-a57563d77965?w=1000&auto=format&fit=crop&q=80';
  }

  // Fallback default architectural plan image
  return 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1000&auto=format&fit=crop&q=80';
};

export const getProjectPdfFiles = (project: Project): string[] => {
  if (!project) return [];
  const set = new Set<string>();

  const checkAndAdd = (u: string) => {
    if (!u) return;
    const trimmed = u.trim();
    if (!trimmed || trimmed === '#') return;
    const lower = trimmed.toLowerCase();
    if (lower.includes('.pdf') || lower.endsWith('.pdf')) {
      set.add(trimmed);
    }
  };

  // 1. Brochure URL
  if (project.brochureUrl) checkAndAdd(project.brochureUrl);

  // 2. SpecImage
  if (project.specImage) {
    project.specImage.split(',').forEach(checkAndAdd);
  }

  // 3. Images array or string
  if (Array.isArray(project.images)) {
    project.images.forEach(checkAndAdd);
  } else if (typeof project.images === 'string') {
    (project.images as string).split(',').forEach(checkAndAdd);
  }

  return Array.from(set);
};
