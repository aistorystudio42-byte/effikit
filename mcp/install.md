# Effikit MCP — 10 Araç İçin Hazır Kurulum

Bu dosya, Effikit MCP server'ı en bilinen **10 AI kodlama aracına** bağlamak için
hazır, kopyalanabilir config bloklarını içerir. Hangi aracı kullanırsan kullan,
ilgili bloğu al, dosyana yapıştır, yolu düzelt, IDE'ni yeniden başlat.

---

## Önce: bir kere bağımlılıkları kur

```bash
cd <EFFIKIT>/mcp
npm install
```

`<EFFIKIT>` = effikit deposunun makinendeki tam yolu.
Örnek (Windows): `C:/Users/RAMAZAN/Desktop/effikit`
Örnek (macOS/Linux): `/Users/sen/effikit`

> **Yol kuralı:** Windows'ta bile JSON içinde **ileri eğik çizgi (`/`)** kullan.
> Ters eğik çizgi (`\`) JSON'da kaçış karakteridir ve hata verir.

---

## Config formatı — 3 aile

10 aracın tamamı aynı server'ı çalıştırır; yalnızca JSON'un **kök anahtarı** ve
**dosya konumu** değişir. Üç aile var:

| Aile | Kök anahtar | Araçlar |
|------|-------------|---------|
| A | `mcpServers` | Claude Code, Claude Desktop, Cursor, Windsurf, Antigravity, Cline, Roo Code, Gemini CLI |
| B | `servers` | VS Code (Copilot) |
| C | `context_servers` | Zed |

---

## 1 · Claude Code

**Dosya:** proje kökünde `.mcp.json` (veya `claude mcp add` komutu)

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

---

## 2 · Claude Desktop

**Dosya:**
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

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

---

## 3 · Cursor

**Dosya:** proje için `.cursor/mcp.json`, global için `~/.cursor/mcp.json`

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

---

## 4 · Windsurf

**Dosya:**
- Windows: `%USERPROFILE%\.codeium\windsurf\mcp_config.json`
- macOS/Linux: `~/.codeium/windsurf/mcp_config.json`

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

---

## 5 · Google Antigravity

**Dosya:** `~/.gemini/config/mcp_config.json`
(IDE içinde: Settings → Customizations → Open MCP Config)

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

---

## 6 · VS Code (GitHub Copilot)

**Dosya:** proje için `.vscode/mcp.json`
> Dikkat: kök anahtar `servers` (mcpServers DEĞİL).

```json
{
  "servers": {
    "effikit": {
      "command": "npx",
      "args": ["tsx", "<EFFIKIT>/mcp/server.ts"]
    }
  }
}
```

---

## 7 · Zed

**Dosya:** `~/.config/zed/settings.json`
> Dikkat: kök anahtar `context_servers` ve `command` iç içe bir nesnedir.

```json
{
  "context_servers": {
    "effikit": {
      "command": {
        "path": "npx",
        "args": ["tsx", "<EFFIKIT>/mcp/server.ts"]
      }
    }
  }
}
```

---

## 8 · Cline (VS Code eklentisi)

**Dosya:** VS Code içinde Cline → MCP Servers → Configure
(`cline_mcp_settings.json`)

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

---

## 9 · Roo Code (VS Code eklentisi)

**Dosya:** Roo Code → MCP → Edit Global MCP (`mcp_settings.json`)

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

---

## 10 · Gemini CLI

**Dosya:** `~/.gemini/settings.json`

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

---

## Kurulumu doğrula

IDE'ni yeniden başlat ve AI'ya sor:

> "effikit_stats çağır"

Şunu görürsen çalışıyor:

```
Toplam 241 dosya, 1461 benzersiz keyword
```

Sonra gerçek test:

> "Effikit'i kullanarak JWT oturum yönetimi için ne önerirsin?"

`craft/auth/auth.token.ts`'i %100 alaka ile öne çıkarmalı.

---

## AI'yı effikit-önce çalışmaya yönlendir

En güçlü etki için, aracın global talimat dosyasına şunu ekle
(Claude için `~/.claude/CLAUDE.md`, Cursor için `.cursor/rules`, vb.):

```markdown
## Effikit Önce
Her kodlama görevinden önce `effikit_navigate` çağır.
Bir özelliğin tamamını inşa edeceksen `effikit_blueprint` kullan.
Önerilen dosyayı `effikit_read` ile oku ve projeye uyarla.
Sıfırdan yazmadan önce daima effikit'e bak.
```

---

## Sorun giderme

| Belirti | Çözüm |
|---------|-------|
| "command not found: npx" | Node.js kurulu mu? `node --version` ≥ 18 olmalı. |
| Server başlamıyor | `<EFFIKIT>/mcp` içinde `npm install` çalıştırdın mı? |
| "navigation.md bulunamadı" | `<EFFIKIT>` yolu yanlış. Effikit kökünü işaret etmeli. |
| JSON hatası | Windows yolunda `\` yerine `/` kullandığından emin ol. |
| Araç server'ı görmüyor | Doğru kök anahtarı mı? (VS Code=`servers`, Zed=`context_servers`) |
