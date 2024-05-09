export type WorkTag =
	| typeof FunctionComponent
	| typeof HostRoot
	| typeof HostComponent
	| typeof HostText;

export const FunctionComponent = 0;
export const HostRoot = 3;
// dom 节点
export const HostComponent = 5;
// 文本节点
export const HostText = 6;
