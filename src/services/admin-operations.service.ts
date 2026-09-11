import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import type { AuthUser } from '@/types';
import Booking from '@/models/Booking';
import Salon from '@/models/Salon';
import Commission, { CommissionStatus } from '@/models/Commission';
import Payout, { PayoutStatus } from '@/models/Payout';
import InventoryItem from '@/models/InventoryItem';
import Leave from '@/models/Leave';
import { recordAuditEvent } from '@/services/audit.service';

const commissionRate = () => {
  const value = Number(process.env.PLATFORM_COMMISSION_RATE ?? 10);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 10;
};

export async function calculateCommission(bookingAmount: number, rate = commissionRate()) {
  if (!Number.isFinite(bookingAmount) || bookingAmount < 0 || !Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error('INVALID_COMMISSION');
  const platformCommission = Math.round((bookingAmount * rate) / 100);
  return { bookingAmount, platformCommission, recipientEarning: bookingAmount - platformCommission, rate };
}

export async function createCommissionForBooking(actor: AuthUser, bookingId: string) {
  await connectDB();
  if (!Types.ObjectId.isValid(bookingId)) throw new Error('INVALID_BOOKING');
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error('BOOKING_NOT_FOUND');
  const calculation = await calculateCommission(booking.totalAmount);
  const commission = await Commission.findOneAndUpdate({ booking: booking._id }, { ...calculation, status: CommissionStatus.PENDING }, { upsert: true, new: true, setDefaultsOnInsert: true });
  await recordAuditEvent({ actor, action: 'COMMISSION_CALCULATED', entityType: 'Commission', entityId: commission._id.toString(), metadata: { bookingId, rate: calculation.rate } });
  return commission;
}

export async function listCommissions() {
  await connectDB();
  return Commission.find().sort({ createdAt: -1 }).limit(100).populate('booking', 'bookingNumber totalAmount').lean();
}

export async function listPayouts() {
  await connectDB();
  return Payout.find().sort({ createdAt: -1 }).limit(100).populate('recipient', 'name phone').populate('booking', 'bookingNumber totalAmount').lean();
}

export async function transitionPayout(actor: AuthUser, payoutId: string, status: PayoutStatus) {
  await connectDB();
  if (!Types.ObjectId.isValid(payoutId) || !Object.values(PayoutStatus).includes(status)) throw new Error('INVALID_PAYOUT');
  const payout = await Payout.findById(payoutId);
  if (!payout) throw new Error('PAYOUT_NOT_FOUND');
  if (payout.status === PayoutStatus.PAID || (status === PayoutStatus.PAID && payout.status !== PayoutStatus.PENDING)) throw new Error('INVALID_PAYOUT_TRANSITION');
  payout.status = status;
  payout.paidAt = status === PayoutStatus.PAID ? new Date() : undefined;
  await payout.save();
  await recordAuditEvent({ actor, action: `PAYOUT_${status}`, entityType: 'Payout', entityId: payoutId });
  return payout;
}

export async function listInventory(salonId?: string) {
  await connectDB();
  const query = salonId && Types.ObjectId.isValid(salonId) ? { salon: salonId } : {};
  return InventoryItem.find(query).sort({ updatedAt: -1 }).lean();
}

export async function adjustInventory(actor: AuthUser, input: { itemId?: string; salonId?: string; name?: string; quantity?: number; lowStockThreshold?: number }) {
  await connectDB();
  if (!Number.isInteger(input.quantity) || (input.quantity ?? 0) < 0 || !input.salonId || !Types.ObjectId.isValid(input.salonId)) throw new Error('INVALID_INVENTORY');
  const salon = await Salon.findOne({ _id: input.salonId, owner: actor._id });
  if (!salon && actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN') throw new Error('FORBIDDEN');
  const item = input.itemId && Types.ObjectId.isValid(input.itemId)
    ? await InventoryItem.findById(input.itemId)
    : await InventoryItem.create({ salon: input.salonId, name: input.name?.trim(), quantity: input.quantity, lowStockThreshold: input.lowStockThreshold ?? 5 });
  if (!item) throw new Error('INVENTORY_NOT_FOUND');
  item.quantity = input.quantity;
  if (input.lowStockThreshold !== undefined) item.lowStockThreshold = input.lowStockThreshold;
  await item.save();
  await recordAuditEvent({ actor, action: 'INVENTORY_ADJUSTED', entityType: 'InventoryItem', entityId: item._id.toString(), metadata: { quantity: item.quantity } });
  return item;
}

export async function createLeave(actor: AuthUser, input: { salonId: string; barberId?: string; startDate: string; endDate: string; reason?: string }) {
  await connectDB();
  if (!Types.ObjectId.isValid(input.salonId)) throw new Error('INVALID_LEAVE');
  const salon = await Salon.findOne({ _id: input.salonId, owner: actor._id });
  if (!salon && actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN') throw new Error('FORBIDDEN');
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) throw new Error('INVALID_LEAVE');
  const leave = await Leave.create({ salon: input.salonId, barber: input.barberId && Types.ObjectId.isValid(input.barberId) ? input.barberId : undefined, startDate, endDate, reason: input.reason?.trim() });
  await recordAuditEvent({ actor, action: 'LEAVE_CREATED', entityType: 'Leave', entityId: leave._id.toString() });
  return leave;
}

export async function listLeaves() {
  await connectDB();
  return Leave.find({ active: true }).sort({ startDate: 1 }).limit(100).lean();
}
