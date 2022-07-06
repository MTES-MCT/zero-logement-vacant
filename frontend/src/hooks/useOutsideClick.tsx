import { useEffect } from 'react';

export const useOutsideClick = (ref: any, onOutsideClick: () => void) => {
    useEffect(() => {
        const handleClickOutside = (event: any) => {
            if (ref.current && !ref.current.contains(event.target)) {
                onOutsideClick();
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [ref]); //eslint-disable-line react-hooks/exhaustive-deps
}
