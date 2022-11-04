import { spawn, Worker, Thread, ModuleThread } from 'threads';
// import { EventSubscriberWorker } from './ConsoleEventSuscriptionReceiverWorker';
import { EventSubscriberWorker } from './ConsoleEventSuscriptionReceiver';

export class MessageEventSubscriptionReceiver {
	name: string;

	workerFile: string;

	worker: ModuleThread<EventSubscriberWorker> | undefined;

	constructor(props: { name: string; workerFile: string }) {
		this.name = props.name;
		this.workerFile = props.workerFile;
	}

	async launchThread() {
		this.worker = await spawn<EventSubscriberWorker>(new Worker(this.workerFile));
		Thread.events(this.worker).subscribe((event) => console.debug('Thread event:', event));
	}

	async terminateThread() {
		if (this.worker) {
			await Thread.terminate(this.worker);
		}
	}

	async receiveMessage(msg: unknown) {
		console.debug('MessageEventSubscriptionReceiver received:', msg);
	}
}
