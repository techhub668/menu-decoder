import { prisma } from "./prisma";

const LIMITS = {
  google: 50,
  yelp: 450,
  llm: 200,
};

// Circuit breaker: 300 calls in a 24hr rolling window -> disabled for 8 hours
const GOOGLE_CIRCUIT_BREAKER_LIMIT = 300;
const GOOGLE_CIRCUIT_BREAKER_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const GOOGLE_CIRCUIT_BREAKER_COOLDOWN_MS = 8 * 60 * 60 * 1000; // 8 hours

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getOrCreateUsage() {
  const date = todayKey();
  let usage = await prisma.dailyApiUsage.findUnique({ where: { date } });
  if (!usage) {
    usage = await prisma.dailyApiUsage.create({ data: { date } });
  }
  return usage;
}

// --- Google Circuit Breaker ---

async function getOrCreateCircuitBreaker() {
  let cb = await prisma.googleCircuitBreaker.findFirst({ where: { id: 1 } });
  if (!cb) {
    cb = await prisma.googleCircuitBreaker.create({
      data: { id: 1, windowStart: new Date(), callCount: 0, disabledUntil: null },
    });
  }
  return cb;
}

/**
 * Check if Google API is available (circuit breaker + daily limit).
 * Returns { allowed: true } or { allowed: false, reason, retryAfter? }
 */
export async function canCallGoogle(): Promise<{
  allowed: boolean;
  reason?: string;
  retryAfter?: Date;
}> {
  const cb = await getOrCreateCircuitBreaker();
  const now = new Date();

  // 1. Check if currently in cooldown
  if (cb.disabledUntil && now < cb.disabledUntil) {
    return {
      allowed: false,
      reason: `Google API circuit breaker active. Re-enables at ${cb.disabledUntil.toISOString()}.`,
      retryAfter: cb.disabledUntil,
    };
  }

  // 2. If cooldown has expired, reset the breaker
  if (cb.disabledUntil && now >= cb.disabledUntil) {
    await prisma.googleCircuitBreaker.update({
      where: { id: 1 },
      data: { callCount: 0, windowStart: now, disabledUntil: null },
    });
    // Continue — breaker is now reset
  }

  // 3. Check if the 24hr window has elapsed; if so, reset counter
  const windowAge = now.getTime() - cb.windowStart.getTime();
  if (windowAge > GOOGLE_CIRCUIT_BREAKER_WINDOW_MS) {
    await prisma.googleCircuitBreaker.update({
      where: { id: 1 },
      data: { callCount: 0, windowStart: now, disabledUntil: null },
    });
    // Fresh window — allow
  } else if (cb.callCount >= GOOGLE_CIRCUIT_BREAKER_LIMIT) {
    // 4. Threshold reached within the window — trip the breaker
    const disabledUntil = new Date(now.getTime() + GOOGLE_CIRCUIT_BREAKER_COOLDOWN_MS);
    await prisma.googleCircuitBreaker.update({
      where: { id: 1 },
      data: { disabledUntil },
    });
    return {
      allowed: false,
      reason: `Google API limit of ${GOOGLE_CIRCUIT_BREAKER_LIMIT} calls/24hr reached. Disabled until ${disabledUntil.toISOString()}.`,
      retryAfter: disabledUntil,
    };
  }

  // 5. Also check the existing daily soft limit
  const usage = await getOrCreateUsage();
  if (usage.googleCalls >= LIMITS.google) {
    return { allowed: false, reason: "Daily Google API soft limit reached." };
  }

  return { allowed: true };
}

export async function incrementGoogle() {
  const date = todayKey();

  // Increment daily counter
  await prisma.dailyApiUsage.upsert({
    where: { date },
    update: { googleCalls: { increment: 1 } },
    create: { date, googleCalls: 1 },
  });

  // Increment circuit breaker counter
  await prisma.googleCircuitBreaker.update({
    where: { id: 1 },
    data: { callCount: { increment: 1 } },
  });
}

// --- Yelp & LLM (unchanged) ---

export async function canCallYelp(): Promise<boolean> {
  const usage = await getOrCreateUsage();
  return usage.yelpCalls < LIMITS.yelp;
}

export async function canCallLLM(): Promise<boolean> {
  const usage = await getOrCreateUsage();
  return usage.llmCalls < LIMITS.llm;
}

export async function incrementYelp() {
  const date = todayKey();
  await prisma.dailyApiUsage.upsert({
    where: { date },
    update: { yelpCalls: { increment: 1 } },
    create: { date, yelpCalls: 1 },
  });
}

export async function incrementLLM() {
  const date = todayKey();
  await prisma.dailyApiUsage.upsert({
    where: { date },
    update: { llmCalls: { increment: 1 } },
    create: { date, llmCalls: 1 },
  });
}

export async function getUsageSummary() {
  const usage = await getOrCreateUsage();
  const cb = await getOrCreateCircuitBreaker();
  const now = new Date();

  const isBreakerActive = cb.disabledUntil ? now < cb.disabledUntil : false;

  return {
    google: {
      used: usage.googleCalls,
      limit: LIMITS.google,
      circuitBreaker: {
        callsInWindow: cb.callCount,
        windowLimit: GOOGLE_CIRCUIT_BREAKER_LIMIT,
        isTripped: isBreakerActive,
        disabledUntil: isBreakerActive ? cb.disabledUntil : null,
      },
    },
    yelp: { used: usage.yelpCalls, limit: LIMITS.yelp },
    llm: { used: usage.llmCalls, limit: LIMITS.llm },
  };
}
