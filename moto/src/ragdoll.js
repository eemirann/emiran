'use strict';
/* ============================================================
   PİXEL MOTOR — sürücü ragdoll'u
   Kaza anında sürücü motordan kopar; eklemli Verlet iskelet olarak savrulur.
   ============================================================ */

(function (M) {

  function pt(x, y) { return { x: x, y: y, px: x, py: y }; }

  const ragdoll = {
    active: false,
    pts: null,
    links: null,
    settled: 0,

    // vx/vy: kare başına yer değiştirme (Verlet hız birimi).
    launch: function (x, y, vx, vy, spin) {
      const p = {
        head: pt(x, y - 7),
        chest: pt(x, y - 3),
        hip: pt(x, y + 2),
        handL: pt(x + 4, y - 3),
        handR: pt(x + 5, y - 1),
        footL: pt(x - 3, y + 7),
        footR: pt(x + 1, y + 8),
      };
      this.pts = p;

      const L = function (a, b, stiff) {
        return { a: a, b: b, len: M.dist(a.x, a.y, b.x, b.y), stiff: stiff === undefined ? 1 : stiff };
      };
      this.links = [
        L(p.head, p.chest), L(p.chest, p.hip),
        L(p.chest, p.handL, 0.8), L(p.chest, p.handR, 0.8),
        L(p.hip, p.footL, 0.8), L(p.hip, p.footR, 0.8),
        L(p.head, p.hip, 0.35),                 // omurga sertliği
        L(p.handL, p.hip, 0.15), L(p.handR, p.hip, 0.15),
        L(p.footL, p.footR, 0.1),
      ];

      // Fırlatma: motorun hızı + yukarı tekme + savrulma.
      const keys = Object.keys(p);
      for (let i = 0; i < keys.length; i++) {
        const q = p[keys[i]];
        const rx = (Math.random() - 0.5) * spin;
        const ry = (Math.random() - 0.5) * spin;
        q.px = q.x - (vx * 1.05 + rx);
        q.py = q.y - (vy * 1.05 - 0.35 + ry);
      }

      this.active = true;
      this.settled = 0;
    },

    step: function (dt, terrain) {
      if (!this.active) return;
      const keys = Object.keys(this.pts);
      let moved = 0;

      for (let i = 0; i < keys.length; i++) {
        const q = this.pts[keys[i]];
        const vx = (q.x - q.px) * 0.996;
        const vy = (q.y - q.py) * 0.996;
        q.px = q.x; q.py = q.y;
        q.x += vx;
        q.y += vy + M.TUNING.gravity * dt * dt;
      }

      for (let it = 0; it < 6; it++) {
        for (let i = 0; i < this.links.length; i++) {
          const c = this.links[i];
          const dx = c.b.x - c.a.x, dy = c.b.y - c.a.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
          const diff = (d - c.len) / d * c.stiff * 0.5;
          c.a.x += dx * diff; c.a.y += dy * diff;
          c.b.x -= dx * diff; c.b.y -= dy * diff;
        }
      }

      for (let i = 0; i < keys.length; i++) {
        const q = this.pts[keys[i]];
        const gy = terrain.heightAt(q.x);
        if (q.y > gy - 0.5) {
          q.y = gy - 0.5;
          // Yerde sürtünme — kayıp durur.
          q.px = q.x - (q.x - q.px) * 0.55;
          q.py = q.y - (q.y - q.py) * 0.2;
        }
        moved += Math.abs(q.x - q.px) + Math.abs(q.y - q.py);
      }

      if (moved < 0.4) this.settled += dt; else this.settled = 0;
    },

    clear: function () { this.active = false; },
  };

  M.ragdoll = ragdoll;

})(window.MOTO);
