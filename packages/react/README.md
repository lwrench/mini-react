```tsx
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

function App() {
	return (
		<div>
			<span>text</span>
		</div>
	);
}

ReactDOM.createRoot(document.querySelector('#root')).render(<App />);
```

会被转译成

```tsx
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { jsx as _jsx } from 'react/jsx-runtime';

function App() {
	return /*#__PURE__*/ _jsx('div', {
		children: /*#__PURE__*/ _jsx('span', {
			children: 'text'
		})
	});
}

ReactDOM.createRoot(document.querySelector('#root')).render(
	/*#__PURE__*/ _jsx(App, {})
);
```

[babel playground](https://shorturl.at/eHIJ3)
