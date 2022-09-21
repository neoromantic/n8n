import { IDataObject, NodeOperationError } from 'n8n-workflow';
import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';
import { apiRequest } from '../transport';
import { utils as xlsxUtils } from 'xlsx';
import { get } from 'lodash';
import {
	ILookupValues,
	ISheetOptions,
	ISheetUpdateData,
	SheetRangeDecoded,
	ValueInputOption,
	ValueRenderOption,
} from './GoogleSheets.types';

export class GoogleSheet {
	id: string;
	executeFunctions: IExecuteFunctions | ILoadOptionsFunctions;

	constructor(
		spreadsheetId: string,
		executeFunctions: IExecuteFunctions | ILoadOptionsFunctions,
		options?: ISheetOptions | undefined,
	) {
		// options = <SheetOptions>options || {};
		if (!options) {
			options = {} as ISheetOptions;
		}

		this.executeFunctions = executeFunctions;
		this.id = spreadsheetId;
	}

	/**
	 * Encodes the range that also none latin character work
	 *
	 * @param {string} range
	 * @returns {string}
	 * @memberof GoogleSheet
	 */
	encodeRange(range: string): string {
		if (range.includes('!')) {
			const [sheet, ranges] = range.split('!');
			return `${encodeURIComponent(sheet)}!${ranges}`;
		}
		return encodeURIComponent(range);
	}

	/**
	 * Clears values from a sheet
	 *
	 * @param {string} range
	 * @returns {Promise<object>}
	 * @memberof GoogleSheet
	 */
	async clearData(range: string): Promise<object> {
		const body = {
			spreadsheetId: this.id,
			range,
		};

		const response = await apiRequest.call(
			this.executeFunctions,
			'POST',
			`/v4/spreadsheets/${this.id}/values/${this.encodeRange(range)}:clear`,
			body,
		);

		return response;
	}

	/**
	 * Returns the cell values
	 */
	async getData(range: string, valueRenderMode: ValueRenderOption, dateTimeRenderOption?: string) {
		const query: IDataObject = {
			valueRenderOption: valueRenderMode,
			dateTimeRenderOption: 'FORMATTED_STRING',
		};

		if (dateTimeRenderOption) {
			query.dateTimeRenderOption = dateTimeRenderOption;
		}

		const response = await apiRequest.call(
			this.executeFunctions,
			'GET',
			`/v4/spreadsheets/${this.id}/values/${this.encodeRange(range)}`,
			{},
			query,
		);

		return response.values as string[][] | undefined;
	}

	/**
	 * Returns the sheets in a Spreadsheet
	 */
	async spreadsheetGetSheets() {
		const query = {
			fields: 'sheets.properties',
		};

		const response = await apiRequest.call(
			this.executeFunctions,
			'GET',
			`/v4/spreadsheets/${this.id}`,
			{},
			query,
		);

		return response;
	}

	/**
	 *  Returns the name of a sheet from a sheet id
	 */
	async spreadsheetGetSheetNameById(sheetId: string) {
		const query = {
			fields: 'sheets.properties',
		};

		const response = await apiRequest.call(
			this.executeFunctions,
			'GET',
			`/v4/spreadsheets/${this.id}`,
			{},
			query,
		);
		const foundItem = response.sheets.find(
			(item: { properties: { sheetId: string } }) => item.properties.sheetId === sheetId,
		);
		if (!foundItem || !foundItem.properties || !foundItem.properties.title) {
			throw new Error(`Sheet with id ${sheetId} not found`);
		}
		return foundItem.properties.title;
	}

	/**
	 *  Returns the grid properties of a sheet
	 */
	async getDataRange(sheetId: string) {
		const query = {
			fields: 'sheets.properties',
		};

		const response = await apiRequest.call(
			this.executeFunctions,
			'GET',
			`/v4/spreadsheets/${this.id}`,
			{},
			query,
		);
		const foundItem = response.sheets.find(
			(item: { properties: { sheetId: string } }) => item.properties.sheetId === sheetId,
		);
		return foundItem.properties.gridProperties;
	}

