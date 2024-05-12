import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

function App() {
	const [num, setNum] = useState(100);

	return <div onClick={() => setNum(num + 1)}>{num}</div>;
}
function Child() {
	return <span>Hello React</span>;
}

ReactDOM.createRoot(document.querySelector('#root') as HTMLElement).render(
	<App />
);
