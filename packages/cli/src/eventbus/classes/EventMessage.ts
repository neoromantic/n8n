/* eslint-disable @typescript-eslint/no-explicit-any */
import { DateTime } from 'luxon';
import { jsonParse } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import {
	EventMessageGroups,
	EventMessageNames,
	EventMessageLevel,
	EventMessageSeverity,
} from '../types/eventMessageTypes';

export interface EventMessageUnserialized {
	readonly id: string;

	readonly ts: string;

	readonly eventName: EventMessageNames;

	readonly level: EventMessageLevel;

	readonly severity: EventMessageSeverity;

	payload: unknown;
}

export class EventMessage<T = any> {
	readonly id: string;

	readonly ts: DateTime;

	readonly eventName: EventMessageNames;

	readonly level: EventMessageLevel;

	readonly severity: EventMessageSeverity;

	payload: T | undefined;

	/**
	 * Creates a new instance of Event Message
	 * @param props.eventName The specific events name e.g. "n8n.workflow.workflowStarted"
	 * @param props.level The log level, defaults to. "info"
	 * @param props.severity The severity of the event e.g. "normal"
	 * @returns instance of EventMessage
	 */
	constructor(props: {
		eventName: EventMessageNames;
		level?: EventMessageLevel;
		severity?: EventMessageSeverity;
		payload?: T;
		type?: string;
	}) {
		this.id = uuid();
		this.ts = DateTime.now();
		this.eventName = props.eventName;
		this.payload = props.payload;
		this.level = props.level ?? 'info';
		this.severity = props.severity ?? 'normal';
	}

	getEventGroup(): EventMessageGroups | undefined {
		const matches = this.eventName.match(/^[\w\s]+.[\w\s]+/);
		if (matches && matches?.length > 0) {
			return matches[0] as EventMessageGroups;
		}
		return;
	}

	getEventName(): EventMessageNames {
		return this.eventName;
	}

	toString() {
		// TODO: filter payload for sensitive info here?
		return JSON.stringify(this);
	}

	static fromJSON(s: string): EventMessage {
		const json = jsonParse<EventMessage>(s);
		return new EventMessage(json);
	}

	/**
	 * Combines the timestamp as milliseconds with the id to generate a unique key that can be ordered by time, alphabetically
	 * @returns database key
	 */
	getKey() {
		return EventMessage.getKey(this);
	}

	/**
	 * Static version of EventMessage.getKey()
	 * Combines the timestamp as milliseconds with the id to generate a unique key that can be ordered by time, alphabetically
	 * @returns database key
	 */
	static getKey(msg: EventMessage) {
		return `${msg.ts.toMillis()}-${msg.id}`;
	}
}
