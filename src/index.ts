'use strict';

import Fluence from 'fluence';
// import {FluenceSender} from "./fluenceSender";
// import {getPageType} from "./index";
import {curl} from './artifacts/curl';
// import {local_storage} from '../../artifacts/local_storage';
// import {facade} from '../../artifacts/facade';

import {stage} from './environments';

type Config = {
	logger_enabled: boolean;
	module: { mounted_binaries: any };
	wasi: { preopened_files: string[] };
	name: string;
	mem_pages_count: number
};

function config(name: string): Config {
	return {
		name,
		mem_pages_count: 100,
		logger_enabled: true,
		module: {
			mounted_binaries: {
				curl: '/usr/bin/curl'
			}
		},
		wasi: {
			preopened_files: ['/tmp'],
		}
	};
}

export async function uploadModule() {
	Fluence.setLogLevel('trace');

	const node = stage[0];
	const client = await Fluence.connect(node.multiaddr);
	console.log(`client peer id is ${client.selfPeerId.toB58String()}`);
	const cfg = config('curl');
	await client.addModule('curl', curl, cfg, node.peerId, 20000);

	const modules = await client.getAvailableModules(node.peerId, 20000);
	console.log(`modules: ${JSON.stringify(modules)}`);

	// const historyName = 'history'
	// const userListName = 'user-list'
	//
	// await cl.addModule('curl', curl, peerId, 20000, c1);
	// const c2 = {
	// 	name: 'local_storage',
	// 	mem_pages_count: 100,
	// 	logger_enabled: true,
	// 	wasi: {
	// 		preopened_files: ['/sites'],
	// 		mapped_dirs: {sites: '/sites'},
	// 	}
	// }
	//
	// await cl.addModule('local_storage', local_storage, peerId, 20000, c2);
	// const c5 = {
	// 	name: 'facade_url_downloader',
	// 	mem_pages_count: 100,
	// 	logger_enabled: true
	// }
	// await cl.addModule('facade_url_downloader', facade, peerId, 20000);
	// console.log('5555')
	// const blueprintId = await cl.addBlueprint('Url-Downloader', ['local_storage', 'curl', 'facade_url_downloader'], URL_DOWNLOADER)
	// // let blueprintIdUserList = await cl.addBlueprint("UserList", ["sqlite3", userListName], USER_LIST_ID)
	// // let blueprintIdSQLite = await cl.addBlueprint("SQLite", ["sqlite3"], SQLITE_ID)
	// console.log(`BLUEPRINT ID: ${blueprintId}`)
	// console.log('66666')
	// // console.log(`BLUEPRINT USER LIST ID: ${blueprintIdUserList}`)
	// // console.log(`BLUEPRINT HISTORY ID: ${blueprintIdSQLite}`)
	//
	// const serviceId = cl.createService(blueprintId, undefined, 20000);
	// console.log('serviceId: ' + serviceId)
	//
	// // await create(cl, num, USER_LIST_ID, HISTORY_ID)
}


uploadModule();

