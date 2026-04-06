import { env } from "./env.js";

// ── Mock payment order (used when MOCK_PAYMENT=true or Razorpay not configured) ──
export function createMockOrder(amount: number, receipt: string) {
  const id = `mock_order_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  return { id, amount, currency: "INR", receipt, status: "created" };
}

export function createMockPaymentId() {
  return `mock_pay_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

export function isMockPayment() {
  return env.MOCK_PAYMENT === "true" || env.RAZORPAY_KEY_ID === "mock";
}

// ── Real Razorpay client (only instantiated when not mock) ────────────────────
let _razorpay: any = null;

export function getRazorpay() {
  if (isMockPayment()) return null;
  if (!_razorpay) {
    // Dynamic import to avoid crash when keys are placeholders
    const Razorpay = require("razorpay");
    _razorpay = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
}

// Keep named export for any existing imports
export const razorpay = { isMock: isMockPayment() };
