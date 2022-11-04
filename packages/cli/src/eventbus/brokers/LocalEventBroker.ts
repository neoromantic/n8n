/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { EventMessage } from '../classes/EventMessage';
import { MessageEventSubscriptionReceiver } from '../eventSubscribersReceivers/MessageEventSubscriptionReceiver';
import { spawn, Worker } from 'threads';
// import { EventSubscriberWorker } from '../eventSubscribersReceivers/ConsoleEventSuscriptionReceiverWorker';
import { EventSubscriberWorker } from '../eventSubscribersReceivers/ConsoleEventSuscriptionReceiver';
import { MessageEventSubscriptionSet } from '../classes/MessageEventSubscriptionSet';
import unionBy from 'lodash.unionby';
import iteratee from 'lodash.iteratee';
import remove from 'lodash.remove';

export class LocalEventBroker {
	#subscribers: {
		[key: string]: {
			receiver: MessageEventSubscriptionReceiver;
			subscriptions: MessageEventSubscriptionSet[];
		};
	} = {};

	async addMessage(msg: EventMessage): Promise<{ subscribers: number; sent: number }> {
		console.debug(`LocalEventBroker Msg received ${msg.eventName} - ${msg.id}`);
		let subscriberCountProcessed = 0;
		let subscriberCountSent = 0;
		for (const receiverName of Object.keys(this.#subscribers)) {
			const worker = this.#getReceiverByName(receiverName)?.worker;
			if (worker) {
				let match = false;
				const eventGroup = msg.getEventGroup();
				const eventName = msg.eventName;
				const subscriptionSets = this.#getSubscriptionSetsByName(receiverName);
				if (subscriptionSets) {
					for (const subscriptionSet of subscriptionSets) {
						if (
							(eventGroup !== undefined && subscriptionSet.eventGroups.includes(eventGroup)) ||
							subscriptionSet.eventNames.includes(eventName)
						) {
							match = true;
							break;
						}
					}
				}
				if (match) {
					console.debug(`LocalEventBroker Msg sent to subscriber ${msg.eventName} - ${msg.id}`);
					await this.#getReceiverByName(receiverName)?.worker?.receive(msg);
					subscriberCountSent++;
				}
			}
			subscriberCountProcessed++;
		}
		return { subscribers: subscriberCountProcessed, sent: subscriberCountSent };
	}

	async addReceiver(
		newReceiver: MessageEventSubscriptionReceiver,
		subscriptionSets?: MessageEventSubscriptionSet[],
	) {
		if (newReceiver.name in this.#subscribers) {
			await this.terminateReceiver(newReceiver.name);
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		newReceiver.worker = await spawn<EventSubscriberWorker>(new Worker(newReceiver.workerFile));
		this.#subscribers[newReceiver.name] = {
			receiver: newReceiver,
			subscriptions: subscriptionSets ?? [],
		};
	}

	async removeReceiver(receiverName: string) {
		await this.terminateReceiver(receiverName);
		delete this.#subscribers[receiverName];
	}

	addSubscriptionSets(receiverName: string, subscriptionSets: MessageEventSubscriptionSet[]) {
		if (receiverName in this.#subscribers) {
			this.#subscribers[receiverName].subscriptions = unionBy(
				this.#subscribers[receiverName].subscriptions,
				subscriptionSets,
				iteratee('name'),
			);
		}
	}

	removeSubscriptionSet(subscriptionSetName: string) {
		if (subscriptionSetName in this.#subscribers) {
			remove(
				this.#subscribers[subscriptionSetName].subscriptions,
				(e) => e.name === subscriptionSetName,
			);
		}
	}

	getSubscribers() {
		return this.#subscribers;
	}

	async terminateReceiver(receiverName?: string) {
		const terminateList = receiverName ? [receiverName] : Object.keys(this.#subscribers);
		for (const terminateName of terminateList) {
			await this.#getReceiverByName(terminateName)?.terminateThread();
		}
	}

	#getReceiverByName(receiverName: string): MessageEventSubscriptionReceiver | undefined {
		if (receiverName in this.#subscribers && this.#subscribers[receiverName].receiver) {
			return this.#subscribers[receiverName].receiver;
		}
		return;
	}

	#getSubscriptionSetsByName(receiverName: string): MessageEventSubscriptionSet[] | undefined {
		if (receiverName in this.#subscribers && this.#subscribers[receiverName].subscriptions) {
			return this.#subscribers[receiverName].subscriptions;
		}
		return;
	}
}

