export interface SalonApplicationReadiness {
  activeServiceCount: number;
  barberProfileCount: number;
  hasAadhaarDocument?: boolean;
  hasPanDocument?: boolean;
}

export function getSalonApplicationBlockers({
  activeServiceCount,
  barberProfileCount,
  hasAadhaarDocument,
  hasPanDocument,
}: SalonApplicationReadiness): string[] {
  const blockers: string[] = [];
  if (activeServiceCount < 1) blockers.push('Add at least one active service before submitting.');
  if (barberProfileCount < 1) blockers.push('Add at least one barber profile before submitting.');
  if (hasAadhaarDocument === false) blockers.push('Upload the salon owner Aadhaar document before submitting.');
  if (hasPanDocument === false) blockers.push('Upload the salon owner PAN document before submitting.');
  return blockers;
}
