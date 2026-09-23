# Kaynaklar ve Meta Veri Kılavuzu

Bu kılavuz, dosyalarınızı `resources/` dizini altında nasıl organize edeceğinizi ve yalın **YAML** kullanarak nasıl meta veri (metadata) ekleyeceğinizi açıklar.

[English Version](RESOURCES_GUIDE.md)

---

## 1. Dizin Yapısı

Dosyalarınızı `resources/` dizini içinde dilediğiniz derinlikte iç içe klasörlerde düzenleyebilirsiniz. Statik site üreteci, bu klasör hiyerarşisini web arayüzünde otomatik olarak yansıtır.

```text
resources/
├── README.md                          <-- (İsteğe bağlı) Tüm kataloğun genel tanıtımı
├── documents/
│   ├── README.md                      <-- (İsteğe bağlı) Bu klasöre özel açıklama
│   ├── _meta.yaml                     <-- (İsteğe bağlı) Klasör düzeyinde meta veri
│   ├── cheatsheet.txt
│   ├── cheatsheet.txt.meta.yaml       <-- (İsteğe bağlı) cheatsheet.txt için yardımcı meta veri dosyası
│   └── tutorials/
│       ├── getting-started.md         <-- YAML frontmatter içeren Markdown belgesi
│       └── deep_dive/                 <-- Derin iç içe alt klasör
│           └── notes.pdf
└── media/
    ├── diagram.svg
    └── diagram.svg.meta.yaml
```

---

## 2. Otomatik Çıkarılan Varsayılan Meta Veriler

Herhangi bir meta veri dosyası eklemeseniz dahi, üreteç şu bilgileri otomatik olarak tespit eder:
- **Başlık (Title)**: Dosya adından temizlenerek otomatik oluşturulur.
  - Örnek: `benim-harika_notlarim.pdf` dosyası `Benim Harika Notlarim` haline gelir.
- **Kategori (Category)**: Dosya uzantısından otomatik belirlenir (`document`, `markdown`, `image`, `video`, `audio`, `code`, `archive`, `data` veya `other`).
- **Dosya Boyutu (File Size)**: Bayt cinsinden okunur ve okunabilir birimlere dönüştürülür (örn. `14.2 KB`, `3.5 MB`).
- **Son Düzenleme Tarihi (Last Modified Date)**: ISO-8601 UTC biçiminde kaydedilir.
- **Klasör Yolu (Folder Path)**: `resources/` köküne göre göreli konumu otomatik olarak işlenir.

---

## 3. Klasör Düzeyinde Meta Veriler

### Klasör Tanıtımı (`README.md` veya `index.md`)
Herhangi bir klasörün içine `README.md` veya `index.md` koyabilirsiniz. Üreteç, bu markdown içeriğini web kataloğunda ilgili klasörün en üstünde şık bir tanıtım alanı olarak gösterir.

### Klasör Meta Verisi (`_meta.yaml`)
Bir klasörün görünen başlığını veya kısa açıklamasını özelleştirmek için klasöre bir `_meta.yaml` dosyası ekleyin:

```yaml
title: Tasarım Varlıkları ve Marka Rehberi
description: Web ve baskı için logolar, renk paletleri ve marka kuralları.
tags:
  - tasarim
  - marka
```

---

## 4. Dosya Düzeyinde Meta Veriler

### Seçenek A: Yardımcı (Sidecar) Meta Veri Dosyası (`{dosya_adi}.meta.yaml`)
Markdown olmayan dosyalar için (örn. `.pdf`, `.svg`, `.zip`, `.txt`, `.sh`, `.mp4`), dosya adının sonuna `.meta.yaml` ekleyerek bir yardımcı YAML dosyası oluşturabilirsiniz:

Örneğin `cheatsheet.txt` için `cheatsheet.txt.meta.yaml` oluşturun:
```yaml
title: Linux ve Bash Hızlı Başvuru Kılavuzu
description: Arşivleme, arama ve disk kullanımı için günlük terminal komutları özeti.
tags:
  - linux
  - bash
  - cheatsheet
author: Ayşe Yılmaz
```

### Seçenek B: Markdown Frontmatter
`.md` ve `.markdown` dosyalarında, dosyanın en başına `---` ayraçları arasına doğrudan frontmatter ekleyebilirsiniz:

```markdown
---
title: Modern Git İş Akışları
description: Trunk-based geliştirme ve pull request süreçleri için pratik rehber.
tags:
  - git
  - gelistirme
  - en-iyi-pratikler
author: Adınız Soyadınız
---

# Modern Git İş Akışları

İçerik buradan başlar...
```

---

## 5. Desteklenen Meta Veri Alanları

| Alan | Tür | Açıklama |
|---|---|---|
| `title` | string (metin) | Özel görünen başlık (dosya adı yerine geçer) |
| `description` | string (metin) | Kartlarda ve tabloda gösterilen bir veya iki cümlelik özet |
| `tags` | string listesi | Filtreleme ve arama için kullanılan etiketler/anahtar kelimeler |
| `author` | string (metin) | Yazar veya katkıda bulunan kişinin adı |
| `overview` | markdown metni | Kapsamlı notlar (genellikle `README.md` dosyasından alınır) |

---

## 6. Yoksayılan Dosyalar

Üreteç şu dosyaları katalog listesine almaz ve otomatik olarak atlar:
- Nokta ile başlayan tüm dosya ve dizinler (`.` ile başlayanlar, örn. `.git`, `.DS_Store`).
- Meta veri dosyaları (`_meta.yaml`, `*.meta.yaml`, `_meta.json`, `*.meta.json`).
- Klasör tanıtım dosyaları (`README.md`, `index.md`) klasör meta verisine dahil edildiğinden ayrı birer indirme bağlantısı olarak listelenmez.

