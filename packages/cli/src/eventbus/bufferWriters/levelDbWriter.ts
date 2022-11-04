/* eslint-disable @typescript-eslint/no-explicit-any */
import { Level } from 'level';
import { DateTime } from 'luxon';
import { EventMessage } from '../classes/EventMessage';
import { MessageEventBusWriter } from '../classes/MessageEventBusWriter';
import { plainToInstance } from 'class-transformer';
import { jsonParse } from 'n8n-workflow';
import { UserSettings } from 'n8n-core';
import path from 'path';

// TODO: make configurable
const KEEP_MESSAGE_BUFFER_FOR_SECONDS = 10;

/**
 * MessageEventBusWriter for LevelDB
 */
export class MessageBufferLevelDbWriter implements MessageEventBusWriter {
	// main db instance = do not write into this directly, but use sentLevel
	// and unsentLevel instead(exception: atomic batch calls)
	#db: Level<string, any>;

	// db partition holding sent messages
	#sentLevel;

	// db partition holding unsent messages
	#unsentLevel;

	constructor(dbName = 'eventdb') {
		const n8nFolder = UserSettings.getUserN8nFolderPath();
		const dbPath = path.join(n8nFolder, dbName);
		this.#db = new Level<string, any>(dbPath, { valueEncoding: 'json' });
		this.#sentLevel = this.#db.sublevel('sent', { valueEncoding: 'json' });
		this.#unsentLevel = this.#db.sublevel('unsent', { valueEncoding: 'json' });
		setInterval(async () => {
			console.log('Cleaning up leveldb...');
			await this.flushSentMessages();
		}, 5000);
	}

	async close(): Promise<void> {
		await this.#sentLevel.close();
		await this.#unsentLevel.close();
		await this.#db.close();
	}

	async putMessage(msg: EventMessage): Promise<void> {
		await this.#unsentLevel.put(EventMessage.getKey(msg), msg.toString());
	}

	putMessageSync(msg: EventMessage): void {
		this.#unsentLevel.put(EventMessage.getKey(msg), msg.toString()).catch((error) => {
			console.error(error);
		});
	}

	async confirmMessageSent(key: string): Promise<void> {
		const msg = await this.#unsentLevel.get(key);
		console.debug(`MessageBufferLevelDbWriter Key confirmed ${key}`);
		// run as atomic batch action
		if (msg) {
			await this.#db.batch([
				{
					type: 'del',
					sublevel: this.#unsentLevel,
					key,
				},
				{
					type: 'put',
					sublevel: this.#sentLevel,
					key,
					value: msg,
				},
			]);
			// await this.#unsentLevel.del(key);
			// await this.#sentLevel.put(key, msg);
		}
	}

	async getMessages(): Promise<EventMessage[]> {
		const result = await this.#db.getMany(await this.#db.keys().all());
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return plainToInstance(EventMessage, result);
	}

	async getMessagesSent(): Promise<EventMessage[]> {
		const result = await this.#sentLevel.getMany(await this.#sentLevel.keys().all());
		return plainToInstance(EventMessage, result);
	}

	async getMessagesUnsent(): Promise<EventMessage[]> {
		const result: EventMessage[] = [];
		const unsentKeys: string[] = await this.#unsentLevel.keys().all();
		const unsentValues = await this.#unsentLevel.getMany(unsentKeys);
		for (const v of unsentValues) {
			// result.push(jsonParse<EventMessage>(v));
			result.push(EventMessage.fromJSON(v));
		}
		// return { keys: unsentKeys, values: unsentValues };
		return result;
	}

	async recoverUnsentMessages(): Promise<void> {
		const foundKeys = await this.#unsentLevel.keys().all();
		console.log(foundKeys);
	}

	async flushSentMessages(
		ageLimitSeconds: number = KEEP_MESSAGE_BUFFER_FOR_SECONDS,
	): Promise<void> {
		const clearDate = DateTime.now().minus({ seconds: ageLimitSeconds }).toMillis();
		await this.#sentLevel.clear({ lte: clearDate });
	}
}
