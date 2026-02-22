import { prisma } from "./prisma";

const LIMITS = {
  google: 50,
  yelp: 450,
  llm: 200,
};

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

export async function canCallGoogle(): Promise<boolean> {
  const usage = await getOrCreateUsage();
  return usage.googleCalls < LIMITS.google;
}

export async function canCallYelp(): Promise<boolean> {
  const usage = await getOrCreateUsage();
  return usage.yelpCalls < LIMITS.yelp;
}

export async function canCallLLM(): Promise<boolean> {
  const usage = await getOrCreateUsage();
  return usage.llmCalls < LIMITS.llm;
}

export async function incrementGoogle() {
  const date = todayKey();
  await prisma.dailyApiUsage.upsert({
    where: { date },
    update: { googleCalls: { increment: 1 } },
    create: { date, googleCalls: 1 },
  });
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
  return {
    google: { used: usage.googleCalls, limit: LIMITS.google },
    yelp: { used: usage.yelpCalls, limit: LIMITS.yelp },
    llm: { used: usage.llmCalls, limit: LIMITS.llm },
  };
}
