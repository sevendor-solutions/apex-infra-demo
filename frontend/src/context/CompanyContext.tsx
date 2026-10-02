import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CompanyProfile } from '../types';
import { getCompanyProfile, updateCompanyProfile as apiUpdateCompanyProfile } from '../utils/db';

interface CompanyContextType {
  profile: CompanyProfile;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<CompanyProfile>, logoFile?: File, iconFile?: File, signatureFile?: File) => Promise<CompanyProfile>;
}

const defaultProfile: CompanyProfile = {
  companyName: 'Apex Real Estate & Infra',
  tagline: 'Building Landmarks, Fulfilling Dreams',
  logoUrl: '/uploads/logo.png',
  phonePrimary: '+91 9876543210',
  phoneSecondary: '+91 9876543211',
  whatsapp: '919876543210',
  email: 'info@apexinfra.com',
  address: 'Business Towers, Tech Park Road, Visakhapatnam, Andhra Pradesh',
  city: 'Visakhapatnam',
  state: 'Andhra Pradesh',
  pincode: '530001',
  isoCertification: 'ISO 9001:2015 Certified',
  rera1: 'AP RERA: P0123456789',
  rera2: 'TS RERA: P0987654321',
  copyrightText: '© 2026 Apex Real Estate & Infra. All rights reserved.',
};

const CompanyContext = createContext<CompanyContextType>({
  profile: defaultProfile,
  loading: false,
  refreshProfile: async () => {},
  updateProfile: async () => defaultProfile,
});

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<CompanyProfile>(() => {
    const cached = localStorage.getItem('jk_company_profile');
    if (cached) {
      try {
        return { ...defaultProfile, ...JSON.parse(cached) };
      } catch {
        // fallback
      }
    }
    return defaultProfile;
  });
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const data = await getCompanyProfile();
      if (data) {
        setProfile({ ...defaultProfile, ...data });
      }
    } catch (e) {
      console.error('Failed to load company profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (
    data: Partial<CompanyProfile>,
    logoFile?: File,
    iconFile?: File,
    signatureFile?: File
  ): Promise<CompanyProfile> => {
    const updated = await apiUpdateCompanyProfile(data, logoFile, iconFile, signatureFile);
    const merged = { ...profile, ...updated };
    setProfile(merged);
    localStorage.setItem('jk_company_profile', JSON.stringify(merged));
    return merged;
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  return (
    <CompanyContext.Provider value={{ profile, loading, refreshProfile, updateProfile }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => useContext(CompanyContext);
