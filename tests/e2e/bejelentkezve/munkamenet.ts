/**
 * A tesztfiók mentett munkamenete (`node scripts/teszt-belepes.mjs a`).
 * Helyi futtatáshoz az AUTH_STATE-tel másik fájl adható meg.
 */
export const MUNKAMENET_A = process.env.AUTH_STATE ?? "tests/e2e/.auth/a.json";
