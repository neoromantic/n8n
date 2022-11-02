/* eslint-disable @typescript-eslint/no-explicit-any */
import { DateTime } from 'luxon';
import { v4 as uuid } from 'uuid';
import {
	EventMessageEventGroup,
	EventMessageEventName,
	EventMessageLevel,
	EventMessageSeverity,
} from './types/eventMessageTypes';

export interface IEventMessageProps {
	eventGroup: EventMessageEventGroup;
	eventName: EventMessageEventName;
	level?: EventMessageLevel;
	severity?: EventMessageSeverity;
	payload?: any;
	type?: string;
}

export class EventMessage {
	readonly id: string;

	readonly ts: DateTime;

	readonly #eventGroup: EventMessageEventGroup;

	readonly #eventName: EventMessageEventName;

	readonly level: EventMessageLevel;

	readonly severity: EventMessageSeverity;

	payload: any;

	/**
	 * Creates a new instance of Event Message
	 * @param props.eventGroup The general group of event this message belongs to, e.g. "n8n.core"
	 * @param props.eventName The specific events name e.g. "workflowStarted"
	 * @param props.level The log level, defaults to. "info"
	 * @param props.severity The severity of the event e.g. "normal"
	 * @returns instance of EventMessage
	 */
	constructor(props: IEventMessageProps) {
		this.id = uuid();
		this.ts = DateTime.now();
		this.#eventGroup = props.eventGroup;
		this.#eventName = props.eventName;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		this.payload = props.payload ?? {};
		this.level = props.level ?? 'info';
		this.severity = props.severity ?? 'normal';
	}

	getEventGroup(): EventMessageEventGroup {
		return this.#eventGroup;
	}

	getEventName(): EventMessageEventName {
		return this.#eventName;
	}

	getFullEventName(): string {
		return `${this.#eventGroup}.${this.#eventName}`;
	}

	toString() {
		// TODO: filter payload for sensitive info here?
		return JSON.stringify(this);
	}

	/**
	 * Combines the timestamp as milliseconds with the id to generate a unique key that can be ordered by time, alphabetically
	 * @returns database key
	 */
	getKey() {
		return `${this.ts.toMillis()}-${this.id}`;
	}
}
