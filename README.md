# 🏍️ PİXEL MOTOR — Emiran Edition

**[`moto/`](moto/) klasöründe** — 2D, mobil, retro piksel akrobasi motor oyunu.
Yatay ekranda oynanır, sonsuz prosedürel arazi, her akrobasi puan kazandırır.

| Kontrol | Mobil | Klavye |
|---|---|---|
| Gaz | Sağ alt **GAZ** | ↑ / W |
| Fren | Sağ alt **FREN** | ↓ / S |
| Geri yatır (backflip) | Sol alt **◀** | ← / A |
| İleri yatır (frontflip) | Sol alt **▶** | → / D |
| Yeniden başla | — | R |

Gaz ve yatırma **aynı anda** basılabilir (çoklu dokunma).

### Puanlama

Havada kazanılan puanlar bir **kombo havuzunda** birikir ve her akrobaside
çarpan büyür. **Temiz iniş** havuzu bankaya yazar, **kaza** havuzu yakar —
banka skoru korunur. Risk/ödül dengesi buradan doğar.

| Akrobasi | Puan |
|---|---|
| Backflip | 1000 (double ×2, triple ×3…) |
| Frontflip | 1500 |
| Hava süresi | 150/sn |
| Büyük hava (120 px+) | +500 |
| Wheelie / Stoppie | 100 / 200 per sn |
| Mükemmel iniş (±10°) | Kombo ×1.5 |

Kaza edince skor sıfırlanmaz; son kontrol noktasından devam edilir. Rekor
tarayıcıda saklanır. Aynı yerde üst üste kaza olursa oyun seni engelin
ötesine taşır — takılıp kalmak yok.

### Teknik

Saf HTML/CSS/JS + Canvas, build yok. Fizik: Verlet parçacık + kısıt gevşetme
(2 tekerlek + kadro + sürücü), 240 Hz sabit adım. Çizim, ekrana **tam sayı**
oranda büyütülen düşük çözünürlüklü bir tampona yapılır — piksel kırılmaları
bu yüzden keskin. Kaynak dosyalar `moto/src/` altında modüllere ayrılmıştır
(`core`, `input`, `terrain`, `bike`, `ragdoll`, `tricks`, `fx`, `render`, `main`).

> Sıradaki aşamalar: kasa açılımı, motor/sürücü renk ve skin değişimi,
> skorboard, ses efektleri.

---

# 🔪 ARAMIZDA — Emiran Edition

Web tabanlı, mobil uyumlu, Among Us tarzı sosyal dedüksiyon oyunu.
Sunucu gerektirmez — oda kuran oyuncunun telefonu host olur (PeerJS / WebRTC).
Herkes kendi telefonundan, kendi internetiyle (4G/5G/WiFi fark etmez) oynar.

## 🎮 Nasıl Oynanır

1. Oyun linkini aç, adını yaz, skinini seç
2. **Oda Kur** → sana 5 haneli bir oda kodu verilir
3. **Davet Linkini Kopyala** ile arkadaşlarına at (WhatsApp vs.)
4. Arkadaşların linke girip **Katıl** der — kod otomatik dolu gelir
5. Host **Oyunu Başlat** der. En az 2 (test), ideali 4+ oyuncu. 7+ kişide 2 impostor.

## 🧑‍🚀 Roller

| Rol | Güç |
|---|---|
| 👨‍🚀 Mürettebat | Görevleri bitir, impostoru bul |
| 🔪 Impostor | Öldür, vent kullan, sabotaj yap (ışıklar / reaktör) |
| 💉 Doktor | Taze cesetleri diriltebilir (1 kez, 30 sn içinde) |
| 🔫 Şerif | 1 kurşunu var — impostoru vurursa ölür, yanlış kişiyi vurursa KENDİSİ ölür |

## ✨ Özellikler

- 14 odalı gemi haritası, görüş karartması (impostor daha uzağı görür)
- 5 tip mini oyun görevi: kablolar, veri indirme, şifreli kod, yakıt, asteroit
- Ceset raporu + acil toplantı + sohbetli oylama + fırlatma
- Hayalet modu: ölüler görevlerine devam eder, kendi aralarında konuşur
- Sabotajlar: ışıkları kapatma, reaktör krizi (süre dolarsa impostor kazanır)
- Vent sistemi (3 tünel grubu)
- Sanal joystick (mobil) + WASD (bilgisayar)
- Arkadaş yüzlerinden özel skinler 😄

## 🚀 Yayınlama (GitHub Pages)

1. GitHub'da repo → **Settings** → **Pages**
2. Source: **Deploy from a branch** → branch'i seç → **/ (root)** → Save
3. 1-2 dakika sonra `https://KULLANICIADI.github.io/REPOADI/` adresinde canlı

> Not: Repo private ise GitHub Pages için ücretli plan gerekir; ücretsizde
> repo public olmalı. Fotoğrafları herkese açık yapmak istemiyorsan
> `assets/skins/` içindeki dosyaları emoji skinlerle değiştirebilirsin.

## 🛠️ Teknik

- Saf HTML/CSS/JS + Canvas — framework yok, build yok
- Multiplayer: [PeerJS](https://peerjs.com) (repoda gömülü, `lib/`) — WebRTC P2P,
  ücretsiz public sinyal sunucusu, oyun verisi telefonlar arasında direkt akar
- Host-otoriter mimari: oda kuran oyuncu tüm oyun mantığını yürütür