// export const localEventBrokerSubscribers: {
// 	[key: string]: IEventSubscriber;
// } = {};

// export class LocalEventBroker {
// 	static #instance: LocalEventBroker;

// 	#thread: ModuleThread<EventBusWorker>;

// 	static getInstance(): LocalEventBroker {
// 		if (!LocalEventBroker.#instance) {
// 			LocalEventBroker.#instance = new LocalEventBroker();
// 		}
// 		return LocalEventBroker.#instance;
// 	}

// 	static workerFn = {
// 		addMessage(msg: EventMessage) {
// 			setImmediate(async () => {
// 				if (isWorkerRuntime()) {
// 					console.log('Worker: sending msg to subscribers');
// 				} else {
// 					console.log('MainThread: sending msg to subscribers');
// 				}
// 				for (const subscriberName of Object.keys(localEventBrokerSubscribers)) {
// 					if (localEventBrokerSubscribers[subscriberName].worker) {
// 						if (
// 							localEventBrokerSubscribers[subscriberName].eventGroups.includes(
// 								msg.getEventGroup(),
// 							) ||
// 							localEventBrokerSubscribers[subscriberName].eventNames.includes(msg.getEventName())
// 						) {
// 							await localEventBrokerSubscribers[subscriberName].worker?.receive(msg);
// 						}
// 					}
// 				}
// 				await eventBus.confirmMessageSent(EventMessage.getKey(msg));
// 			});
// 		},
// 		async addSubscriber(newSubscriber: IEventSubscriber) {
// 			if (newSubscriber.name in localEventBrokerSubscribers) {
// 				const existingSubscriber = localEventBrokerSubscribers[newSubscriber.name];
// 				if (existingSubscriber.worker) {
// 					await Thread.terminate(existingSubscriber.worker);
// 				}
// 			}
// 			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
// 			newSubscriber.worker = await spawn<EventSubscriberWorker>(
// 				new Worker(newSubscriber.workerFile),
// 			);
// 			localEventBrokerSubscribers[newSubscriber.name] = newSubscriber;
// 		},
// 		getSubscribers() {
// 			return localEventBrokerSubscribers;
// 		},
// 		async terminateSubscriberThreads() {
// 			for (const subscriberName of Object.keys(localEventBrokerSubscribers)) {
// 				const worker = localEventBrokerSubscribers[subscriberName].worker;
// 				if (worker) {
// 					await Thread.terminate(worker);
// 				}
// 			}
// 		},
// 		async removeSubscriber(name: string) {
// 			console.log('name in localEventBrokerSubscribers', name in localEventBrokerSubscribers);
// 			console.log(`localEventBrokerSubscribers[${name}]`, localEventBrokerSubscribers[name]);
// 			console.log(Object.keys(localEventBrokerSubscribers));
// 			if (name in localEventBrokerSubscribers) {
// 				const worker = localEventBrokerSubscribers[name].worker;
// 				if (worker) {
// 					await Thread.terminate(worker);
// 				}
// 				delete localEventBrokerSubscribers.name;
// 			}
// 		},
// 	};

// 	async runAsThread() {
// 		if (!this.#thread) {
// 			this.#thread = await spawn<EventBusWorker>(new Worker('./workers/bus'));
// 		}
// 		return this.#thread;
// 	}

// 	async runInMainThread() {
// 		return LocalEventBroker.workerFn;
// 	}

// 	async terminate() {
// 		if (this.#thread) {
// 			await Thread.terminate(this.#thread);
// 		}
// 	}
// }

// // export const localEventBrokerInMain = LocalEventBroker.getInstance().runInMainThread();
// // export const localEventBrokerAsThread = LocalEventBroker.getInstance().runAsThread();

// export const localEventBrokerInstance = LocalEventBroker.getInstance();
// export type EventBusWorker = typeof LocalEventBroker.workerFn;
