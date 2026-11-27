"use strict";
// Відносний час для fixtures: значення рахуються при завантаженні сторінки, щоб відліки йшли «наживо».
Object.defineProperty(exports, "__esModule", { value: true });
exports.inMinutes = inMinutes;
exports.bucketsAgo = bucketsAgo;
/** ISO-час через `minutes` хвилин від зараз (мінус — у минулому). */
function inMinutes(minutes) {
    return new Date(Date.now() + minutes * 60000).toISOString();
}
/** ISO-час початку бакета: `n` одиниць тому, вирівняно до години / дня. */
function bucketsAgo(n, unit) {
    var d = new Date();
    if (unit === 'minute')
        d.setSeconds(0, 0), d.setMinutes(d.getMinutes() - n);
    if (unit === 'hour')
        d.setMinutes(0, 0, 0), d.setHours(d.getHours() - n);
    if (unit === 'day')
        d.setHours(0, 0, 0, 0), d.setDate(d.getDate() - n);
    return d.toISOString();
}
