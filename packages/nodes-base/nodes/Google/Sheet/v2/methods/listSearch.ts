import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
	INodePropertyOptions,
	NodeOperationError,
} from 'n8n-workflow';
import { GoogleSheet } from '../helpers/GoogleSheet';
import { ResourceLocator } from '../helpers/GoogleSheets.types';
import { getSpreadsheetId, sortLoadOptions } from '../helpers/GoogleSheets.utils';
import { apiRequest, apiRequestAllItems } from '../transport';

export async function spreadSheetsSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const returnData: INodeListSearchItems[] = [];
	const query: string[] = [];
	if (filter) {
		query.push(`name contains '${filter.replace("'", "\\'")}'`);
	}
	query.push("mimeType = 'application/vnd.google-apps.spreadsheet'");
	const qs = {
		pageSize: 50,
		orderBy: 'modifiedTime desc',
		fields: 'nextPageToken, files(id, name, webViewLink)',
		q: query.join(' and '),
		includeItemsFromAllDrives: true,
		supportsAllDrives: true,
	};

	const sheets = await apiRequestAllItems.call(
		this,
		'files',
		'GET',
		'',
		{},
		qs,
		'https://www.googleapis.com/drive/v3/files',
	);
	for (const sheet of sheets) {
		returnData.push({
			name: sheet.name as string,
			value: sheet.id as string,
			url: sheet.webViewLink as string,
		});
	}
	return { results: sortLoadOptions(returnData) };
}

export async function sheetsSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const { mode, value } = this.getNodeParameter('documentId', 0) as IDataObject;
	const spreadsheetId = getSpreadsheetId(mode as ResourceLocator, value as string);

	const query = {
		fields: 'sheets.properties',
	};

	const responseData = await apiRequest.call(
		this,
		'GET',
		`/v4/spreadsheets/${spreadsheetId}`,
		{},
		query,
	);

	if (responseData === undefined) {
		throw new NodeOperationError(this.getNode(), 'No data got returned');
	}

	const returnData: INodeListSearchItems[] = [];
	for (const sheet of responseData.sheets!) {
		if (sheet.properties!.sheetType !== 'GRID') {
			continue;
		}

		returnData.push({
			name: sheet.properties!.title as string,
			value: sheet.properties!.sheetId as unknown as string,
			//prettier-ignore
			url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheet.properties!.sheetId}`,
		});
	}

	return { results: returnData };
}