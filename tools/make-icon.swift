// Малює іконку MaControl за сіткою macOS (полотно 1024, форма 824 з відступом 100, радіус 185)
// і збирає Resources/AppIcon.icns з усіма розмірами 16…512 @1x/@2x.
// Запуск:  swift tools/make-icon.swift [концепт] [--preview <файл.png>]
//   концепт: moon (обраний, за замовчуванням: куля Umbra у фазі місяця) | orb | orb-light | mac | power | dial
//   — решта лишені для порівняння
//   --preview: лише PNG 1024 для перегляду, .icns не чіпається.
// Без SF Symbols: Apple забороняє їх в іконках аппок, тому все намальовано кривими.
import AppKit

let args = Array(CommandLine.arguments.dropFirst())
let concept = args.first { !$0.hasPrefix("--") && !$0.hasSuffix(".png") } ?? "moon"
let previewPath = args.firstIndex(of: "--preview").map { args[$0 + 1] }

func rgb(_ hex: UInt32, _ a: CGFloat = 1) -> CGColor {
    CGColor(srgbRed: CGFloat(hex >> 16 & 0xFF) / 255, green: CGFloat(hex >> 8 & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255, alpha: a)
}
func white(_ a: CGFloat) -> CGColor { CGColor(gray: 1, alpha: a) }

/// Контекст у координатах сітки 1024 (початок знизу зліва), будь-який реальний розмір.
struct Canvas {
    let cg: CGContext
    func gradient(_ colors: [CGColor], _ locs: [CGFloat]? = nil) -> CGGradient {
        CGGradient(colorsSpace: CGColorSpace(name: CGColorSpace.sRGB), colors: colors as CFArray, locations: locs)!
    }
    /// Лінійний градієнт усередині path.
    func fill(_ path: CGPath, _ colors: [CGColor], from: CGPoint, to: CGPoint, locs: [CGFloat]? = nil) {
        cg.saveGState(); cg.addPath(path); cg.clip()
        cg.drawLinearGradient(gradient(colors, locs), start: from, end: to,
                              options: [.drawsBeforeStartLocation, .drawsAfterEndLocation])
        cg.restoreGState()
    }
    func radial(_ path: CGPath, _ colors: [CGColor], center: CGPoint, radius: CGFloat) {
        cg.saveGState(); cg.addPath(path); cg.clip()
        cg.drawRadialGradient(gradient(colors), startCenter: center, startRadius: 0, endCenter: center,
                              endRadius: radius, options: [.drawsAfterEndLocation])
        cg.restoreGState()
    }
    /// Обведення лінії градієнтом (через контур штриха), з необов'язковим світінням.
    func stroke(_ path: CGPath, width: CGFloat, _ colors: [CGColor], from: CGPoint, to: CGPoint,
                glow: CGColor? = nil, glowBlur: CGFloat = 40) {
        let outline = path.copy(strokingWithWidth: width, lineCap: .round, lineJoin: .round, miterLimit: 10)
        if let glow {
            cg.saveGState()
            cg.setShadow(offset: .zero, blur: glowBlur * scale, color: glow)
            cg.addPath(outline); cg.setFillColor(colors[0]); cg.fillPath()
            cg.restoreGState()
        }
        fill(outline, colors, from: from, to: to)
    }
    func solid(_ path: CGPath, _ color: CGColor, glow: CGColor? = nil, glowBlur: CGFloat = 30) {
        cg.saveGState()
        if let glow { cg.setShadow(offset: .zero, blur: glowBlur * scale, color: glow) }
        cg.addPath(path); cg.setFillColor(color); cg.fillPath()
        cg.restoreGState()
    }
    var scale: CGFloat { cg.ctm.a }
}

let body = CGRect(x: 100, y: 100, width: 824, height: 824)
let bodyPath = CGPath(roundedRect: body, cornerWidth: 185, cornerHeight: 185, transform: nil)
let C = CGPoint(x: 512, y: 512)

func arc(_ c: CGPoint, _ r: CGFloat, from a0: CGFloat, to a1: CGFloat, clockwise: Bool) -> CGPath {
    let p = CGMutablePath()
    p.addArc(center: c, radius: r, startAngle: a0 * .pi / 180, endAngle: a1 * .pi / 180, clockwise: clockwise)
    return p
}
func line(_ a: CGPoint, _ b: CGPoint) -> CGPath { let p = CGMutablePath(); p.move(to: a); p.addLine(to: b); return p }
func circle(_ c: CGPoint, _ r: CGFloat) -> CGPath {
    CGPath(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r), transform: nil)
}

