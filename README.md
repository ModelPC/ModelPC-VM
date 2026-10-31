# ModelPC VM

Apple Silicon Mac'lerde Linux, Windows 11 ARM ve macOS sanal makineleri oluşturup çalıştırmak için yazılmış, SwiftUI tabanlı bir sanal makine yöneticisi. Apple'ın yerleşik **Virtualization.framework**'ünü kullanır; ayrı bir hipervizör veya çekirdek uzantısı gerektirmez.

---

## Özellikler

**Sanal makine yönetimi**
- Sihirbazla yeni VM oluşturma (işletim sistemi, CPU, RAM, disk, ağ)
- Başlat, durdur, zorla kapat, duraklat, devam ettir, yeniden başlat
- Grid ve liste görünümü, arama, kontrol paneli (CPU, bellek, disk, ağ kullanımı)
- Menü çubuğundan hızlı erişim (`MenuBarExtra`)

**Depolama**
- Seyrek (sparse) disk imajları; birden fazla disk ekleme/kaldırma
- Windows önyükleme diskleri için NVMe denetleyici, diğerleri için VirtIO blok aygıtı
- ISO'lar USB yığın depolama aygıtı olarak takılır (Linux ve Windows kurulum ortamlarıyla uyumlu)
- Anlık görüntü (snapshot) oluşturma, geri yükleme ve silme

**ISO kitaplığı**
- Yerel ISO'ları kaydetme ve VM'lere takma/çıkarma
- Dahili ISO indirici
- ARM64 olmayan (x64/amd64) ISO'ları başlatmadan önce tespit edip uyarma
- ISO takılı değilse kitaplıktan uygun bir ARM64 ISO'yu otomatik bulma

**Görüntü ve konsol**
- Ayrı konsol penceresinde grafik ekran (`VZVirtualMachineView`)
- VirtIO GPU (Linux/Windows) ve Apple paravirtualized GPU (macOS konukları)
- Çözünürlük ön ayarları (720p'den 4K'ya, MacBook ekran boyutları), çift ekran, Retina/HiDPI
- `/dev/hvc0` üzerinden seri konsol (Ubuntu Server kurulum ekranı dahil), VT100 terminal görünümü
- Klavye kısayollarını konuğa yönlendirme, yakınlaştırma, tam ekran

**Ağ**
- NAT, paylaşılan ağ, köprülü (bridged) ağ veya ağsız
- Port yönlendirme kuralları ve ağ tanılama araçları
- Köprülü ağ için gerekli yetki yoksa otomatik olarak NAT'a geri düşer

**Diğer**
- VirtioFS ile paylaşılan klasörler
- Ses çıkışı, entropi aygıtı, bellek balonu (memory balloon)
- macOS bildirimleri (VM başladı/durdu, anlık görüntü, düşük disk alanı)
- Çok dilli arayüz (Türkçe dahil), açık/koyu/sistem teması
- SSS bölümü

---

## Gereksinimler

| | |
|---|---|
| Donanım | Apple Silicon (M serisi) Mac |
| macOS | 26.6 veya üzeri (proje dağıtım hedefi) |
| Xcode | 27 |
| Konuk işletim sistemleri | **ARM64 / AArch64** sürümler (ör. Ubuntu 24.04 ARM64, Windows 11 ARM). x64 ISO'lar Apple Silicon'da çalışmaz. |

---

## Derleme ve çalıştırma

1. `ModelPC VM.xcodeproj` dosyasını Xcode ile açın.
2. **Signing & Capabilities** sekmesinde kendi geliştirici ekibinizi seçin.
3. **ModelPC VM** şemasını ve **My Mac** hedefini seçip `⌘R` ile çalıştırın.

Paylaşılan şema (`xcshareddata/xcschemes/ModelPC VM.xcscheme`), macOS'un sistem kayıtlarını (`com.apple.linkd.autoShortcut` gibi zararsız satırları) gizlemek için `OS_ACTIVITY_MODE=disable` ortam değişkenini ayarlar. Uygulamanın kendi `print` çıktıları görünmeye devam eder. Sistem kayıtlarını görmek isterseniz: **Product → Scheme → Edit Scheme → Run → Arguments** altından kapatın.

### Yetkiler (entitlements)

