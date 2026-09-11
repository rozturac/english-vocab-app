# İngilizce Kelime — Flashcard & Quiz

Türkçe ara seviye öğrenenler için çevrimdışı çalışabilen tek sayfa kelime uygulaması (Vite + React + TypeScript).

## Çalıştırma

```bash
cd /workspace/english-vocab-app
npm install
npm run dev
```

Tarayıcıda Vite’ın yazdığı adresi aç (genelde `http://localhost:5173/`).

Üretim derlemesi:

```bash
npm run build
npm run preview
```

## Özellikler

1. **Kartlar** — EN ↔ TR çevir, örnek cümlede ifade kalın, 🔊 Seslendir (Web Speech API, en-US)
2. **Yazarak quiz** — TR gör, EN yaz (büyük/küçük harf ve noktalama yok sayılır)
3. **Çoktan seçmeli** — 4 seçenek
4. **Dinle** — EN ses, TR seç
5. **Günlük 8 yeni + Leitner tekrar** — progress `localStorage`’da
6. **Gün / tema filtresi**, istatistikler (öğrenilen, vadesi gelen, seri)
7. **Arayüz Türkçe**, mobil uyumlu, kısayollar: Space çevir, Enter onay, 1–4 seçenek

## Veri

- Kaynak: `/workspace/vocab_slim.json` (1221 ifade, gün 1–63)
- Uygulama verisi: `src/data/vocab.json` (`ex` örnek cümleleri dahil)
- Örnek cümleleri yeniden üretmek için: `python3 scripts/generate_examples.py`

## Notlar / sınırlar

- Ses için tarayıcıda `speechSynthesis` gerekir (Chrome/Edge/Safari genelde tamam).
- İlerleme yalnızca bu tarayıcının localStorage’ında tutulur.
- Örnek cümleler script + curated liste ile üretilmiştir; bazı genel kelimelerde şablon tadı kalabilir — `scripts/curated_examples.json` ile iyileştirilebilir.
