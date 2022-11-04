import { LocalEventBroker } from '../brokers/LocalEventBroker';
import { EventMessage } from '../classes/EventMessage';
import { MessageEventBusForwarder } from '../classes/MessageEventBusForwarder';
import { eventBus } from '../classes/MessageEventBus';
import { MessageEventSubscriptionReceiver } from '../eventSubscribersReceivers/MessageEventSubscriptionReceiver';
import { MessageEventSubscriptionSet } from '../classes/MessageEventSubscriptionSet';

export class MessageForwarderToLocalBroker implements MessageEventBusForwarder {
	#localBroker: LocalEventBroker;

	constructor() {
		this.#localBroker = new LocalEventBroker();
		console.debug(`MessageForwarderToLocalBroker Broker initialized`);
	}

	async forward(msg: EventMessage): Promise<boolean> {
		const result = await this.#localBroker?.addMessage(msg);
		console.debug(`MessageForwarderToLocalBroker forwarded  ${msg.eventName} - ${msg.id}`);
		console.debug(
			`MessageForwarderToLocalBroker subscribers: ${result.subscribers} - actually sent: ${result.sent}`,
		);

		// to confirm it is enough that subscribers have existed at all who could potentially receive the message,
		// NOT that any of them actually subscribed to that particular eventName.
		if (result.subscribers > 0) {
			console.debug(`MessageForwarderToLocalBroker confirm ${msg.eventName} - ${msg.id}`);
			await eventBus.confirmSent(msg);
			return true;
		}
		return false;
	}

	async addReceiver(receiver: MessageEventSubscriptionReceiver) {
		await this.#localBroker.addReceiver(receiver);
		return this;
	}

	addSubscription(
		receiver: MessageEventSubscriptionReceiver,
		subscriptionSets: MessageEventSubscriptionSet[],
	) {
		this.#localBroker.addSubscriptionSets(receiver.name, subscriptionSets);
		return this;
	}
}
