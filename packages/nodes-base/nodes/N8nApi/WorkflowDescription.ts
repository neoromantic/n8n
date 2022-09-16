import { omit } from 'lodash';
import {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
	PreSendAction,
} from 'n8n-workflow';
import { getCursorPaginator, parseAndSetBodyJson } from './GenericFunctions';

/**
 * Workflow fields that are marked read-only.
 *
 * Attempting to create or update a Workflow with these fields will
 * have the n8n API return a with a HTTP 400 error.
 */
const READ_ONLY_FIELDS = ['id', 'active', 'tags'];

/**
 * A helper function to automatically remove the read-only fields from the body
 * data, if 'removeReadOnlyFields' is set to true.
 *
 * NOTE! This expects the requestOptions.body to already be set as an object,
 * so take care to first call parseAndSetBodyJson().
 */
const maybeRemoveReadOnlyFields: PreSendAction = async function (
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const shouldRemove = this.getNodeParameter('options.removeReadOnlyFields', false) as boolean;
	if (shouldRemove) {
		requestOptions.body = omit(requestOptions.body as {}, READ_ONLY_FIELDS);
	}
	return requestOptions;
};

export const workflowOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getAll',
		displayOptions: {
			show: {
				resource: ['workflow'],
			},
		},
		options: [
			{
				name: 'Activate',
				value: 'activate',
				action: 'Activate a workflow',
				routing: {
					request: {
						method: 'POST',
						url: '=/workflows/{{ $parameter.workflowId }}/activate',
					},
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a workflow',
				routing: {
					request: {
						method: 'POST',
						url: '/workflows',
					},
				},
			},
			{
				name: 'Deactivate',
				value: 'deactivate',
				action: 'Deactivate a workflow',
				routing: {
					request: {
						method: 'POST',
						url: '=/workflows/{{ $parameter.workflowId }}/deactivate',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a workflow',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/workflows/{{ $parameter.workflowId }}',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a workflow',
				routing: {
					request: {
						method: 'GET',
						url: '=/workflows/{{ $parameter.workflowId }}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many workflows',
				routing: {
					request: {
						method: 'GET',
						url: '/workflows',
					},
					send: {
						paginate: true,
					},
					operations: {
						pagination: getCursorPaginator(),
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a workflow',
				routing: {
					request: {
						method: 'PUT',
						url: '=/workflows/{{ $parameter.workflowId }}',
					},
				},
			},
		],
	},
];

const activateOperation: INodeProperties[] = [
	{
		displayName: 'Workflow ID',
		name: 'workflowId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['activate'],
			},
		},
	},
];

const createOperation: INodeProperties[] = [
	{
		displayName: 'Workflow Object',
		name: 'workflowObject',
		type: 'json',
		default: '{ "name": "My workflow", "nodes": [], "connections": {}, "settings": {} }',
		placeholder:
			'{\n  "name": "My workflow",\n  "nodes": [],\n  "connections": {},\n  "settings": {}\n}',
		required: true,
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				preSend: [parseAndSetBodyJson('workflowObject'), maybeRemoveReadOnlyFields],
			},
		},
		description:
			"A avlid JSON object with properties of workflow, e.g. 'name', 'nodes', 'connections', 'settings'",
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Remove Read-only Fields',
				name: 'removeReadOnlyFields',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
				description:
					'Whether to automatically remove read-only fields (e.g. "id", "tags", "active")',
			},
		],
	},
];

const deactivateOperation: INodeProperties[] = [
	{
		displayName: 'Workflow ID',
		name: 'workflowId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['deactivate'],
			},
		},
	},
];

const deleteOperation: INodeProperties[] = [
	{
		displayName: 'Workflow ID',
		name: 'workflowId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['delete'],
			},
		},
	},
];

const getAllOperation: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['getAll'],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 100,
		typeOptions: {
			minValue: 1,
			maxValue: 250,
		},
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		routing: {
			request: {
				qs: {
					limit: '={{ $value }}',
				},
			},
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Return Only Active Workflows',
				name: 'activeWorkflows',
				type: 'boolean',
				default: true,
				routing: {
					request: {
						qs: {
							active: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				routing: {
					// Only include the 'tags' query parameter if it's non-empty
					send: {
						type: 'query',
						property: 'tags',
						value: '={{ $value !== "" ? $value : undefined }}',
					},
				},
				description: 'Include only workflows with these tags',
				hint: 'Comma separated list of tags (empty value is ignored)',
			},
		],
	},
];

const getOperation: INodeProperties[] = [
	{
		displayName: 'Workflow ID',
		name: 'workflowId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['get'],
			},
		},
	},
];

const updateOperation: INodeProperties[] = [
	{
		displayName: 'Workflow ID',
		name: 'workflowId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Workflow Object',
		name: 'workflowObject',
		type: 'json',
		default: '',
		placeholder:
			'{\n  "name": "My workflow",\n  "nodes": [],\n  "connections": {},\n  "settings": {}\n}',
		required: true,
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['update'],
			},
		},
		routing: {
			send: {
				preSend: [parseAndSetBodyJson('workflowObject'), maybeRemoveReadOnlyFields],
			},
		},
		description:
			"A avlid JSON object with properties of workflow, e.g. 'name', 'nodes', 'connections', 'settings'",
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Remove Read-only Fields',
				name: 'removeReadOnlyFields',
				type: 'boolean',
				default: true,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
				description:
					'Whether to automatically remove read-only fields (e.g. "id", "tags", "active")',
			},
		],
	},
];

export const workflowFields: INodeProperties[] = [
	...activateOperation,
	...createOperation,
	...deactivateOperation,
	...deleteOperation,
	...getAllOperation,
	...getOperation,
	...updateOperation,
];
