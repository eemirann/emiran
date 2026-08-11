'use strict';
/* ============================================================
   PİXEL MOTOR — çekirdek
   Namespace, seedli PRNG, matematik yardımcıları, ayar sabitleri.
   ============================================================ */

window.MOTO = window.MOTO || {};

// ---------- SANAL ÇÖZÜNÜRLÜK ----------
// Tüm oyun mantığı ve çizimi bu piksel uzayında yaşar; ekrana ölçeklenir.
MOTO.VW = 320;
MOTO.VH = 180;

// ---------- AYARLAR ----------
// Oynanışın hissi buradan ayarlanır. Değerler sanal piksel / saniye cinsinden.
// Ölçek: 1 sanal piksel ≈ 6.5 cm (dingil mesafesi 21 px ≈ 1.4 m).
// Sürtünme katsayıları 240 Hz adım başınadır — saniyeye çevirirken ^240 unutma.
MOTO.TUNING = {
  gravity: 560,

  wheelRadius: 6,
  wheelBase: 24,          // tekerlek merkezleri arası
  chassisHeight: 12,      // kadro üst noktasının dingil hattına yüksekliği
  riderOffsetY: 10,       // sürücü kütle merkezinin kadro üstüne yüksekliği
  riderOffsetX: -1.5,

  // Motor kuvveti tek parçacığa uygulanır, kısıtlar onu 4 parçacığa yayar —
  // efektif ivme bunun ~1/4'ü. Dik yokuşu (45°) durduğu yerden tırmanabilmesi
  // için yerçekiminin yokuş bileşeninin belirgin üstünde olmalı.
  engineForce: 2700,      // arka tekerleğe teğet itiş
  engineWheelieTorque: 70,
  stabilizeTorque: 520,   // yerde kendini doğrultma yardımı
  brakeForce: 1500,
  reverseForce: 260,      // frende duruyorsa hafif geri
  maxSpeed: 330,

  airLeanTorque: 1000,     // havada dönüş gücü
  maxAirSpin: 13.0,       // havada azami açısal hız (rad/sn ≈ 2 tur/sn)
  groundLeanTorque: 150,  // yerde ağırlık kaydırma
  airLeanDamp: 0.985,

  suspension: 0.62,       // tekerlek-kadro kısıt sertliği (1 = rijit)
  frameStiffness: 1.0,
  riderStiffness: 0.35,

  rollFriction: 0.99985,  // yuvarlanma sürtünmesi (yerde, adım başına 240hz)
  airDrag: 0.99997,
  gripTangent: 0.55,      // yanal kayma emilimi
  bounce: 0.12,

  landAlignTolerance: 48 * Math.PI / 180,  // temiz iniş toleransı
  crashAngle: 85 * Math.PI / 180,          // bunun ötesi kaza
  crashSpeed: 120,                         // bu hızın altında sert iniş kaza saymaz

  cameraLead: 0.32,
  cameraSmooth: 0.12,
};

// ---------- MATEMATİK ----------
MOTO.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
MOTO.lerp = function (a, b, t) { return a + (b - a) * t; };
MOTO.sign = function (v) { return v < 0 ? -1 : 1; };

// Açıyı -PI..PI aralığına sarar. Takla sayımında sürekli açı türetmek için şart.
MOTO.wrapAngle = function (a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

MOTO.dist = function (ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
};

// ---------- SEEDLİ PRNG (mulberry32) ----------
// Deterministik arazi üretimi için — aynı seed her zaman aynı pisti verir.
MOTO.makeRng = function (seed) {
  let a = seed >>> 0;
  const rng = function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.range = function (lo, hi) { return lo + rng() * (hi - lo); };
  rng.int = function (lo, hi) { return Math.floor(lo + rng() * (hi - lo + 1)); };
  // Ağırlıklı seçim: [[deger, agirlik], ...]
  rng.weighted = function (pairs) {
    let total = 0;
    for (let i = 0; i < pairs.length; i++) total += pairs[i][1];
    let r = rng() * total;
    for (let i = 0; i < pairs.length; i++) {
      r -= pairs[i][1];
      if (r <= 0) return pairs[i][0];
    }
    return pairs[pairs.length - 1][0];
  };
  return rng;
};

// ---------- RETRO PALET ----------
MOTO.PAL = {
  skyTop: '#3aa8e0',
  skyMid: '#63c6ef',
  skyLow: '#a5e3f7',
  farHill: '#8fadc0',
  midHill: '#5c8574',
  ground: '#6b4423',
  groundDark: '#4a2d16',
  grass: '#3f7a2e',
  grassDark: '#2c5720',
  bike: '#2b2b33',
  bikeHi: '#4a4a58',
  bikeAccent: '#c2352c',
  rider: '#d0342c',
  riderDark: '#8f231e',
  skin: '#e8b98a',
  wheel: '#1a1a20',
  ink: '#12121a',
  white: '#f4f4ef',
  gold: '#ffcf3f',
  danger: '#e0453a',
};
