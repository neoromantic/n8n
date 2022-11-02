import { spawn, Worker, Thread } from 'threads';
import { expose } from 'threads/worker';
import { EventMessage, IEventMessageProps } from '../EventMessage';
import { EventSubscriber } from './eventSubscriber';
import { EventEmitter } from 'node:events';
import { IEventSubscriber, IEventSubscriberProps } from '../interfaces/IEventSubscriber';

class EventBusEmitter extends EventEmitter {}
const eventBusEmitter = new EventBusEmitter();
const subscribers: {
	[key: string]: IEventSubscriber;
} = {};

eventBusEmitter.on('message', function (msg: EventMessage) {
	setImmediate(async () => {
		// console.log("this happens asynchronously");
		for (const subscriberName of Object.keys(subscribers)) {
			if (subscribers[subscriberName].worker) {
				if (
					subscribers[subscriberName].eventGroups.includes(msg.getEventGroup()) ||
					subscribers[subscriberName].eventNames.includes(msg.getFullEventName())
				) {
					await subscribers[subscriberName].worker?.receive(msg);
				}
			}
		}
	});
});

const eventBusWorker = {
	addMessage(msg: IEventMessageProps) {
		eventBusEmitter.emit('message', new EventMessage(msg));
	},
	async addSubscriber(props: IEventSubscriberProps) {
		const newSubscriber =
			props.name in subscribers ? subscribers[props.name] : new IEventSubscriber(props);
		if (newSubscriber.worker) {
			await Thread.terminate(newSubscriber.worker);
		}
		newSubscriber.worker = await spawn<EventSubscriber>(new Worker(props.workerFile));
		subscribers[props.name] = newSubscriber;
	},
	getSubscribers() {
		return subscribers;
	},
	async terminateSubscribers() {
		for (const subscriberName of Object.keys(subscribers)) {
			const worker = subscribers[subscriberName].worker;
			if (worker) {
				await Thread.terminate(worker);
			}
		}
	},
	async removeSubscriber(name: string) {
		console.log('name in subscribers', name in subscribers);
		console.log(`subscribers[${name}]`, subscribers[name]);
		console.log(Object.keys(subscribers));
		if (name in subscribers) {
			const worker = subscribers[name].worker;
			if (worker) {
				await Thread.terminate(worker);
			}
			delete subscribers.name;
		}
	},
};

export type EventBusWorker = typeof eventBusWorker;

expose(eventBusWorker);
