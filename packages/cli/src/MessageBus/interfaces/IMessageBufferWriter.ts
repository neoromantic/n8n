/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventMessage } from '../EventMessage';

export interface IMessageBufferWriter {
	putMessage(msg: EventMessage): Promise<void>;
	putMessageSync(msg: EventMessage): void;
	confirmMessageSent(msg: EventMessage): Promise<void>;
	// confirmMessageSentSync(msg: EventMessage): void;
	getMessages(): Promise<EventMessage[]>;
	getMessagesSent(): Promise<EventMessage[]>;
	getMessagesUnsent(): Promise<EventMessage[]>;
	close(): Promise<void>;
	recoverUnsentMessages(): Promise<void>;
	deleteSentOldMessages(ageLimitSeconds: number): Promise<void>;
}
