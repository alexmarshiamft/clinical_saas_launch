import { ClinicalTemplate } from '../types';
import { DEFAULT_CLINICAL_TEMPLATES } from './defaultTemplates';

export const TEMPLATE_STORAGE_KEY = 'clinical_saas_scribe_templates_v2';

export function getStoredTemplates(): ClinicalTemplate[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_CLINICAL_TEMPLATES;
  }
  try {
    const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(DEFAULT_CLINICAL_TEMPLATES));
      return DEFAULT_CLINICAL_TEMPLATES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn('[TemplateStore] Failed to read templates from localStorage, returning defaults:', err);
  }
  return DEFAULT_CLINICAL_TEMPLATES;
}

export function saveTemplate(template: ClinicalTemplate): ClinicalTemplate[] {
  const current = getStoredTemplates();
  const existingIdx = current.findIndex((t) => t.id === template.id);
  let updated: ClinicalTemplate[];

  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = template;
  } else {
    updated = [...current, template];
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('[TemplateStore] Failed to save template to localStorage:', err);
    }
  }
  return updated;
}

export function deleteTemplate(templateId: string): ClinicalTemplate[] {
  const current = getStoredTemplates();
  // Protect factory presets from deletion if desired, or allow removing custom templates
  const updated = current.filter((t) => t.id !== templateId);

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('[TemplateStore] Failed to delete template from localStorage:', err);
    }
  }
  return updated;
}

export function resetToFactoryPresets(): ClinicalTemplate[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(DEFAULT_CLINICAL_TEMPLATES));
    } catch (err) {
      console.warn('[TemplateStore] Failed to reset templates in localStorage:', err);
    }
  }
  return DEFAULT_CLINICAL_TEMPLATES;
}
