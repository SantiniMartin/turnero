import { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';

export const ROLES = ['user', 'admin'] as const;
export type Role = (typeof ROLES)[number];

const userSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'user' },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;

export const UserModel = model('User', userSchema);
