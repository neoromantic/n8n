import { parse } from 'node:path';
import { isWorkerRuntime } from 'threads';
import { expose } from 'threads/worker';
import { isEventMessageDeserialized } from '../classes/EventMessage';
import { MessageEventSubscriptionReceiver } from './MessageEventSubscriptionReceiver';

// -----------------------------------------
// * This part runs in the Worker Thread ! *
// -----------------------------------------

const consoleEventSubscriberWorker = {
	receive(msg: unknown) {
		if (isEventMessageDeserialized(msg)) {
			process.stdout.write(
				`consoleEventSubscriber: Received Event ${msg.eventName} || Payload: ${JSON.stringify(
					msg.payload,
				)}\n`,
			);
		}
	},
	communicate(msg: string, param: unknown) {},
};

if (isWorkerRuntime()) {
	expose(consoleEventSubscriberWorker);
}

// ---------------------------------------
// * This part runs in the Main Thread ! *
// ---------------------------------------

export class ConsoleEventSubscriptionReceiver extends MessageEventSubscriptionReceiver {
	constructor(name = 'ConsoleEventSubscriptionReceiver') {
		super({
			name,
			workerFile: `../eventSubscribersReceivers/${parse(__filename).name}`,
		});
	}
}
