import { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import internals from 'shared/internals';
import { Action } from 'shared/ReactTypes';
import { FiberNode } from './fiber';
import { FlagsType, PassiveEffect } from './fiberFlags';
import { Lane, NoLane, requestUpdateLane } from './fiberLane';
import { HookHasEffect, Passive } from './hookEffectTags';
import {
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	processUpdateQueue,
	Update,
	UpdateQueue
} from './updateQueue';
import { scheduleUpdateOnFiber } from './workLoop';

let currentlyRenderingFiber: FiberNode | null = null;
let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null;
let renderLane: Lane = NoLane;

const { currentDispatcher } = internals;

interface Hook {
	memorizedState: any;
	updateQueue: unknown;
	next: Hook | null;
	baseState: any;
	baseQueue: Update<any> | null;
}
export interface Effect {
	tag: FlagsType;
	create: EffectCallback | void;
	destroy: EffectCallback | void;
	deps: EffectDeps;
	next: Effect | null;
}

type EffectCallback = () => void;
type EffectDeps = any[] | null;

export interface FunctionComponentUpdateQueue<State>
	extends UpdateQueue<State> {
	lastEffect: Effect | null;
}

export function renderWithHooks(wip: FiberNode, lane: Lane) {
	currentlyRenderingFiber = wip;
	// 重置hook链表
	wip.memorizedState = null;
	// 重置effect hook链表
	wip.updateQueue = null;
	renderLane = lane;

	const current = wip.alternate;

	if (current !== null) {
		// update
		currentDispatcher.current = HooksDispatcherOnUpdate;
	} else {
		// mount
		currentDispatcher.current = HooksDispatcherOnMount;
	}

	const Component = wip.type;
	const props = wip.pendingProps;
	const children = Component(props);

	currentlyRenderingFiber = null;
	workInProgressHook = null;
	currentHook = null;
	renderLane = NoLane;
	return children;
}

const HooksDispatcherOnMount: Dispatcher = {
	useState: mountState,
	useEffect: mountEffect
};

function mountState<State>(
	initialState: (() => State) | State
): [State, Dispatch<State>] {
	const hook = mountWorkInProgressHook();
	let memorizedState;
	if (initialState instanceof Function) {
		memorizedState = initialState();
	} else {
		memorizedState = initialState;
	}
	const queue = createUpdateQueue<State>();
	hook.updateQueue = queue;
	hook.memorizedState = memorizedState;

	// function App() {
	// 	const [x,dispatch]= useState(0)
	// 	window.dispatch = dispatch
	// }
	// window.dispatch()
	// 如此可以做到在函数外部也能触发更新
	// @ts-ignore
	const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
	queue.dispatch = dispatch;

	return [memorizedState, dispatch];
}

// effect hook 的 memorizedState属性单独形成一条环状链表
// hook 的next 属性形成一条所有hook都在的环状链表
// fiber 的 memorizedState 存储 所有hooks
function mountEffect(create: EffectCallback | void, deps: EffectDeps | void) {
	const hook = mountWorkInProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	(currentlyRenderingFiber as FiberNode).flags |= PassiveEffect;

	// Passive 类型的effect hook，并且需要更新
	// 此外还有 layout 类型的 effect hook，对应着useLayoutEffect
	// 如果effect hook 此次需要更新，flag属性会加上 HookHasEffect
	hook.memorizedState = pushEffect(
		Passive | HookHasEffect,
		create,
		undefined,
		nextDeps
	);
}

function pushEffect(
	hookFlags: FlagsType,
	create: EffectCallback | void,
	destroy: EffectCallback | void,
	deps: EffectDeps
): Effect {
	const effect: Effect = {
		tag: hookFlags,
		create,
		destroy,
		deps,
		next: null
	};
	const fiber = currentlyRenderingFiber as FiberNode;
	const updateQueue = fiber.updateQueue as FunctionComponentUpdateQueue<any>;
	if (updateQueue === null) {
		const updateQueue = createFunctionComponentUpdateQueue();
		fiber.updateQueue = updateQueue;
		effect.next = effect;
		updateQueue.lastEffect = effect;
	} else {
		// 插入effect
		const lastEffect = updateQueue.lastEffect;
		if (lastEffect === null) {
			effect.next = effect;
			updateQueue.lastEffect = effect;
		} else {
			const firstEffect = lastEffect.next;
			lastEffect.next = effect;
			effect.next = firstEffect;
			updateQueue.lastEffect = effect;
		}
	}
	return effect;
}

function createFunctionComponentUpdateQueue<State>() {
	const updateQueue =
		createUpdateQueue<State>() as FunctionComponentUpdateQueue<State>;
	updateQueue.lastEffect = null;
	return updateQueue;
}

const HooksDispatcherOnUpdate: Dispatcher = {
	useState: updateState,
	useEffect: updateEffect
};

function updateState<State>(): [State, Dispatch<State>] {
	const hook = updateWorkInProgressHook();
	// 计算新state的逻辑
	const queue = hook.updateQueue as UpdateQueue<State>;
	const baseState = hook.baseState;

	const pending = queue.shared.pending;
	const current = currentHook as Hook;
	let baseQueue = current.baseQueue;

	if (pending !== null) {
		// 将pending update 和 baseQueue 保存在current中
		if (baseQueue !== null) {
			const baseFirst = baseQueue.next;
			const pendingFirst = pending.next;

			baseQueue.next = pendingFirst;
			pending.next = baseFirst;
		}
		baseQueue = pending;
		current.baseQueue = baseQueue;

		queue.shared.pending = null;

		if (baseQueue !== null) {
			const {
				memorizedState,
				baseQueue: newBaseQueue,
				baseState: newBaseState
			} = processUpdateQueue(baseState, pending, renderLane);
			hook.memorizedState = memorizedState;
			hook.baseQueue = newBaseQueue;
			hook.baseState = newBaseState;
		}
	}

	return [hook.memorizedState, queue.dispatch as Dispatch<State>];
}
function dispatchSetState<State>(
	fiber: FiberNode,
	updateQueue: UpdateQueue<State>,
	action: Action<State>
) {
	const lane = requestUpdateLane();
	const update = createUpdate(action, lane);

	enqueueUpdate(updateQueue, update);

	scheduleUpdateOnFiber(fiber, lane);
}

function updateEffect(create: EffectCallback | void, deps: EffectDeps | void) {
	const hook = updateWorkInProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	let destroy: EffectCallback | void;

	if (currentHook !== null) {
		const prevEffect = currentHook.memorizedState as Effect;
		destroy = prevEffect.destroy;

		if (nextDeps !== null) {
			// 浅比较依赖
			const prevDeps = prevEffect.deps;
			if (areHookInputsEqual(nextDeps, prevDeps)) {
				hook.memorizedState = pushEffect(Passive, create, destroy, nextDeps);
				return;
			}
		}
		// 浅比较 不相等
		(currentlyRenderingFiber as FiberNode).flags |= PassiveEffect;
		hook.memorizedState = pushEffect(
			Passive | HookHasEffect,
			create,
			destroy,
			nextDeps
		);
	}
}

function areHookInputsEqual(nextDeps: EffectDeps, prevDeps: EffectDeps) {
	if (prevDeps === null || nextDeps === null) {
		return false;
	}
	for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
		if (Object.is(prevDeps[i], nextDeps[i])) {
			continue;
		}
		return false;
	}
	return true;
}

