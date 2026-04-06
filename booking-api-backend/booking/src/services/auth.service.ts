import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "../config/db.js";
import { users } from "../db/schema/index.js";
import { redis, REDIS_KEYS, REDIS_TTL } from "../config/redis.js";
import { emailQueue } from "../config/queue.js";
import { env } from "../config/env.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/token.js";
import type {
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
  ChangePasswordInput,
} from "../schemas/auth.schema.js";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  avatarUrl: string | null;
  isVerified: boolean;
  createdAt: Date;
};

function toSafeUser(user: typeof users.$inferSelect): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  };
}

async function issueTokens(user: typeof users.$inferSelect): Promise<AuthTokens> {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken({ sub: user.id, email: user.email, role: user.role }),
    signRefreshToken({ sub: user.id }),
  ]);

  // Store refresh token in Redis
  await redis.setex(
    REDIS_KEYS.refreshToken(user.id),
    REDIS_TTL.refreshToken,
    refreshToken
  );

  return { accessToken, refreshToken };
}

// ── Email HTML builders ───────────────────────────────────────────────────────

function buildOtpEmail(name: string, otp: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:32px 16px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#7c3aed;padding:28px 24px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">Verify your email</h1>
    </div>
    <div style="padding:28px">
      <p style="margin:0 0 8px;color:#374151">Hi ${name},</p>
      <p style="margin:0 0 24px;color:#374151">Use the code below to verify your TicketFlow account. It expires in 10 minutes.</p>
      <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px">
        <p style="margin:0;font-size:36px;font-weight:800;font-family:monospace;letter-spacing:.2em;color:#5b21b6">${otp}</p>
      </div>
      <p style="margin:0;font-size:13px;color:#9ca3af">If you didn't create a TicketFlow account, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>`;
}

function buildPasswordResetEmail(name: string, token: string, frontendUrl: string): string {
  const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:32px 16px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#7c3aed;padding:28px 24px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">Reset your password</h1>
    </div>
    <div style="padding:28px">
      <p style="margin:0 0 8px;color:#374151">Hi ${name},</p>
      <p style="margin:0 0 24px;color:#374151">Click the button below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetUrl}"
         style="display:block;background:#7c3aed;color:#fff;text-decoration:none;text-align:center;padding:14px 20px;border-radius:8px;font-weight:600;font-size:15px;margin-bottom:24px">
        Reset Password
      </a>
      <p style="margin:0;font-size:13px;color:#9ca3af">If you didn't request a password reset, you can safely ignore this email. Your password won't change.</p>
    </div>
  </div>
</body>
</html>`;
}

export const authService = {
  async register(input: RegisterInput): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (existing) {
      throw Object.assign(new Error("Email already registered"), { code: "EMAIL_EXISTS" });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    // Generate 6-digit OTP for email verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.setex(REDIS_KEYS.emailOtp(input.email), REDIS_TTL.emailOtp, otp);

    const [user] = await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
      })
      .returning();

    await emailQueue.add("verify-email", {
      to: input.email,
      subject: "Verify your TicketFlow account",
      html: buildOtpEmail(input.name, otp),
    });

    const tokens = await issueTokens(user);
    return { user: toSafeUser(user), tokens };
  },

  async login(input: LoginInput): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const user = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (!user || !user.passwordHash) {
      throw Object.assign(new Error("Invalid email or password"), { code: "INVALID_CREDENTIALS" });
    }

    if (user.isBanned) {
      throw Object.assign(new Error("Account has been banned"), { code: "ACCOUNT_BANNED" });
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw Object.assign(new Error("Invalid email or password"), { code: "INVALID_CREDENTIALS" });
    }

    const tokens = await issueTokens(user);
    return { user: toSafeUser(user), tokens };
  },

  async logout(userId: string): Promise<void> {
    await redis.del(REDIS_KEYS.refreshToken(userId));
  },

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      throw Object.assign(new Error("Invalid refresh token"), { code: "INVALID_TOKEN" });
    }

    const stored = await redis.get(REDIS_KEYS.refreshToken(payload.sub));
    if (!stored || stored !== refreshToken) {
      throw Object.assign(new Error("Refresh token has been revoked"), { code: "TOKEN_REVOKED" });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.sub),
    });

    if (!user) {
      throw Object.assign(new Error("User not found"), { code: "USER_NOT_FOUND" });
    }

    return issueTokens(user);
  },

  async verifyEmail(email: string, otp: string): Promise<void> {
    const stored = await redis.get(REDIS_KEYS.emailOtp(email));
    if (!stored || stored !== otp) {
      throw Object.assign(new Error("Invalid or expired OTP"), { code: "INVALID_OTP" });
    }

    await db
      .update(users)
      .set({ isVerified: true, emailVerifiedAt: new Date() })
      .where(eq(users.email, email));

    await redis.del(REDIS_KEYS.emailOtp(email));
  },

  async resendOtp(email: string): Promise<void> {
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user) {
      throw Object.assign(new Error("User not found"), { code: "USER_NOT_FOUND" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.setex(REDIS_KEYS.emailOtp(email), REDIS_TTL.emailOtp, otp);

    await emailQueue.add("resend-otp", {
      to: email,
      subject: "Your TicketFlow verification code",
      html: buildOtpEmail(user.name, otp),
    });
  },

  async forgotPassword(email: string): Promise<void> {
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    // Always succeed silently (prevents email enumeration)
    if (!user) return;

    const token = crypto.randomUUID();
    await redis.setex(REDIS_KEYS.passwordReset(token), REDIS_TTL.passwordReset, user.id);

    await emailQueue.add("forgot-password", {
      to: email,
      subject: "Reset your TicketFlow password",
      html: buildPasswordResetEmail(user.name, token, env.FRONTEND_URL),
    });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    const userId = await redis.get(REDIS_KEYS.passwordReset(token));
    if (!userId) {
      throw Object.assign(new Error("Invalid or expired reset token"), { code: "INVALID_TOKEN" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
    await redis.del(REDIS_KEYS.passwordReset(token));
  },

  async getProfile(userId: string): Promise<SafeUser> {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) {
      throw Object.assign(new Error("User not found"), { code: "USER_NOT_FOUND" });
    }
    return toSafeUser(user);
  },

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<SafeUser> {
    const [updated] = await db
      .update(users)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    return toSafeUser(updated);
  },

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user || !user.passwordHash) {
      throw Object.assign(new Error("User not found"), { code: "USER_NOT_FOUND" });
    }

    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw Object.assign(new Error("Current password is incorrect"), { code: "INVALID_PASSWORD" });
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));

    // Revoke all refresh tokens on password change
    await redis.del(REDIS_KEYS.refreshToken(userId));
  },
};
