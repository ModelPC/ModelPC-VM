# ModelPC VM

[Türkçe](README.md) · **English** · [Dansk](README.da.md)

A SwiftUI virtual machine manager for creating and running Linux, Windows 11 ARM and macOS virtual machines on Apple Silicon Macs. It uses Apple's built-in **Virtualization.framework**, so no separate hypervisor or kernel extension is needed.


---

Webside 
https://modelpc.github.io/ModelPC-VM/index.html

## Features

**Virtual machine management**
- Create new VMs with a wizard (operating system, CPU, RAM, disk, network)
- Start, stop, force stop, pause, resume, restart
- Grid and list views, search, dashboard (CPU, memory, disk and network usage)
- Quick access from the menu bar (`MenuBarExtra`)

**Storage**
- Sparse disk images; add and remove multiple disks
- NVMe controller for Windows boot disks, VirtIO block devices for everything else
- ISOs are attached as USB mass storage devices (compatible with Linux and Windows installers)
- Create, restore and delete snapshots

**ISO library**
- Register local ISOs and attach/eject them on VMs
- Built-in ISO downloader
- Detects non-ARM64 (x64/amd64) ISOs and warns before booting
- Automatically finds a matching ARM64 ISO in the library when none is attached

**Display and console**
- Graphical display in a separate console window (`VZVirtualMachineView`)
- VirtIO GPU (Linux/Windows) and Apple paravirtualized GPU (macOS guests)
- Resolution presets (720p to 4K, MacBook screen sizes), dual display, Retina/HiDPI
- Serial console over `/dev/hvc0` (including the Ubuntu Server installer), VT100 terminal view
- Pass keyboard shortcuts to the guest, zoom, full screen

**Networking**
- NAT, shared network, bridged network or no network
- Port forwarding rules and network diagnostics
- Falls back to NAT automatically when the bridged networking entitlement is missing

**Other**
- Shared folders via VirtioFS
- Audio output, entropy device, memory balloon
- macOS notifications (VM started/stopped, snapshot, low disk space)
- Multi-language interface (including Turkish), light/dark/system theme
- FAQ section

---

## Requirements

| | |
|---|---|
| Hardware | Apple Silicon (M-series) Mac |
| macOS | 26.6 or later (project deployment target) |
| Xcode | 27 |
| Guest operating systems | **ARM64 / AArch64** builds (e.g. Ubuntu 24.04 ARM64, Windows 11 ARM). x64 ISOs do not run on Apple Silicon. |

---

## Building and running

1. Open `ModelPC VM.xcodeproj` in Xcode.
2. In **Signing & Capabilities**, select your own development team.
3. Select the **ModelPC VM** scheme and the **My Mac** destination, then press `⌘R`.

The shared scheme (`xcshareddata/xcschemes/ModelPC VM.xcscheme`) sets the `OS_ACTIVITY_MODE=disable` environment variable to hide harmless macOS system logs (such as `com.apple.linkd.autoShortcut`). The app's own `print` output is still shown. To see system logs again, turn it off under **Product → Scheme → Edit Scheme → Run → Arguments**.

### Entitlements

| Key | Why |
|---|---|
| `com.apple.security.virtualization` | Required to run VMs with Virtualization.framework |
| `com.apple.security.hypervisor` | Hypervisor access |
| `com.apple.security.network.client` / `.server` | ISO downloads, NAT and port forwarding |

Bridged networking (`VZBridgedNetworkDeviceAttachment`) additionally needs the Apple-granted `com.apple.vm.networking` entitlement. Without it, the app uses NAT instead.

---

## Setting up your first virtual machine

1. Add an ARM64 installation ISO under **ISO Images**, or download one with the built-in downloader.
2. Use **Create New VM** to choose the operating system, resources and ISO.
3. Press **Start**; the console window opens automatically (this can be turned off in Settings).
4. After installation, eject the ISO from the **ISO** menu in the console.

> A VM whose disk has no operating system installed and no ISO attached will not start; the app shows an error asking you to attach an ISO instead.

---

## Project structure

```
ModelPC VM/
├── ModelPC_VMApp.swift          # App entry: main window, console window, Settings, menu bar
├── ContentView.swift
├── Models/                      # VirtualMachine, VMConfiguration, VMDisk, VMSnapshot, ISOImage,
│                                # OSType, PortForwardingRule, VMError, AppLanguage, ...
├── Services/
│   ├── VirtualizationService    # Builds VZVirtualMachineConfiguration, VM lifecycle, serial console
│   ├── StorageService           # VM bundles and sparse disk images
│   ├── DownloadManagerService   # ISO downloads
│   ├── NetworkService           # NAT / bridged network attachments
│   ├── PortForwardingService
│   ├── NetworkDiagnosticsService
│   ├── SystemMonitorService     # Dashboard metrics
│   ├── SecurityBookmarkService  # Security-scoped bookmarks for files outside the sandbox
│   ├── NotificationService
│   └── LanguageManager          # Interface translations
├── ViewModels/
│   ├── VMManagerViewModel       # App state and all VM operations
│   └── CreateVMViewModel
└── Views/
    ├── Dashboard, VMList, VMDetail, CreateVM
    ├── VMConsole                # Console window and VZVirtualMachineView wrapper
    ├── ISO, Storage, Snapshots, Network
    ├── Settings, FAQ, MenuBar
    └── Components
```

---

## Known limitations

- **Memory and CPU caps:** To protect the host, VM RAM is capped at 3 GB on 8 GB Macs and at half of physical memory on larger Macs. vCPUs never exceed half of the host's cores. Windows 11 needs at least 4 GB of RAM, so on 8 GB Macs installation may be slow or fail to start.
- **ARM64 guests only:** x86/x64 operating systems are not emulated.
- **Automatic display resizing** is off for Linux and Windows guests; the picture is scaled to the window instead.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "No operating system on the disk and no ISO attached" | Attach an ARM64 ISO in the VM settings. |
| "Architecture mismatch" error | The ISO is an x64/amd64 build; download the ARM64 build. |
| VM boots from the ISO again after installation | Eject the ISO from the **ISO** menu in the console. |
| VM is stuck at the UEFI screen | Reset the EFI variables with the **NVRAM** button in the console. |
| Bridged networking doesn't work | It needs the `com.apple.vm.networking` entitlement; NAT is used otherwise. |
| No notifications | Allow them in System Settings → Notifications → ModelPC VM. |
