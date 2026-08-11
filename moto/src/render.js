'use strict';
/* ============================================================
   PİXEL MOTOR — çizim
   Her şey 320x180'lik tampona çizilir, ekrana yumuşatmasız ölçeklenir.
   Gerçek piksel kırılmaları buradan gelir.
   ============================================================ */

(function (M) {

  const PAL = M.PAL;

  const render = {
    buf: null, bctx: null,
    view: null, vctx: null,
    scale: 1, offX: 0, offY: 0,

    cam: { x: 0, y: 0, zoom: 1 },

    init: function (viewCanvas) {
      this.view = viewCanvas;
      this.vctx = viewCanvas.getContext('2d', { alpha: false });
      this.buf = document.createElement('canvas');
      this.bctx = this.buf.getContext('2d', { alpha: false });
      this.vctx.imageSmoothingEnabled = false;
      this.resize();
      window.addEventListener('resize', this.resize.bind(this));
      window.addEventListener('orientationchange', this.resize.bind(this));
    },

    // Netliğin sırrı TAM SAYI ölçek: her sanal piksel ekranda tam olarak SxS
    // aygıt pikseline denk gelir. Kesirli ölçekte kimi piksel 3, kimi 4 aygıt
    // pikseli olur ve görüntü bulanık/titrek görünür.
    //
    // Bunu garantilemek için tampon boyutu ekrandan türetilir, canvas'ın
    // arka belleği tam kat yapılır ve CSS boyutu buna göre ayarlanır; artan
    // 1-2 pikselik kenar siyah kalır (gözle görülmez).
    resize: function () {
      const dpr = M.clamp(window.devicePixelRatio || 1, 1, 3);
      const cssW = window.innerWidth, cssH = window.innerHeight;
      const devW = Math.round(cssW * dpr), devH = Math.round(cssH * dpr);

      // Kısa kenarda ~168 sanal piksel: motor tanınacak kadar büyük,
      // ileriyi görecek kadar geniş.
      const s = Math.max(1, Math.round(Math.min(devW, devH) / 168));
      const w = Math.floor(devW / s);
      const h = Math.floor(devH / s);

      if (this.buf.width !== w || this.buf.height !== h) {
        this.buf.width = w;
        this.buf.height = h;
      }
      this.bctx.imageSmoothingEnabled = false;
      M.VW = w; M.VH = h;

      this.view.width = w * s;
      this.view.height = h * s;
      this.view.style.width = (w * s / dpr) + 'px';
      this.view.style.height = (h * s / dpr) + 'px';

      this.scale = s;
      this.offX = 0;
      this.offY = 0;
      this.vctx.imageSmoothingEnabled = false;
    },

    // ---------- KAMERA ----------
    updateCamera: function (bike, dt, instant) {
      const T = M.TUNING;
      const vx = bike.vx() / (1 / 60);
      const tx = bike.cx() + vx * T.cameraLead + M.VW * 0.09;
      // Motoru ekranın biraz altında tut: yukarıda uçuş için boşluk kalsın,
      // aşağıda gereksiz toprak görünmesin.
      const ty = bike.cy() - M.VH * 0.12;
      const tz = bike.airborne ? 0.86 : 1;
      if (instant) {
        this.cam.x = tx; this.cam.y = ty; this.cam.zoom = tz;
      } else {
        const k = M.clamp(T.cameraSmooth * dt * 60, 0, 1);
        this.cam.x += (tx - this.cam.x) * k;
        this.cam.y += (ty - this.cam.y) * k * 0.8;
        this.cam.zoom += (tz - this.cam.zoom) * k * 0.5;
      }
    },

    // ---------- ANA ÇİZİM ----------
    draw: function (game) {
      const c = this.bctx;
      const cam = this.cam;
      const fx = M.fx;

      c.setTransform(1, 0, 0, 1, 0, 0);
      this.drawSky(c, cam);
      this.drawParallax(c, cam);

      const z = cam.zoom;
      const camX = cam.x + fx.camShakeX;
      const camY = cam.y + fx.camShakeY;
      c.setTransform(z, 0, 0, z, M.VW / 2 - camX * z, M.VH / 2 - camY * z);

      this.drawTerrain(c, camX, z);
      this.drawParticles(c, fx);

      if (M.ragdoll.active) {
        this.drawBike(c, M.bike, false);
        this.drawRagdoll(c, M.ragdoll);
      } else {
        this.drawBike(c, M.bike, true);
      }

      this.drawSpeedLines(c, M.bike, camX, camY, z);

      c.setTransform(1, 0, 0, 1, 0, 0);
      this.drawPopups(c, fx);

      if (fx.flashAmt > 0.01) {
        c.globalAlpha = M.clamp(fx.flashAmt, 0, 0.7);
        c.fillStyle = fx.flashColor;
        c.fillRect(0, 0, M.VW, M.VH);
        c.globalAlpha = 1;
      }

      // Tamponu ekrana bas.
      const v = this.vctx;
      v.imageSmoothingEnabled = false;
      v.drawImage(this.buf, 0, 0, M.VW * this.scale, M.VH * this.scale);
    },

    // Ufuk = zeminin ekrandaki yüksekliği. Uzak tepeler ve gök bantları buna
    // göre yerleşir; yoksa arazi onları örter ya da dither şeridi çimenin
    // üstünden geçer.
    horizon: function (cam) {
      const gy = M.terrain.heightAt(cam.x);
      const sy = (gy - cam.y) * cam.zoom + M.VH / 2;
      return M.clamp(sy, M.VH * 0.12, M.VH * 0.98);
    },

    // İki renk arasında 4x4 Bayer eşikli düzgün bir dither şeridi üretir.
    // Şerit bir kez çizilip saklanır — her karede piksel piksel hesaplamak
    // pahalı olurdu ve rastgele nokta serpmek "gürültü" gibi görünürdü.
    makeDither: function (top, bottom) {
      const h = 14;
      const cv = document.createElement('canvas');
      cv.width = M.VW; cv.height = h;
      const g = cv.getContext('2d');
      g.fillStyle = top;
      g.fillRect(0, 0, M.VW, h);
      g.fillStyle = bottom;
      const B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
      for (let y = 0; y < h; y++) {
        const d = (y + 0.5) / h;
        for (let x = 0; x < M.VW; x++) {
          if (B[y & 3][x & 3] / 16 < d) g.fillRect(x, y, 1, 1);
        }
      }
      return cv;
    },

    ensureDither: function () {
      if (this._ditherW === M.VW) return;
      this._ditherW = M.VW;
      this._dith = [
        this.makeDither(PAL.skyTop, PAL.skyMid),
        this.makeDither(PAL.skyMid, PAL.skyLow),
      ];
    },

    // ---------- GÖKYÜZÜ (dither bantlı) ----------
    drawSky: function (c, cam) {
      this.ensureDither();
      const hz = this.horizon(cam);
      const dh = this._dith[0].height;
      // Bantlar ufkun epey üstünde durur; aksi halde geçiş şeridi tam oyun
      // alanının ortasından geçer ve dikkat dağıtır.
      const y1 = Math.round(hz - M.VH * 0.85);
      const y2 = Math.round(hz - M.VH * 0.45);

      c.fillStyle = PAL.skyTop;
      c.fillRect(0, 0, M.VW, Math.max(0, y1));
      c.fillStyle = PAL.skyMid;
      c.fillRect(0, Math.max(0, y1), M.VW, Math.max(0, y2 - y1));
      c.fillStyle = PAL.skyLow;
      c.fillRect(0, Math.max(0, y2), M.VW, M.VH - Math.max(0, y2));

      if (y1 > -dh && y1 < M.VH) c.drawImage(this._dith[0], 0, y1);
      if (y2 > -dh && y2 < M.VH) c.drawImage(this._dith[1], 0, y2);
      // Güneş: dolu disk + halka
      const sx = M.VW * 0.72 - (cam.x * 0.02) % (M.VW * 1.6);
      const sy = hz - M.VH * 0.62;
      c.fillStyle = '#ffe9a0';
      c.beginPath(); c.arc(sx, sy, 12, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff8dc';
      c.beginPath(); c.arc(sx, sy, 9, 0, Math.PI * 2); c.fill();

      this.drawClouds(c, cam, hz);
    },

    // Bulutlar: birkaç üst üste binmiş dolu daire, düşük parallax ile.
    drawClouds: function (c, cam, hz) {
      c.fillStyle = 'rgba(255,255,255,0.82)';
      const span = M.VW + 220;
      for (let i = 0; i < 5; i++) {
        const seed = i * 137.5;
        let x = (seed - cam.x * 0.06) % span;
        if (x < -110) x += span;
        const y = hz - M.VH * (0.45 + (i % 3) * 0.14);
        const s = 0.75 + (i % 3) * 0.3;
        c.beginPath();
        c.arc(x, y, 6 * s, 0, Math.PI * 2);
        c.arc(x + 7 * s, y - 3 * s, 8 * s, 0, Math.PI * 2);
        c.arc(x + 16 * s, y, 6 * s, 0, Math.PI * 2);
        c.fill();
      }
    },

    // ---------- PARALLAX TEPELER ----------
    drawParallax: function (c, cam) {
      const hz = this.horizon(cam);
      const layers = [
        { k: 0.14, amp: 11, base: hz - 17, freq: 0.011, color: PAL.farHill },
        { k: 0.30, amp: 14, base: hz - 5, freq: 0.017, color: PAL.midHill },
      ];
      for (let l = 0; l < layers.length; l++) {
        const L = layers[l];
        c.fillStyle = L.color;
        c.beginPath();
        c.moveTo(0, M.VH);
        for (let x = 0; x <= M.VW; x += 2) {
          const wx = (x + cam.x * L.k);
          const y = L.base
            + Math.sin(wx * L.freq) * L.amp
            + Math.sin(wx * L.freq * 2.7 + 1.3) * L.amp * 0.35;
          c.lineTo(x, y);
        }
        c.lineTo(M.VW, M.VH);
        c.closePath();
        c.fill();
      }
    },

    // ---------- ARAZİ ----------
    drawTerrain: function (c, camX, z) {
      const t = M.terrain;
      const halfW = (M.VW / z) * 0.5 + 12;
      const xLeft = camX - halfW, xRight = camX + halfW;
      const i0 = Math.max(0, Math.floor((xLeft - t.x0) / t.step) - 1);
      const i1 = Math.min(t.pts.length - 1, Math.ceil((xRight - t.x0) / t.step) + 1);
      if (i1 <= i0) return;

      const bottom = this.cam.y + M.VH / z;

      c.beginPath();
      c.moveTo(t.x0 + i0 * t.step, bottom + 200);
      for (let i = i0; i <= i1; i++) c.lineTo(t.x0 + i * t.step, t.pts[i]);
      c.lineTo(t.x0 + i1 * t.step, bottom + 200);
      c.closePath();
      c.fillStyle = PAL.ground;
      c.fill();

      // Toprak dokusu: koyu tortu şeritleri + araya serpilmiş çakıl.
      // Dünya koordinatına sabitlenir, böylece kamera kaydıkça zemin kayıyor
      // gibi görünür — düz kahverengi duvar hissini kırar.
      c.save();
      c.clip();
      c.fillStyle = PAL.groundDark;
      const startY = Math.floor((this.cam.y - 40) / 14) * 14;
      for (let y = startY; y < bottom + 200; y += 14) {
        c.fillRect(xLeft, y, halfW * 2, 3);
      }
      const gx0 = Math.floor(xLeft / 17) * 17;
      for (let x = gx0; x < xRight; x += 17) {
        for (let y = startY + 7; y < bottom + 200; y += 28) {
          // Konuma bağlı sahte rastgelelik — kare başına değişmez.
          const j = ((x * 73 + y * 31) % 11);
          c.fillRect(x + j, y + (j % 5), 2, 1);
        }
      }
      c.restore();

      // Çim: koyu taban + üstünde açık ince bir tepe çizgisi. İki katman,
      // zemin kenarını keskin ve okunur yapar.
      const ridge = function (off) {
        c.beginPath();
        for (let i = i0; i <= i1; i++) {
          const x = t.x0 + i * t.step, y = t.pts[i] + off;
          if (i === i0) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.stroke();
      };
      c.lineJoin = 'round';
      c.lineWidth = 4;
      c.strokeStyle = PAL.grassDark;
      ridge(1.5);
      c.lineWidth = 2;
      c.strokeStyle = PAL.grass;
      ridge(0);
      c.lineWidth = 1;
      c.strokeStyle = '#5fa63f';
      ridge(-0.5);
      c.lineJoin = 'miter';
    },

    drawParticles: function (c, fx) {
      const ps = fx.particles;
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        c.globalAlpha = M.clamp(p.life / p.maxLife, 0, 1);
        c.fillStyle = p.color;
        c.fillRect(p.x | 0, p.y | 0, p.size, p.size);
      }
      c.globalAlpha = 1;
    },

    // ---------- MOTOR + SÜRÜCÜ ----------
    drawBike: function (c, b, withRider) {
      if (!b.parts) return;
      const R = M.TUNING.wheelRadius;
      const rear = b.rear, front = b.front, ch = b.chassis;

      // Motorun kendi eksen takımı: u ileri, n yukarı. Tüm parçalar bu
      // eksende yerleştirilir, böylece motor yattıkça her şey birlikte döner.
      const ax = front.x - rear.x, ay = front.y - rear.y;
      const al = Math.sqrt(ax * ax + ay * ay) || 1;
      const ux = ax / al, uy = ay / al;
      const nx = uy, ny = -ux;
      const mx = (rear.x + front.x) / 2, my = (rear.y + front.y) / 2;
      const P = function (fwd, up) {
        return { x: mx + ux * fwd + nx * up, y: my + uy * fwd + ny * up };
      };

      const barX = P(4, 10).x, barY = P(4, 10).y;

      // Arka salıncak + egzoz
      c.strokeStyle = PAL.bikeHi;
      c.lineCap = 'round';
      c.lineWidth = 2;
      this.seg(c, P(-11, 0), P(-3, 3));
      c.strokeStyle = '#9a9aa6';
      c.lineWidth = 2;
      this.seg(c, P(-9, 5), P(1, 6));

      // Ön amortisör
      c.strokeStyle = PAL.bikeHi;
      c.lineWidth = 2;
      this.seg(c, P(11, 0), P(5, 9));

      // Gövde bloğu (motor + depo) — dolu çokgen, ince çizgiden çok daha net
      c.fillStyle = PAL.bike;
      c.beginPath();
      const body = [P(-7, 2), P(-5, 8), P(3, 9), P(7, 6), P(6, 1), P(-2, -1)];
      c.moveTo(body[0].x, body[0].y);
      for (let i = 1; i < body.length; i++) c.lineTo(body[i].x, body[i].y);
      c.closePath();
      c.fill();

      // Depo: kırmızı aksan, koyu gövdeden ayrılsın
      c.fillStyle = PAL.bikeAccent;
      c.beginPath();
      const tank = [P(-4, 8), P(2, 9), P(5, 7), P(0, 6)];
      c.moveTo(tank[0].x, tank[0].y);
      for (let i = 1; i < tank.length; i++) c.lineTo(tank[i].x, tank[i].y);
      c.closePath();
      c.fill();

      // Sele
      c.fillStyle = PAL.ink;
      c.beginPath();
      const seat = [P(-8, 8), P(-3, 10), P(0, 9), P(-6, 7)];
      c.moveTo(seat[0].x, seat[0].y);
      for (let i = 1; i < seat.length; i++) c.lineTo(seat[i].x, seat[i].y);
      c.closePath();
      c.fill();

      // Gidon
      c.strokeStyle = PAL.ink;
      c.lineWidth = 2;
      this.seg(c, P(2, 10), P(6, 10));

      this.drawWheel(c, rear.x, rear.y, R, b.wheelSpin);
      this.drawWheel(c, front.x, front.y, R, b.wheelSpin);

      c.lineCap = 'butt';
      if (withRider) this.drawRider(c, b, barX, barY, P);
    },

    seg: function (c, a, b) {
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.stroke();
    },

    // Lastik + jant + göbek: dolu halkalar ince çizgiye göre çok daha okunur.
    drawWheel: function (c, x, y, r, spin) {
      c.fillStyle = PAL.wheel;
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#3c3c46';
      c.beginPath(); c.arc(x, y, r - 1.6, 0, Math.PI * 2); c.fill();

      c.strokeStyle = '#b9b9c4';
      c.lineWidth = 1;
      c.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = spin + i * Math.PI / 3;
        const co = Math.cos(a) * (r - 2), si = Math.sin(a) * (r - 2);
        c.moveTo(x - co, y - si);
        c.lineTo(x + co, y + si);
      }
      c.stroke();

      c.fillStyle = '#d8d8e0';
      c.beginPath(); c.arc(x, y, 1.3, 0, Math.PI * 2); c.fill();
    },

    // Sürücü, motorun parçacıklarından türer: kalça kadroda, baş sürücü
    // parçacığında, eller gidonda, ayaklar basamakta. Motor yattıkça figür
    // kendiliğinden eğilir.
    drawRider: function (c, b, barX, barY, P) {
      const hip = P(-3, 11);          // selede
      const head = b.rider;           // sürücü parçacığı → gerçek sarkma/eğilme
      const shoulder = {
        x: hip.x + (head.x - hip.x) * 0.72,
        y: hip.y + (head.y - hip.y) * 0.72,
      };
      const peg = P(-2, 4);           // basamak
      // Diz öne, dirsek yukarı kırılır — silüet insan gibi okunsun.
      const knee = P(2, 6);
      const elbow = { x: (shoulder.x + barX) / 2, y: (shoulder.y + barY) / 2 - 2 };

      c.lineCap = 'round';

      // Bacak (gövdenin arkasında kalsın diye önce)
      c.strokeStyle = PAL.riderDark;
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(hip.x, hip.y);
      c.lineTo(knee.x, knee.y);
      c.lineTo(peg.x, peg.y);
      c.stroke();

      // Gövde
      c.strokeStyle = PAL.rider;
      c.lineWidth = 4;
      this.seg(c, hip, shoulder);

      // Kol → gidon
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(shoulder.x, shoulder.y);
      c.lineTo(elbow.x, elbow.y);
      c.lineTo(barX, barY);
      c.stroke();

      // Kask + siperlik
      c.fillStyle = PAL.rider;
      c.beginPath();
      c.arc(head.x, head.y, 3.4, 0, Math.PI * 2);
      c.fill();
      const fx = (b.front.x - b.rear.x), fy = (b.front.y - b.rear.y);
      const fl = Math.sqrt(fx * fx + fy * fy) || 1;
      c.fillStyle = '#2a2a33';
      c.beginPath();
      c.arc(head.x + fx / fl * 1.5, head.y + fy / fl * 1.5, 1.5, 0, Math.PI * 2);
      c.fill();

      c.lineCap = 'butt';
    },

    drawRagdoll: function (c, r) {
      const p = r.pts;
      c.strokeStyle = PAL.rider;
      c.lineWidth = 2.2;
      c.beginPath();
      c.moveTo(p.head.x, p.head.y); c.lineTo(p.chest.x, p.chest.y);
      c.lineTo(p.hip.x, p.hip.y);
      c.stroke();
      c.lineWidth = 1.8;
      c.beginPath();
      c.moveTo(p.chest.x, p.chest.y); c.lineTo(p.handL.x, p.handL.y);
      c.moveTo(p.chest.x, p.chest.y); c.lineTo(p.handR.x, p.handR.y);
      c.stroke();
      c.strokeStyle = PAL.riderDark;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(p.hip.x, p.hip.y); c.lineTo(p.footL.x, p.footL.y);
      c.moveTo(p.hip.x, p.hip.y); c.lineTo(p.footR.x, p.footR.y);
      c.stroke();
      c.fillStyle = PAL.rider;
      c.beginPath(); c.arc(p.head.x, p.head.y, 2.6, 0, Math.PI * 2); c.fill();
    },

    // Yüksek hızda ekranı yalayan hız çizgileri.
    drawSpeedLines: function (c, b, camX, camY, z) {
      const v = Math.abs(b.vx()) / (1 / 60);
      if (v < 190) return;
      const n = Math.min(7, Math.round((v - 170) / 22));
      c.strokeStyle = 'rgba(255,255,255,0.28)';
      c.lineWidth = 1;
      c.beginPath();
      for (let i = 0; i < n; i++) {
        const y = camY - M.VH / z * 0.5 + ((i * 53 + (performance.now() * 0.05) % 180) % (M.VH / z));
        const x = camX + M.VW / z * 0.5 - ((performance.now() * 0.6 + i * 90) % (M.VW / z));
        c.moveTo(x, y);
        c.lineTo(x + 14, y);
      }
      c.stroke();
    },

    // ---------- POPUP YAZILARI ----------
    drawPopups: function (c, fx) {
      c.textAlign = 'center';
      c.font = 'bold 11px "Courier New", monospace';
      for (let i = 0; i < fx.popups.length; i++) {
        const q = fx.popups[i];
        const alpha = M.clamp(q.life / 0.45, 0, 1);
        // HUD'un ve kaza kutusunun altında kalsın diye ekranın yarısına yakın
        // başlar, sönerken yukarı süzülür.
        const y = M.VH * 0.52 + q.y + (1 - M.clamp(q.life / 1.3, 0, 1)) * -6;
        c.globalAlpha = alpha;
        c.fillStyle = PAL.ink;
        c.fillText(q.text, M.VW / 2 + 1, y + 1);
        c.fillStyle = q.color;
        c.fillText(q.text, M.VW / 2, y);
      }
      c.globalAlpha = 1;
      c.textAlign = 'left';
    },
  };

  M.render = render;

})(window.MOTO);
