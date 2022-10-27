/* eslint-disable import/no-cycle */
import { EntityManager, In } from 'typeorm';
import { User } from '../databases/entities/User';

export class UserService {
	static async getByIds(transaction: EntityManager, ids: string[]) {
		return transaction.find(User, { id: In(ids) });
	}
}
