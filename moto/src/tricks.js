'use strict';
/* ============================================================
   PİXEL MOTOR — akrobasi ve kombo
   Havada kazanılan puan "bekleyen havuz"da toplanır ve çarpan büyür.
   Temiz iniş → havuz bankaya yazılır. Kaza → havuz kaybedilir.
   ============================================================ */

(function (M) {

  const TAU = Math.PI * 2;

  const P = {
    flipBack: 1000,
    flipFront: 1500,
    airPerSec: 150,
    bigAir: 500,
    wheeliePerSec: 100,
    stoppiePerSec: 200,
    perfectLandMul: 1.5,
  };

  const tricks = {
    score: 0,
    pending: 0,
    multiplier: 0,
    best: 0,
    distance: 0,

    _wasAir: false,
    _rotStart: 0,
    _flips: 0,
    _bigAirDone: false,
    _maxHeight: 0,
    _wheelieTime: 0,
    _stoppieTime: 0,
    _lastFlipText: '',

    reset: function () {
      this.score = 0;
      this.pending = 0;
      this.multiplier = 0;
      this.distance = 0;
      this._wasAir = false;
      this._flips = 0;
      this._bigAirDone = false;
      this._maxHeight = 0;
      this._wheelieTime = 0;
      this._stoppieTime = 0;
      this.best = parseInt(localStorage.getItem('moto_best') || '0', 10) || 0;
    },

    add: function (points, label, color) {
      this.pending += points;
      this.multiplier++;
      if (label) M.fx.popup(label, color || M.PAL.gold);
    },

    // Temiz iniş: havuz çarpanla bankaya yazılır.
    bank: function (perfect) {
      if (this.pending <= 0) { this.multiplier = 0; return 0; }
      const mul = Math.max(1, this.multiplier) * (perfect ? P.perfectLandMul : 1);
      const gained = Math.round(this.pending * mul);
      this.score += gained;
      if (this.multiplier > 1 || perfect) {
        M.fx.popup(
          (perfect ? 'MÜKEMMEL İNİŞ ' : '') + '+' + gained + ' (x' + (Math.round(mul * 10) / 10) + ')',
          perfect ? M.PAL.white : M.PAL.gold
        );
      } else {
        M.fx.popup('+' + gained, M.PAL.white);
      }
      this.pending = 0;
      this.multiplier = 0;
      return gained;
    },

    // Kaza: bekleyen havuz yanar, banka skoru korunur.
    wipe: function () {
      if (this.pending > 0) M.fx.popup('KOMBO YANDI', M.PAL.danger);
      this.pending = 0;
      this.multiplier = 0;
      this.saveBest();
    },

    saveBest: function () {
      if (this.score > this.best) {
        this.best = this.score;
        try { localStorage.setItem('moto_best', String(this.best)); } catch (e) { /* yoksay */ }
      }
    },

    update: function (dt, bike, terrain) {
      this.distance = Math.max(this.distance, (bike.cx() - 0) / 10);

      // Engebeli zeminde tekerlek sürekli bir an havalanır. Gerçek bir uçuş
      // saymak için eşik koy — yoksa her tümsek "iniş" popup'ı üretir.
      const air = bike.airborne && !bike.crashed && bike.airTime > 0.12;

      if (air) {
        if (!this._wasAir) {
          // Kalkış anı: dönüş sayacını uçuşun başladığı açıdan başlat.
          this._rotStart = bike.rotAtTakeoff;
          this._flips = 0;
          this._bigAirDone = false;
          this._maxHeight = 0;
        }

        // Hava süresi puanı.
        this.pending += P.airPerSec * dt;

        // Zeminden yükseklik.
        const h = terrain.heightAt(bike.cx()) - bike.cy();
        if (h > this._maxHeight) this._maxHeight = h;
        if (!this._bigAirDone && h > 120) {
          this._bigAirDone = true;
          this.add(P.bigAir, 'BÜYÜK HAVA!', M.PAL.white);
        }

        // Takla sayımı: birikimli dönüş her tam turda bir akrobasi.
        const delta = bike.rot - this._rotStart;
        const done = Math.floor(Math.abs(delta) / TAU + 0.028); // 350°'de say
        if (done > this._flips) {
          const backflip = delta < 0;   // y aşağı: negatif dönüş = burun yukarı
          const n = done;
          const names = ['', '', 'DOUBLE ', 'TRIPLE ', 'QUAD ', 'ÇILGIN '];
          const prefix = n < names.length ? names[n] : (n + 'x ');
          const label = prefix + (backflip ? 'BACKFLIP!' : 'FRONTFLIP!');
          this._flips = done;
          this.add(backflip ? P.flipBack : P.flipFront, label,
            backflip ? M.PAL.gold : M.PAL.white);
          // Takla tamamlanınca kısa slow-mo — anı hissettir.
          M.fx.slowMo(0.3, 0.32);
        }

        // Slow-mo'yu takla ortasında da hafifçe tetikle (yüksek uçuşlarda).
        if (this._maxHeight > 90 && bike.airTime > 0.5) M.fx.slowMo(0.55, 0.08);

      } else if (!bike.crashed) {
        // --- yerdeki akrobasiler ---
        const rearOnly = bike.rear.onGround && !bike.front.onGround;
        const frontOnly = bike.front.onGround && !bike.rear.onGround;
        const slope = terrain.slopeAt(bike.cx());
        const rel = M.wrapAngle(bike.angle - slope);

        if (rearOnly && rel < -0.31) {
          this._wheelieTime += dt;
          this.pending += P.wheeliePerSec * dt;
          if (this._wheelieTime > 0.8 && this.multiplier === 0) {
            this.multiplier = 1;
            M.fx.popup('WHEELIE', M.PAL.gold);
          }
        } else if (this._wheelieTime > 0) {
          this._wheelieTime = 0;
          if (this.pending > 60 && !bike.airborne) this.bank(false);
        }

        if (frontOnly && rel > 0.31) {
          this._stoppieTime += dt;
          this.pending += P.stoppiePerSec * dt;
          if (this._stoppieTime > 0.5 && this.multiplier === 0) {
            this.multiplier = 1;
            M.fx.popup('STOPPIE', M.PAL.gold);
          }
        } else if (this._stoppieTime > 0) {
          this._stoppieTime = 0;
          if (this.pending > 60 && !bike.airborne) this.bank(false);
        }
      }

      // İniş anı: havadan yere geçiş.
      if (this._wasAir && !air && !bike.crashed) {
        const slope = terrain.slopeAt(bike.cx());
        const diff = Math.abs(M.wrapAngle(bike.angle - slope));
        const had = this.pending;
        // Kayda değer bir uçuş olmadıysa sessizce yaz — küçük tümsekler
        // "mükemmel iniş" kutlaması hak etmiyor.
        if (had < 60) {
          this.score += Math.round(had);
          this.pending = 0;
          this.multiplier = 0;
        } else {
          this.bank(diff < 0.175);
          M.fx.shake(diff < 0.175 ? 1.5 : 2.5);
        }
        this.saveBest();
      }

      this._wasAir = air;
    },
  };

  M.tricks = tricks;
  M.TRICK_POINTS = P;

})(window.MOTO);