/// Спільне для всіх концептів: тінь під формою, фон, відблиск зверху.
func base(_ k: Canvas, top: CGColor, bottom: CGColor, highlight: CGFloat = 0.16) {
    k.cg.saveGState()
    k.cg.setShadow(offset: CGSize(width: 0, height: -10 * k.scale), blur: 22 * k.scale, color: CGColor(gray: 0, alpha: 0.35))
    k.solid(bodyPath, bottom)
    k.cg.restoreGState()
    k.fill(bodyPath, [top, bottom], from: CGPoint(x: 512, y: 924), to: CGPoint(x: 512, y: 100))
    k.fill(bodyPath, [white(highlight), white(0)], from: CGPoint(x: 512, y: 924), to: CGPoint(x: 512, y: 560))
    // Далі все малюється лише всередині форми: піксель поза нею — і macOS 26+ зменшить іконку в сірий контейнер.
    k.cg.addPath(bodyPath); k.cg.clip()
}

// MARK: концепти

/// Знак живлення, що світиться, і орбіта з пристроями: Mac у центрі, Web UI і Telegram навколо.
func drawPower(_ k: Canvas) {
    base(k, top: rgb(0x232B55), bottom: rgb(0x0B0E1F))
    k.radial(bodyPath, [rgb(0x3B4BC8, 0.55), rgb(0x3B4BC8, 0)], center: C, radius: 420)
    // орбіта
    let orbit = CGPath(ellipseIn: CGRect(x: 512 - 340, y: 512 - 340, width: 680, height: 680), transform: nil)
    k.cg.saveGState(); k.cg.addPath(orbit); k.cg.setStrokeColor(white(0.14)); k.cg.setLineWidth(6); k.cg.strokePath()
    k.cg.restoreGState()
    let deg: (CGFloat) -> CGPoint = { a in CGPoint(x: 512 + 340 * cos(a * .pi / 180), y: 512 + 340 * sin(a * .pi / 180)) }
    k.solid(circle(deg(35), 30), rgb(0x5EF2C6), glow: rgb(0x5EF2C6, 0.9), glowBlur: 30)
    k.solid(circle(deg(215), 22), rgb(0xFFB547), glow: rgb(0xFFB547, 0.9), glowBlur: 26)
    // знак живлення
    let ringColors = [rgb(0x47E3FF), rgb(0x8C5CFF)]
    k.stroke(arc(C, 210, from: 58, to: 122, clockwise: true), width: 74, ringColors,
             from: CGPoint(x: 512, y: 740), to: CGPoint(x: 512, y: 290), glow: rgb(0x47E3FF, 0.85), glowBlur: 46)
    k.stroke(line(CGPoint(x: 512, y: 520), CGPoint(x: 512, y: 760)), width: 74, ringColors,
             from: CGPoint(x: 512, y: 740), to: CGPoint(x: 512, y: 290), glow: rgb(0x47E3FF, 0.85), glowBlur: 46)
}

