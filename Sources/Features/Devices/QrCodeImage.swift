import CoreImage.CIFilterBuiltins
import SwiftUI

/// QR-код рядка в стилі MaControl: заокруглені кути-маркери і крапки-модулі на білому.
/// Матрицю модулів беремо з CIFilter (його вихід — піксель на модуль), малюємо SwiftUI Canvas без розмиття.
struct QrCodeImage: View {
    let text: String
    private let matrix: QrMatrix?

    init(text: String) {
        self.text = text
        self.matrix = QrMatrix.make(from: text)
    }

    var body: some View {
        if let matrix {
            Canvas { context, size in
                QrDrawing.draw(matrix, into: context, size: size)
            }
            .aspectRatio(1, contentMode: .fit)
            .padding(8)
            .background(.white, in: RoundedRectangle(cornerRadius: 8))
        }
    }
}

/// Квадратна сітка модулів: `dark[row * size + col]`, row 0 — верхній рядок.
struct QrMatrix {
    let size: Int
    let dark: [Bool]

    func isDark(_ row: Int, _ col: Int) -> Bool { dark[row * size + col] }

    static func make(from text: String) -> QrMatrix? {
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(text.utf8)
        filter.correctionLevel = "M"
        guard let output = filter.outputImage else { return nil }
        let n = Int(output.extent.width.rounded())
        guard n > 0, Int(output.extent.height.rounded()) == n,
              let cgImage = CIContext().createCGImage(output, from: output.extent) else { return nil }

        var pixels = [UInt8](repeating: 0, count: n * n * 4)
        let drawn = pixels.withUnsafeMutableBytes { raw -> Bool in
            guard let space = CGColorSpace(name: CGColorSpace.sRGB),
                  let bitmap = CGContext(data: raw.baseAddress, width: n, height: n, bitsPerComponent: 8,
                                         bytesPerRow: n * 4, space: space,
                                         bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return false }
            bitmap.draw(cgImage, in: CGRect(x: 0, y: 0, width: n, height: n))
            return true
        }
        guard drawn else { return nil }

        // Bitmap пише знизу вгору: рядок `row` зверху відповідає пам'яті `n - 1 - row`.
        var dark = [Bool](repeating: false, count: n * n)
        for row in 0..<n {
            let memRow = n - 1 - row
            for col in 0..<n {
                dark[row * n + col] = pixels[(memRow * n + col) * 4] < 128
            }
        }
        return QrMatrix(size: n, dark: dark)
    }
}

enum QrDrawing {
    /// Тиха зона з модулів навколо коду, як у стандарту QR.
    private static let quiet = 4

    static func draw(_ matrix: QrMatrix, into context: GraphicsContext, size: CGSize) {
        let n = matrix.size
        let total = Double(n + 2 * quiet)
        let cell = min(size.width, size.height) / total
        guard cell > 0 else { return }

        var ctx = context
        ctx.translateBy(x: (size.width - cell * total) / 2, y: (size.height - cell * total) / 2)
        ctx.scaleBy(x: cell, y: cell)

        // Фон: білий квадрат в одиницях модулів.
        ctx.fill(Path(CGRect(x: 0, y: 0, width: total, height: total)), with: .color(.white))

        let q = Double(quiet)
        // Три кути-маркери: чорне заокруглене кільце 7×7, біла смуга 5×5, чорне ядро 3×3.
        for (row, col) in [(0, 0), (0, n - 7), (n - 7, 0)] {
            let x = Double(col) + q
            let y = Double(row) + q
            ctx.fill(Path(roundedRect: CGRect(x: x, y: y, width: 7, height: 7), cornerRadius: 2.2), with: .color(.black))
            ctx.fill(Path(roundedRect: CGRect(x: x + 1, y: y + 1, width: 5, height: 5), cornerRadius: 1.2), with: .color(.white))
            ctx.fill(Path(roundedRect: CGRect(x: x + 2, y: y + 2, width: 3, height: 3), cornerRadius: 0.8), with: .color(.black))
        }

        // Дані: крапки в центрі модулів, маркери пропускаємо.
        var dots = Path()
        let radius = 0.44
        for row in 0..<n {
            for col in 0..<n where matrix.isDark(row, col) && !isInFinder(row, col, n) {
                let cx = Double(col) + q + 0.5
                let cy = Double(row) + q + 0.5
                dots.addEllipse(in: CGRect(x: cx - radius, y: cy - radius, width: radius * 2, height: radius * 2))
            }
        }
        ctx.fill(dots, with: .color(.black))
    }

    private static func isInFinder(_ row: Int, _ col: Int, _ n: Int) -> Bool {
        (row < 8 && col < 8) || (row < 8 && col >= n - 8) || (row >= n - 8 && col < 8)
    }
}
