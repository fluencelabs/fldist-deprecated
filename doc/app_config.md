# Application config

Application config or app config - is a file which represents application in a declarative way. `fldist` is used to deploy the specified in the file items. The deployment algorithm is the following:

1. goes through every service in `services` section
2. resolves every dependency for the service
3. uploads corresponding modules
4. uploads the service
5. executes scripts in `scripts` section
6. uploads scripts from `script_storage` section
7. appends the ids of all uploaded entities to the corresponding sections and generates the output file

The generated output can be used in a typescript application by importing the file.

The only file format for app config (at least currently) is json, which means that comments are not allowed.

## services

This section describes the list of services which should be deployed onto the Fluence Network. Represented as an object, where key correspond to the name of the service and the value is an object which describes the service configuration. Available options: `dependencies`, `node`, `modules`

### dependencies

The list of the name of modules the service is depending on. Represented as a list of strings, each item corresponds to the key in `modules` section

### node

Peer id of the node where to upload the service to.

## modules

This section describes the list of modules to be used by the services. Represented as an object, where key correspond to the name of the service and the value is an object which describes the module configuration. Available options: `file` or `url`, `config`, `modules`

### file

Path to the `.wasm` file from wich to load the module. The path is relative to the directory of the app config json file. Either `file` or `url` must be specified.

### url

Url pointing to the module `.wasm` file. Either `file` or `url` must be specified. Either `file` or `url` must be specified.

### config

Module configuration, an object with the following keys: `mapped_dirs`, `mounted_binaries`, `preopened_files`. All keys are optional. See documentation for more info.

### config.mapped_dirs

Directory mappings for the module: a list of objects in the form of `{ "alias" = "./dir" }`. This example `./dir` can be accessed by the alias _alias_.

### config.mounted_binaries

A list of mounted binary executable files

### config.preopened_files

List of directories which are can be accessed by the module. Each item in the list is a string representing the directory path.

e.g `["./dir"]` - `./dir` can be accessed by the corresponding _effector_ module.

## scripts

The section contains optional scripts to be executed for additional configuration of deployed services. Scripts are executed after the services are ready and before executing the `script_storage` section. Each script must be a separate file of air format. Variables can be specified in `variables` section of the config file. In addition to that each script gets pre-defined variables in the following format injected:

-   `init_relay` - the peer id of the relay.
-   `%service_name%` - generated id of the service defined in the `services` section.
-   `%service_name%__node` - the peer id of the node, the services is deployed to.

### file

Path to the file with the script in air format. The path is relative to the directory of the app config json file. Either `file` or `url` must be specified.

### url

Url pointing to the script in air format. Either `file` or `url` must be specified. Either `file` or `url` must be specified.

### variables

List of variables to be used in the script. Represented as an object where key corresponds to the name of the variable and the value is any object used as variable value. Can be ommited if the script contains no variables.

## script_storage

Describes the list of scripts for to be added scripts_storage (See documentation for `script add` built in function for more information). Event though script storage does not allow to use variables inside scripts (i.e the data has to be embedded into the text of script) `fldist` allows to interpolate names of services and related node peer ids in handlebars format. In other words the following syntax: `{{service}} `, `{{service__node}}` can be used to specify `service` id and the peer id of the node it's deployed to respectively.

### file

Path to the file with the script in air format. The path is relative to the directory of the app config json file. Either `file` or `url` must be specified.

### url

Url pointing to the script in air format. Either `file` or `url` must be specified. Either `file` or `url` must be specified.

### interval

Interval which the script will be executed periodically at. All intervals are rounded to 3 seconds. The minimum interval is 3 seconds.

### node

Peer id of the node where to upload the script to.

# example file

```json
{
	"services": {
		"history": {
			"dependencies": ["history_inmemory"],
			"node": "12D3KooWKEprYXUXqoV5xSBeyqrWLpQLLH4PXfvVkDJtmcqmh5V3"
		},
		"user_list": {
			"dependencies": ["user_list_inmemory"],
			"node": "12D3KooWKEprYXUXqoV5xSBeyqrWLpQLLH4PXfvVkDJtmcqmh5V3"
		}
	},
	"modules": {
		"history_inmemory": {
			"file": "history.wasm",
			"config": {
				"preopened_files": ["/tmp"],
				"mapped_dirs": { "history": "/tmp" }
			}
		},
		"user_list_inmemory": {
			"file": "user_list.wasm",
			"config": {}
		}
	},
	"scripts": {
		"set_tetraplet": {
			"file": "set_tetraplet.air",
			"variables": {
				"function": "is_authenticated",
				"json_path": "$.[\"is_authenticated\"]"
			},
			"node": "12D3KooWKEprYXUXqoV5xSBeyqrWLpQLLH4PXfvVkDJtmcqmh5V3"
		}
	},
	"script_storage": {
		"remove_disconnected": {
			"file": "remove_disconnected.air",
			"interval": 10,
			"node": "12D3KooWKEprYXUXqoV5xSBeyqrWLpQLLH4PXfvVkDJtmcqmh5V3"
		}
	}
}

```

