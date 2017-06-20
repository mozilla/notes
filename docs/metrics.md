# Notes Metrics
The metrics collection and analysis plan for Notes, a forthcoming Test Pilot experiment.


## Analysis
Data collected by Notes will be used to answer the following high-level questions:

- Do people take notes in Firefox?
	- In what intervals?
	- In what circumstances?
- What are the notes like?
	- How long are they?
	- Do they span multiple lines?
	- Do they use formatting options? Which?
- Do people sync?
	- How does syncing affect engagement?

Note: sync will not be part of the first release of this experiment; all sync-related metrics will be reported when that feature is offered.

## Collection
Data will be collected with Google Analytics and follow [Test Pilot standards](https://github.com/mozilla/testpilot/blob/master/docs/experiments/ga.md) for reporting.

### Custom Metrics
- `cm1` - the size of the notepad, in characters, with markup removed.
- `cm2` - the size of the notepad, measured by the number of lines.
- `cm3` - the size of the change, measured in the number of characters different between the content of the notepad when they began editing and the contents when the `change` event was fired, with markup removed.

### Custom Dimensions
- `cd1` - whether sync is enabled for the current user. One of `true` or `false`.
- `cd2` - whether the user has, anywhere in their notepad, changed the size of text from the default. One of `true` or `false`.
- `cd3` - whether the user has, anywhere in their notepad, bolded text. One of `true` or `false`.
- `cd4` - whether the user has, anywhere in their notepad, italicized text. One of `true` or `false`.
- `cd5` - whether the user has, anywhere in their notepad, strikethrough text. One of `true` or `false`.
- `cd6` - whether the user has, anywhere in their notepad, a list. One of `true` or `false`.
- `cd7` - the UI element used to open or close the notepad. Possible values TBD, but may include `closeButton`, `sidebarButton`, and `sidebarSwitcher`.
- `cd8` - the reason an editing session ended. One of `timeout` or `closed`.

### Events

#### `open`
An event fired when the user actively navigates to the Notes sidebar. Includes:

- `ec` - `notes`
- `ea` - `open`
- `cm1`
- `cm2`
- `cd1`
- `cd2`
- `cd3`
- `cd4`
- `cd5`
- `cd6`
- `cd7`

#### `close`
An event fired when the user actively navigates away from the Notes sidebar. Includes:

- `ec` - `notes`
- `ea` - `close`
- `cm1`
- `cm2`
- `cd1`
- `cd2`
- `cd3`
- `cd4`
- `cd5`
- `cd6`
- `cd7`

#### `changed`
An event fired when the user completes a change of the content of the notepad. It prospectively begins when a user focuses on the notepad's editable area, and ends when the user either 1) closes the sidebar, or 2) does not make any changes in 120 seconds. Includes:

- `ec` - `notes`
- `ea` - `changed`
- `cm1`
- `cm2`
- `cm3`
- `cd1`
- `cd2`
- `cd3`
- `cd4`
- `cd5`
- `cd6`
- `cd7`
- `cd8`

#### `sync-enabled`
An event fired whenever the user enables sync. Includes:

- `ec` - `notes`
- `ea` - `sync-enabled`
- `cm1`
- `cm2`
- `cd1`
- `cd2`
- `cd3`
- `cd4`
- `cd5`
- `cd6`

#### `sync-disabled`
An event fired whenever the user disables sync. Includes:

- `ec` - `notes`
- `ea` - `sync-disabled`
- `cm1`
- `cm2`
- `cd1`
- `cd2`
- `cd3`
- `cd4`
- `cd5`
- `cd6`
