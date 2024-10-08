import { randomInt } from 'n8n-workflow';
import { User } from '@/databases/entities/user';
import { CredentialsEntity } from '@/databases/entities/credentials-entity';
import { Project } from '@/databases/entities/project';

import {
	randomCredentialPayload,
	randomEmail,
	randomName,
	uniqueId,
} from '../integration/shared/random';

export const mockCredential = (): CredentialsEntity =>
	Object.assign(new CredentialsEntity(), randomCredentialPayload());

export const mockUser = (): User =>
	Object.assign(new User(), {
		id: randomInt(1000),
		email: randomEmail(),
		firstName: randomName(),
		lastName: randomName(),
	});

export const mockProject = (): Project =>
	Object.assign(new Project(), {
		id: uniqueId(),
		type: 'personal',
		name: 'Nathan Fillion <nathan.fillion@n8n.io>',
	});
