import { expose } from 'threads/worker';
import { EventMessage } from '../EventMessage';

const eventSubscriber = {
	subscribe() {},
	receive(msg: EventMessage) {
		process.stdout.write(`Received Event ${msg.getFullEventName()}:\n${JSON.stringify(msg)}\n\n`);
	},
};

export type EventSubscriber = typeof eventSubscriber;

expose(eventSubscriber);
