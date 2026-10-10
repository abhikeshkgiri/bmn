export interface ActiveServiceSearchCriteria {
  serviceId?: string;
  serviceSearch?: string;
  category?: string;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildActiveServiceSearchFilter(criteria: ActiveServiceSearchCriteria): Record<string, unknown> {
  const filter: Record<string, unknown> = { isActive: true };

  if (criteria.serviceId) filter._id = criteria.serviceId;
  if (criteria.category) filter.category = criteria.category;
  if (criteria.serviceSearch) {
    const search = new RegExp(escapeRegex(criteria.serviceSearch.trim()), 'i');
    filter.$or = [{ name: search }, { category: search }];
  }

  return filter;
}