| Anahtar | Neden |
|---|---|
| `com.apple.security.virtualization` | Virtualization.framework ile VM çalıştırmak için zorunlu |
| `com.apple.security.hypervisor` | Hipervizör erişimi |
| `com.apple.security.network.client` / `.server` | ISO indirme, NAT ve port yönlendirme |

Köprülü ağ (`VZBridgedNetworkDeviceAttachment`) ayrıca Apple'ın verdiği `com.apple.vm.networking` yetkisini ister. Bu yetki yoksa uygulama köprülü ağ yerine NAT kullanır.

---

## İlk sanal makineyi kurma

1. **ISO İmajları** bölümünden bir ARM64 kurulum ISO'su ekleyin ya da indiriciyle indirin.
2. **Yeni VM Oluştur** ile işletim sistemini, kaynakları ve ISO'yu seçin.
3. **Start** ile başlatın; konsol penceresi otomatik açılır (Ayarlar'dan kapatılabilir).
4. Kurulum bittikten sonra ISO'yu konsoldaki **ISO** menüsünden çıkarabilirsiniz.

> Diskinde işletim sistemi kurulu olmayan ve ISO takılı olmayan bir VM başlatılmaz; uygulama bunun yerine ISO takmanızı isteyen bir hata gösterir.

---

## Proje yapısı

```
ModelPC VM/
├── ModelPC_VMApp.swift          # Uygulama girişi: ana pencere, konsol penceresi, Ayarlar, menü çubuğu
├── ContentView.swift
├── Models/                      # VirtualMachine, VMConfiguration, VMDisk, VMSnapshot, ISOImage,
│                                # OSType, PortForwardingRule, VMError, AppLanguage, ...
├── Services/
│   ├── VirtualizationService    # VZVirtualMachineConfiguration oluşturma, VM yaşam döngüsü, seri konsol
│   ├── StorageService           # VM paketleri ve seyrek disk imajları
│   ├── DownloadManagerService   # ISO indirmeleri
│   ├── NetworkService           # NAT / köprülü ağ bağlantıları
│   ├── PortForwardingService
│   ├── NetworkDiagnosticsService
│   ├── SystemMonitorService     # Kontrol paneli metrikleri
│   ├── SecurityBookmarkService  # Sandbox dışı dosyalar için güvenlik yer imleri
│   ├── NotificationService
│   └── LanguageManager          # Arayüz metinlerinin çevirileri
├── ViewModels/
│   ├── VMManagerViewModel       # Uygulama durumu ve tüm VM işlemleri
│   └── CreateVMViewModel
└── Views/
    ├── Dashboard, VMList, VMDetail, CreateVM
    ├── VMConsole                # Konsol penceresi ve VZVirtualMachineView sarmalayıcısı
    ├── ISO, Storage, Snapshots, Network
    ├── Settings, FAQ, MenuBar
    └── Components
```

---

## Bilinen sınırlamalar

- **Bellek ve CPU üst sınırı:** Ana makineyi korumak için VM'e verilen RAM, 8 GB'lık Mac'lerde 3 GB ile, daha büyük Mac'lerde fiziksel belleğin yarısıyla sınırlanır. vCPU sayısı da ana makinedeki çekirdeklerin yarısını geçmez. Windows 11 en az 4 GB RAM istediği için 8 GB'lık Mac'lerde kurulum yavaş olabilir veya başlamayabilir.
- **Yalnızca ARM64 konuklar:** x86/x64 işletim sistemleri emüle edilmez.
- **Otomatik ekran yeniden boyutlandırma** Linux ve Windows konuklarında kapalıdır; görüntü pencereye ölçeklenir.

---

## Sorun giderme

| Belirti | Çözüm |
|---|---|
| "Diskinde işletim sistemi yok ve ISO takılı değil" | VM ayarlarından bir ARM64 ISO takın. |
| "Architecture mismatch" hatası | ISO x64/amd64 sürümü; ARM64 sürümünü indirin. |
| Kurulumdan sonra VM tekrar ISO'dan açılıyor | Konsoldaki **ISO** menüsünden ISO'yu çıkarın. |
| VM UEFI ekranında kalıyor | Konsoldaki **NVRAM** düğmesiyle EFI değişkenlerini sıfırlayın. |
| Köprülü ağ çalışmıyor | `com.apple.vm.networking` yetkisi gerekir; yoksa NAT kullanılır. |
| Bildirim gelmiyor | Sistem Ayarları → Bildirimler → ModelPC VM'de izin verin. |
