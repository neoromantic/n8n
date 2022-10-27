/* eslint-disable import/no-cycle */
import { EntityManager } from 'typeorm';
import { Role } from '../databases/entities/Role';

export class RoleService {
	static async trxGet(transaction: EntityManager, role: Partial<Role>) {
		return transaction.findOne(Role, role);
	}
}
