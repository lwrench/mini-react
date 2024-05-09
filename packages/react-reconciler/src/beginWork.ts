import { ReactElementType } from 'shared/ReactTypes';
import { mountChildFibers, reconcileChildFibers } from './childFibers';
import { FiberNode } from './fiber';
import { processUpdateQueue, UpdateQueue } from './updateQueue';
import { HostComponent, HostRoot, HostText } from './workTags';

/**
 * 递归中的递阶段，比较子 current fiber和子reactElement，返回子 wip fiber
 * 对于如下结构的reactElement: <A><B/></A>
 * 当进入A的beginWork时，通过比对B的current fiber 和 B的reactElement，生成B对应的 wip fiber
 * @param wip
 * @returns
 */
// 递归中的递阶段，比较fiber和reactElement，返回子fiber
export function beginWork(wip: FiberNode) {
	// 比较，返回子fiberNode
	switch (wip.tag) {
		case HostRoot:
			// 1. 计算状态最新值
			// 2. 创造子fiberNode
			return updateHostRoot(wip);
		case HostComponent:
			// 创造子fiberNode
			return updateHostComponent(wip);
		case HostText:
			return null;
		default:
			if (__DEV__) {
				console.warn('beginWork未实现的类型');
			}
			break;
	}
	return null;
}

function updateHostRoot(wip: FiberNode) {
	const baseState = wip.memoizedState;
	const updateQueue = wip.updateQueue as UpdateQueue<Element>;
	const pending = updateQueue.shared.pending;
	updateQueue.shared.pending = null;
	const { memorizedState } = processUpdateQueue(baseState, pending);
	wip.memoizedState = memorizedState;

	// hostRootFiber的子reactElement，见updateContainer的传入参数
	const nextChildren = wip.memoizedState;
	// 需要和hostRootFiber的子 current fiber对比，即wip.alternate.child
	reconcileChildren(wip, nextChildren);
	return wip.child;
}

function updateHostComponent(wip: FiberNode) {
	const nextProps = wip.pendingProps;
	const nextChildren = nextProps.children;
	reconcileChildren(wip, nextChildren);
	return wip.child;
}

function reconcileChildren(wip: FiberNode, children?: ReactElementType) {
	const current = wip.alternate;

	if (current !== null) {
		// update
		wip.child = reconcileChildFibers(wip, current?.child, children);
	} else {
		// mount
		wip.child = mountChildFibers(wip, null, children);
	}
}
