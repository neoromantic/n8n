import path from 'node:path';
import { isWorkerRuntime } from 'threads';
import { expose } from 'threads/worker';
import { EventMessage, EventMessageUnserialized } from '../classes/EventMessage';
import { MessageEventSubscriptionReceiver } from './MessageEventSubscriptionReceiver';

// -----------------------------------------
// * This part runs in the Worker Thread ! *
// -----------------------------------------

const consoleEventSubscriberWorker = {
	subscribe() {},
	receive(msg: EventMessageUnserialized | EventMessage) {
		process.stdout.write(
			`consoleEventSubscriber: Received Event ${msg.eventName} || Payload: ${JSON.stringify(
				msg.payload,
			)}\n`,
		);
	},
};
export type EventSubscriberWorker = typeof consoleEventSubscriberWorker;

if (isWorkerRuntime()) {
	expose(consoleEventSubscriberWorker);
}

// ---------------------------------------
// * This part runs in the Main Thread ! *
// ---------------------------------------

export class ConsoleEventSuscriptionReceiver extends MessageEventSubscriptionReceiver {
	constructor(name = 'ConsoleEventSuscriptionReceiver') {
		// super({ name, workerFile: path.parse(__filename).name });
		// super({
		// 	name,
		// 	workerFile: `../eventSubscribersReceivers/${path.parse(__filename).name}Worker`,
		// });
		super({
			name,
			workerFile: `../eventSubscribersReceivers/${path.parse(__filename).name}`,
		});
	}
}
