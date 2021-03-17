#!/usr/bin/env node

import { setLogLevel } from '@fluencelabs/fluence';
import yargs from 'yargs';
import { args } from './args';
import { Distributor } from './distributor';

export const DEFAULT_NODE_IDX = 3;

const main = async () => {
	if (typeof process !== 'object') {
		return;
	}

	const res = await args();

	// TODO:: it doesn't work. Need to find out why and remove all process.exit(0) calls
	const d = res.distributor as Distributor;
	await d?.closeClient();
};

main();
