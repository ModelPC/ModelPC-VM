# ModelPC VM

[Türkçe](README.md) · [English](README.en.md) · **Dansk**

En SwiftUI-baseret administrator til virtuelle maskiner, der opretter og kører Linux-, Windows 11 ARM- og macOS-maskiner på Mac-computere med Apple Silicon. Den bruger Apples indbyggede **Virtualization.framework**, så der kræves hverken separat hypervisor eller kerneudvidelse.

---

## Funktioner

**Administration af virtuelle maskiner**
- Opret nye VM'er med en guide (styresystem, CPU, RAM, disk, netværk)
- Start, stop, tvungen stop, pause, genoptag, genstart
- Gitter- og listevisning, søgning, kontrolpanel (CPU-, hukommelses-, disk- og netværksforbrug)
- Hurtig adgang fra menulinjen (`MenuBarExtra`)

**Lagring**
- Sparse-diskbilleder; tilføj og fjern flere diske
- NVMe-controller til Windows-startdiske, VirtIO-blokenheder til alt andet
- ISO-filer tilsluttes som USB-masselagerenheder (kompatibelt med Linux- og Windows-installationsprogrammer)
- Opret, gendan og slet snapshots

**ISO-bibliotek**
- Registrér lokale ISO-filer, og tilslut/skub dem ud på VM'er
- Indbygget ISO-downloader
- Registrerer ISO-filer, der ikke er ARM64 (x64/amd64), og advarer før opstart
- Finder automatisk en passende ARM64-ISO i biblioteket, hvis ingen er tilsluttet

**Skærm og konsol**
- Grafisk skærm i et separat konsolvindue (`VZVirtualMachineView`)
- VirtIO GPU (Linux/Windows) og Apples paravirtualiserede GPU (macOS-gæster)
- Forudindstillede opløsninger (720p til 4K, MacBook-skærmstørrelser), to skærme, Retina/HiDPI
- Seriel konsol via `/dev/hvc0` (inklusive Ubuntu Server-installationsprogrammet), VT100-terminalvisning
- Send tastaturgenveje videre til gæsten, zoom, fuld skærm

**Netværk**
- NAT, delt netværk, brokoblet (bridged) netværk eller intet netværk
- Regler for portvideresendelse og netværksdiagnosticering
- Skifter automatisk til NAT, hvis tilladelsen til brokoblet netværk mangler

**Andet**
- Delte mapper via VirtioFS
- Lydudgang, entropienhed, hukommelsesballon
- macOS-notifikationer (VM startet/stoppet, snapshot, lav diskplads)
- Flersproget brugerflade (inklusive tyrkisk), lyst/mørkt/systemtema
- FAQ-sektion

---

## Krav

| | |
|---|---|
| Hardware | Mac med Apple Silicon (M-serien) |
| macOS | 26.6 eller nyere (projektets deployment target) |
| Xcode | 27 |
| Gæstestyresystemer | **ARM64 / AArch64**-versioner (f.eks. Ubuntu 24.04 ARM64, Windows 11 ARM). x64-ISO-filer kører ikke på Apple Silicon. |

---

## Bygning og kørsel

1. Åbn `ModelPC VM.xcodeproj` i Xcode.
2. Vælg dit eget udviklerteam under **Signing & Capabilities**.
3. Vælg skemaet **ModelPC VM** og destinationen **My Mac**, og tryk på `⌘R`.

Det delte skema (`xcshareddata/xcschemes/ModelPC VM.xcscheme`) sætter miljøvariablen `OS_ACTIVITY_MODE=disable` for at skjule harmløse macOS-systemlogs (som `com.apple.linkd.autoShortcut`). Appens egne `print`-udskrifter vises stadig. Vil du se systemlogs igen, så slå den fra under **Product → Scheme → Edit Scheme → Run → Arguments**.

### Tilladelser (entitlements)

| Nøgle | Hvorfor |
|---|---|
| `com.apple.security.virtualization` | Påkrævet for at køre VM'er med Virtualization.framework |
| `com.apple.security.hypervisor` | Adgang til hypervisoren |
| `com.apple.security.network.client` / `.server` | ISO-download, NAT og portvideresendelse |

