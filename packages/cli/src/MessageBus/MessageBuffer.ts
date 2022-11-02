import { MessageBufferLevelDbWriter } from './bufferWriters/levelDbWriter';
import { EventMessage } from './EventMessage';
import { IMessageBufferWriter } from './interfaces/IMessageBufferWriter';

export class MessageBuffer {
	static #instance: MessageBuffer;

	static #writer: IMessageBufferWriter;

	#queue: EventMessage[] = [];

	static getInstance(): MessageBuffer {
		if (!MessageBuffer.#instance) {
			MessageBuffer.#instance = new MessageBuffer();
			MessageBuffer.#instance.initialize();
		}
		return MessageBuffer.#instance;
	}

	initialize() {
		MessageBuffer.#writer = new MessageBufferLevelDbWriter('events');
		this.publishEvent(
			new EventMessage({ eventGroup: 'n8n.core', eventName: 'messageBufferWriterInitialized' }),
		).catch(() => {});
	}

	async close() {
		// TODO: make sure all msg are written
		await MessageBuffer.#writer.close();
		// TODO: make sure all msg are sent
		if (this.#queue.length > 0) {
			console.error('Messages left in MessageBuffer queue');
		}
	}

	#addMessageToQueue(msg: EventMessage) {
		this.#queue.push(msg);
	}

	#popMessageFromQueue(): EventMessage | undefined {
		if (this.#queue.length > 0) {
			return this.#queue.shift();
		}
		return;
	}

	async publishEvent(msg: EventMessage) {
		await MessageBuffer.#writer.putMessage(msg);
		this.#addMessageToQueue(msg);
	}

	publishEventSync(msg: EventMessage) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		MessageBuffer.#writer.putMessageSync(msg);
		this.#addMessageToQueue(msg);
	}

	async getEvents() {
		return MessageBuffer.#writer.getMessages();
	}

	async getEventsSent() {
		return MessageBuffer.#writer.getMessagesSent();
	}

	async getEventsUnsent() {
		return MessageBuffer.#writer.getMessagesUnsent();
	}

	forwardEvents() {}
}

export const messageBufferInstance = MessageBuffer.getInstance();
