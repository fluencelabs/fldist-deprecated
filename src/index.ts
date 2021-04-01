#!/usr/bin/env node

import { args } from './args';
import { Distributor } from './distributor';

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
