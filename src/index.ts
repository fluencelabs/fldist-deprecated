#!/usr/bin/env node

import { args } from './args';

export const DEFAULT_NODE_IDX = 3;

if (typeof process === 'object') {
	args();
}
