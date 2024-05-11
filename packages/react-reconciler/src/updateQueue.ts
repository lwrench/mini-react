import { Dispatch } from 'react/src/currentDispatcher';
import { Action } from 'shared/ReactTypes';

export interface Update<State> {
	// action 即为setState中传入的参数，即可以是一个函数，函数的返回值是需要更新的状态，也可以直接是一个状态
	// this.setState(state) 或者 this.setState((prevState) => (state))
	action: Action<State>;
}

export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null;
	};
	dispatch: Dispatch<State> | null;
}

export const createUpdate = <State>(action: Action<State>): Update<State> => {
	return {
		action
	};
};

export const createUpdateQueue = <State>() => {
	return {
		shared: {
			pending: null
		},
		dispatch: null
	} as UpdateQueue<State>;
};

export const enqueueUpdate = <State>(
	updateQueue: UpdateQueue<State>,
	update: Update<State>
) => {
	updateQueue.shared.pending = update;
};

/**
 * 消费update的方法
 * @param baseState 初始的状态
 * @param pendingUpdate 要消费的update
 * @returns 全新的状态
 */
export const processUpdateQueue = <State>(
	baseState: State,
	pendingUpdate: Update<State> | null
): { memorizedState: State } => {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memorizedState: baseState
	};

	if (pendingUpdate !== null) {
		const action = pendingUpdate.action;

		// baseState: 1, action: (prev) => prev * 2 -> memorizedState: 2
		// baseState: 1, action: 2 -> memorizedState: 2
		if (action instanceof Function) {
			result.memorizedState = action(baseState);
		} else {
			result.memorizedState = action;
		}
	}

	return result;
};
