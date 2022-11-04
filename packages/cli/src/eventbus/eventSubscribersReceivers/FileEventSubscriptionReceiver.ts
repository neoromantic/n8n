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

let LOG_FILE_NAME = '';
let PAUSED = true;

const fileEventSubscriberWorker = {
	receive(msg: unknown) {
		if (PAUSED) {
			return;
		}

		if (isEventMessageDeserialized(msg)) {
			appendFileSync(LOG_FILE_NAME, JSON.stringify(msg) + '\n');
		}
	},
	communicate(msg: string, param: unknown) {
		switch (msg) {
			case 'setFileName': {
				if (typeof param === 'string') {
					LOG_FILE_NAME = param;
				}
			}
			case 'pause': {
				PAUSED = true;
			}
			case 'start': {
				PAUSED = false;
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
	logFileName;

	constructor(props?: { name?: string; fileName?: string }) {
		super({
			name: props?.name ?? 'FileEventSubscriptionReceiver',
			workerFile: `../eventSubscribersReceivers/${parse(__filename).name}`,
		});
		if (props?.fileName) {
			if (!parse(props.fileName).dir) {
				this.logFileName = join(UserSettings.getUserN8nFolderPath(), props.fileName);
			} else {
				this.logFileName = props.fileName;
			}
		} else {
			this.logFileName = join(UserSettings.getUserN8nFolderPath(), 'event_log.txt');
		}
	}

	override async launchThread() {
		this.worker = await super.launchThread();
		await this.worker?.communicate('setFileName', this.logFileName);
		await this.worker?.communicate('start', undefined);
		return this.worker;
	}
}
