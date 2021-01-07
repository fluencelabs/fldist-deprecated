import yargs from "yargs";
import {addBlueprint, createService, runAir, distribute, uploadModule, getModules} from "./index";

const {hideBin} = require('yargs/helpers')

export function args() {
    return yargs(hideBin(process.argv))
        .usage('Usage: $0 <cmd> [options]') // usage string of application.
        .command({
            command: 'distribute',
            describe: 'Create services according to the distribution specified in the code',
            handler: async (_) => {
                await distribute()
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
                await uploadModule(argv.name as string, argv.path as string)
                console.log("module uploaded successfully")
                return;
            }
        })
        .command({
            command: 'get_modules',
            describe: 'Print all modules on a node',
            builder: (yargs) => {
                return yargs
                    .option('p', {
                        alias: 'peer',
                        demandOption: false,
                        describe: 'nodes peer id',
                        type: 'string'
                    })
            },
            handler: async (argv) => {
                return getModules(argv.peerId as string)
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
                    await addBlueprint(argv.name as string, argv.id as string, argv.deps as string[])
                    console.log("blueprint added successfully")
                    return;

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
                    .option('s', {
                        alias: 'seed',
                        demandOption: false,
                        describe: 'client seed',
                        type: 'string'
                    })

            },
            handler: async (argv) => {
                await createService(argv.id as string, argv.seed as string)
                console.log("service created successfully")
                return;

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
                    .option('s', {
                        alias: 'seed',
                        demandOption: false,
                        describe: 'seed',
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
                return runAir(argv.path as string, argv.data as Map<string, any>, argv.seed as string)

            }
        })
        .argv;
}