	/**
	 * Sets values in one or more ranges of a spreadsheet.
	 */
	async spreadsheetBatchUpdate(requests: IDataObject[]) {
		const body = {
			requests,
		};

		const response = await apiRequest.call(
			this.executeFunctions,
			'POST',
			`/v4/spreadsheets/${this.id}:batchUpdate`,
			body,
		);

		return response;
	}

	/**
	 * Sets the cell values
	 */
	async batchUpdate(updateData: ISheetUpdateData[], valueInputMode: ValueInputOption) {
		const body = {
			data: updateData,
			valueInputOption: valueInputMode,
		};

		const response = await apiRequest.call(
			this.executeFunctions,
			'POST',
			`/v4/spreadsheets/${this.id}/values:batchUpdate`,
			body,
		);

		return response;
	}

	// isn't used anywhere
	/**
	 * Sets the cell values
	 */
	async setData(range: string, data: string[][], valueInputMode: ValueInputOption) {
		const body = {
			valueInputOption: valueInputMode,
			values: data,
		};

		const response = await apiRequest.call(
			this.executeFunctions,
			'POST',
			`/v4/spreadsheets/${this.id}/values/${range}`,
			body,
		);

		return response;
	}

	/**
	 * Appends the cell values
	 */
	async appendData(range: string, data: string[][], valueInputMode: ValueInputOption) {
		const body = {
			range,
			values: data,
		};

		const query = {
			valueInputOption: valueInputMode,
		};

		const response = await apiRequest.call(
			this.executeFunctions,
			'POST',
			`/v4/spreadsheets/${this.id}/values/${this.encodeRange(range)}:append`,
			body,
			query,
		);

		return response;
	}

	async updateRow(
		sheetName: string,
		data: string[][],
		valueInputMode: ValueInputOption,
		row: number,
	) {
		const range = `${sheetName}!${row}:${row}`;

		const body = {
			range,
			values: data,
		};

		const query = {
			valueInputOption: valueInputMode,
		};

		const response = await apiRequest.call(
			this.executeFunctions,
			'PUT',
			`/v4/spreadsheets/${this.id}/values/${this.encodeRange(range)}`,
			body,
			query,
		);

		return response;
	}

	/**
	 * Returns the given sheet data in a structured way
	 */
	structureData(
		inputData: string[][],
		startRow: number,
		keys: string[],
		addEmpty?: boolean,
	): IDataObject[] {
		const returnData = [];

		let tempEntry: IDataObject, rowIndex: number, columnIndex: number, key: string;

		for (rowIndex = startRow; rowIndex < inputData.length; rowIndex++) {
			tempEntry = {};
			for (columnIndex = 0; columnIndex < inputData[rowIndex].length; columnIndex++) {
				key = keys[columnIndex];
				if (key) {
					// Only add the data for which a key was given and ignore all others
					tempEntry[key] = inputData[rowIndex][columnIndex];
				}
			}
			if (Object.keys(tempEntry).length || addEmpty === true) {
				// Only add the entry if data got found to not have empty ones
				returnData.push(tempEntry);
			}
		}

		return returnData;
	}

	/**
	 * Returns the given sheet data in a structured way using
	 * the startRow as the one with the name of the key
	 */
	structureArrayDataByColumn(
		inputData: string[][],
		keyRow: number,
		dataStartRow: number,
	): IDataObject[] {
		const keys: string[] = [];

		if (keyRow < 0 || dataStartRow < keyRow || keyRow >= inputData.length) {
			// The key row does not exist so it is not possible to structure data
			return [];
		}

		const longestRow = inputData.reduce((a, b) => (a.length > b.length ? a : b), []).length;
		for (let columnIndex = 0; columnIndex < longestRow; columnIndex++) {
			keys.push(inputData[keyRow][columnIndex] || `col_${columnIndex}`);
		}

		return this.structureData(inputData, dataStartRow, keys);
	}

	testFilter(inputData: string[][], keyRow: number, dataStartRow: number): string[] {
		const keys: string[] = [];
		//const returnData = [];

		if (keyRow < 0 || dataStartRow < keyRow || keyRow >= inputData.length) {
			// The key row does not exist so it is not possible to structure data
			return [];
		}

		// Create the keys array
		for (let columnIndex = 0; columnIndex < inputData[keyRow].length; columnIndex++) {
			keys.push(inputData[keyRow][columnIndex]);
		}

		return keys;
	}

