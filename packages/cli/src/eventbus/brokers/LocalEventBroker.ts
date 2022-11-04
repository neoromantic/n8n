import { EventMessage } from '../classes/EventMessage';
import {
	EventSubscriberWorker,
	MessageEventSubscriptionReceiver,
} from '../eventSubscribersReceivers/MessageEventSubscriptionReceiver';
import { spawn, Worker } from 'threads';
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
					await this.#getReceiverByName(receiverName)?.worker?.receive(msg.toJSON());
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
		// newReceiver.worker = await spawn<EventSubscriberWorker>(new Worker(newReceiver.workerFile));
		newReceiver.worker = await newReceiver.launchThread();
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
