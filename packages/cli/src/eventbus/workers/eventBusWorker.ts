// import { spawn, Worker, Thread } from 'threads';
// import { expose } from 'threads/worker';
// import { EventMessage } from '../classes/EventMessage';

// import { MessageEventSubscriptionReceiver } from '../classes/MessageEventSubscriptionReceiver';
// import { EventSubscriberWorker } from '../eventSubscribers/ConsoleEventSuscriptionReceiver';

// const subscribers: {
// 	[key: string]: MessageEventSubscriptionReceiver;
// } = {};

// const eventBusWorker = {
// 	addMessage(msg: EventMessage) {
// 		setImmediate(async () => {
// 			console.log('sending msg to subscribers');
// 			for (const subscriberName of Object.keys(subscribers)) {
// 				if (subscribers[subscriberName].worker) {
// 					const eventGroup = msg.getEventGroup();
// 					const includesEventGroups =
// 						eventGroup !== undefined &&
// 						subscribers[subscriberName].eventGroups.includes(eventGroup);
// 					const includesEventNames = subscribers[subscriberName].eventNames.includes(
// 						msg.getEventName(),
// 					);
// 					if (includesEventGroups || includesEventNames) {
// 						await subscribers[subscriberName].worker?.receive(msg);
// 					}
// 				}
// 			}
// 		});
// 	},
// 	async addSubscriber(newSubscriber: MessageEventSubscriptionReceiver) {
// 		if (newSubscriber.name in subscribers) {
// 			const existingSubscriber = subscribers[newSubscriber.name];
// 			if (existingSubscriber.worker) {
// 				await Thread.terminate(existingSubscriber.worker);
// 			}
// 		}
// 		newSubscriber.worker = await spawn<EventSubscriberWorker>(new Worker(newSubscriber.workerFile));
// 		subscribers[newSubscriber.name] = newSubscriber;
// 	},
// 	getSubscribers() {
// 		return subscribers;
// 	},
// 	async terminateSubscriberThreads() {
// 		for (const subscriberName of Object.keys(subscribers)) {
// 			const worker = subscribers[subscriberName].worker;
// 			if (worker) {
// 				await Thread.terminate(worker);
// 			}
// 		}
// 	},
// 	async removeSubscriber(name: string) {
// 		console.log('name in subscribers', name in subscribers);
// 		console.log(`subscribers[${name}]`, subscribers[name]);
// 		console.log(Object.keys(subscribers));
// 		if (name in subscribers) {
// 			const worker = subscribers[name].worker;
// 			if (worker) {
// 				await Thread.terminate(worker);
// 			}
// 			delete subscribers.name;
// 		}
// 	},
// };

// export type EventBusWorker = typeof eventBusWorker;

// expose(eventBusWorker);
