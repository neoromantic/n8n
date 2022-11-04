import { EventMessage } from './EventMessage';
import { MessageEventBusWriter } from './MessageEventBusWriter';
import { MessageEventBusForwarder } from './MessageEventBusForwarder';
import unionBy from 'lodash.unionby';
import iteratee from 'lodash.iteratee';
import { MessageEventSubscriptionReceiver } from '../eventSubscribersReceivers/MessageEventSubscriptionReceiver';

interface MessageEventBusInitializationOptions {
	forwarders: MessageEventBusForwarder[];
	immediateWriters: MessageEventBusWriter[];
}

class MessageEventBus {
	static #instance: MessageEventBus;

	#immediateWriters: MessageEventBusWriter[];

	#forwarders: MessageEventBusForwarder[];

	#receivers: MessageEventSubscriptionReceiver[];

	#pushInteralTimer: NodeJS.Timer;

	#eventMessageQueue: EventMessage[] = [];

	static getInstance(): MessageEventBus {
		if (!MessageEventBus.#instance) {
			MessageEventBus.#instance = new MessageEventBus();
		}
		return MessageEventBus.#instance;
	}

	async initialize(options: MessageEventBusInitializationOptions) {
		if (this.#pushInteralTimer) {
			clearInterval(this.#pushInteralTimer);
		}
		this.#immediateWriters = options.immediateWriters;
		this.#forwarders = options.forwarders;

		await this.send(
			new EventMessage({
				eventName: 'n8n.core.eventBusInitialized',
				level: 'debug',
				severity: 'normal',
			}),
		);

		// check for unsent messages
		const unsentMessages = await this.getEventsUnsent();
		console.debug(`Found unsent messages: ${unsentMessages.length}`);
		for (const unsentMsg of unsentMessages) {
			await this.#forwardMessage(unsentMsg);
		}
		// this.#pushInteral = setInterval(() => {
		// 	this.#localBroker?.addMessage()
		// }, 1000);
		console.debug('MessageEventBus initialized');
	}

	async close() {
		// TODO: make sure all msg are written
		for (const writer of this.#immediateWriters) {
			await writer.close();
		}
		// TODO: make sure all msg are sent
		if (this.#eventMessageQueue.length > 0) {
			console.error('Messages left in MessageBuffer queue');
		}
	}

	async #addMessageToQueue(msg: EventMessage) {
		// this.#queue.push(msg);
		// await this.#localBroker?.addMessage(msg);
	}

	#popMessageFromQueue(): EventMessage | undefined {
		if (this.#eventMessageQueue.length > 0) {
			return this.#eventMessageQueue.shift();
		}
		return;
	}

	async send(msg: EventMessage) {
		console.debug(`MessageEventBus Msg received ${msg.eventName} - ${msg.id}`);
		await this.#writePutMessage(msg);
		await this.#forwardMessage(msg);
	}

	async confirmSent(msg: EventMessage) {
		await this.#writeConfirmMessageSent(msg.getKey());
	}

	async #writePutMessage(msg: EventMessage) {
		for (const writer of this.#immediateWriters) {
			await writer.putMessage(msg);
			console.debug(`MessageEventBus Msg written  ${msg.eventName} - ${msg.id}`);
		}
	}

	async #writeConfirmMessageSent(key: string) {
		for (const writer of this.#immediateWriters) {
			await writer.confirmMessageSent(key);
			console.debug(`MessageEventBus confirmed ${key}`);
		}
	}

	async #forwardMessage(msg: EventMessage) {
		for (const forwarder of this.#forwarders) {
			await forwarder.forward(msg);
			console.debug(`MessageEventBus Msg forwarded  ${msg.eventName} - ${msg.id}`);
		}
	}

	// publishEventSync(msg: EventMessage) {
	// 	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
	// 	this.#writer.putMessageSync(msg);
	// 	this.#addMessageToQueue(msg).catch(() => {});
	// }

	// async confirmMessageSent(key: string) {
	// 	await this.#writer.confirmMessageSent(key);
	// }

	async getEvents(options: { returnUnsent: boolean }): Promise<EventMessage[]> {
		if (this.#immediateWriters.length > 1) {
			const allQueryResults = [];
			for (const writer of this.#immediateWriters) {
				let queryResult: EventMessage[];
				if (options.returnUnsent) {
					queryResult = await writer.getMessagesUnsent();
				} else {
					queryResult = await writer.getMessagesSent();
				}
				if (queryResult.length > 0) {
					allQueryResults.push(queryResult);
				}
			}
			const unionResult = unionBy(allQueryResults, iteratee('id'));
			return unionResult;
		} else if (this.#immediateWriters.length === 1) {
			let queryResult: EventMessage[];
			if (options.returnUnsent) {
				queryResult = await this.#immediateWriters[0].getMessagesUnsent();
			} else {
				queryResult = await this.#immediateWriters[0].getMessagesSent();
			}
			return queryResult;
		} else {
			return [];
		}
	}

	async getEventsSent() {
		const sentMessages = await this.getEvents({ returnUnsent: false });
		console.debug(`Sent Messages: ${sentMessages.length}`);
		return sentMessages;
	}

	async getEventsUnsent() {
		const unSentMessages = await this.getEvents({ returnUnsent: true });
		console.debug(`Unsent Messages: ${unSentMessages.length}`);
		return unSentMessages;
	}
}

export const eventBus = MessageEventBus.getInstance();
