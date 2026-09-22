/**
 * Az üzemeltető adatai és a jogi szövegek változata, egy helyen: ezt használja
 * a Felhasználási feltételek, az Adatkezelési tájékoztató, a süti-tájékoztató
 * és a regisztráció (ott a felhasználó metaadataiba is bekerül a változat).
 */
export const OPERATOR = {
  name: "Adorjáni Szabolcs",
  kind: "magánszemély",
  email: "ado.szabi@gmail.com",
} as const;

/** A jogi szövegek változata: ha lényegesen változnak, ezt kell átírni. */
export const LEGAL_VERSION = "2026-09-22";
export const LEGAL_EFFECTIVE = "2026. szeptember 22.";

/**
 * Ez a süti jegyzi meg, hogy a látogató látta a süti-tájékoztatót (maga is
 * feltétlenül szükséges süti). Az értéke a tájékoztató változata: ha az
 * megváltozik, a tájékoztató újra megjelenik.
 */
export const CONSENT_COOKIE = "gymcrew_suti";
export const CONSENT_MAX_AGE = 365 * 24 * 60 * 60;