	async appendSheetData(
		inputData: IDataObject[],
		range: string,
		keyRowIndex: number,
		valueInputMode: ValueInputOption,
		usePathForKeyRow: boolean,
	): Promise<string[][]> {
		const data = await this.convertStructuredDataToArray(
			inputData,
			range,
			keyRowIndex,
			usePathForKeyRow,
		);
		return this.appendData(range, data, valueInputMode);
	}

	getColumnWithOffset(startColumn: string, offset: number): string {
		const columnIndex = xlsxUtils.decode_col(startColumn) + offset;
		return xlsxUtils.encode_col(columnIndex);
	}

	/**
	 * Updates data in a sheet
	 *
	 * @param {IDataObject[]} inputData Data to update Sheet with
	 * @param {string} indexKey The name of the key which gets used to know which rows to update
	 * @param {string} range The range to look for data
	 * @param {number} keyRowIndex Index of the row which contains the keys
	 * @param {number} dataStartRowIndex Index of the first row which contains data
	 * @returns {Promise<string[][]>}
	 * @memberof GoogleSheet
	 */
	async updateSheetData(
		inputData: IDataObject[],
		indexKey: string,
		range: string,
		keyRowIndex: number,
		dataStartRowIndex: number,
		valueInputMode: ValueInputOption,
		valueRenderMode: ValueRenderOption,
		upsert = false,
	): Promise<string[][]> {
		// Get current data in Google Sheet
		let rangeStart: string, rangeEnd: string, rangeFull: string;
		let sheet: string | undefined = undefined;

		if (range.includes('!')) {
			[sheet, rangeFull] = range.split('!');
		} else {
			rangeFull = range;
		}
		[rangeStart, rangeEnd] = rangeFull.split(':');

		const rangeStartSplit = rangeStart.match(/([a-zA-Z]{1,10})([0-9]{0,10})/);
		const rangeEndSplit = rangeEnd.match(/([a-zA-Z]{1,10})([0-9]{0,10})/);

		if (
			rangeStartSplit === null ||
			rangeStartSplit.length !== 3 ||
			rangeEndSplit === null ||
			rangeEndSplit.length !== 3
		) {
			throw new NodeOperationError(
				this.executeFunctions.getNode(),
				`The range "${range}" is not valid`,
			);
		}

		// const decodedRange = this.getDecodedSheetRange(range);

		// let keyRowRange = '';
		// if (decodedRange.start && decodedRange.end) {
		// 	keyRowRange = `
		// 		${decodedRange.name ? decodedRange.name + '!' : ''}
		// 		${decodedRange.start.column}${keyRowIndex + 1}:${decodedRange.end.column}${keyRowIndex + 1}
		// 	`;
		// } else {
		// 	keyRowRange = `
		// 		${decodedRange.name ? decodedRange.name + '!' : ''}${keyRowIndex + 1}:${keyRowIndex + 1}`;
		// }

		const keyRowRange = `${sheet ? sheet + '!' : ''}${rangeStartSplit[1]}${keyRowIndex + 1}:${
			rangeEndSplit[1]
		}${keyRowIndex + 1}`;

		const sheetDatakeyRow = await this.getData(keyRowRange, valueRenderMode);

		if (sheetDatakeyRow === undefined) {
			throw new NodeOperationError(
				this.executeFunctions.getNode(),
				'Could not retrieve the key row',
			);
		}

		const keyColumnOrder = sheetDatakeyRow[0];

		const keyIndex = keyColumnOrder.indexOf(indexKey);

		if (keyIndex === -1) {
			throw new NodeOperationError(
				this.executeFunctions.getNode(),
				`Could not find column for key "${indexKey}"`,
			);
		}

		const startRowIndex = rangeStartSplit[2] || dataStartRowIndex;
		const endRowIndex = rangeEndSplit[2] || '';

		const keyColumn = this.getColumnWithOffset(rangeStartSplit[1], keyIndex);
		const keyColumnRange = `${
			sheet ? sheet + '!' : ''
		}${keyColumn}${startRowIndex}:${keyColumn}${endRowIndex}`;

		const sheetDataKeyColumn = await this.getData(keyColumnRange, valueRenderMode);

		if (sheetDataKeyColumn === undefined) {
			throw new NodeOperationError(
				this.executeFunctions.getNode(),
				'Could not retrieve the key column',
			);
		}

		// TODO: The data till here can be cached optionally. Maybe add an option which can
		//       can be activated if it is used in a loop and nothing else updates the data.

		// Remove the first row which contains the key
		sheetDataKeyColumn.shift();

		// Create an Array which all the key-values of the Google Sheet
		const keyColumnIndexLookup = sheetDataKeyColumn.map((rowContent) => rowContent[0]);

		const updateData: ISheetUpdateData[] = [];
		const appendData: IDataObject[] = [];

		for (const item of inputData) {
			const inputIndexKey = item[indexKey] as string;
			if (inputIndexKey === undefined || inputIndexKey === null) {
				// Item does not have the indexKey so we can ignore it or append it if upsert true
				if (upsert) {
					appendData.push(item);
				}
				continue;
			}

			// Item does have the key so check if it exists in Sheet
			const indexOfIndexKeyInSheet = keyColumnIndexLookup.indexOf(inputIndexKey);
			if (indexOfIndexKeyInSheet === -1) {
				// Key does not exist in the Sheet so it can not be updated so skip it or append it if upsert true
				if (upsert) {
					appendData.push(item);
				}
				continue;
			}

			// Get the row index in which the data should be updated
			const updateRowIndex = indexOfIndexKeyInSheet + dataStartRowIndex + 1;

			// Check all the properties in the sheet and check which ones exist on the
			// item and should be updated
			for (const columnName of keyColumnOrder) {
				if (columnName === indexKey) {
					// Ignore the key itself as that does not get changed it gets
					// only used to find the correct row to update
					continue;
				}
				if (item[columnName] === undefined || item[columnName] === null) {
					// Property does not exist so skip it
					continue;
				}

				// Property exists so add it to the data to update
				// Get the column name in which the property data can be found
				const columnToUpdate = this.getColumnWithOffset(
					rangeStartSplit[1],
					keyColumnOrder.indexOf(columnName),
				);

				updateData.push({
					range: `${sheet ? sheet + '!' : ''}${columnToUpdate}${updateRowIndex}`,
					values: [[item[columnName] as string]],
				});
			}
		}

		if (upsert && appendData.length) {
			await this.appendSheetData(appendData, range, keyRowIndex, valueInputMode, false);
		}

		let response;
		if (updateData.length) {
			response = await this.batchUpdate(updateData, valueInputMode);
		}

		return response;
	}

