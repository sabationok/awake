/**
 * Справжній stdout для протоколу з Mac-аппкою. Зберігається до того, як main.ts
 * перенаправить process.stdout у stderr, щоб випадковий console.log не зламав протокол.
 */
const write = process.stdout.write.bind(process.stdout);

export function writeProtocolLine(message: unknown) {
  write(`${JSON.stringify(message)}\n`);
}

export function redirectStrayStdout() {
  process.stdout.write = process.stderr.write.bind(process.stderr) as typeof process.stdout.write;
}
