import { useEffect } from 'react';
import { withRouter } from 'react-router-dom';

function ScrollToTop({ history }: {history: any}) {
    useEffect(() => {
        const unlisten = history.listen(() => {
            window.scrollTo(0, 130);
        });
        return () => {
            unlisten();
        }
    }, [history]);

    return null;
}

export default withRouter(ScrollToTop);
