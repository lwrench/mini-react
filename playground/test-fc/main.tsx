import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// function App() {
// 	const [num, setNum] = useState(100);

// 	return (
// 		<>
// 			<div
// 				onClick={() => {
// 					setNum((prev) => prev + 1);
// 					setNum((prev) => prev + 1);
// 					setNum((prev) => prev + 1);
// 				}}
// 			>
// 				{num}
// 			</div>
// 		</>
// 	);
// 	return (
// 		<>
// 			<div></div>
// 			<div></div>
// 		</>
// 	);
// 	return (
// 		<ul>
// 			<>
// 				<li>1</li>
// 				<li>2</li>
// 			</>
// 			<li>3</li>
// 			<li>4</li>
// 		</ul>
// 	);
// 	const arr =
// 		num % 2 === 0
// 			? [<li key="1">1</li>, <li key="2">2</li>, <li key="3">3</li>]
// 			: [<li key="3">3</li>, <li key="2">2</li>, <li key="1">1</li>];
// 	return (
// 		<ul onClickCapture={() => setNum(num + 1)}>
// 			<li>4</li>
// 			<li>5</li>
// 			{arr}
// 		</ul>
// 	);
// }

// function Child() {
// 	return <span>big-react</span>;
// }

function App() {
	const [num, updateNum] = useState(0);
	useEffect(() => {
		console.log('App mount');
	}, []);

	useEffect(() => {
		console.log('num change create', num);
		return () => {
			console.log('num change destroy', num);
		};
	}, [num]);

	return (
		<div onClick={() => updateNum(num + 1)}>
			{num === 0 ? <Child /> : 'noop'}
		</div>
	);
}

function Child() {
	useEffect(() => {
		console.log('Child mount');
		return () => console.log('Child unmount');
	}, []);

	return 'i am child';
}
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />
);
