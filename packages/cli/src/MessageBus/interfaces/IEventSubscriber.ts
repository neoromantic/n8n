import { ModuleThread } from 'threads';
import { EventMessageEventGroup } from '../types/eventMessageTypes';
import { EventSubscriber } from '../workers/eventSubscriber';

export interface IEventSubscriberProps {
	name: string;
	eventGroups?: EventMessageEventGroup[];
	eventNames?: string[];
	workerFile: string;
}

export class IEventSubscriber {
	name: string;

	eventGroups: EventMessageEventGroup[];

	eventNames: string[];

	workerFile: string;

	worker: ModuleThread<EventSubscriber> | undefined;

	constructor(props: IEventSubscriberProps) {
		this.name = props.name;
		this.eventGroups = props.eventGroups ?? [];
		this.eventNames = props.eventNames ?? [];
		this.workerFile = props.workerFile ?? './eventSubscriber.ts';
	}
}
