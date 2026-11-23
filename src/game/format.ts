const normal = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0, minimumFractionDigits: 0 })
const exact = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 2 })
export const money = (paise: number, precise = false) => (precise && paise % 100 !== 0 ? exact : normal).format(paise / 100)
export const date = (day: number) => 'Day ' + ((day - 1) % 30 + 1) + ' · Month ' + Math.ceil(day / 30)
export const pct = (bps: number) => (bps / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + '%'