// 获取当前工作hook
function mountWorkInProgressHook(): Hook {
	const hook: Hook = {
		memorizedState: null,
		updateQueue: null,
		next: null,
		baseQueue: null,
		baseState: null
	};
	if (workInProgressHook === null) {
		// mount 时的第一个hook
		if (currentlyRenderingFiber === null) {
			throw new Error('请在函数组件内调用');
		} else {
			workInProgressHook = hook;
			currentlyRenderingFiber.memorizedState = workInProgressHook;
		}
	} else {
		// mount 时 后续的hook
		workInProgressHook.next = hook;
		workInProgressHook = hook;
	}
	return workInProgressHook;
}

// 获取当前工作hook
function updateWorkInProgressHook(): Hook {
	// render 阶段触发更新
	// function App() {
	// 	const [num, updateNum] = useState(0)
	// 	updateNum(100)
	// 	return <div>{num}</div>
	// }
	let nextCurrentHook: Hook | null;
	if (currentHook === null) {
		// function component update时的第一个hook
		const current = currentlyRenderingFiber?.alternate;
		if (current !== null) {
			nextCurrentHook = current?.memorizedState;
		} else {
			// mount
			nextCurrentHook = null;
		}
	} else {
		// function component update时后续的hook
		nextCurrentHook = currentHook.next;
	}

	if (nextCurrentHook === null) {
		// mount/update u1 u2 u3
		// update       u1 u2 u3 u4
		throw new Error(
			`组件${currentlyRenderingFiber?.type}本次执行时的Hook比上次执行时多`
		);
	}

	currentHook = nextCurrentHook as Hook;
	const newHook: Hook = {
		memorizedState: currentHook.memorizedState,
		updateQueue: currentHook.updateQueue,
		next: null,
		baseQueue: currentHook.baseQueue,
		baseState: currentHook.baseState
	};
	if (workInProgressHook === null) {
		// mount时 第一个hook
		if (currentlyRenderingFiber === null) {
			throw new Error('请在函数组件内调用hook');
		} else {
			workInProgressHook = newHook;
			currentlyRenderingFiber.memorizedState = workInProgressHook;
		}
	} else {
		// mount时 后续的hook
		workInProgressHook.next = newHook;
		workInProgressHook = newHook;
	}
	return workInProgressHook;
}
