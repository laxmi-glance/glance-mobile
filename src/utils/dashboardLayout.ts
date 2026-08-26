import { DEFAULT_VISIBLE_SECTIONS } from "../config/dashboard";
import type { LayoutConfig } from "../types/dashboard";

const LEGACY_SECTION_EXPANSIONS: Record<string, string[]> = {
  primaryFinancial: ["cashPosition", "plSnapshot", "bankReconciliation"],
  financialSnapshot: ["balanceSheet", "cashFlowTrend"],
  financial: ["plSnapshot", "bankBalances"],
  tools: ["currencyConverter", "tdsCalculator"],
  parties: ["topVendors", "topCustomers"],
  analytics: ["automationTrend", "approvalTrend", "documentSource", "aiAccuracy"],
};

const expandLegacySectionList = (sections: string[]) =>
  sections.flatMap((sectionId) => LEGACY_SECTION_EXPANSIONS[sectionId] || [sectionId]);

export const getDefaultHiddenSections = (defaultSections: string[] = []) => {
  const visible = new Set<string>(DEFAULT_VISIBLE_SECTIONS);
  return defaultSections.filter((sectionId) => !visible.has(sectionId));
};

const mergeSectionOrder = (defaultSections: string[], savedSections: string[]) => {
  if (!defaultSections.length) {
    return [];
  }
  if (!savedSections.length) {
    return [...defaultSections];
  }
  const allowed = new Set(defaultSections);
  const merged = savedSections.filter((sectionId) => allowed.has(sectionId));
  defaultSections.forEach((sectionId) => {
    if (!merged.includes(sectionId)) {
      merged.push(sectionId);
    }
  });
  return merged;
};

export const parseLayoutConfig = (
  saved: LayoutConfig | string[] | null | undefined,
  defaultSections: string[] = []
): LayoutConfig => {
  const defaults = Array.isArray(defaultSections) ? defaultSections : [];
  const defaultHidden = getDefaultHiddenSections(defaults);

  if (Array.isArray(saved)) {
    return {
      order: mergeSectionOrder(defaults, expandLegacySectionList(saved)),
      hidden: [],
    };
  }

  if (saved && typeof saved === "object") {
    const order = mergeSectionOrder(defaults, expandLegacySectionList(saved.order || []));
    const allowed = new Set(defaults);
    const hidden = Array.isArray(saved.hidden)
      ? expandLegacySectionList(saved.hidden).filter((id) => allowed.has(id))
      : defaultHidden;
    return { order, hidden };
  }

  return { order: [...defaults], hidden: defaultHidden };
};

export const getVisibleSections = (config: LayoutConfig) => {
  const hidden = new Set(config.hidden || []);
  return (config.order || []).filter((sectionId) => !hidden.has(sectionId));
};

export const buildLayoutPayload = (order: string[], hidden: string[]): LayoutConfig => ({
  order: [...order],
  hidden: [...hidden],
});

export const countVisibleSections = (config: LayoutConfig) => getVisibleSections(config).length;

const isSameSectionOrder = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

const isSameHiddenSet = (a: string[], b: string[]) => {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size !== setB.size) {
    return false;
  }
  return [...setA].every((id) => setB.has(id));
};

export const isDefaultLayoutConfig = (config: LayoutConfig, defaultSections: string[]) => {
  if (!isSameSectionOrder(config.order, defaultSections)) {
    return false;
  }
  const defaultHidden = getDefaultHiddenSections(defaultSections);
  if (isSameHiddenSet(config.hidden || [], defaultHidden)) {
    return true;
  }
  return (config.hidden || []).length === 0;
};