	/**
	 * Looks for a specific value in a column and if it gets found it returns the whole row
	 *
	 * @param {string[][]} inputData Data to to check for lookup value in
	 * @param {number} keyRowIndex Index of the row which contains the keys
	 * @param {number} dataStartRowIndex Index of the first row which contains data
	 * @param {ILookupValues[]} lookupValues The lookup values which decide what data to return
	 * @param {boolean} [returnAllMatches] Returns all the found matches instead of only the first one
	 * @returns {Promise<IDataObject[]>}
	 * @memberof GoogleSheet
	 */
	async lookupValues(
		inputData: string[][],
		keyRowIndex: number,
		dataStartRowIndex: number,
		lookupValues: ILookupValues[],
		returnAllMatches?: boolean,
	): Promise<IDataObject[]> {
		const keys: string[] = [];

		if (keyRowIndex < 0 || dataStartRowIndex < keyRowIndex || keyRowIndex >= inputData.length) {
			// The key row does not exist so it is not possible to look up the data
			throw new NodeOperationError(this.executeFunctions.getNode(), `The key row does not exist`);
		}

		// Create the keys array
		for (let columnIndex = 0; columnIndex < inputData[keyRowIndex].length; columnIndex++) {
			keys.push(inputData[keyRowIndex][columnIndex]);
		}

		const returnData = [inputData[keyRowIndex]];

		// Standardise values array, if rows is [[]], map it to [['']] (Keep the columns into consideration)
		for (let rowIndex = 0; rowIndex < inputData?.length; rowIndex++) {
			if (inputData[rowIndex].length === 0) {
				for (let i = 0; i < keys.length; i++) {
					inputData[rowIndex][i] = '';
				}
			} else if (inputData[rowIndex].length < keys.length) {
				for (let i = 0; i < keys.length; i++) {
					if (inputData[rowIndex][i] === undefined) {
						inputData[rowIndex].push('');
					}
				}
			}
		}
		// Loop over all the lookup values and try to find a row to return
		let rowIndex: number;
		let returnColumnIndex: number;

		lookupLoop: for (const lookupValue of lookupValues) {
			returnColumnIndex = keys.indexOf(lookupValue.lookupColumn);

			if (returnColumnIndex === -1) {
				throw new NodeOperationError(
					this.executeFunctions.getNode(),
					`The column "${lookupValue.lookupColumn}" could not be found`,
				);
			}

			// Loop over all the items and find the one with the matching value
			for (rowIndex = dataStartRowIndex; rowIndex < inputData.length; rowIndex++) {
				if (
					inputData[rowIndex][returnColumnIndex]?.toString() === lookupValue.lookupValue.toString()
				) {
					returnData.push(inputData[rowIndex]);

					if (returnAllMatches !== true) {
						continue lookupLoop;
					}
				}
			}

			// If value could not be found add an empty one that the order of
			// the returned items stays the same
			if (returnAllMatches !== true) {
				returnData.push([]);
			}
		}

		return this.structureData(returnData, 1, keys, true);
	}

