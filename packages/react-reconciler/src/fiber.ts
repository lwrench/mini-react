import { CallbackNode } from 'scheduler';
import { Props, Key, Ref, ReactElementType } from 'shared/ReactTypes';
import {
	Fragment,
	FunctionComponent,
	HostComponent,
	WorkTag
} from './workTags';
import { FlagsType, NoFlags } from './fiberFlags';
import { Container } from 'hostConfig';
import { Lane, Lanes, NoLane, NoLanes } from './fiberLane';
import { Effect } from './fiberHooks';

export class FiberNode {
	// 'div' 'span' 'func App' 'class Comp' ...
	type: any;
	tag: WorkTag;
	pendingProps: Props;
	key: Key | null;
	stateNode: any;
	ref: Ref;

	return: FiberNode | null;
	sibling: FiberNode | null;
	child: FiberNode | null;
	index: number;

	memorizedProps: Props | null;
	// function 保存 hooks链表
	memorizedState: any;
	alternate: FiberNode | null;

	// function component fiber中保存effect
	// host root fiber 保存 render函数生成的update，action为<App /> 生成的react element
	updateQueue: unknown;

	// 副作用
	flags: FlagsType;
	subtreeFlags: FlagsType;
	deletions: FiberNode[] | null;

	constructor(tag: WorkTag, pendingProps: Props, key: Key) {
		// fiber的类型
		this.tag = tag;
		this.key = key || null;
		// HostComponent <div> 真实的dom节点
		this.stateNode = null;
		// FunctionComponent ()=>{} / ClassComponent.render()
		this.type = null;

		// 构成树状结构
		this.return = null;
		this.sibling = null;
		this.child = null;
		this.index = 0;

		this.ref = null;

		// 作为工作单元
		// 刚开始的props
		this.pendingProps = pendingProps;
		// 结束时的props
		this.memorizedProps = null;
		this.updateQueue = null;
		// reactElement ?
		this.memorizedState = null;

		this.alternate = null;
		// diff后需要打上的标签，即副作用
		this.flags = NoFlags;
		this.subtreeFlags = NoFlags;
		this.deletions = null;
	}
}

export interface PendingPassiveEffects {
	unmount: Effect[];
	update: Effect[];
}

export class FiberRootNode {
	// 保存宿主环境的挂载点，在 web 中即为 document.getElementById('root') dom节点
	container: Container;
	// 指向 hostRootFiber
	current: FiberNode;
	// 指向更新完成后的 hostRootFiber
	finishedWork: FiberNode | null;
	// 所有未被消费的lane的集合
	pendingLanes: Lanes;
	// 本次更新消费的Lane
	finishedLane: Lane;

	pendingPassiveEffects: PendingPassiveEffects;

	callbackNode: CallbackNode | null;
	callbackPriority: Lane;

	constructor(container: Container, hostRootFiber: FiberNode) {
		this.container = container;
		this.current = hostRootFiber;
		hostRootFiber.stateNode = this;
		this.finishedWork = null;
		this.pendingLanes = NoLanes;
		this.finishedLane = NoLane;

		this.pendingPassiveEffects = {
			unmount: [],
			update: []
		};

		this.callbackNode = null;
		this.callbackPriority = NoLane;
	}
}

/**
 * 每次都会返回传入的 hostRootFiber 的 alternate，以实现双缓存机制，每次更新都是操作的当前current的alternate
 * @param current
 * @param pendingProps
 * @returns
 */
export const createWorkInProgress = (
	current: FiberNode,
	pendingProps: Props
): FiberNode => {
	let wip = current.alternate;

	if (wip === null) {
		// mount， 首屏渲染
		wip = new FiberNode(current.tag, pendingProps, current.key);
		wip.stateNode = current.stateNode;

		wip.alternate = current;
		current.alternate = wip;
	} else {
		// update
		wip.pendingProps = pendingProps;
		wip.flags = NoFlags;
		wip.subtreeFlags = NoFlags;
		wip.deletions = null;
	}
	wip.type = current.type;
	wip.updateQueue = current.updateQueue;
	wip.child = current.child;
	wip.memorizedProps = current.memorizedProps;
	wip.memorizedState = current.memorizedState;
	wip.deletions = null;

	return wip;
};

export function createFiberFromElement(element: ReactElementType) {
	const { type, key, props } = element;
	let fiberTag: WorkTag = FunctionComponent;

	if (typeof type === 'string') {
		fiberTag = HostComponent;
	} else if (typeof type !== 'function' && __DEV__) {
		console.warn('未定义的type类型', element);
	}

	const fiber = new FiberNode(fiberTag, props, key);
	fiber.type = type;

	return fiber;
}

export function createFiberFromFragment(elements: any[], key: Key): FiberNode {
	const fiber = new FiberNode(Fragment, elements, key);
	return fiber;
}
