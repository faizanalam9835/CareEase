import mongoose, { type HydratedDocument, type InferSchemaType, type Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, DEPARTMENTS } from '../config/constants';

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },

    email: { type: String, required: true, lowercase: true, trim: true },
    professionalEmail: { type: String, lowercase: true, trim: true },

    phone: { type: String, required: true, trim: true },

    // Never returned by a plain query - explicitly select('+password') to read it.
    password: { type: String, required: true, select: false },
    mustChangePassword: { type: Boolean, default: false },
    lastLoginAt: Date,

    department: { type: String, required: true, enum: DEPARTMENTS },
    designation: { type: String, trim: true },
    specialization: { type: String, trim: true },

    // Doctor-only fields, ignored for other roles.
    consultationFee: { type: Number, default: 0, min: 0 },
    availableDays: [{ type: String }],
    availableFrom: { type: String, default: '09:00' },
    availableTo: { type: String, default: '17:00' },

    roles: {
      type: [{ type: String, enum: ROLES }],
      required: true,
      validate: {
        validator: (value: unknown) => Array.isArray(value) && value.length > 0,
        message: 'At least one role is required'
      }
    },

    tenantId: { type: String, required: true, index: true },

    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'LOCKED'],
      default: 'ACTIVE'
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc: unknown, ret: Record<string, unknown>) {
        delete ret.password;
        return ret;
      }
    }
  }
);

export type IUser = InferSchemaType<typeof userSchema>;

export interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
  isDoctor(): boolean;
}

export interface IUserVirtuals {
  fullName: string;
}

export type UserModel = Model<IUser, {}, IUserMethods, IUserVirtuals>;
export type UserDoc = HydratedDocument<IUser, IUserMethods & IUserVirtuals>;

// Uniqueness is per tenant, not global: two hospitals may both employ
// someone with the same e-mail address.
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });
userSchema.index({ tenantId: 1, roles: 1 });

userSchema.virtual('fullName').get(function (this: UserDoc) {
  return `${this.firstName} ${this.lastName}`.trim();
});
userSchema.set('toJSON', { virtuals: true, transform(_doc: unknown, ret: Record<string, unknown>) { delete ret.password; return ret; } });
userSchema.set('toObject', { virtuals: true });

// Hash on every password change, wherever it happens. The old code hashed by
// hand in each controller, so any path that forgot to do it stored plaintext.
userSchema.pre('save', async function hashPassword(this: UserDoc) {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(this: UserDoc, candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isDoctor = function isDoctor(this: UserDoc) {
  return this.roles.includes('DOCTOR');
};

export default mongoose.model<IUser, UserModel>('User', userSchema);