/// Циферблат таймера: дуга прогресу від заходу до ночі, місяць у центрі — «не спати» і «заснути за таймером».
func drawDial(_ k: Canvas) {
    base(k, top: rgb(0x2B3C9E), bottom: rgb(0x111842))
    k.solid(circle(C, 262), white(0.07))
    // поділки
    for i in 0..<60 {
        let a = CGFloat(i) * 6 * .pi / 180
        let major = i % 5 == 0
        let r0: CGFloat = major ? 206 : 218, r1: CGFloat = 238
        let p = line(CGPoint(x: 512 + r0 * sin(a), y: 512 + r0 * cos(a)), CGPoint(x: 512 + r1 * sin(a), y: 512 + r1 * cos(a)))
        k.cg.saveGState(); k.cg.addPath(p); k.cg.setLineCap(.round)
        k.cg.setStrokeColor(white(major ? 0.55 : 0.22)); k.cg.setLineWidth(major ? 10 : 6); k.cg.strokePath()
        k.cg.restoreGState()
    }
    // дуга прогресу: з 12 години за годинниковою на 270°
    k.stroke(arc(C, 300, from: 90, to: -180, clockwise: true), width: 46, [rgb(0xFFC65A), rgb(0xFF4F8B)],
             from: CGPoint(x: 812, y: 700), to: CGPoint(x: 300, y: 250), glow: rgb(0xFF8A5A, 0.7), glowBlur: 34)
    k.solid(circle(CGPoint(x: 212, y: 512), 32), white(1), glow: rgb(0xFF4F8B, 0.9))
    // місяць: коло мінус зсунуте коло
    // місяць: коло, з якого вирізано зсунуте коло (кліп «усе, крім другого кола»)
    k.cg.saveGState()
    let cut = CGMutablePath()
    cut.addRect(CGRect(x: 0, y: 0, width: 1024, height: 1024))
    cut.addPath(circle(CGPoint(x: 560, y: 560), 112))
    k.cg.addPath(cut); k.cg.clip(using: .evenOdd)
    k.solid(circle(CGPoint(x: 496, y: 496), 130), rgb(0xFFE9B0), glow: rgb(0xFFE6A6, 0.7), glowBlur: 46)
    k.cg.restoreGState()
    for (p, r) in [(CGPoint(x: 590, y: 600), CGFloat(13)), (CGPoint(x: 640, y: 545), 8)] {
        k.solid(circle(p, r), rgb(0xFFE9B0), glow: rgb(0xFFE9B0, 0.8), glowBlur: 16)
    }
}

/// Екран Mac із знаком живлення і хвилі сигналу: Mac, яким керують на відстані.
func drawMac(_ k: Canvas) {
    base(k, top: rgb(0x14B8A6), bottom: rgb(0x1E2F86), highlight: 0.14)
    // підставка
    let stand = CGMutablePath()
    stand.move(to: CGPoint(x: 450, y: 330)); stand.addLine(to: CGPoint(x: 574, y: 330))
    stand.addLine(to: CGPoint(x: 600, y: 250)); stand.addLine(to: CGPoint(x: 424, y: 250)); stand.closeSubpath()
    k.fill(stand, [rgb(0xE6EAF2), rgb(0xA9B3C7)], from: CGPoint(x: 512, y: 330), to: CGPoint(x: 512, y: 250))
    k.solid(CGPath(roundedRect: CGRect(x: 380, y: 222, width: 264, height: 36), cornerWidth: 18, cornerHeight: 18, transform: nil), rgb(0xD5DBE6))
    // монітор
    let frame = CGPath(roundedRect: CGRect(x: 200, y: 320, width: 560, height: 400), cornerWidth: 46, cornerHeight: 46, transform: nil)
    k.cg.saveGState()
    k.cg.setShadow(offset: CGSize(width: 0, height: -14 * k.scale), blur: 30 * k.scale, color: CGColor(gray: 0, alpha: 0.35))
    k.solid(frame, rgb(0xEEF1F6))
    k.cg.restoreGState()
    let screen = CGPath(roundedRect: CGRect(x: 226, y: 346, width: 508, height: 348), cornerWidth: 24, cornerHeight: 24, transform: nil)
    k.fill(screen, [rgb(0x1B2350), rgb(0x0A0E22)], from: CGPoint(x: 512, y: 694), to: CGPoint(x: 512, y: 346))
    let sc = CGPoint(x: 480, y: 520)
    k.stroke(arc(sc, 96, from: 55, to: 125, clockwise: true), width: 36, [rgb(0x5EF2C6), rgb(0x22C55E)],
             from: CGPoint(x: 480, y: 640), to: CGPoint(x: 480, y: 420), glow: rgb(0x5EF2C6, 0.9), glowBlur: 30)
    k.stroke(line(CGPoint(x: 480, y: 530), CGPoint(x: 480, y: 636)), width: 36, [rgb(0x5EF2C6), rgb(0x22C55E)],
             from: CGPoint(x: 480, y: 640), to: CGPoint(x: 480, y: 420), glow: rgb(0x5EF2C6, 0.9), glowBlur: 30)
    // хвилі сигналу з кута монітора: керування на відстані
    let src = CGPoint(x: 742, y: 702)
    for (i, r) in [CGFloat(58), 98, 138].enumerated() {
        let a = 1 - CGFloat(i) * 0.22
        k.stroke(arc(src, r, from: 14, to: 76, clockwise: false), width: 26, [white(a), white(a)],
                 from: .zero, to: CGPoint(x: 1, y: 1))
    }
    k.solid(circle(src, 26), rgb(0x22C55E), glow: rgb(0x5EF2C6, 0.9), glowBlur: 20)
}

