import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

function App() {
	const [num, setNum] = useState(100);
	window.setNum = setNum;
	return <div>{num}</div>;
}
function Child() {
	return <span>Hello React</span>;
}

ReactDOM.createRoot(document.querySelector('#root') as HTMLElement).render(
	<App />
);
