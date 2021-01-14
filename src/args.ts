import yargs from "yargs";
import {addBlueprint, createService, runAir, distribute, uploadModule, getModules} from "./index";

const {hideBin} = require('yargs/helpers')

export function args() {
    return yargs(hideBin(process.argv))
        .usage('Usage: $0 <cmd> [options]') // usage string of application.
        .option('s', {
            alias: 'seed',
            demandOption: false,
            describe: 'Client seed',
            type: 'string'
        })
        .command({
            command: 'distribute',
            describe: 'Create services according to the distribution specified in the code',
            handler: async (argv) => {
                await distribute(argv.seed as string)
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
                        describe: 'Path to wasm file',
                        type: 'string'
                    })
                    .option('n', {
                        alias: 'name',
                        demandOption: true,
                        describe: 'A name of a wasm module',
                        type: 'string'
                    })
            },
            handler: async (argv) => {
                await uploadModule(argv.name as string, argv.path as string, argv.seed as string)
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
                return getModules(argv.peerId as string, argv.seed as string)
            }
        })
        .command({
                command: 'add_blueprint',
                describe: 'Add a blueprint',
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
                            demandOption: false,
                            describe: 'an id of a blueprint',
                            type: 'string'
                        })
                },
                handler: async (argv) => {
                    let id = await addBlueprint(argv.name as string, argv.id as string, argv.deps as string[], argv.seed as string)
                    console.log(`blueprint '${id}' added successfully`)
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

            },
            handler: async (argv) => {
                await createService(argv.id as string, argv.seed as string)
                console.log("service created successfully")
                return;

            }
        })
        .command({
            command: 'run_air',
            describe: 'Send an air script from a file. Send arguments to "returnService" back to the client to print them in the console. More examples in "scripts_examples" directory.',
            builder: (yargs) => {
                return yargs
                    .option('p', {
                        alias: 'path',
                        demandOption: true,
                        describe: 'Path to air script',
                        type: 'string'
                    })
                    .option('d', {
                        alias: 'data',
                        demandOption: true,
                        describe: 'Data for air script in json',
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
