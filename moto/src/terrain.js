'use strict';
/* ============================================================
   PİXEL MOTOR — arazi
   Sonsuz prosedürel yükseklik alanı. Eşit aralıklı y örnekleri;
   x → indeks dönüşümü O(1), aradaki değer lineer enterpolasyon.
   ============================================================ */

(function (M) {

  const STEP = 5;          // örnekler arası mesafe (sanal piksel)
  const AHEAD = 900;       // motorun ne kadar önü üretilsin
  const BEHIND = 420;      // ne kadar gerisi saklansın

  const terrain = {
    step: STEP,
    x0: 0,          // pts[0]'ın dünya x'i
    pts: [],        // y değerleri
    genY: 0,        // üretim imlecinin yüksekliği
    rng: null,
    seed: 0,
    features: [],   // {x0,x1,type} — render'da rampa boyaması için

    reset: function (seed) {
      this.seed = seed >>> 0;
      this.rng = M.makeRng(this.seed);
      this.x0 = -200;
      this.genY = 120;
      this.pts = [];
      this.features = [];
      // Başlangıçta düz bir kalkış pisti — oyuncu hemen hız alsın.
      this.pushFlat(320);
      this.ensure(600);
    },

    // ---------- SORGULAR ----------
    lastX: function () { return this.x0 + (this.pts.length - 1) * STEP; },

    heightAt: function (x) {
      const fi = (x - this.x0) / STEP;
      if (fi <= 0) return this.pts[0];
      const i = fi | 0;
      if (i >= this.pts.length - 1) return this.pts[this.pts.length - 1];
      const t = fi - i;
      return this.pts[i] + (this.pts[i + 1] - this.pts[i]) * t;
    },

    // Yüzey eğimi (radyan). Tekerlek çarpışması ve iniş hizası için.
    slopeAt: function (x) {
      const a = this.heightAt(x - STEP);
      const b = this.heightAt(x + STEP);
      return Math.atan2(b - a, STEP * 2);
    },

    // x, bir uçurumun dibinde mi? (kaza kontrolü için)
    inPit: function (x) {
      for (let i = 0; i < this.features.length; i++) {
        const f = this.features[i];
        if (f.type === 'gap' && x > f.x0 && x < f.x1) return true;
      }
      return false;
    },

    // x'ten ileriye doğru tarayıp motorun güvenle konabileceği ilk düz yeri
    // bulur: her iki tekerleğin de düz zemine bastığı, uçurum dibi olmayan
    // bir nokta. Yeniden doğuş bunu kullanır; yoksa oyuncu onu öldüren
    // rampanın tam üstüne bırakılır ve sonsuz döngüye girer.
    safeSpot: function (x) {
      const wb = M.TUNING.wheelBase;
      this.ensure(x + 1300);
      for (let d = 0; d < 1200; d += 10) {
        const cx = x + d;
        if (this.inPit(cx)) continue;
        const a = this.heightAt(cx - wb), b = this.heightAt(cx), e = this.heightAt(cx + wb);
        // Düzlük: iki yandaki yükseklik farkı küçük olmalı.
        if (Math.abs(a - b) < 7 && Math.abs(e - b) < 7 && Math.abs(a - e) < 9) return cx;
      }
      return x;
    },

    // Yukarı bakan birim normal.
    normalAt: function (x) {
      const s = this.slopeAt(x);
      return { x: Math.sin(s), y: -Math.cos(s) };
    },

    // ---------- ÜRETİM ----------
    // Motor ilerledikçe önü doldur, arkayı at.
    update: function (bikeX) {
      this.ensure(bikeX + AHEAD);
      const cutX = bikeX - BEHIND;
      const drop = Math.floor((cutX - this.x0) / STEP);
      if (drop > 64) {
        this.pts.splice(0, drop);
        this.x0 += drop * STEP;
        while (this.features.length && this.features[0].x1 < cutX) this.features.shift();
      }
    },

    ensure: function (targetX) {
      let guard = 0;
      while (this.lastX() < targetX && guard++ < 400) this.generateFeature();
    },

    push: function (y) {
      this.genY = M.clamp(y, -140, 260);
      this.pts.push(this.genY);
    },

    pushFlat: function (len) {
      const n = Math.max(1, Math.round(len / STEP));
      for (let i = 0; i < n; i++) this.push(this.genY);
    },

    // Zorluk 0..1 — mesafeyle artar, arazi sertleşir.
    difficulty: function () {
      return M.clamp(this.lastX() / 9000, 0, 1);
    },

    generateFeature: function () {
      const rng = this.rng;
      const d = this.difficulty();
      const startX = this.lastX();

      const type = rng.weighted([
        ['hills', 30],
        ['tabletop', 20],
        ['kicker', 24 + d * 10],
        ['whoops', 10 + d * 6],
        ['gap', 6 + d * 12],
        ['bigair', 10 + d * 14],
        ['flat', 8],
      ]);

      switch (type) {
        case 'flat':
          this.pushFlat(rng.range(60, 140));
          break;

        case 'hills': {
          // Yumuşak sinüs tepeleri — hız kazanma ve küçük sıçramalar.
          const len = rng.range(180, 380);
          const n = Math.round(len / STEP);
          const amp = rng.range(8, 16 + d * 20);
          const wave = rng.range(0.05, 0.11);
          const base = this.genY;
          const phase = rng.range(0, Math.PI * 2);
          for (let i = 0; i < n; i++) {
            const t = i / n;
            // Uçları yumuşat ki bir sonraki parça ile dikiş oluşmasın.
            const fade = Math.sin(Math.PI * t);
            this.push(base + Math.sin(phase + i * wave) * amp * fade);
          }
          break;
        }

        case 'whoops': {
          // Ardışık küçük tümsekler — süspansiyonu zorlar, wheelie fırsatı.
          const bumps = rng.int(3, 6);
          const amp = rng.range(5, 9 + d * 6);
          const w = rng.range(26, 40);
          const base = this.genY;
          for (let b = 0; b < bumps; b++) {
            const n = Math.round(w / STEP);
            for (let i = 0; i < n; i++) {
              this.push(base - Math.sin((i / n) * Math.PI) * amp);
            }
          }
          this.pushFlat(30);
          break;
        }

        case 'tabletop': {
          // Rampa → düz masa → iniş rampası. Takla için en güvenli yapı.
          const h = rng.range(22, 38 + d * 18);
          const up = rng.range(50, 80);
          this.ramp(-h, up, 'ease');
          this.pushFlat(rng.range(60, 130));
          this.ramp(h, rng.range(60, 100), 'ease');
          this.pushFlat(40);
          break;
        }

        case 'kicker': {
          // Dik kalkış rampası + arkasında boşluk. Klasik takla rampası.
          const h = rng.range(26, 42 + d * 20);
          this.ramp(-h, rng.range(46, 68), 'kick');
          // Rampanın arkası aniden düşer.
          const dropY = this.genY + rng.range(18, 34 + d * 20);
          this.push(dropY);
          this.pushFlat(rng.range(40, 90));
          // Yumuşak iniş yokuşu.
          this.ramp(-rng.range(6, 16), rng.range(50, 90), 'ease');
          this.pushFlat(60);
          this.features.push({ x0: startX, x1: this.lastX(), type: 'kicker' });
          break;
        }

        case 'gap': {
          // Çukur: dik iniş, düz dip, dik çıkış. Atlanacak, girilmeyecek.
          // Dibin tam aralığı kaydedilir; oraya düşen oyuncu beklemeden
          // kaza yer (bkz. main.js), çünkü dik duvardan tırmanmak imkânsız.
          this.pushFlat(30);
          const depth = rng.range(34, 60 + d * 40);
          const width = rng.range(58, 92 + d * 80);
          const edgeY = this.genY;
          const pitX0 = this.lastX();
          this.push(edgeY + depth);
          const n = Math.round(width / STEP);
          for (let i = 0; i < n; i++) this.push(edgeY + depth);
          const pitX1 = this.lastX();
          this.push(edgeY - rng.range(0, 10));
          this.pushFlat(70);
          this.features.push({ x0: pitX0 - 4, x1: pitX1 + 4, type: 'gap' });
          break;
        }

        case 'bigair': {
          // Uzun hızlanma yokuşu + dik rampa + geniş boşluk + iniş yokuşu.
          this.ramp(rng.range(10, 22), rng.range(90, 150), 'ease');   // aşağı: hız topla
          const h = rng.range(40, 60 + d * 24);
          this.ramp(-h, rng.range(60, 90), 'kick');
          const dropY = this.genY + rng.range(50, 90 + d * 50);
          this.push(dropY);
          this.pushFlat(rng.range(90, 150 + d * 90));
          this.ramp(-rng.range(14, 26), rng.range(70, 110), 'ease');
          this.pushFlat(80);
          this.features.push({ x0: startX, x1: this.lastX(), type: 'bigair' });
          break;
        }
      }
    },

    // dy: negatif = yukarı. shape 'ease' yumuşak S, 'kick' sonu dikleşen rampa.
    ramp: function (dy, len, shape) {
      const n = Math.max(2, Math.round(len / STEP));
      const base = this.genY;
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const e = shape === 'kick'
          ? t * t                                   // sona doğru dikleşir
          : (1 - Math.cos(t * Math.PI)) * 0.5;      // yumuşak S eğrisi
        this.push(base + dy * e);
      }
    },
  };

  M.terrain = terrain;

})(window.MOTO);
