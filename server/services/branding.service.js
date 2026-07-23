/**
 * Branding Service - Handle survey and company branding logic
 *
 * Provides fallback hierarchy: survey settings > company settings > system defaults
 * with proper validation and effective settings calculation.
 *
 * @fileoverview Branding service for SurveyFlow
 * @author SurveyFlow Team
 */
import Company from "../models/company.models.js";

/**
 * Default system branding configuration
 */
const SYSTEM_DEFAULTS = {
  logo: null,
  themeColor: "#10B981", // Emerald-500
  secondaryColor: "#10B981", // Emerald-500
  defaultFont: "Inter",
  thankYouMessage: "Thank you for completing this survey!"
};

/**
 * Calculate effective branding settings with fallback hierarchy
 *
 * @param {Object} survey - Survey document with branding fields
 * @param {Object} company - Company document with branding settings
 * @returns {Object} Effective branding settings with inheritance information
 */
export const getEffectiveBrandingSettings = (survey, company = null) => {
  const effective = {};
  const isInherited = {};

  // Logo fallback: survey > company > null
  if (survey.logo && survey.logo.trim() !== '') {
    effective.logo = survey.logo;
    isInherited.logo = false;
  } else if (company?.logo && company.logo.trim() !== '') {
    effective.logo = company.logo;
    isInherited.logo = true;
  } else {
    effective.logo = SYSTEM_DEFAULTS.logo;
    isInherited.logo = true;
  }

  // Theme color fallback: survey > company primary > system default
  if (survey.themeColor && survey.themeColor.trim() !== '') {
    effective.themeColor = survey.themeColor;
    isInherited.themeColor = false;
  } else if (company?.primaryColor && company.primaryColor.trim() !== '') {
    effective.themeColor = company.primaryColor;
    isInherited.themeColor = true;
  } else {
    effective.themeColor = SYSTEM_DEFAULTS.themeColor;
    isInherited.themeColor = true;
  }

  // Secondary color (from company or system default)
  if (company?.secondaryColor && company.secondaryColor.trim() !== '') {
    effective.secondaryColor = company.secondaryColor;
    isInherited.secondaryColor = true;
  } else {
    effective.secondaryColor = SYSTEM_DEFAULTS.secondaryColor;
    isInherited.secondaryColor = true;
  }

  // Font (from company or system default)
  if (company?.defaultFont && company.defaultFont.trim() !== '') {
    effective.defaultFont = company.defaultFont;
    isInherited.defaultFont = true;
  } else {
    effective.defaultFont = SYSTEM_DEFAULTS.defaultFont;
    isInherited.defaultFont = true;
  }

  // Thank you message fallback: survey > company > system default
  if (survey.thankYouMessage && survey.thankYouMessage.trim() !== '') {
    effective.thankYouMessage = survey.thankYouMessage;
    isInherited.thankYouMessage = false;
  } else if (company?.thankYouMessage && company.thankYouMessage.trim() !== '') {
    effective.thankYouMessage = company.thankYouMessage;
    isInherited.thankYouMessage = true;
  } else {
    effective.thankYouMessage = SYSTEM_DEFAULTS.thankYouMessage;
    isInherited.thankYouMessage = true;
  }

  return {
    ...effective,
    isInherited
  };
};

/**
 * Validate branding fields with detailed error messages
 *
 * @param {Object} brandingData - Branding fields to validate
 * @returns {Object} Validation result with errors array
 */
export const validateBrandingFields = (brandingData) => {
  const errors = [];

  // Validate logo
  if (brandingData.logo !== undefined && brandingData.logo !== null && brandingData.logo.trim() !== '') {
    const logo = brandingData.logo.trim();
    const urlPattern = /^(https?:\/\/|\/)/;
    const relativePathPattern = /^[a-zA-Z0-9._\-\/]+\.(jpg|jpeg|png|gif|svg|webp)$/i;

    if (!urlPattern.test(logo) && !relativePathPattern.test(logo)) {
      errors.push({
        field: 'logo',
        message: 'Logo must be a valid URL (http/https) or file path ending with image extension'
      });
    }
  }

  // Validate theme color
  if (brandingData.themeColor !== undefined && brandingData.themeColor !== null && brandingData.themeColor.trim() !== '') {
    const themeColor = brandingData.themeColor.trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(themeColor)) {
      errors.push({
        field: 'themeColor',
        message: 'Theme color must be a valid 6-digit hex color (e.g., #10B981)'
      });
    }
  }

  // Validate thank you message length
  if (brandingData.thankYouMessage !== undefined && brandingData.thankYouMessage !== null) {
    const message = brandingData.thankYouMessage.trim();
    if (message.length > 2000) {
      errors.push({
        field: 'thankYouMessage',
        message: 'Thank you message cannot exceed 2000 characters'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Get company branding settings by company ID
 *
 * @param {string} companyId - Company object ID
 * @returns {Object|null} Company branding settings
 */
export const getCompanyBranding = async (companyId) => {
  if (!companyId) return null;

  try {
    const company = await Company.findById(companyId)
      .select('logo primaryColor secondaryColor defaultFont thankYouMessage')
      .lean();

    return company;
  } catch (error) {
    console.error('Error fetching company branding:', error);
    return null;
  }
};

/**
 * Sanitize branding fields for database storage
 *
 * @param {Object} brandingData - Raw branding data
 * @returns {Object} Sanitized branding fields
 */
export const sanitizeBrandingFields = (brandingData) => {
  const sanitized = {};

  // Sanitize logo - store empty string instead of null for fallback logic
  if (brandingData.logo !== undefined) {
    sanitized.logo = brandingData.logo === null ? '' : (brandingData.logo || '').trim();
  }

  // Sanitize theme color - store empty string instead of null for fallback logic
  if (brandingData.themeColor !== undefined) {
    sanitized.themeColor = brandingData.themeColor === null ? '' : (brandingData.themeColor || '').trim();
  }

  // Sanitize thank you message
  if (brandingData.thankYouMessage !== undefined) {
    sanitized.thankYouMessage = brandingData.thankYouMessage === null ? '' : (brandingData.thankYouMessage || '').trim();
  }

  return sanitized;
};
