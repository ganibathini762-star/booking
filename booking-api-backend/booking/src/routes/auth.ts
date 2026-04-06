import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { parseBody } from "../middleware/validate.js";
import { apiSuccess, apiError } from "../utils/response.js";
import { authService } from "../services/auth.service.js";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendOtpSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "../schemas/auth.schema.js";

const auth = new Hono();

// POST /auth/register
auth.post("/register", authLimiter, async (c) => {
  const body = await parseBody(c, registerSchema);
  if (!body) return c.res;

  try {
    const result = await authService.register(body);
    return apiSuccess(c, result, "Registration successful. Please verify your email.", 201);
  } catch (err: unknown) {
    const e = err as { code?: string; message: string };
    if (e.code === "EMAIL_EXISTS") return apiError(c, "EMAIL_EXISTS", e.message, 409);
    throw err;
  }
});

// POST /auth/login
auth.post("/login", authLimiter, async (c) => {
  const body = await parseBody(c, loginSchema);
  if (!body) return c.res;

  try {
    const result = await authService.login(body);
    return apiSuccess(c, result, "Login successful");
  } catch (err: unknown) {
    const e = err as { code?: string; message: string };
    if (e.code === "INVALID_CREDENTIALS") return apiError(c, "INVALID_CREDENTIALS", e.message, 401);
    if (e.code === "ACCOUNT_BANNED") return apiError(c, "ACCOUNT_BANNED", e.message, 403);
    throw err;
  }
});

// POST /auth/logout
auth.post("/logout", authMiddleware, async (c) => {
  const user = c.get("user");
  await authService.logout(user.id);
  return apiSuccess(c, null, "Logged out successfully");
});

// POST /auth/refresh
auth.post("/refresh", async (c) => {
  const body = await parseBody(c, refreshTokenSchema);
  if (!body) return c.res;

  try {
    const tokens = await authService.refreshTokens(body.refreshToken);
    return apiSuccess(c, tokens, "Tokens refreshed");
  } catch (err: unknown) {
    const e = err as { code?: string; message: string };
    if (e.code === "INVALID_TOKEN" || e.code === "TOKEN_REVOKED") {
      return apiError(c, e.code, e.message, 401);
    }
    throw err;
  }
});

// POST /auth/forgot-password
auth.post("/forgot-password", authLimiter, async (c) => {
  const body = await parseBody(c, forgotPasswordSchema);
  if (!body) return c.res;

  await authService.forgotPassword(body.email);
  return apiSuccess(c, null, "If that email exists, a reset link has been sent.");
});

// POST /auth/reset-password
auth.post("/reset-password", authLimiter, async (c) => {
  const body = await parseBody(c, resetPasswordSchema);
  if (!body) return c.res;

  try {
    await authService.resetPassword(body.token, body.password);
    return apiSuccess(c, null, "Password reset successfully");
  } catch (err: unknown) {
    const e = err as { code?: string; message: string };
    if (e.code === "INVALID_TOKEN") return apiError(c, "INVALID_TOKEN", e.message, 400);
    throw err;
  }
});

// POST /auth/verify-email
auth.post("/verify-email", async (c) => {
  const body = await parseBody(c, verifyEmailSchema);
  if (!body) return c.res;

  try {
    await authService.verifyEmail(body.email, body.otp);
    return apiSuccess(c, null, "Email verified successfully");
  } catch (err: unknown) {
    const e = err as { code?: string; message: string };
    if (e.code === "INVALID_OTP") return apiError(c, "INVALID_OTP", e.message, 400);
    throw err;
  }
});

// POST /auth/resend-otp
auth.post("/resend-otp", authLimiter, async (c) => {
  const body = await parseBody(c, resendOtpSchema);
  if (!body) return c.res;

  try {
    await authService.resendOtp(body.email);
    return apiSuccess(c, null, "OTP sent to your email");
  } catch (err: unknown) {
    const e = err as { code?: string; message: string };
    if (e.code === "USER_NOT_FOUND") return apiError(c, "USER_NOT_FOUND", e.message, 404);
    throw err;
  }
});

// GET /auth/me
auth.get("/me", authMiddleware, async (c) => {
  const user = c.get("user");
  try {
    const profile = await authService.getProfile(user.id);
    return apiSuccess(c, profile);
  } catch (err: unknown) {
    const e = err as { code?: string; message: string };
    if (e.code === "USER_NOT_FOUND") return apiError(c, "USER_NOT_FOUND", e.message, 404);
    throw err;
  }
});

// PUT /auth/me
auth.put("/me", authMiddleware, async (c) => {
  const user = c.get("user");
  const body = await parseBody(c, updateProfileSchema);
  if (!body) return c.res;

  const updated = await authService.updateProfile(user.id, body);
  return apiSuccess(c, updated, "Profile updated");
});

// PUT /auth/me/password
auth.put("/me/password", authMiddleware, async (c) => {
  const user = c.get("user");
  const body = await parseBody(c, changePasswordSchema);
  if (!body) return c.res;

  try {
    await authService.changePassword(user.id, body);
    return apiSuccess(c, null, "Password changed successfully");
  } catch (err: unknown) {
    const e = err as { code?: string; message: string };
    if (e.code === "INVALID_PASSWORD") return apiError(c, "INVALID_PASSWORD", e.message, 400);
    throw err;
  }
});

export default auth;
