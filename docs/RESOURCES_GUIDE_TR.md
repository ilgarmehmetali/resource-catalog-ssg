# Kaynak ve Bilgi Ekleme Rehberi

Kataloğa dosya yüklemek ve bunlara başlık, açıklama ve etiket eklemek için pratik kullanım rehberi.

[English Version](RESOURCES_GUIDE.md)

---

## 1. Dosya Ekleme

Dosyalarınızı `resources/` klasörünün içine koymanız yeterlidir. Dilediğiniz gibi alt klasörler açarak düzenleyebilirsiniz:

```text
resources/
├── dosyam.pdf
├── egitimler/
│   ├── python_temelleri.md
│   └── sistem_semasi.png
```

- **Klasör yapısı** katalogda otomatik olarak gezinme klasörlerine dönüşür.
- **Dosya adları** otomatik olarak düzgün başlıklara çevrilir (örn. `python_temelleri.md` dosyasının başlığı `Python Temelleri` olur).
- **Dosya kategorisi ve boyutu** sistem tarafından otomatik belirlenir.

---

## 2. Detaylı Bilgi Ekleme (Başlık, Açıklama, Etiketler)

Bir dosyaya özel başlık, açıklama, etiketler veya yazar eklemek isterseniz:

### Markdown Belgeleri İçin (`.md`)

Dosyanızın en başına `---` arasına şu bilgi bloğunu ekleyin:

```markdown
---
title: Python'a Giriş Rehberi
description: Kurulum ve temel sözdizimini anlatan başlangıç kılavuzu.
tags:
  - python
  - egitim
author: Ayşe Yılmaz
---

# Python'a Giriş Rehberi
İçerik buradan başlar...
```

### Diğer Tüm Dosyalar İçin (`.pdf`, `.png`, `.zip` vb.)

Dosyanızın hemen yanına aynı isimde bir `.meta.yaml` dosyası oluşturun.

Örneğin `dosyam.pdf` için `dosyam.pdf.meta.yaml` dosyası oluşturup içine yazın:

```yaml
title: 2026 Yıllık Finans Raporu
description: Üç aylık gelir özeti ve bilanço tablosu.
tags:
  - finans
  - rapor
author: Mehmet Demir
```

---

## 3. Kullanabileceğiniz Bilgi Alanları

| Alan | Açıklama | Örnek |
|---|---|---|
| `title` | Dosyanın katalogda görünecek ana başlığı | `2026 Yıllık Finans Raporu` |
| `description` | Kartta ve arama sonuçlarında gösterilecek kısa özet | `Üç aylık gelir özeti ve bilanço tablosu.` |
| `tags` | Dosyanın kolay filtrelenmesini ve bulunmasını sağlayan etiketler | `[finans, rapor]` |
| `author` | Dosyayı hazırlayan kişi veya katkıda bulunan | `Ayşe Yılmaz` |

Tüm alanlar isteğe bağlıdır.

---

## 4. Klasöre Tanıtım Metni Ekleme (İsteğe Bağlı)

Bir klasörün sayfasının en üstüne tanıtım yazısı veya özel başlık eklemek için:

- **Klasör Notları**: Klasörün içine bir `README.md` dosyası koyun. Bu dosyadaki yazı, klasör sayfasının en üstünde görünür.
- **Klasör Başlığı**: Klasörün içine bir `_meta.yaml` dosyası koyun:
  ```yaml
  title: Geliştirici Kılavuzları
  description: Yazılımcılar için kurulum ve entegrasyon notları.
  ```