Brokoblet netværk (`VZBridgedNetworkDeviceAttachment`) kræver desuden tilladelsen `com.apple.vm.networking`, som tildeles af Apple. Uden den bruger appen NAT i stedet.

---

## Opsætning af din første virtuelle maskine

1. Tilføj en ARM64-installations-ISO under **ISO Images**, eller hent en med den indbyggede downloader.
2. Brug **Create New VM** til at vælge styresystem, ressourcer og ISO.
3. Tryk på **Start**; konsolvinduet åbnes automatisk (kan slås fra i indstillingerne).
4. Når installationen er færdig, skubber du ISO-filen ud fra menuen **ISO** i konsollen.

> En VM, hvis disk ikke har noget styresystem installeret og ingen ISO tilsluttet, starter ikke; appen viser i stedet en fejl, der beder dig tilslutte en ISO.

---

## Projektstruktur

```
ModelPC VM/
├── ModelPC_VMApp.swift          # Appens indgang: hovedvindue, konsolvindue, indstillinger, menulinje
├── ContentView.swift
├── Models/                      # VirtualMachine, VMConfiguration, VMDisk, VMSnapshot, ISOImage,
│                                # OSType, PortForwardingRule, VMError, AppLanguage, ...
├── Services/
│   ├── VirtualizationService    # Bygger VZVirtualMachineConfiguration, VM-livscyklus, seriel konsol
│   ├── StorageService           # VM-pakker og sparse-diskbilleder
│   ├── DownloadManagerService   # ISO-download
│   ├── NetworkService           # NAT / brokoblede netværkstilslutninger
│   ├── PortForwardingService
│   ├── NetworkDiagnosticsService
│   ├── SystemMonitorService     # Målinger til kontrolpanelet
│   ├── SecurityBookmarkService  # Sikkerhedsbogmærker til filer uden for sandkassen
│   ├── NotificationService
│   └── LanguageManager          # Oversættelser af brugerfladen
├── ViewModels/
│   ├── VMManagerViewModel       # Appens tilstand og alle VM-handlinger
│   └── CreateVMViewModel
└── Views/
    ├── Dashboard, VMList, VMDetail, CreateVM
    ├── VMConsole                # Konsolvindue og wrapper til VZVirtualMachineView
    ├── ISO, Storage, Snapshots, Network
    ├── Settings, FAQ, MenuBar
    └── Components
```

---

## Kendte begrænsninger

- **Loft over hukommelse og CPU:** For at beskytte værtsmaskinen begrænses en VM's RAM til 3 GB på Mac-computere med 8 GB og til halvdelen af den fysiske hukommelse på større maskiner. Antallet af vCPU'er overstiger aldrig halvdelen af værtens kerner. Windows 11 kræver mindst 4 GB RAM, så på Mac-computere med 8 GB kan installationen være langsom eller slet ikke starte.
- **Kun ARM64-gæster:** x86/x64-styresystemer emuleres ikke.
- **Automatisk skærmtilpasning** er slået fra for Linux- og Windows-gæster; billedet skaleres i stedet til vinduet.

---

## Fejlfinding

| Symptom | Løsning |
|---|---|
| "Intet styresystem på disken og ingen ISO tilsluttet" | Tilslut en ARM64-ISO i VM'ens indstillinger. |
| Fejlen "Architecture mismatch" | ISO-filen er en x64/amd64-version; hent ARM64-versionen. |
| VM'en starter fra ISO'en igen efter installationen | Skub ISO-filen ud fra menuen **ISO** i konsollen. |
| VM'en sidder fast på UEFI-skærmen | Nulstil EFI-variablerne med knappen **NVRAM** i konsollen. |
| Brokoblet netværk virker ikke | Det kræver tilladelsen `com.apple.vm.networking`; ellers bruges NAT. |
| Ingen notifikationer | Tillad dem under Systemindstillinger → Notifikationer → ModelPC VM. |
