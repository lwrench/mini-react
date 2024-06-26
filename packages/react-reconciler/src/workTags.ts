export type WorkTag =
	| typeof FunctionComponent
	| typeof HostRoot
	| typeof HostComponent
	| typeof HostText
	| typeof Fragment
	| typeof ContextProvider;

export const FunctionComponent = 0;
export const HostRoot = 3;
// dom 节点
export const HostComponent = 5;
// 文本节点
export const HostText = 6;
export const Fragment = 7;

export const ContextProvider = 8;
