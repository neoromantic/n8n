import { EventMessage } from './EventMessage';

// TODO: TBD
export interface MessageEventBusForwarder {
	forward(msg: EventMessage): Promise<boolean>;
}
