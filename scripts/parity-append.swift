// Stitches PNGs side by side (like `magick +append`) with a 24 px gap and a label strip on top.
// Usage: swift scripts/parity-append.swift <out.png> <label:in.png>...
// Both inputs are scaled to the height of the first one, so a 2x Mac snapshot and a 2x Chrome screenshot line up.
import AppKit

let args = Array(CommandLine.arguments.dropFirst())
guard args.count >= 2 else { FileHandle.standardError.write("usage: <out> <label:in>...\n".data(using: .utf8)!); exit(2) }

let parts: [(String, CGImage)] = args.dropFirst().map { spec in
    let split = spec.split(separator: ":", maxSplits: 1).map(String.init)
    let (label, path) = split.count == 2 ? (split[0], split[1]) : ("", spec)
    guard let image = NSImage(contentsOfFile: path)?.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        FileHandle.standardError.write("cannot read \(path)\n".data(using: .utf8)!); exit(2)
    }
    return (label, image)
}

let height = CGFloat(parts[0].1.height)
let gap: CGFloat = 24, strip: CGFloat = 56
let widths = parts.map { CGFloat($0.1.width) * height / CGFloat($0.1.height) }
let total = CGSize(width: widths.reduce(0, +) + gap * CGFloat(parts.count - 1), height: height + strip)

guard let ctx = CGContext(data: nil, width: Int(total.width), height: Int(total.height), bitsPerComponent: 8,
                          bytesPerRow: 0, space: CGColorSpace(name: CGColorSpace.sRGB)!,
                          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(3) }
ctx.setFillColor(CGColor(gray: 0.12, alpha: 1))
ctx.fill(CGRect(origin: .zero, size: total))

NSGraphicsContext.current = NSGraphicsContext(cgContext: ctx, flipped: false)
var x: CGFloat = 0
for ((label, image), width) in zip(parts, widths) {
    ctx.draw(image, in: CGRect(x: x, y: 0, width: width, height: height))
    (label as NSString).draw(at: NSPoint(x: x + 16, y: height + 14), withAttributes: [
        .font: NSFont.systemFont(ofSize: 26, weight: .semibold), .foregroundColor: NSColor.white,
    ])
    x += width + gap
}

guard let out = ctx.makeImage(),
      let png = NSBitmapImageRep(cgImage: out).representation(using: .png, properties: [:]) else { exit(3) }
try png.write(to: URL(fileURLWithPath: args[0]))