// MARK: Umbra — скляна куля на орбіті в стилі бібліотеки Umbra (чорне скло, hairline, один теплий акцент)

struct UmbraLook {
    let tileTop: CGColor, tileBottom: CGColor
    let glowA: CGColor, glowB: CGColor
    let hairline: CGColor
    let orb: [CGColor]          // від світлого ядра до краю
    let ring: CGColor, accent: CGColor, accentGlow: CGColor
    let shade: CGColor          // тінь «фази місяця»

    static let dark = UmbraLook(
        tileTop: rgb(0x161517), tileBottom: rgb(0x000000),
        glowA: rgb(0xFF9B2F, 0.30), glowB: rgb(0xFF7A45, 0.18), hairline: white(0.11),
        orb: [rgb(0xFFF1DC), rgb(0xFFB766), rgb(0xFF9B2F), rgb(0xA8410C), rgb(0x1E0D05)],
        ring: white(0.20), accent: rgb(0xFFB766), accentGlow: rgb(0xFF9B2F, 0.95), shade: rgb(0x050403, 0.92))
    static let light = UmbraLook(
        tileTop: rgb(0xFBFBFC), tileBottom: rgb(0xE4E4E9),
        glowA: rgb(0xFF9B2F, 0.22), glowB: rgb(0x7D6BFF, 0.12), hairline: CGColor(gray: 0, alpha: 0.08),
        orb: [rgb(0xFFE3C2), rgb(0xF08A1C), rgb(0xD96A00), rgb(0x8A3E00), rgb(0x3A1800)],
        ring: CGColor(gray: 0, alpha: 0.16), accent: rgb(0xD96A00), accentGlow: rgb(0xF08A1C, 0.8),
        shade: rgb(0x1A1410, 0.85))
}

