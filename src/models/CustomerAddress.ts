import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICustomerAddress extends Document {
  _id: Types.ObjectId;
  customer: Types.ObjectId;
  label: string;
  name: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  area?: string;
  city: string;
  state: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerAddressSchema = new Schema<ICustomerAddress>(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label: { type: String, required: true, trim: true, maxlength: 40 },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, trim: true, maxlength: 20 },
    addressLine1: { type: String, required: true, trim: true, maxlength: 200 },
    addressLine2: { type: String, trim: true, maxlength: 200 },
    area: { type: String, trim: true, maxlength: 100 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    state: { type: String, required: true, trim: true, maxlength: 80 },
    postalCode: { type: String, required: true, trim: true, maxlength: 12 },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    isDefault: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

CustomerAddressSchema.index({ customer: 1, isDefault: -1, createdAt: -1 });
const CustomerAddress = mongoose.models.CustomerAddress || mongoose.model<ICustomerAddress>('CustomerAddress', CustomerAddressSchema);
export default CustomerAddress;