	private async convertStructuredDataToArray(
		inputData: IDataObject[],
		range: string,
		keyRowIndex: number,
		usePathForKeyRow: boolean,
	): Promise<string[][]> {
		let startColumn, endColumn, getRange;
		let sheet: string | undefined = undefined;
		// Handle just sheet name as range - used for auto mapping
		if (range.includes('!') || range.includes(':')) {
			if (range.includes('!')) {
				[sheet, range] = range.split('!');
			}
			if (range.includes(':')) {
				[startColumn, endColumn] = range.split(':');
			}
			getRange = `${startColumn}${keyRowIndex + 1}:${endColumn}${keyRowIndex + 1}`;
			if (sheet !== undefined) {
				getRange = `${sheet}!${getRange}`;
			}
		} else {
			sheet = range;
			getRange = range;
		}

		// Get existing data
		const sheetData = await this.getData(getRange, 'UNFORMATTED_VALUE');

		if (sheetData === undefined) {
			throw new NodeOperationError(
				this.executeFunctions.getNode(),
				'Could not retrieve the column data',
			);
		}

		// const columnNames = sheetData[keyRowIndex - 1];
		const response = await this.getData(`${sheet}!${keyRowIndex + 1}:1`, 'FORMATTED_VALUE');
		const columnNames = response ? response[0] : [];
		const setData: string[][] = [];

		// Will need to add a new column here later
		// If column
		// let rowData: string[] = [];
		inputData.forEach((item) => {
			const rowData: string[] = [];
			columnNames.forEach((key) => {
				let value;
				if (usePathForKeyRow) {
					value = get(item, key) as string;
				} else {
					value = item[key] as string;
				}
				if (value === undefined || value === null) {
					rowData.push('');
					return;
				}
				if (typeof value === 'object') {
					rowData.push(JSON.stringify(value));
				} else {
					rowData.push(value);
				}
			});
			setData.push(rowData);
		});

		return setData;
	}

	getDecodedSheetRange(stringToDecode: string): SheetRangeDecoded {
		const decodedRange: IDataObject = {};
		const [name, range] = stringToDecode.split('!');

		decodedRange.nameWithRange = stringToDecode;
		decodedRange.name = name;
		decodedRange.range = range || '';

		if (range) {
			const [startCell, endCell] = range.split(':');
			if (startCell) {
				const [cell, column, row] = startCell.match(/([a-zA-Z]{1,10})([0-9]{0,10})/) || [];
				decodedRange.start = { cell, column, row: +row };
			}
			if (endCell) {
				const [cell, column, row] = endCell.match(/([a-zA-Z]{1,10})([0-9]{0,10})/) || [];
				decodedRange.end = { cell, column, row: +row };
			}
		}

		return decodedRange as SheetRangeDecoded;
	}
}
