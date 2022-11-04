/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventMessage } from './EventMessage';

export interface MessageEventBusWriter {
	putMessage(msg: EventMessage): Promise<void>;
	putMessageSync(msg: EventMessage): void;
	confirmMessageSent(key: string): Promise<void>;
	getMessages(): Promise<EventMessage[]>;
	getMessagesSent(): Promise<EventMessage[]>;
	getMessagesUnsent(): Promise<EventMessage[]>;
	close(): Promise<void>;
	recoverUnsentMessages(): Promise<void>;
	flushSentMessages(ageLimitSeconds: number): Promise<void>;
}
