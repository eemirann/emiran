'use strict';
/* ============================================================
   PİXEL MOTOR — oyun döngüsü ve durum makinesi
   ============================================================ */

(function (M) {

  const PHYS_DT = 1 / 240;   // sabit fizik adımı
  const MAX_FRAME = 0.05;    // sekme arkaplandayken zıplamayı önle

  const game = {
    state: 'ready',          // ready | ride | crash
    acc: 0,
    last: 0,
    crashTimer: 0,
    stuckTimer: 0,
    stuckRefX: 0,
    lastCrashX: -9999,
    repeatCrashes: 0,
    safeX: 0,
    safeScore: 0,
    startX: 0,
    fps: 60,
    _fpsAcc: 0, _fpsN: 0,

    el: {},

    init: function () {
      const canvas = document.getElementById('view');
      M.render.init(canvas);
      M.input.init();

      this.el = {
        score: document.getElementById('hud-score'),
        dist: document.getElementById('hud-dist'),
        best: document.getElementById('hud-best'),
        combo: document.getElementById('hud-combo'),
        overlay: document.getElementById('overlay'),
        overTitle: document.getElementById('over-title'),
        overText: document.getElementById('over-text'),
      };

      M.tricks.reset();
      this.newRun();

      this.last = performance.now();
      requestAnimationFrame(this.frame.bind(this));
    },

    newRun: function () {
      const seed = (Math.random() * 0xffffffff) >>> 0;
      M.terrain.reset(seed);
      M.fx.reset();
      M.ragdoll.clear();
      M.tricks.reset();

      this.startX = 0;
      M.bike.spawnOn(0, M.terrain);
      this.safeX = 0;
      this.safeScore = 0;
      this.lastCrashX = -9999;
      this.repeatCrashes = 0;
      this.stuckTimer = 0;
      this.stuckRefX = 0;
      this.state = 'ready';
      this.crashTimer = 0;
      M.render.updateCamera(M.bike, 0, true);
      this.showOverlay('PİXEL MOTOR', 'Başlamak için GAZ\'a bas');
    },

    // Kazadan sonra son güvenli noktadan devam — skor korunur, kombo yanar.
    // Aynı yerde üst üste kaza olursa daha geriden başlat: oyuncuya hız
    // alacak mesafe ver, yoksa aynı rampaya sıfır hızla düşüp sonsuza kadar
    // takılır.
    respawn: function () {
      const back = 16 + Math.min(this.repeatCrashes, 3) * 45;
      let base = Math.max(0, this.safeX - back);
      // İki kez aynı yerde kazandıysa engeli aş: oyuncuyu takıldığı yapının
      // ötesine taşı. Sonsuz "aynı rampada öl" döngüsünün kesin çözümü bu.
      if (this.repeatCrashes >= 2) base = Math.max(base, this.lastCrashX + 70);
      const x = M.terrain.safeSpot(base);
      M.terrain.ensure(x + 900);
      M.bike.spawnOn(x, M.terrain);
      M.ragdoll.clear();
      this.state = 'ride';
      this.crashTimer = 0;
      this.stuckTimer = 0;
      this.stuckRefX = x;
      M.fx.shake(0);
      this.hideOverlay();
      M.render.updateCamera(M.bike, 0, true);
    },

    // Mobilde tam ekran + yatay kilit ancak bir kullanıcı hareketiyle
    // istenebilir. Desteklemeyen tarayıcıda sessizce geçilir.
    goLandscape: function () {
      if (this._triedLock) return;
      this._triedLock = true;
      const el = document.documentElement;
      const lock = function () {
        if (screen.orientation && screen.orientation.lock) {
          const p = screen.orientation.lock('landscape');
          if (p && p.catch) p.catch(function () { /* desteklenmiyor */ });
        }
      };
      try {
        if (el.requestFullscreen) {
          const p = el.requestFullscreen();
          if (p && p.then) p.then(lock).catch(function () { /* yoksay */ });
          else lock();
        } else { lock(); }
      } catch (e) { /* yoksay */ }
    },

    showOverlay: function (title, text, crash) {
      this.el.overTitle.textContent = title;
      this.el.overText.innerHTML = text;
      this.el.overlay.classList.toggle('crash', !!crash);
      this.el.overlay.classList.remove('hidden');
    },
    hideOverlay: function () { this.el.overlay.classList.add('hidden'); },

    // ---------- KARE ----------
    frame: function (now) {
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (!(dt > 0)) dt = 1 / 60;
      if (dt > MAX_FRAME) dt = MAX_FRAME;

      this._fpsAcc += dt; this._fpsN++;
      if (this._fpsAcc > 0.5) {
        this.fps = this._fpsN / this._fpsAcc;
        this._fpsAcc = 0; this._fpsN = 0;
      }

      M.fx.update(dt);
      const simDt = dt * M.fx.timeScale;

      this.update(simDt, dt);
      M.render.draw(this);
      M.input.endFrame();

      requestAnimationFrame(this.frame.bind(this));
    },

    update: function (simDt, realDt) {
      const inp = M.input.state;
      const bike = M.bike;

      if (this.state === 'ready') {
        if (inp.throttle || inp.anyPress) {
          this.state = 'ride';
          this.hideOverlay();
          this.goLandscape();
        }
        M.render.updateCamera(bike, realDt, false);
        return;
      }

      if (inp.restart) { this.newRun(); return; }

      // --- fizik: sabit adım ---
      this.acc += simDt;
      let steps = 0;
      while (this.acc >= PHYS_DT && steps < 40) {
        bike.step(PHYS_DT, this.state === 'ride' ? inp : NO_INPUT, M.terrain);
        M.ragdoll.step(PHYS_DT, M.terrain);
        this.acc -= PHYS_DT;
        steps++;
      }
      if (steps >= 40) this.acc = 0;

      M.terrain.update(bike.cx());

      if (this.state === 'ride') {
        M.tricks.update(simDt, bike, M.terrain);
        this.emitFx(simDt, bike);
        this.trackCheckpoint(bike);
        this.checkStuck(realDt, bike, inp);

        if (bike.crashed) this.onCrash(bike);

      } else if (this.state === 'crash') {
        this.crashTimer += realDt;
        const settled = M.ragdoll.active && M.ragdoll.settled > 0.35;
        if (this.crashTimer > 2.6 || (settled && this.crashTimer > 1.0) ||
            (this.crashTimer > 0.7 && inp.anyPress)) {
          this.respawn();
        }
      }

      M.render.updateCamera(bike, realDt, false);
      this.updateHud();
    },

    onCrash: function (bike) {
      const x = bike.cx();
      this.repeatCrashes = Math.abs(x - this.lastCrashX) < 80 ? this.repeatCrashes + 1 : 0;
      this.lastCrashX = x;
      this.state = 'crash';
      this.crashTimer = 0;
      M.tricks.wipe();
      M.fx.shake(6);
      M.fx.flash(0.5, M.PAL.danger);
      M.fx.slowMo(0.25, 0.5);
      M.fx.debris(bike.cx(), bike.cy(), 14, '#8a8a95');
      M.ragdoll.launch(
        bike.rider.x, bike.rider.y,
        (bike.rider.x - bike.rider.px) * 1.2,
        (bike.rider.y - bike.rider.py) * 1.2,
        1.2
      );
      this.showOverlay('KAZA!', bike.crashReason +
        '<br><span class="sm">Devam etmek için dokun</span>', true);
    },

    // Havada değilken, düz ve dengeli konumdaysa burayı kontrol noktası say.
    trackCheckpoint: function (bike) {
      if (bike.airborne || bike.crashed) return;
      if (bike.groundTime < 0.06) return;
      const slope = M.terrain.slopeAt(bike.cx());
      if (Math.abs(slope) > 0.8) return;
      const rel = Math.abs(M.wrapAngle(bike.angle - slope));
      if (rel > 0.8) return;
      if (bike.cx() > this.safeX) this.safeX = bike.cx();
    },

    // Çukura düşüp duvara yaslanan motor sonsuza kadar orada kalmasın.
    // Anlık hıza bakmak yetmez: yokuşta ileri-geri sallanan motorun hızı
    // yüksektir ama yol almaz. Bu yüzden NET ilerlemeye bakılır.
    checkStuck: function (dt, bike, inp) {
      // Uçurumun dibine indiyse beklemeye gerek yok — anında kaza.
      if (!bike.airborne && M.terrain.inPit(bike.cx())) {
        bike.crash('UÇURUMA DÜŞTÜN');
        return;
      }
      if (!inp.throttle && !inp.brake) { this.stuckTimer = 0; return; }
      const x = bike.cx();
      if (x > this.stuckRefX + 25) {
        this.stuckRefX = x;
        this.stuckTimer = 0;
        return;
      }
      this.stuckTimer += dt;
      if (this.stuckTimer > 3.0) {
        this.stuckTimer = 0;
        this.stuckRefX = x;
        bike.crash('TAKILDIN');
      }
    },

    emitFx: function (dt, bike) {
      const speed = Math.abs(bike.vx()) / PHYS_DT;
      // Tekerlek tozu
      if (bike.rear.onGround && speed > 40 && Math.random() < dt * 55) {
        M.fx.dust(bike.rear.x, bike.rear.y + M.TUNING.wheelRadius, speed, 1);
      }
      if (bike.front.onGround && speed > 90 && Math.random() < dt * 25) {
        M.fx.dust(bike.front.x, bike.front.y + M.TUNING.wheelRadius, speed, 1);
      }
      // Egzoz dumanı
      if (bike.engineOn && Math.random() < dt * 28) {
        M.fx.smoke(bike.rear.x - 3, bike.rear.y - 4);
      }
      // Sert iniş sarsıntısı
      if (bike.lastImpact > 90) {
        M.fx.shake(M.clamp(bike.lastImpact / 90, 1, 5));
        M.fx.dust(bike.rear.x, bike.rear.y + M.TUNING.wheelRadius, 260, 1);
        M.fx.dust(bike.front.x, bike.front.y + M.TUNING.wheelRadius, 260, -1);
      }
      bike.lastImpact = 0;
    },

    updateHud: function () {
      const t = M.tricks;
      this.el.score.textContent = t.score.toLocaleString('tr-TR');
      this.el.dist.textContent = Math.max(0, Math.round(M.bike.cx() / 10)) + ' m';
      this.el.best.textContent = t.best.toLocaleString('tr-TR');
      if (t.pending > 0) {
        this.el.combo.textContent = '+' + Math.round(t.pending) +
          (t.multiplier > 1 ? '  x' + t.multiplier : '');
        this.el.combo.classList.add('on');
      } else {
        this.el.combo.classList.remove('on');
      }
    },
  };

  // Kaza sonrası motora kumanda edilemez.
  const NO_INPUT = { throttle: false, brake: false, leanBack: false, leanFwd: false };

  M.game = game;
  window.addEventListener('load', function () { game.init(); });

})(window.MOTO);
