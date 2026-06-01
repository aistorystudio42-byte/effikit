# Effikit MCP Server

Effikit'i, **MCP konuşan herhangi bir AI'nın** (Claude Code, Claude Desktop, Cursor, VS Code, Windsurf, Zed) akıl yürütebileceği bir **keşif motoruna** dönüştürür.

Artık her projeye `.effikit` klonlamana gerek yok. Bir kere kur — her projede, her IDE'de effikit elinin altında.

---

## Ne Yapar?

Bir kodlama görevine başladığında, AI önce effikit'e sorar: *"bu iş için ne var?"* Server, akademik kalitede, tip-güvenli dosyaları **alaka skoruyla** sıralayıp döndürür. AI sıfırdan yazmak yerine kanıtlanmış koddan başlar.

### 8 Tool

| Tool | Ne zaman çağrılır |
|------|-------------------|
| **`effikit_navigate`** | Her kodlama görevinden **önce**. "Şunu yapacağım" → en alakalı dosyalar. |
| **`effikit_blueprint`** | Bir özelliğin **tamamını** inşa ederken. Katmanlı çok-dosyalı reçete. |
| **`effikit_search`** | Belirli bir keyword/kavram ararken. İsteğe bağlı bölüm filtresi. |
| **`effikit_read`** | Önerilen bir dosyanın tam içeriğini okurken. |
| **`effikit_skill`** | Bir alanda uzman gibi düşünmek gerektiğinde (security, refactoring, persona...). |
| **`effikit_manifest`** | Tüm effikit haritasına genel bakış. |
| **`effikit_stats`** | Kapsam istatistikleri. |
| **`effikit_audit`** | Sağlık denetimi: eksik/bozuk etiketler + Bütünlük Bütçesi (şişen klasörler). |

### İçindeki zekâ

- **Alaka motoru:** BM25-esinli IDF ağırlıklandırma + alan-ağırlıklı keyword eşleşmesi + fuzzy (Levenshtein) tolerans + mutlak skor tabanı.
- **TR↔EN kavram köprüsü:** "oturum" → `session`, "kullanıcı girişi" → `login/auth`. Türkçe görev tanımı doğrudan İngilizce keyword'lere bağlanır.
- **Çok-token cezası:** "fuzzy search" keyword'ünde yalnızca "search" geçen sorgu tam isabet sayılmaz — kısmi kredi alır. Tek yaygın sözcük dosyayı yapay olarak zirveye taşıyamaz.
- **Öz-denetim:** `effikit_audit` tüm depoyu tarayıp etiketi eksik/bozuk dosyaları raporlar. Etiket disiplini geliştiriciye değil, sisteme bağlı — "insan unutur, sistem yakalar".
- **Bütünlük Bütçesi (büyüme koruması):** Bir klasör şişip AI'nın alaka skorunu ve context bütçesini bozma eşiğine gelince sistem dereceli tepki verir: yumuşak eşikte uyarır, sert eşikte (≥7 dosya veya ≥80K karakter) `buildIndex` **build'i reddeder** — bozuk yapıyla effikit çalışmaz. Karar iki sinyalin (dosya sayısı + bağlam ağırlığı) en kötüsüne bakar; salt sayı tavanı değil. Büyüme sınırsız değil, **denetlenir**.

---

## Kurulum

### 1. Bağımlılıkları kur (bir kere)

```bash
cd effikit/mcp
npm install
```

### 2. IDE'ne ekle

10 farklı araç için (Claude Code, Claude Desktop, Cursor, Windsurf, Antigravity,
VS Code, Zed, Cline, Roo Code, Gemini CLI) hazır, kopyalanabilir config blokları
**[install.md](install.md)** içinde. Aracını seç, bloğu al, yolu düzelt.

Hızlı bakış — çoğu araç bu bloğu `mcpServers` altında kullanır:

```json
{
  "mcpServers": {
    "effikit": {
      "command": "npx",
      "args": ["tsx", "<EFFIKIT>/mcp/server.ts"]
    }
  }
}
```

> **İstisnalar:** VS Code kök anahtarı `servers`, Zed ise `context_servers` kullanır
> (ayrıntı [install.md](install.md)'de). `<EFFIKIT>` = effikit'in tam yolu, Windows'ta
> bile `/` ile (ör. `C:/Users/RAMAZAN/Desktop/effikit`). `EFFIKIT_ROOT` ortam
> değişkeniyle override edilebilir; verilmezse server kendi konumundan kökü bulur.

### 3. IDE'ni yeniden başlat

MCP server otomatik ayağa kalkar. stderr'de şunu görürsün:

```
[effikit-mcp] hazır · kök: <EFFIKIT> · 241 dosya indekslendi
```

---

## AI'yı effikit'i kullanmaya yönlendir

En güçlü etkiyi, global yapay zeka talimatına (ör. `~/.claude/CLAUDE.md`) şu kuralı ekleyerek alırsın:

```markdown
## Effikit Önce
Her kodlama görevinden önce `effikit_navigate` tool'unu çağır.
Bir özelliğin tamamını inşa edeceksen `effikit_blueprint` kullan.
Effikit bir dosya önerirse `effikit_read` ile oku ve projeye uyarla —
sıfırdan yazmadan önce daima effikit'e bak.
```

---

## Doğrulama

IDE'nde AI'ya şunu sor:

> "effikit_stats çağır"

`241 dosya, 1461 keyword` ve bölüm dağılımını dönerse server çalışıyor demektir. Ardından:

> "Effikit'i kullanarak JWT oturum yönetimi için ne önerirsin?"

`craft/auth/auth.token.ts`'i %100 alaka ile öne çıkarmalı.

---

## Geliştirme

```bash
npm run dev        # watch modunda server
npm run typecheck  # tip kontrolü
```

Effikit'e yeni dosya eklediğinde server'ı yeniden başlatmana **gerek yok** — `IndexCache`, deponun mtime imzasını izler ve değişiklikte otomatik yeniden tarar.

---

## Mimari

```
mcp/
  server.ts            ← MCP giriş noktası, 7 tool tanımı
  lib/
    types.ts           ← Çekirdek tip sistemi
    tokenizer.ts       ← Normalizasyon + Levenshtein benzerlik
    lexicon.ts         ← TR↔EN + eş anlamlı kavram köprüsü
    indexer.ts         ← Depo tarama + ters indeks + mtime cache
    scorer.ts          ← Çok-sinyalli alaka motoru (IDF, fuzzy, çok-token cezası)
    blueprint.ts       ← Katmanlı çok-dosyalı görev reçeteleri
    presenter.ts       ← AI için ikna edici, gerekçeli sunum
```

Katmanlar tek yönlü bağımlıdır: `server → presenter/blueprint → scorer → indexer/lexicon → tokenizer → types`. Her katman bağımsız test edilebilir.
