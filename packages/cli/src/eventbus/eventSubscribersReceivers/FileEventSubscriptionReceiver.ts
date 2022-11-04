import { UserSettings } from 'n8n-core';
import { join, parse } from 'node:path';
import { appendFileSync } from 'node:fs';
import { isWorkerRuntime } from 'threads';
import { expose } from 'threads/worker';
import { isEventMessageDeserialized } from '../classes/EventMessage';
import { MessageEventSubscriptionReceiver } from './MessageEventSubscriptionReceiver';

// -----------------------------------------
// * This part runs in the Worker Thread ! *
// -----------------------------------------

let MAKE_ME_CONFIGURABLE = join(UserSettings.getUserN8nFolderPath(), 'event_log.txt');

const fileEventSubscriberWorker = {
	receive(msg: unknown) {
		if (isEventMessageDeserialized(msg)) {
			appendFileSync(MAKE_ME_CONFIGURABLE, JSON.stringify(msg) + '\n');
		}
	},
	communicate(msg: string, param: unknown) {
		switch (msg) {
			case 'setFileName': {
				if (typeof param === 'string') {
					MAKE_ME_CONFIGURABLE = param;
				}
			}
		}
	},
};

if (isWorkerRuntime()) {
	expose(fileEventSubscriberWorker);
}

// ---------------------------------------
// * This part runs in the Main Thread ! *
// ---------------------------------------

export class FileEventSubscriptionReceiver extends MessageEventSubscriptionReceiver {
	constructor(name = 'FileEventSuscriptionReceiver') {
		super({
			name,
			workerFile: `../eventSubscribersReceivers/${parse(__filename).name}`,
		});
	}
}
