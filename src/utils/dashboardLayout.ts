import { DEFAULT_VISIBLE_SECTIONS, SECTION_ALIASES } from "../config/dashboard";
import type { LayoutConfig } from "../types/dashboard";

const LEGACY_SECTION_EXPANSIONS: Record<string, string[]> = {
  primaryFinancial: ["cashPosition", "plSnapshot", "bankReconciliation"],
  financialSnapshot: ["balanceSheet", "cashFlowTrend"],
  financial: ["plSnapshot", "cashPosition"],
  tools: ["currencyConverter", "tdsCalculator"],
  parties: ["topVendors", "topCustomers"],
  analytics: ["operations", "aiAccuracy"],
};

const expandLegacySectionList = (sections: string[]) =>
  sections.flatMap((sectionId) => LEGACY_SECTION_EXPANSIONS[sectionId] || [sectionId]);

export const canonicalizeSectionId = (sectionId: string): string =>
  SECTION_ALIASES[sectionId] || sectionId;

export const canonicalizeSectionList = (sections: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  sections.forEach((sectionId) => {
    const canonical = canonicalizeSectionId(sectionId);
    if (seen.has(canonical)) {
      return;
    }
    seen.add(canonical);
    result.push(canonical);
  });
  return result;
};

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
  const merged: string[] = [];
  const seen = new Set<string>();
  savedSections.forEach((sectionId) => {
    if (!allowed.has(sectionId) || seen.has(sectionId)) {
      return;
    }
    seen.add(sectionId);
    merged.push(sectionId);
  });
  defaultSections.forEach((sectionId) => {
    if (seen.has(sectionId)) {
      return;
    }
    seen.add(sectionId);
    merged.push(sectionId);
  });
  return merged;
};

/** A merged widget stays visible if any of its old aliases was visible. */
const hiddenAfterAliases = (rawOrder: string[], rawHidden: string[], order: string[]) => {
  const hiddenRaw = new Set(rawHidden);
  const mentioned = new Set<string>();
  const visibleCanonical = new Set<string>();
  rawOrder.forEach((sectionId) => {
    const canonical = canonicalizeSectionId(sectionId);
    mentioned.add(canonical);
    if (!hiddenRaw.has(sectionId)) {
      visibleCanonical.add(canonical);
    }
  });
  rawHidden.forEach((sectionId) => {
    mentioned.add(canonicalizeSectionId(sectionId));
  });
  return order.filter((sectionId) => mentioned.has(sectionId) && !visibleCanonical.has(sectionId));
};

export const parseLayoutConfig = (
  saved: LayoutConfig | string[] | null | undefined,
  defaultSections: string[] = []
): LayoutConfig => {
  const defaults = canonicalizeSectionList(defaultSections);
  const defaultHidden = getDefaultHiddenSections(defaults);

  if (Array.isArray(saved)) {
    return {
      order: mergeSectionOrder(defaults, canonicalizeSectionList(expandLegacySectionList(saved))),
      hidden: [],
    };
  }

  if (saved && typeof saved === "object") {
    const rawOrder = expandLegacySectionList(saved.order || []);
    const order = mergeSectionOrder(defaults, canonicalizeSectionList(rawOrder));
    if (!Array.isArray(saved.hidden)) {
      return { order, hidden: defaultHidden };
    }
    const rawHidden = expandLegacySectionList(saved.hidden);
    const allowed = new Set(defaults);
    const hidden = hiddenAfterAliases(rawOrder, rawHidden, order).filter((id) => allowed.has(id));
    return { order, hidden };
  }

  return { order: [...defaults], hidden: defaultHidden };
};

export const getVisibleSections = (config: LayoutConfig) => {
  const hidden = new Set((config.hidden || []).map(canonicalizeSectionId));
  return canonicalizeSectionList(config.order || []).filter((sectionId) => !hidden.has(sectionId));
};

export const buildLayoutPayload = (order: string[], hidden: string[]): LayoutConfig => ({
  order: canonicalizeSectionList(order),
  hidden: canonicalizeSectionList(hidden),
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
  const defaults = canonicalizeSectionList(defaultSections);
  if (!isSameSectionOrder(config.order, defaults)) {
    return false;
  }
  const defaultHidden = getDefaultHiddenSections(defaults);
  if (isSameHiddenSet(config.hidden || [], defaultHidden)) {
    return true;
  }
  return (config.hidden || []).length === 0;
};
