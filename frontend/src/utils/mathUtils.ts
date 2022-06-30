export const percent = (value: number, total?: number) => {
    return value === 0 ? 0 : Math.round(value / (total ?? value) * 10000) / 100
}
