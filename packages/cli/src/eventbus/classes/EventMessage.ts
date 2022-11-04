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

export class EventMessageDeserialized {
	readonly id: string;

	readonly ts: string;

	readonly eventName: EventMessageNames;

	readonly level: EventMessageLevel;

	readonly severity: EventMessageSeverity;

	payload: unknown;
}

export const isEventMessage = (candidate: unknown): candidate is EventMessage => {
	const o = candidate as EventMessage;
	return (
		o.eventName !== undefined &&
		o.id !== undefined &&
		o.ts !== undefined &&
		o.getEventGroup !== undefined
	);
};

export const isEventMessageDeserialized = (
	candidate: unknown,
): candidate is EventMessageDeserialized => {
	const o = candidate as EventMessageDeserialized;
	return o.eventName !== undefined && o.id !== undefined && o.ts !== undefined;
};

export class EventMessage<T = unknown> {
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
		return JSON.stringify(this.toJSON());
	}

	toJSON() {
		// TODO: filter payload for sensitive info here?
		return {
			id: this.id,
			ts: this.ts.toISO(),
			eventName: this.eventName,
			level: this.level,
			severity: this.severity,
			payload: JSON.stringify(this.payload),
		};
	}

	static fromJSONString(s: string): EventMessage {
		const json = jsonParse<EventMessage>(s);
		return new EventMessage(json);
	}

	/**
	 * Combines the timestamp as milliseconds with the id to generate a unique key that can be ordered by time, alphabetically
	 * @returns database key
	 */
	getKey(): string {
		return EventMessage.getKey(this);
	}

	/**
	 * Static version of EventMessage.getKey()
	 * Combines the timestamp as milliseconds with the id to generate a unique key that can be ordered by time, alphabetically
	 * @returns database key
	 */
	static getKey(msg: EventMessage): string {
		return `${msg.ts.toMillis()}-${msg.id}`;
	}
}
