// Іконка зі стрічкою стейджу для не-production збірок.
// Запуск: swift tools/stage-icon.swift <вхід.icns> <вихід.icns> <stage>   (stage: dev | preview)
import AppKit

let args = CommandLine.arguments
guard args.count == 4 else {
    FileHandle.standardError.write("Формат: stage-icon.swift <in.icns> <out.icns> <stage>\n".data(using: .utf8)!)
    exit(1)
}
let input = URL(fileURLWithPath: args[1])
let output = URL(fileURLWithPath: args[2])
let stage = args[3]

func rgb(_ hex: UInt32) -> NSColor {
    NSColor(srgbRed: CGFloat(hex >> 16 & 0xFF) / 255, green: CGFloat(hex >> 8 & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255, alpha: 1)
}

/// Колір стрічки за стейджем: dev помаранчевий, preview фіолетовий, інше сіре.
let color: NSColor = switch stage {
case "dev": rgb(0xF26B1D)
case "preview": rgb(0x7A4DE0)
default: rgb(0x6B6B6B)
}
let label = stage.uppercased()

guard let base = NSImage(contentsOf: input) else {
    FileHandle.standardError.write("Не читається \(input.path)\n".data(using: .utf8)!)
    exit(1)
}

func render(_ px: Int) -> Data {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: px, pixelsHigh: px, bitsPerSample: 8,
                               samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                               colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    let s = CGFloat(px) / 1024
    base.draw(in: NSRect(x: 0, y: 0, width: px, height: px))

    if px < 64 {
        // На малих розмірах текст не читається: лише кольорова крапка в правому нижньому куті.
        let d = 360 * s
        color.setFill()
        NSBezierPath(ovalIn: NSRect(x: 924 * s - d, y: 100 * s, width: d, height: d)).fill()
    } else {
        // Стрічка внизу форми іконки (форма 824 з відступом 100, як у make-icon.swift).
        let band = NSRect(x: 100 * s, y: 150 * s, width: 824 * s, height: 190 * s)
        color.setFill()
        NSBezierPath(roundedRect: band, xRadius: 40 * s, yRadius: 40 * s).fill()
        let font = NSFont.systemFont(ofSize: 150 * s, weight: .heavy)
        let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: NSColor.white, .kern: 6 * s]
        let text = NSAttributedString(string: label, attributes: attrs)
        let size = text.size()
        text.draw(at: NSPoint(x: band.midX - size.width / 2, y: band.midY - size.height / 2))
    }
    NSGraphicsContext.restoreGraphicsState()
    return rep.representation(using: .png, properties: [:])!
}

let iconset = FileManager.default.temporaryDirectory
    .appendingPathComponent("mc-stage-\(UUID().uuidString).iconset")
try! FileManager.default.createDirectory(at: iconset, withIntermediateDirectories: true)
defer { try? FileManager.default.removeItem(at: iconset) }
for size in [16, 32, 128, 256, 512] {
    try! render(size).write(to: iconset.appendingPathComponent("icon_\(size)x\(size).png"))
    try! render(size * 2).write(to: iconset.appendingPathComponent("icon_\(size)x\(size)@2x.png"))
}
let iconutil = Process()
iconutil.executableURL = URL(fileURLWithPath: "/usr/bin/iconutil")
iconutil.arguments = ["-c", "icns", iconset.path, "-o", output.path]
try! iconutil.run()
iconutil.waitUntilExit()
exit(iconutil.terminationStatus)
