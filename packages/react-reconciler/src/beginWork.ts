import { ReactElementType } from 'shared/ReactTypes';
import { mountChildFibers, reconcileChildFibers } from './childFibers';
import { FiberNode } from './fiber';
import { Ref } from './fiberFlags';
import { renderWithHooks } from './fiberHooks';
import { Lane } from './fiberLane';
import { processUpdateQueue, UpdateQueue } from './updateQueue';
import {
	Fragment,
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './workTags';

/**
 * 递归中的递阶段，比较子 current fiber和子reactElement，返回子 wip fiber
 * 对于如下结构的reactElement: <A><B/></A>
 * 当进入A的beginWork时，通过比对B的current fiber 和 B的reactElement，生成B对应的 wip fiber
 * @param wip
 * @returns
 */
// 递归中的递阶段，比较fiber和reactElement，返回子fiber
export function beginWork(wip: FiberNode, renderLane: Lane) {
	// 比较，返回子fiberNode
	switch (wip.tag) {
		case HostRoot:
			// 1. 计算状态最新值
			// 2. 创造子fiberNode
			return updateHostRoot(wip, renderLane);
		case HostComponent:
			// 创造子fiberNode
			return updateHostComponent(wip);
		case FunctionComponent:
			return updateFunctionComponent(wip, renderLane);
		case Fragment:
			return updateFragment(wip);
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

function updateHostRoot(wip: FiberNode, renderLane: Lane) {
	const baseState = wip.memorizedState;
	const updateQueue = wip.updateQueue as UpdateQueue<Element>;
	const pending = updateQueue.shared.pending;
	updateQueue.shared.pending = null;
	const { memorizedState } = processUpdateQueue(baseState, pending, renderLane);
	wip.memorizedState = memorizedState;

	// hostRootFiber的子reactElement，即updateContainer的传入参数
	const nextChildren = wip.memorizedState;
	// 需要和hostRootFiber的子 current fiber对比，即wip.alternate.child
	reconcileChildren(wip, nextChildren);
	return wip.child;
}

function updateHostComponent(wip: FiberNode) {
	const nextProps = wip.pendingProps;
	const nextChildren = nextProps.children;
	markRef(wip.alternate, wip);
	reconcileChildren(wip, nextChildren);
	return wip.child;
}

function updateFunctionComponent(wip: FiberNode, renderLane: Lane) {
	const nextChildren = renderWithHooks(wip, renderLane);
	reconcileChildren(wip, nextChildren);
	return wip.child;
}

function updateFragment(wip: FiberNode) {
	const nextChildren = wip.pendingProps;
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

function markRef(current: FiberNode | null, workInProgress: FiberNode) {
	const ref = workInProgress.ref;

	if (
		(current === null && ref !== null) ||
		(current !== null && current.ref !== ref)
	) {
		workInProgress.flags |= Ref;
	}
}
