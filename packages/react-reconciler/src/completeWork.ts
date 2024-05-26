import {
	appendInitialChild,
	Container,
	createInstance,
	createTextInstance,
	Instance
} from 'hostConfig';

import { FiberNode } from './fiber';
import { NoFlags, Update } from './fiberFlags';
import {
	Fragment,
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './workTags';

function markUpdate(fiber: FiberNode) {
	fiber.flags |= Update;
}

/**
 * 对于Host类型的fiber，构建离屏dom树
 * 标记Update flags
 * 冒泡子树的flags
 * @param wip
 * @returns
 */
export function completeWork(wip: FiberNode) {
	// 返回子fiberNode
	const newProps = wip.pendingProps;
	const current = wip.alternate;

	switch (wip.tag) {
		case HostComponent:
			if (current !== null && wip.stateNode) {
				// TODO update
				// props 是否变化
				markUpdate(wip);
			} else {
				// mount
				// 1. 构建dom
				const instance = createInstance(wip.type, newProps);
				// 2. 将dom插入到dom树中
				appendAllChildren(instance, wip);
				wip.stateNode = instance;
			}
			bubbleProperties(wip);
			return null;

		case HostText:
			if (current !== null && wip.stateNode) {
				// update
				const oldText = current.memorizedProps?.content;
				const newText = newProps.content;
				if (oldText !== newText) {
					markUpdate(wip);
				}
			} else {
				// mount
				// 1. 构建dom
				const instance = createTextInstance(newProps.content);
				// 2. 将dom插入到dom树中
				wip.stateNode = instance;
			}
			bubbleProperties(wip);
			return null;
		case HostRoot:
		case FunctionComponent:
		case Fragment:
			bubbleProperties(wip);
			return;
		default:
			if (__DEV__) {
				console.warn('未处理的completeWork情况', wip);
			}
			break;
	}
}
/**
 * 向parent插入fiber的dom节点，
 * 如果子fiber是dom类型，就执行插入，
 * 如果子fiber不是dom类型，就继续往下找，
 * 如果仍然没有dom类型的fiber，就往上找节点的兄弟节点，直到回到wip fiber
 * @param parent
 * @param wip
 * @returns
 */
function appendAllChildren(parent: Container | Instance, wip: FiberNode) {
	let node = wip.child;

	while (node !== null) {
		if (node.tag === HostComponent || node.tag === HostText) {
			appendInitialChild(parent, node?.stateNode);
		} else if (node.child !== null) {
			node.child.return = node;
			node = node.child;
			continue;
		}

		if (node === wip) {
			return;
		}

		while (node.sibling === null) {
			if (node.return === null || node.return === wip) {
				return;
			}
			node = node?.return;
		}

		node.sibling.return = node.return;
		node = node.sibling;
	}
}

function bubbleProperties(wip: FiberNode) {
	let subtreeFlags = NoFlags;
	let child = wip.child;

	// 遍历所有child以及child的sibling
	while (child !== null) {
		subtreeFlags |= child.subtreeFlags;
		subtreeFlags |= child.flags;

		child.return = wip;
		child = child.sibling;
	}

	wip.subtreeFlags |= subtreeFlags;
}
