'use strict';
/* ============================================================
   PİXEL MOTOR — efektler
   Partiküller, ekran sarsıntısı, slow-mo, akrobasi popup'ları, flaş.
   ============================================================ */

(function (M) {

  const MAX_PARTICLES = 220;

  const fx = {
    particles: [],
    popups: [],
    shakeAmt: 0,
    flashAmt: 0,
    flashColor: '#fff',
    timeScale: 1,
    _slowLeft: 0,
    _slowTarget: 1,
    camShakeX: 0,
    camShakeY: 0,

    reset: function () {
      this.particles.length = 0;
      this.popups.length = 0;
      this.shakeAmt = 0;
      this.flashAmt = 0;
      this.timeScale = 1;
      this._slowLeft = 0;
    },

    // ---------- PARTİKÜLLER ----------
    spawn: function (x, y, vx, vy, life, color, size, grav) {
      if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
      this.particles.push({
        x: x, y: y, vx: vx, vy: vy,
        life: life, maxLife: life,
        color: color, size: size || 1,
        grav: grav === undefined ? 60 : grav,
      });
    },

    dust: function (x, y, speed, dir) {
      const n = speed > 180 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        this.spawn(
          x + (Math.random() - 0.5) * 3, y + Math.random() * 2,
          -dir * (10 + Math.random() * speed * 0.18), -Math.random() * 24 - 4,
          0.32 + Math.random() * 0.3,
          Math.random() < 0.4 ? '#c9a97a' : '#a58559',
          1 + (Math.random() < 0.3 ? 1 : 0), 30
        );
      }
    },

    smoke: function (x, y) {
      this.spawn(
        x + (Math.random() - 0.5) * 2, y,
        -8 - Math.random() * 12, -6 - Math.random() * 10,
        0.5 + Math.random() * 0.4, '#6e6e78', 1, -8
      );
    },

    debris: function (x, y, n, color) {
      for (let i = 0; i < n; i++) {
        this.spawn(
          x, y,
          (Math.random() - 0.5) * 140, -Math.random() * 110 - 20,
          0.6 + Math.random() * 0.6, color || '#8a8a95',
          1 + (Math.random() < 0.25 ? 1 : 0), 200
        );
      }
    },

    // ---------- POPUP ----------
    popup: function (text, color) {
      // Aynı yazı üst üste binmesin — yenisi eskisini yukarı iter.
      for (let i = 0; i < this.popups.length; i++) this.popups[i].y -= 9;
      this.popups.push({ text: text, color: color || '#fff', life: 1.3, y: 0 });
      if (this.popups.length > 5) this.popups.shift();
    },

    // ---------- KAMERA / ZAMAN ----------
    shake: function (amount) {
      if (amount > this.shakeAmt) this.shakeAmt = Math.min(amount, 7);
    },

    flash: function (amount, color) {
      this.flashAmt = Math.max(this.flashAmt, amount);
      this.flashColor = color || '#fff';
    },

    // scale: hedef zaman ölçeği, dur: gerçek saniye
    slowMo: function (scale, dur) {
      if (this._slowLeft > dur && this._slowTarget <= scale) return;
      this._slowTarget = scale;
      this._slowLeft = Math.max(this._slowLeft, dur);
    },

    // dt: GERÇEK zaman (slow-mo'dan etkilenmez)
    update: function (dt) {
      // zaman ölçeği
      if (this._slowLeft > 0) {
        this._slowLeft -= dt;
        this.timeScale += (this._slowTarget - this.timeScale) * 0.35;
      } else {
        this.timeScale += (1 - this.timeScale) * 0.12;
        if (this.timeScale > 0.995) this.timeScale = 1;
      }

      const ps = this.particles;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.life -= dt;
        if (p.life <= 0) { ps.splice(i, 1); continue; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.grav * dt;
        p.vx *= 0.97;
      }

      for (let i = this.popups.length - 1; i >= 0; i--) {
        const q = this.popups[i];
        q.life -= dt;
        q.y -= 14 * dt;
        if (q.life <= 0) this.popups.splice(i, 1);
      }

      this.shakeAmt *= 0.86;
      if (this.shakeAmt < 0.05) this.shakeAmt = 0;
      this.camShakeX = (Math.random() - 0.5) * this.shakeAmt * 2;
      this.camShakeY = (Math.random() - 0.5) * this.shakeAmt * 2;

      this.flashAmt *= 0.88;
      if (this.flashAmt < 0.01) this.flashAmt = 0;
    },
  };

  M.fx = fx;

})(window.MOTO);
