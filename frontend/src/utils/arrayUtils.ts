export function updateWithValue<Type> (list: Type[] = [], value: Type, added: boolean): Type[] {
    const valueIndex = list.indexOf(value);
    if (added && valueIndex === -1) {
        return [...list, value];
    } else if (!added && valueIndex !== -1) {
        return list.filter(f => f !== value);
    }
    return list;
}
