'use strict';
/* ============================================================
   PİXEL MOTOR — motor fiziği
   Verlet parçacık + kısıt gevşetme. Rijit gövde matrisi yok:
   motorun açısı iki tekerlek arasındaki vektörden türer.
   ============================================================ */

(function (M) {

  const T = M.TUNING;

  function particle(x, y, invMass) {
    return { x: x, y: y, px: x, py: y, ax: 0, ay: 0, im: invMass, onGround: false };
  }

  const bike = {
    parts: null,
    rear: null, front: null, chassis: null, rider: null,
    constraints: null,

    angle: 0,        // -PI..PI, y aşağı: negatif = burun yukarı
    rot: 0,          // sarmasız birikimli dönüş (takla sayımı için)
    rotAtTakeoff: 0, // tekerlekler yerden kesildiği andaki birikimli dönüş
    spin: 0,         // açısal hız (rad/sn)
    airborne: false,
    airTime: 0,
    groundTime: 0,
    crashed: false,
    crashReason: '',
    lastImpact: 0,   // son iniş şiddeti (efektler için)
    wheelSpin: 0,    // tekerlek çizimi için görsel dönüş
    engineOn: false,

    // ---------- KURULUM ----------
    // Motor zemin eğimine oturtulur; tekerleklerden biri tepenin içinde
    // kalırsa çözücü onu şiddetle fırlatır — bu yüzden her tekerlek kendi
    // x'indeki yükseklikten yerleştirilir.
    spawnOn: function (x, terrain) {
      const wb = T.wheelBase, r = T.wheelRadius;
      const rx = x - wb / 2, fx = x + wb / 2;
      const ry = terrain.heightAt(rx) - r - 1;
      const fy = terrain.heightAt(fx) - r - 1;
      const mx = (rx + fx) / 2, my = (ry + fy) / 2;
      const s = Math.atan2(fy - ry, wb);
      // Kadro ve sürücü, motorun eğimine dik olarak yukarı yerleştirilir.
      const upX = Math.sin(s), upY = -Math.cos(s);
      this.spawnAt(
        rx, ry, fx, fy,
        mx + upX * T.chassisHeight, my + upY * T.chassisHeight,
        mx + upX * (T.chassisHeight + T.riderOffsetY) + T.riderOffsetX,
        my + upY * (T.chassisHeight + T.riderOffsetY)
      );
    },

    spawnAt: function (rx, ry, fx, fy, cxp, cyp, rdx, rdy) {
      const rear = particle(rx, ry, 1);
      const front = particle(fx, fy, 1);
      const chassis = particle(cxp, cyp, 0.72);
      const rider = particle(rdx, rdy, 1.1);

      this.rear = rear; this.front = front; this.chassis = chassis; this.rider = rider;
      this.parts = [rear, front, chassis, rider];

      const link = function (a, b, stiff) {
        return { a: a, b: b, len: M.dist(a.x, a.y, b.x, b.y), stiff: stiff };
      };
      this.constraints = [
        link(rear, front, T.frameStiffness),
        link(rear, chassis, T.suspension),
        link(front, chassis, T.suspension),
        link(chassis, rider, T.riderStiffness),
        link(rear, rider, T.riderStiffness * 0.6),
      ];

      this.angle = Math.atan2(front.y - rear.y, front.x - rear.x);
      this.rot = 0;
      this.rotAtTakeoff = 0;
      this.spin = 0;
      this.airborne = false;
      this.airTime = 0;
      this.groundTime = 0;
      this.crashed = false;
      this.crashReason = '';
      this.wheelSpin = 0;
      this.lastImpact = 0;
    },

    // Motorun merkezi ve hızı — kamera, skor ve efektler için.
    cx: function () { return (this.rear.x + this.front.x) * 0.5; },
    cy: function () { return (this.rear.y + this.front.y) * 0.5; },
    vx: function () { return this.rear.x - this.rear.px; },
    speed: function (dt) {
      const c = this.rear;
      return M.dist(0, 0, c.x - c.px, c.y - c.py) / dt;
    },

    // ---------- ADIM ----------
    step: function (dt, input, terrain) {
      const parts = this.parts;
      const prevAngle = this.angle;

      // --- kuvvetler ---
      for (let i = 0; i < parts.length; i++) {
        parts[i].ax = 0;
        parts[i].ay = T.gravity;
      }

      const axLen = M.dist(this.rear.x, this.rear.y, this.front.x, this.front.y) || 1;
      const axX = (this.front.x - this.rear.x) / axLen;
      const axY = (this.front.y - this.rear.y) / axLen;
      // Eksene dik yön: motor düzken (1,0) → (0,1), yani aşağı. Buruna aşağı
      // kuvvet = frontflip yönü.
      const perpX = -axY, perpY = axX;

      const rearGround = this.rear.onGround;
      const anyGround = rearGround || this.front.onGround;
      this.airborne = !anyGround;

      if (!this.crashed) {
        // Gaz: arka tekerleğe zemin teğeti boyunca itiş + hafif wheelie torku.
        if (input.throttle) {
          this.engineOn = true;
          if (rearGround) {
            const s = terrain.slopeAt(this.rear.x);
            this.rear.ax += Math.cos(s) * T.engineForce;
            this.rear.ay += Math.sin(s) * T.engineForce;
            // Arka tekerdeki tork motoru geriye yatırır — wheelie kendiliğinden
            // gelir. Hız arttıkça zayıflar, yoksa motor sürekli geriye takla atar.
            const spd = Math.abs(this.vx()) / dt;
            const fade = M.clamp(1 - spd / T.maxSpeed, 0.2, 1);
            this.applyTorque(-T.engineWheelieTorque * fade, perpX, perpY);
          } else {
            // Havada gaz = tekerlek atalet momenti → motor geriye döner (backflip yardımı).
            this.applyTorque(-T.airLeanTorque * 0.22, perpX, perpY);
          }
        } else {
          this.engineOn = false;
        }

        // Fren: teğet hızı söndürür, motoru öne yatırır (stoppie).
        if (input.brake) {
          if (anyGround) {
            this.damp(this.rear, T.brakeForce * dt * 0.0016);
            this.damp(this.front, T.brakeForce * dt * 0.0016);
            this.applyTorque(T.engineWheelieTorque * 0.5, perpX, perpY);
            // Neredeyse durduysa hafif geri git — takılan yerden kurtulmak için.
            if (Math.abs(this.vx()) < 0.05) {
              this.rear.ax -= T.reverseForce;
              this.front.ax -= T.reverseForce;
            }
          } else {
            this.applyTorque(T.airLeanTorque * 0.22, perpX, perpY);
          }
        }

        // Yatırma: havada güçlü, yerde ağırlık kaydırma seviyesinde.
        // Havada dönüş hızı sınırlıdır — yoksa tuşu basılı tutmak motoru
        // kontrolsüz bir çıkrığa çevirir ve takla saymak anlamsızlaşır.
        const leanPower = this.airborne ? T.airLeanTorque : T.groundLeanTorque;
        const spinOk = function (dir) {
          return !this.airborne || Math.abs(this.spin) < T.maxAirSpin ||
            M.sign(this.spin) !== dir;
        }.bind(this);
        if (input.leanBack && spinOk(-1)) this.applyTorque(-leanPower, perpX, perpY);
        if (input.leanFwd && spinOk(1)) this.applyTorque(leanPower, perpX, perpY);

        // Yerde ve elin yatırmada değilse motor kendini zemine doğrultur.
        // Oynanışı affedici kılan asıl yardım bu — olmadan gaz açan herkes
        // sırtüstü takla atarak düşer.
        if (anyGround && !input.leanBack && !input.leanFwd) {
          const rel = M.wrapAngle(this.angle - terrain.slopeAt(this.cx()));
          if (Math.abs(rel) < 1.15) {
            this.applyTorque(M.clamp(-rel * T.stabilizeTorque, -600, 600), perpX, perpY);
          }
        }
      }

      // --- integrasyon (Verlet) ---
      const damp = this.airborne ? T.airDrag : T.rollFriction;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const vx = (p.x - p.px) * damp;
        const vy = (p.y - p.py) * damp;
        p.px = p.x; p.py = p.y;
        p.x += vx + p.ax * p.im * dt * dt;
        p.y += vy + p.ay * p.im * dt * dt;
      }

      // --- kısıtlar ---
      for (let it = 0; it < 7; it++) this.solveConstraints();

      // --- zemin ---
      this.rear.onGround = false;
      this.front.onGround = false;
      this.collideWheel(this.rear, dt, terrain);
      this.collideWheel(this.front, dt, terrain);
      this.collideBody(this.chassis, dt, terrain, 2.6, 'chassis');
      this.collideBody(this.rider, dt, terrain, 2.2, 'rider');

      // --- hız sınırı ---
      const vlim = T.maxSpeed * dt;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const dx = p.x - p.px;
        if (dx > vlim) p.px = p.x - vlim;
      }

      // --- açı ve birikimli dönüş ---
      this.angle = Math.atan2(this.front.y - this.rear.y, this.front.x - this.rear.x);
      const dAngle = M.wrapAngle(this.angle - prevAngle);
      this.rot += dAngle;
      this.spin = dAngle / dt;   // açısal hız (rad/sn)

      if (this.airborne) {
        if (this.airTime === 0) this.rotAtTakeoff = this.rot;   // kalkış anı
        this.airTime += dt; this.groundTime = 0;
      } else {
        this.groundTime += dt; this.airTime = 0;
      }

      // Tekerlek görsel dönüşü — yerde mesafeye, havada gaza göre.
      const travel = this.rear.x - this.rear.px;
      this.wheelSpin += (anyGround ? travel / T.wheelRadius
        : (this.engineOn ? 0.9 : travel / T.wheelRadius * 0.3));
    },

    // Eksene dik zıt kuvvetler = saf tork.
    applyTorque: function (amount, perpX, perpY) {
      this.front.ax += perpX * amount;
      this.front.ay += perpY * amount;
      this.rear.ax -= perpX * amount;
      this.rear.ay -= perpY * amount;
    },

    damp: function (p, k) {
      k = M.clamp(k, 0, 0.9);
      p.px += (p.x - p.px) * k;
      p.py += (p.y - p.py) * k;
    },

    solveConstraints: function () {
      const cs = this.constraints;
      for (let i = 0; i < cs.length; i++) {
        const c = cs[i], a = c.a, b = c.b;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        const diff = (d - c.len) / d * c.stiff;
        const wsum = a.im + b.im;
        const ka = a.im / wsum, kb = b.im / wsum;
        a.x += dx * diff * ka; a.y += dy * diff * ka;
        b.x -= dx * diff * kb; b.y -= dy * diff * kb;
      }
    },

    collideWheel: function (w, dt, terrain) {
      const r = T.wheelRadius;
      const gy = terrain.heightAt(w.x);
      const pen = (w.y + r) - gy;
      if (pen <= 0) return;

      const s = terrain.slopeAt(w.x);
      const nx = Math.sin(s), ny = -Math.cos(s);
      const push = pen * Math.cos(s);

      w.x += nx * push;
      w.y += ny * push;
      w.onGround = true;

      // Hızı normal / teğet bileşenlerine ayır.
      let vx = w.x - w.px, vy = w.y - w.py;
      const vn = vx * nx + vy * ny;
      const tx = -ny, ty = nx;
      const vt = vx * tx + vy * ty;

      const impact = -vn / dt;
      if (vn < 0) {
        // Zemine giren bileşeni sektir (çoğunu yut — süspansiyon hissi).
        const newVn = -vn * T.bounce;
        vx = tx * vt + nx * newVn;
        vy = ty * vt + ny * newVn;
        if (impact > this.lastImpact) this.lastImpact = impact;
      } else {
        vx = tx * vt + nx * vn;
        vy = ty * vt + ny * vn;
      }

      // Yanal tutuş: teğet dışı kaymayı emer.
      w.px = w.x - vx;
      w.py = w.y - vy;

      if (this.crashed) return;

      // --- kaza kontrolleri ---
      const diff = Math.abs(M.wrapAngle(this.angle - s));
      if (diff > T.crashAngle && impact > T.crashSpeed) {
        this.crash('SERT İNİŞ');
        return;
      }
      // Dik duvara toslamak.
      if (Math.abs(s) > 0.95 && impact > T.crashSpeed * 1.8) {
        this.crash('DUVARA ÇARPTIN');
        return;
      }
      // Tolerans içindeki inişte motoru zemine nazikçe hizala — affedicilik.
      if (diff < T.landAlignTolerance) {
        const corr = M.wrapAngle(s - this.angle);
        const axLen = M.dist(this.rear.x, this.rear.y, this.front.x, this.front.y) || 1;
        const px = -(this.front.y - this.rear.y) / axLen;
        const py = (this.front.x - this.rear.x) / axLen;
        const k = corr * 0.5;
        this.front.x += px * k; this.front.y += py * k;
        this.rear.x -= px * k; this.rear.y -= py * k;
      }
    },

    // Kadro / sürücü zemine değerse: kaza.
    collideBody: function (p, dt, terrain, r, what) {
      const gy = terrain.heightAt(p.x);
      const pen = (p.y + r) - gy;
      if (pen <= 0) return;
      p.y -= pen;
      const impact = -(p.y - p.py) / dt;
      // Sürtünerek geçen bir temas kaza değil. Kaza iki durumda olur:
      // sert çarpma, ya da motorun zemine göre gerçekten devrilmiş olması.
      // İkincisi olmazsa motor ters dönmüş halde yerde sürünür ve oyuncu
      // "takıldın" zaman aşımını beklemek zorunda kalır — kötü his.
      const tipped = Math.abs(M.wrapAngle(this.angle - terrain.slopeAt(this.cx()))) > 1.05;
      if (!this.crashed && (impact > T.crashSpeed * 0.7 || tipped)) {
        this.crash(what === 'rider' ? 'SÜRÜCÜ YERE ÇARPTI' : 'MOTOR TAKLA ATTI');
      }
      // Kaza sonrası gövde yerde sürtsün.
      this.damp(p, 0.4);
    },

    crash: function (reason) {
      if (this.crashed) return;
      this.crashed = true;
      this.crashReason = reason;
    },
  };

  M.bike = bike;

})(window.MOTO);
