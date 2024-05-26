import {
	// 立即更新
	unstable_ImmediatePriority as ImmediatePriority,
	// 点击事件
	unstable_UserBlockingPriority as UserBlockingPriority,
	unstable_NormalPriority as NormalPriority,
	unstable_LowPriority as LowPriority,
	unstable_IdlePriority as IdlePriority,
	unstable_scheduleCallback as scheduleCallback,
	unstable_shouldYield as shouldYield,
	CallbackNode,
	unstable_getFirstCallbackNode as getFirstCallbackNode,
	unstable_cancelCallback as cancelCallback
} from 'scheduler';
import './style.css';

type Priority =
	| typeof IdlePriority
	| typeof LowPriority
	| typeof NormalPriority
	| typeof UserBlockingPriority
	| typeof ImmediatePriority;

interface Work {
	count: number;
	priority: Priority;
}
const root = document.querySelector('#root');

const workList: Work[] = [];
let prevPriority: Priority = IdlePriority;
let curCallback: CallbackNode | null = null;

[LowPriority, NormalPriority, UserBlockingPriority, ImmediatePriority].forEach(
	(priority) => {
		const btn = document.createElement('button');
		root?.appendChild(btn);
		btn.innerText = [
			'',
			'ImmediatePriority',
			'UserBlockingPriority',
			'NormalPriority',
			'LowPriority'
		][priority];
		btn.onclick = () => {
			workList.unshift({
				count: 100,
				priority: priority as Priority
			});
			schedule();
		};
	}
);

function schedule() {
	const cbNode = getFirstCallbackNode();
	// 获取优先级最高的work
	const curWork = workList.sort((w1, w2) => w1.priority - w2.priority)[0];

	// TODO 策略逻辑
	if (!curWork) {
		curCallback = null;
		cbNode && cancelCallback(cbNode);
		return;
	}

	const { priority: currentPriority } = curWork;
	if (currentPriority === prevPriority) {
		return;
	}

	// 更高优先级
	cbNode && cancelCallback(cbNode);
	curCallback = scheduleCallback(currentPriority, perform.bind(null, curWork));
}

function perform(work: Work, didTimeOut?: boolean) {
	// work count太多造成卡顿，类比react中组件多的情况
	/**
	 * 1. work.priority
	 * 2. 饥饿问题（优先级太低，一直无法执行）
	 * 3. 时间切片
	 */
	const needSync = work.priority === ImmediatePriority || didTimeOut;
	while ((needSync || !shouldYield()) && work.count) {
		work.count--;
		// insertSpan操作耗时卡顿，类比react中render /commit 耗时
		insertSpan(work.priority + '');
	}
	prevPriority = work.priority;
	// 中断执行或者已经执行完了
	if (!work.count) {
		const workIndex = workList.indexOf(work);
		workList.splice(workIndex, 1);
		prevPriority = IdlePriority;
	}

	const prevCallback = curCallback;
	schedule();
	const newCallback = curCallback;

	if (newCallback && prevCallback === newCallback) {
		return perform.bind(null, work);
	}
}

function insertSpan(content) {
	const span = document.createElement('span');
	span.innerText = content;
	span.className = `pri-${content}`;
	doSomeBusyWork(10000000);
	root?.appendChild(span);
}

function doSomeBusyWork(len: number) {
	let result = 0;
	while (len--) {
		result += len;
	}
}
