import { IExecuteFunctions } from 'n8n-core';
import { ROW_NUMBER, SheetProperties, ValueInputOption } from '../../helpers/GoogleSheets.types';
import { IDataObject, INodeExecutionData, NodeOperationError } from 'n8n-workflow';
import { GoogleSheet } from '../../helpers/GoogleSheet';
import { autoMapInputData, mapFields, untilSheetSelected } from '../../helpers/GoogleSheets.utils';

export const description: SheetProperties = [
	{
		displayName: 'Data to Send',
		name: 'dataToSend',
		type: 'options',
		options: [
			{
				name: 'Auto-Map Input Data to Columns',
				value: 'autoMapInputData',
				description: 'Use when node input properties match destination column names',
			},
			{
				name: 'Define Below for Each Column',
				value: 'defineBelow',
				description: 'Set the value for each destination column',
			},
			{
				name: 'Nothing',
				value: 'nothing',
				description: 'Do not send anything',
			},
		],
		displayOptions: {
			show: {
				operation: ['append'],
			},
			hide: {
				...untilSheetSelected,
			},
		},
		default: 'defineBelow',
		description: 'Whether to insert the input data this node receives in the new row',
	},
	{
		displayName: 'Handling Extra Data',
		name: 'handlingExtraData',
		type: 'options',
		options: [
			{
				name: 'Insert in New Column(s)',
				value: 'insertInNewColumn',
				description: 'Create a new column for extra data',
			},
			{
				name: 'Ignore It',
				value: 'ignoreIt',
				description: 'Ignore extra data',
			},
			{
				name: 'Error',
				value: 'error',
				description: 'Throw an error',
			},
		],
		displayOptions: {
			show: {
				operation: ['append'],
				dataToSend: ['autoMapInputData'],
			},
			hide: {
				...untilSheetSelected,
			},
		},
		default: 'insertInNewColumn',
		description: 'How to handle extra data',
	},
	{
		displayName: 'Fields to Send',
		name: 'fieldsUi',
		placeholder: 'Add Field',
		type: 'fixedCollection',
		typeOptions: {
			multipleValueButtonText: 'Add Field to Send',
			multipleValues: true,
		},
		displayOptions: {
			show: {
				operation: ['append'],
				dataToSend: ['defineBelow'],
			},
			hide: {
				...untilSheetSelected,
			},
		},
		default: {},
		options: [
			{
				displayName: 'Field',
				name: 'fieldValues',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldId',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsDependsOn: ['sheetName'],
							loadOptionsMethod: 'getSheetHeaderRow',
						},
						default: '',
					},
					{
						displayName: 'Field Value',
						name: 'fieldValue',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['append'],
			},
			hide: {
				...untilSheetSelected,
			},
		},
		options: [
			{
				displayName: 'Cell Format',
				name: 'cellFormat',
				type: 'options',
				displayOptions: {
					show: {
						'/operation': ['append'],
					},
				},
				options: [
					{
						name: 'Use Format From N8N',
						value: 'RAW',
						description: 'The values will not be parsed and will be stored as-is',
					},
					{
						name: 'Automatic',
						value: 'USER_ENTERED',
						description:
							'The values will be parsed as if the user typed them into the UI. Numbers will stay as numbers, but strings may be converted to numbers, dates, etc. following the same rules that are applied when entering text into a cell via the Google Sheets UI.',
					},
				],
				default: 'RAW',
				description: 'Determines how data should be interpreted',
			},
			{
				displayName: 'Header Row',
				name: 'headerRow',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				displayOptions: {
					show: {
						'/operation': ['append'],
					},
				},
				default: 1,
				description:
					'Index of the row which contains the keys. Starts at 1. The incoming node data is matched to the keys for assignment. The matching is case sensitive.',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	sheet: GoogleSheet,
	sheetName: string,
): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const dataToSend = this.getNodeParameter('dataToSend', 0) as string;

	if (!items.length || dataToSend === 'nothing') return [];

	const options = this.getNodeParameter('options', 0, {}) as IDataObject;
	let setData: IDataObject[] = [];

	if (dataToSend === 'autoMapInputData') {
		const handlingExtraData = this.getNodeParameter('handlingExtraData', 0) as string;
		setData = await autoMapInputData.call(
			this,
			handlingExtraData,
			sheetName,
			sheet,
			items,
			options,
		);
	} else {
		setData = mapFields.call(this, items.length);
	}

	await sheet.appendSheetData(
		setData,
		sheetName,
		options.keyRow as number,
		(options.cellFormat as ValueInputOption) || 'RAW',
		false,
	);

	return items;
}
