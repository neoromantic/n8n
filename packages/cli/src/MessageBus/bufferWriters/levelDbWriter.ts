/* eslint-disable @typescript-eslint/no-explicit-any */
import { Level } from 'level';
import { DateTime } from 'luxon';
import { EventMessage } from '../EventMessage';
import { IMessageBufferWriter } from '../interfaces/IMessageBufferWriter';
import { plainToInstance } from 'class-transformer';

// TODO: make configurable
const KEEP_MESSAGE_BUFFER_FOR_SECONDS = 10;

export class MessageBufferLevelDbWriter implements IMessageBufferWriter {
	private db: Level<string, any>;

	private sentLevel;

	private unsentLevel;

	constructor(dbName = 'eventdb') {
		this.db = new Level<string, any>(dbName, { valueEncoding: 'json' });
		this.sentLevel = this.db.sublevel('sent', { valueEncoding: 'json' });
		this.unsentLevel = this.db.sublevel('unsent', { valueEncoding: 'json' });
		setInterval(async () => {
			console.log('Cleaning up leveldb...');
			await this.deleteSentOldMessages();
		}, 5000);
	}

	async close(): Promise<void> {
		await this.sentLevel.close();
		await this.unsentLevel.close();
		await this.db.close();
	}

	async putMessage(msg: EventMessage): Promise<void> {
		await this.unsentLevel.put(msg.getKey(), msg.toString());
	}

	putMessageSync(msg: EventMessage): void {
		this.unsentLevel.put(msg.getKey(), msg.toString()).catch((error) => {
			console.error(error);
		});
	}

	async confirmMessageSent(msg: EventMessage): Promise<void> {
		await this.unsentLevel.del(msg.getKey());
		await this.sentLevel.put(msg.getKey(), msg.toString());
	}

	async getMessages(): Promise<EventMessage[]> {
		const result = await this.db.getMany(await this.db.keys().all());
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return plainToInstance(EventMessage, result);
	}

	async getMessagesSent(): Promise<EventMessage[]> {
		const result = await this.sentLevel.getMany(await this.sentLevel.keys().all());
		return plainToInstance(EventMessage, result);
	}

	async getMessagesUnsent(): Promise<EventMessage[]> {
		const result = await this.unsentLevel.getMany(await this.unsentLevel.keys().all());
		return plainToInstance(EventMessage, result);
	}

	async recoverUnsentMessages(): Promise<void> {
		const foundKeys = await this.unsentLevel.keys().all();
		console.log(foundKeys);
	}

	async deleteSentOldMessages(
		ageLimitSeconds: number = KEEP_MESSAGE_BUFFER_FOR_SECONDS,
	): Promise<void> {
		const clearDate = DateTime.now().minus({ seconds: ageLimitSeconds }).toMillis();
		await this.sentLevel.clear({ lte: clearDate });
	}
}