func drawUmbraOrb(_ k: Canvas, _ l: UmbraLook, moon: Bool) {
    base(k, top: l.tileTop, bottom: l.tileBottom, highlight: 0.05)
    k.radial(bodyPath, [l.glowA, rgb(0, 0)], center: CGPoint(x: 230, y: 880), radius: 520)
    k.radial(bodyPath, [l.glowB, rgb(0, 0)], center: CGPoint(x: 860, y: 150), radius: 460)

    let R: CGFloat = 196
    let tilt = CGAffineTransform(translationX: C.x, y: C.y).rotated(by: -18 * .pi / 180).scaledBy(x: 1, y: 0.30)
    func ringArc(_ a0: CGFloat, _ a1: CGFloat) -> CGPath {
        let p = CGMutablePath(); let t = tilt
        p.addArc(center: .zero, radius: 336, startAngle: a0 * .pi / 180, endAngle: a1 * .pi / 180, clockwise: false, transform: t)
        return p
    }
    // вся орбіта під кулею; передня половина ще раз — лише поверх кулі (без накладання кінців)
    k.stroke(ringArc(0, 360), width: 9, [l.ring, l.ring], from: .zero, to: CGPoint(x: 1, y: 1))

    // куля: м'яке світіння навколо, тіло з ядром зміщеним угору-вліво
    let orb = circle(C, R)
    k.solid(orb, l.orb[2], glow: l.accentGlow, glowBlur: 90)
    k.cg.saveGState(); k.cg.addPath(orb); k.cg.clip()
    k.cg.drawRadialGradient(k.gradient(l.orb, [0, 0.22, 0.48, 0.82, 1]),
                            startCenter: CGPoint(x: C.x - 70, y: C.y + 80), startRadius: 0,
                            endCenter: C, endRadius: R * 1.08, options: [.drawsAfterEndLocation])
    if moon {
        // тінь фази: друга куля зміщена вправо-вгору, з м'яким краєм
        let sc = CGPoint(x: C.x + 118, y: C.y + 52)
        k.cg.drawRadialGradient(k.gradient([l.shade, l.shade, rgb(0, 0)], [0, 0.78, 1]),
                                startCenter: sc, startRadius: 0, endCenter: sc, endRadius: R * 1.18, options: [])
    }
    // відблиск скла
    let spec = CGPath(ellipseIn: CGRect(x: C.x - 118, y: C.y + 84, width: 96, height: 50),
                      transform: nil)
    k.cg.saveGState()
    k.cg.translateBy(x: C.x - 68, y: C.y + 107); k.cg.rotate(by: 28 * .pi / 180); k.cg.translateBy(x: -(C.x - 68), y: -(C.y + 107))
    k.fill(spec, [white(0.5), white(0)], from: CGPoint(x: C.x - 90, y: C.y + 144), to: CGPoint(x: C.x - 40, y: C.y + 70))
    k.cg.restoreGState()
    k.cg.restoreGState()
    k.stroke(orb, width: 3, [white(0.28), white(0.04)], from: CGPoint(x: C.x, y: C.y + R), to: CGPoint(x: C.x, y: C.y - R))

    // передня половина орбіти — поверх кулі, з теплим сегментом-сигналом
    k.cg.saveGState(); k.cg.addPath(orb); k.cg.clip()
    k.stroke(ringArc(180, 360), width: 9, [l.ring, l.ring], from: .zero, to: CGPoint(x: 1, y: 1))
    k.cg.restoreGState()
    k.stroke(ringArc(286, 334), width: 12, [l.accent, l.accent], from: .zero, to: CGPoint(x: 1, y: 1),
             glow: l.accentGlow, glowBlur: 26)
    let ha = 334 * CGFloat.pi / 180
    let head = CGPoint(x: 336 * cos(ha), y: 336 * sin(ha)).applying(tilt)
    k.solid(circle(head, 15), l.accent, glow: l.accentGlow, glowBlur: 24)
    // hairline по краю плитки
    let inner = CGPath(roundedRect: body.insetBy(dx: 2, dy: 2), cornerWidth: 183, cornerHeight: 183, transform: nil)
    k.stroke(inner, width: 3, [l.hairline, l.hairline], from: .zero, to: CGPoint(x: 1, y: 1))
}

let draw: (Canvas) -> Void = switch concept {
case "orb": { drawUmbraOrb($0, .dark, moon: false) }
case "orb-light": { drawUmbraOrb($0, .light, moon: false) }
case "mac": drawMac
case "dial": drawDial
case "power": drawPower
default: { drawUmbraOrb($0, .dark, moon: true) }
}

func render(_ px: Int) -> Data {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: px, pixelsHigh: px, bitsPerSample: 8,
                               samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                               colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    let ctx = NSGraphicsContext(bitmapImageRep: rep)!
    NSGraphicsContext.current = ctx
    let cg = ctx.cgContext
    cg.scaleBy(x: CGFloat(px) / 1024, y: CGFloat(px) / 1024)
    draw(Canvas(cg: cg))
    NSGraphicsContext.restoreGraphicsState()
    return rep.representation(using: .png, properties: [:])!
}

if let previewPath {
    try! render(1024).write(to: URL(fileURLWithPath: previewPath))
    print(previewPath)
    exit(0)
}

let iconset = FileManager.default.temporaryDirectory.appendingPathComponent("mc-icon-\(UUID().uuidString).iconset")
try! FileManager.default.createDirectory(at: iconset, withIntermediateDirectories: true)
defer { try? FileManager.default.removeItem(at: iconset) }
for size in [16, 32, 128, 256, 512] {
    try! render(size).write(to: iconset.appendingPathComponent("icon_\(size)x\(size).png"))
    try! render(size * 2).write(to: iconset.appendingPathComponent("icon_\(size)x\(size)@2x.png"))
}
let iconutil = Process()
iconutil.executableURL = URL(fileURLWithPath: "/usr/bin/iconutil")
iconutil.arguments = ["-c", "icns", iconset.path, "-o", "Resources/AppIcon.icns"]
try! iconutil.run()
iconutil.waitUntilExit()
print("Resources/AppIcon.icns")
exit(iconutil.terminationStatus)
