import Fluence from 'fluence';
import log from 'loglevel';

// NodeJS imports
import {promises as fs} from 'fs';
import {faasDev, Node} from './environments';
import {Distributor, getCustomModule} from './distributor';
import yargs from "yargs";

const {hideBin} = require('yargs/helpers')

export const TTL = 20000;

// For use in browser
interface MyNamespacedWindow extends Window {
    nodes: Node[];
    distributor: Distributor;
    distribute: () => Promise<void>;
}

declare let window: MyNamespacedWindow;
try {
    window.nodes = faasDev;
    window.distribute = distribute;
    window.distributor = new Distributor(window.nodes);
} catch (e) {
    //
}

// @ts-ignore
export async function distribute() {
    const nodes = faasDev;
    const distributor = new Distributor(nodes);
    await distributor
        .distributeServices(
            nodes[0],
            new Map([
                // ['SQLite 3', [1, 2, 3, 4]],
                ['User List', [1, 1]],
                ['Message History', [1, 1, 1]],
                // ['Redis', [5,6,7,8]]
            ]),
        )
        .then((_) => log.warn('finished'));
}

export async function loadCustomWasmModule(path: string): Promise<string> {
    const data = await fs.readFile(path);
    return data.toString('base64');
}

export async function loadWasmModule(name: string): Promise<string> {
    const data = await fs.readFile(`./src/artifacts/${name}`);
    return data.toString('base64');
}

export async function addBlueprint(name: string, id: string, deps: string[]): Promise<void> {

    const distributor = new Distributor([]);
    await distributor.uploadBlueprint(faasDev[2], {name, uuid: id, dependencies: deps})
}

export async function createService(id: string): Promise<void> {
    const distributor = new Distributor([]);
    let serviceId = await distributor.createService(faasDev[2], id)
    log.warn("Service id: " + serviceId)
}

export async function runAir(path: string, data: Map<string, any>): Promise<void> {
    const distributor = new Distributor([]);

    const fileData = await fs.readFile(path);
    const air = fileData.toString('utf-8');

    let particleId = await distributor.runAir(faasDev[2], air, data)
    log.warn(`Particle id: ${particleId}. Waiting for results... Press Ctrl+C to stop the script.`)
}

export async function uploadModule(name: string, path: string): Promise<void> {
    let module = await getCustomModule(name, path)
    const distributor = new Distributor([]);
    await distributor.uploadModule(faasDev[2], module)

    console.log(`Module uploaded!`);
}

export async function uploadAll(): Promise<void> {
    const distributor = new Distributor(faasDev);
    await distributor.load_modules();
    await distributor
        .distributeServices(
            faasDev[0],
            new Map([
                // ['SQLite 3', [1, 2, 3, 4]],
                ['User List', [1, 1]],
                ['Message History', [1, 1, 1]],
                // ['Redis', [5,6,7,8]]
            ]),
        )
        .then((_) => log.warn('finished'));
    // await log.warn(await loadWasmModule('history.wasm'));
}

if (typeof process === 'object') {
    Fluence.setLogLevel('warn');
    log.setLevel('warn');

    console.log(`log level is ${log.getLevel()}`);

    // we're running in Node.js
    log.warn('hello, node!');

    // a fairly complex CLI defined using the yargs 3.0 API:
    let argv = yargs(hideBin(process.argv))
        .usage('Usage: $0 <cmd> [options]') // usage string of application.
        .command({
            command: 'uploadAll',
            describe: 'Upload all artifacts',
            handler: async (_) => {
                await uploadAll()
            }
        })
        .command({
            command: 'upload',
            describe: 'Upload selected wasm',
            builder: (yargs) => {
                return yargs
                    .option('p', {
                        alias: 'path',
                        demandOption: true,
                        describe: 'path to wasm file',
                        type: 'string'
                    })
                    .option('n', {
                        alias: 'name',
                        demandOption: true,
                        describe: 'a name of a wasm module',
                        type: 'string'
                    })
            },
            handler: async (argv) => {
                return uploadModule(argv.name as string, argv.path as string)
            }
        })
        .command({
                command: 'add_blueprint',
                describe: 'Add blueprint',
                builder: (yargs) => {
                    return yargs
                        .option('d', {
                            alias: 'deps',
                            demandOption: true,
                            describe: 'Dependencies',
                            type: 'array'
                        })
                        .option('n', {
                            alias: 'name',
                            demandOption: true,
                            describe: 'a name of a blueprint',
                            type: 'string'
                        })
                        .option('i', {
                            alias: 'id',
                            demandOption: true,
                            describe: 'an id of a blueprint',
                            type: 'string'
                        })
                },
                handler: async (argv) => {
                    return addBlueprint(argv.name as string, argv.id as string, argv.deps as string[])

                }
            }
        )
        .command({
            command: 'create_service',
            describe: 'Create a service',
            builder: (yargs) => {
                return yargs
                    .option('i', {
                        alias: 'id',
                        demandOption: true,
                        describe: 'blueprint id',
                        type: 'string'
                    })

            },
            handler: async (argv) => {
                return createService(argv.id as string)

            }
        })
        .command({
            command: 'run_air',
            describe: 'Send an air script. Example: tsc && node -r esm . run_air -p /home/diemust/git/proto-distributor/script.clj -d \'{"provider":"780550a5-0e3a-4079-b82b-a53083a1bb19","verifier":"4f336826-9dfd-4d7b-9948-fae5cc11524f","json_path":"$.[\\"is_registered\\"]","peerId":"12D3KooWJbJFaZ3k5sNd8DjQgg3aERoKtBAnirEvPV8yp76kEXHB"}\'',
            builder: (yargs) => {
                return yargs
                    .option('p', {
                        alias: 'path',
                        demandOption: true,
                        describe: 'path to air script',
                        type: 'string'
                    })
                    .option('d', {
                        alias: 'data',
                        demandOption: true,
                        describe: 'data for air script',
                        type: 'string'
                    })
                    .coerce("data", function (arg) {
                        const dataJson = JSON.parse(arg);
                        return new Map(Object.entries(dataJson));
                    })
            },
            handler: async (argv) => {
                return runAir(argv.path as string, argv.data as Map<string, any>)

            }
        })
        .argv;

// the parsed data is stored in argv.
    console.log(argv);
}
