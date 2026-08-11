'use strict';
/* ============================================================
   PİXEL MOTOR — giriş
   Çoklu dokunma (gaz + yatırma AYNI ANDA basılabilmeli) ve klavye.
   ============================================================ */

(function (M) {

  const state = {
    throttle: false,
    brake: false,
    leanBack: false,   // geri yatır → backflip yönü
    leanFwd: false,    // ileri yatır → frontflip yönü
    restart: false,    // tek karelik tetik
    anyPress: false,   // menüden çıkış için "herhangi bir tuş"
  };

  // Her buton kendi aktif pointer kümesini tutar; bir parmak bırakılınca
  // diğer parmakların bastığı butonlar etkilenmez.
  const pointerOwners = new Map(); // pointerId -> flag adı

  function bindButton(el, flag) {
    if (!el) return;

    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      pointerOwners.set(e.pointerId, flag);
      state[flag] = true;
      state.anyPress = true;
      el.classList.add('held');
      if (el.setPointerCapture) {
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* yoksay */ }
      }
    });

    const release = function (e) {
      if (pointerOwners.get(e.pointerId) !== flag) return;
      pointerOwners.delete(e.pointerId);
      // Aynı flag'i tutan başka parmak varsa basılı kalsın.
      let stillHeld = false;
      pointerOwners.forEach(function (f) { if (f === flag) stillHeld = true; });
      state[flag] = stillHeld;
      if (!stillHeld) el.classList.remove('held');
    };

    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('lostpointercapture', release);
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  const KEYS = {
    ArrowUp: 'throttle', KeyW: 'throttle', Space: 'throttle',
    ArrowDown: 'brake', KeyS: 'brake',
    ArrowLeft: 'leanBack', KeyA: 'leanBack',
    ArrowRight: 'leanFwd', KeyD: 'leanFwd',
  };

  function onKey(down) {
    return function (e) {
      if (e.code === 'KeyR') {
        if (down) state.restart = true;
        return;
      }
      const flag = KEYS[e.code];
      if (!flag) return;
      e.preventDefault();
      state[flag] = down;
      if (down) state.anyPress = true;
    };
  }

  M.input = {
    state: state,

    init: function () {
      bindButton(document.getElementById('btn-lean-back'), 'leanBack');
      bindButton(document.getElementById('btn-lean-fwd'), 'leanFwd');
      bindButton(document.getElementById('btn-gas'), 'throttle');
      bindButton(document.getElementById('btn-brake'), 'brake');

      window.addEventListener('keydown', onKey(true));
      window.addEventListener('keyup', onKey(false));

      // Sekme değişince tuşlar takılı kalmasın.
      window.addEventListener('blur', function () {
        state.throttle = state.brake = state.leanBack = state.leanFwd = false;
        pointerOwners.clear();
        document.querySelectorAll('.pad.held').forEach(function (el) {
          el.classList.remove('held');
        });
      });

      // Sayfanın kaymasını / çift dokunma zoom'unu engelle.
      document.addEventListener('touchmove', function (e) {
        if (e.cancelable) e.preventDefault();
      }, { passive: false });
      document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    },

    // Kare sonunda tek seferlik tetikleri temizle.
    endFrame: function () {
      state.restart = false;
      state.anyPress = false;
    },
  };

})(window.MOTO);
