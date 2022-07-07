export const percent = (value?: number, total?: number) => {
    console.log('percetn', (!value || value === 0) ? 0 : Math.round(value / (total ?? value) * 10000) / 100, value, total)
    console.log('value', value, Number(value) === 0)
    return (!value || Number(value) === 0) ? 0 : Math.round(value / (total ?? value) * 10000) / 100
}

export const numberSort = (n1?: number, n2?: number) => n1 ? (n2 ? n1 - n2 : 1) : (n2 ? -1 : 0)
