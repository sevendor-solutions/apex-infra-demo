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
    ? '/marketing_banner_hd.png'
    : '/jk_difference_hd.png';
};
