// Малює іконку аппки за сіткою macOS (полотно 1024, форма 824 з відступом 100)
// і збирає Resources/AppIcon.icns.   Запуск: swift tools/make-icon.swift
import AppKit

let root = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : ".")
let iconset = root.appendingPathComponent("build/AppIcon.iconset")
try? FileManager.default.removeItem(at: iconset)
try! FileManager.default.createDirectory(at: iconset, withIntermediateDirectories: true)

func rgb(_ hex: UInt32) -> NSColor {
    NSColor(srgbRed: CGFloat(hex >> 16 & 0xFF) / 255, green: CGFloat(hex >> 8 & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255, alpha: 1)
}

func render(_ px: Int) -> Data {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: px, pixelsHigh: px, bitsPerSample: 8,
                               samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                               colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    let s = CGFloat(px) / 1024
    let rect = NSRect(x: 100 * s, y: 100 * s, width: 824 * s, height: 824 * s)
    let shape = NSBezierPath(roundedRect: rect, xRadius: 185 * s, yRadius: 185 * s)

    // тінь під формою
    NSGraphicsContext.saveGraphicsState()
    let shadow = NSShadow()
    shadow.shadowColor = .black.withAlphaComponent(0.35)
    shadow.shadowBlurRadius = 24 * s
    shadow.shadowOffset = NSSize(width: 0, height: -12 * s)
    shadow.set()
    rgb(0x2B1A10).setFill()
    shape.fill()
    NSGraphicsContext.restoreGraphicsState()

    // фон: нічне небо зверху, теплий колір кави знизу
    NSGradient(colors: [rgb(0x2E3A6E), rgb(0x5B3A6B), rgb(0xB0683A)], atLocations: [0, 0.55, 1],
               colorSpace: .sRGB)!.draw(in: shape, angle: -90)

    // легкий відблиск зверху
    NSGraphicsContext.saveGraphicsState()
    shape.addClip()
    NSGradient(starting: .white.withAlphaComponent(0.18), ending: .clear)!
        .draw(in: NSRect(x: rect.minX, y: rect.midY, width: rect.width, height: rect.height / 2), angle: -90)
    NSGraphicsContext.restoreGraphicsState()

    func symbol(_ name: String, _ size: CGFloat, _ color: NSColor, center: NSPoint) {
        let cfg = NSImage.SymbolConfiguration(pointSize: size * s, weight: .semibold)
            .applying(.init(paletteColors: [color]))
        guard let img = NSImage(systemSymbolName: name, accessibilityDescription: nil)?
            .withSymbolConfiguration(cfg) else { return }
        let sz = img.size
        img.draw(in: NSRect(x: center.x * s - sz.width / 2, y: center.y * s - sz.height / 2,
                            width: sz.width, height: sz.height))
    }
    symbol("cup.and.saucer.fill", 380, .white, center: NSPoint(x: 512, y: 440))
    symbol("moon.stars.fill", 150, rgb(0xFFD98A), center: NSPoint(x: 690, y: 720))

    NSGraphicsContext.restoreGraphicsState()
    return rep.representation(using: .png, properties: [:])!
}

for base in [16, 32, 128, 256, 512] {
    try! render(base).write(to: iconset.appendingPathComponent("icon_\(base)x\(base).png"))
    try! render(base * 2).write(to: iconset.appendingPathComponent("icon_\(base)x\(base)@2x.png"))
}
print(iconset.path)
