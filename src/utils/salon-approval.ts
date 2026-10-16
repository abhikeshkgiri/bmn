export type SalonApprovalFields = {
  approvalStatus?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  isVerified: boolean;
};

export const APPROVED_SALON_STATUS_FILTER = { $in: ['APPROVED', null] };

export function isSalonApproved(salon: SalonApprovalFields): boolean {
  return salon.approvalStatus === 'APPROVED' ||
    (salon.approvalStatus == null && salon.isVerified);
}
