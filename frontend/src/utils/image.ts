import type { Project } from '../types';

export const getProjectGalleryImages = (project: Project): string[] => {
  const specImages = project.specImage ? project.specImage.split(',').map(u => u.trim()).filter(Boolean) : [];
  const propImages = project.images || [];
  
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
    ? 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&auto=format&fit=crop&q=60'
    : 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=60';
};
