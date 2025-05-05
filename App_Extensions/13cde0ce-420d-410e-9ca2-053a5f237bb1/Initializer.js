SC.event.addGlobalHandler(SC.event.QueryTabContainsRelativeTimes, function (eventArgs) {
	if (isDiagnosticsTab(eventArgs.tabName))
		eventArgs.hasRelativeTimes = true;
});

SC.event.addGlobalHandler(SC.event.PreRender, function (eventArgs) {
	if (SC.context.pageType === 'HostPage')
		SC.util.includeStyleSheet(extensionContext.baseUrl + 'RemoteDiagnosticsToolkit.css');
});

SC.event.addGlobalHandler(SC.event.QueryCommandButtonState, function (eventArgs) {
	if (isDiagnosticsTab(eventArgs.commandArgument)) {
		eventArgs.isEnabled = eventArgs.isVisible = eventArgs.commandContext.sessionType !== SC.types.SessionType.Meeting &&
			eventArgs.commandContext &&
			eventArgs.commandContext.sessions &&
			eventArgs.commandContext.sessions.length === 1 &&
			(eventArgs.commandContext.permissions & SC.types.SessionPermissions.RunCommandOutside) > 0 &&
			(eventArgs.commandContext.permissions & SC.types.SessionPermissions.RemoveCommand) > 0;
	}
});

SC.event.addGlobalHandler(SC.event.QueryCommandButtons, function (eventArgs) {
	switch (eventArgs.area) {
		case 'HostDetailTabList':
			Array.prototype.push.apply(eventArgs.buttonDefinitions,
				commandTabNameMap.map(function (it) {
					return { commandName: 'Select', commandArgument: it.tabName, text: SC.res['DiagnosticsToolkit.' + it.commandName + 'Tab.Label'], imageUrl: extensionContext.baseUrl + 'Images/' + it.commandName + '.png', tooltipOrTitle: true, };
				})
			);
			break;
		case 'DownloadLatestDiagnosticEventData':
			eventArgs.buttonDefinitions.push(
				{ commandName: 'DownloadEventData', text: SC.res['DiagnosticsToolkit.DownloadData.Label'] }
			);
			break;
	}
});

SC.event.addGlobalHandler(SC.event.ExecuteCommand, function (eventArgs) {
	const dataItem = SC.util.combineObjects.apply(this, SC.command.getEventDataItems(eventArgs));
	switch (eventArgs.commandName) {
		case 'RefreshDiagnostics':
			if (isSessionGuestConnected(dataItem.session)) {
				executeRemoteCommand("Get" + dataItem.commandName, null, dataItem.session.GuestOperatingSystemName);
				setLoadingIndicator(true);
			}
			break;
		case 'ExecuteRemoteCommand':
			if (isSessionGuestConnected(dataItem.session)) {
				executeRemoteCommand(eventArgs.commandArgument, dataItem.itemData, dataItem.session.GuestOperatingSystemName);
				setLoadingIndicator(true);
				SC.css.ensureClass(SC.command.getEventDataElement(eventArgs), 'Loading', true);
			}
			break;
		case 'DownloadEventData':
			var dt = new Date();
			var link = $a({
				download: SC.util.formatString(SC.res['DiagnosticsToolkit.DownloadData.FileNameFormat'], dataItem.session.Name, dataItem.commandName, dt.toLocaleDateString(), dt.toLocaleTimeString()),
				href: 'data:text/plain,' + window.encodeURIComponent(dataItem.eventParseResult.rawContent),
			});
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			break;
	}
});

SC.event.addGlobalHandler(SC.event.InitializeTab, function (eventArgs) {
	if (isDiagnosticsTab(eventArgs.tabName)) {
		SC.ui.setContents(eventArgs.container, [
			$div({ className: 'DiagnosticsHeader' }, [
				$h2(SC.res['DiagnosticsToolkit.' + getDiagnosticsTabCommandName(eventArgs.tabName) + 'Tab.Label']),
				$div({ className: 'LastUpdatePanel' }, [
					$span({ className: 'LastUpdateTime' }),
					SC.command.createCommandButtons([{ commandName: 'RefreshDiagnostics', text: SC.res['DiagnosticsToolkit.Refresh.Button'] }])
				]),
				$div({ className: 'FilterBoxPanel' },
					SC.ui.createFilterBox({ id: 'diagnosticsFilterBox' }, function () { applyFilter(eventArgs.container); }),
				),
			]),
			$div({ className: 'InformationDisplayContainer' },
				$div({ className: 'EmptyPanel' },
					getEmptyStateContents(eventArgs.tabName)
				),
				$table({ className: 'DataTable' })
			),
			$div({ className: 'DownloadButtonPanel' }, [
				$div({ className: 'DownloadDataButton' }, SC.command.queryAndCreateCommandButtons('DownloadLatestDiagnosticEventData'))
			])
		]);

		setLoadingIndicator(true);
	}
});

SC.event.addGlobalHandler(SC.event.RefreshTab, function (eventArgs) {
	if (isDiagnosticsTab(eventArgs.tabName)) {
		var sessionInfo = SC.pagedata.get();
		var isGuestConnected = isSessionGuestConnected(eventArgs.session);

		var tryDeleteEvents = function (eventCollection, eventType, shouldDeleteFunc) {
			if (eventCollection)
				eventCollection.forEach(function (item, i) {
					if (shouldDeleteFunc(item, i)) {
						SC.service.DeleteDiagnosticCommandEvents(
							sessionInfo.SessionGroupPath,
							eventArgs.session.SessionID,
							item.ConnectionID || null,
							item.EventID,
							eventType
						);
					}
				});
		};

		var getQueuedEvents = function (parseResultPredicate) {
			return eventArgs.sessionDetails.Events
				.filter(function (e) { return e.EventType === SC.types.SessionEventType.QueuedCommand; })
				.filter(function (e) { return parseResultPredicate(parseQueuedCommandEvent(e.Data)); })
				.sort(function (x, y) { return x.Time - y.Time; });
		};

		var diagnosticEventPredicate = function (it) { return it.isValid && it.headers.Command === "Get" + getDiagnosticsTabCommandName(eventArgs.tabName); };
		var invalidatingEventPredicate = function (it) { return it.isValid && it.headers && it.headers['InvalidatesCommand']; };

		var queuedDiagnosticEvents = getQueuedEvents(diagnosticEventPredicate);

		var latestQueuedDiagnosticEvent = queuedDiagnosticEvents.length > 0 ? queuedDiagnosticEvents[0] : null;

		var queuedInvalidatingEvents = getQueuedEvents(invalidatingEventPredicate);

		var latestQueuedInvalidatingEvent = queuedInvalidatingEvents.length > 0 ? queuedInvalidatingEvents[0] : null;

		var versionParts = SC.context.productVersion.split('.');

		if (versionParts && versionParts.length > 1) {
			var ranEvents;
			if (SC.util.isVersion({ major: 22, minor: 9 }, null, { major: versionParts[0], minor: versionParts[1] })) {
				ranEvents = eventArgs.sessionDetails.Events
					.filter(function (e) {
						if (e.ConnectionID !== null && e.EventType == SC.types.SessionEventType.RanCommand) {
							var parseResult = parseRanCommandEvent(e.Data, 1);
							return parseResult.isValid;
						}
	
						return false;
					});
			}
			else
			{
				ranEvents = eventArgs.sessionDetails.Connections
					.map(function (c) {
						Array.prototype.forEach.call(c.Events, function (e) {
							e.ConnectionID = c.ConnectionID;
						});
		
						return c.Events;
					})
					.reduce(function (outputArray, events) { Array.prototype.push.apply(outputArray, events); return outputArray; }, [])
					.filter(function (e) {
						if (e.EventType === SC.types.SessionEventType.RanCommand) {
							var parseResult = parseRanCommandEvent(e.Data, 1);
							return parseResult.isValid;
						}
		
						return false;
					});
			}
		}

		var getRanEvents = function (parseResultPredicate) {
			return ranEvents
				.filter(function (e) { return parseResultPredicate(parseRanCommandEvent(e.Data, 1)); })
				.sort(function (x, y) { return x.Time - y.Time; });
		};

		var ranDiagnosticEvents = getRanEvents(diagnosticEventPredicate);

		var latestRanDiagnosticEvent = ranDiagnosticEvents.length > 0 ? ranDiagnosticEvents[0] : null;

		var ranInvalidatingEvents = getRanEvents(invalidatingEventPredicate);

		var latestRanInvalidatingEvent = ranInvalidatingEvents.length > 0 ? ranInvalidatingEvents[0] : null;

		var latestRanDiagnosticEventParseResult = latestRanDiagnosticEvent ? parseRanCommandEvent(latestRanDiagnosticEvent.Data, 2) : null;

		eventArgs.container._dataItem = {
			commandName: getDiagnosticsTabCommandName(eventArgs.tabName),
			event: latestRanDiagnosticEvent,
			session: eventArgs.session,
			eventParseResult: latestRanDiagnosticEventParseResult,
		};

		setLoadingIndicator(!latestRanDiagnosticEvent || latestQueuedDiagnosticEvent || latestRanInvalidatingEvent || latestQueuedInvalidatingEvent);

		var informationDisplayContainer = eventArgs.container.querySelector('.InformationDisplayContainer');
		SC.css.ensureClass(informationDisplayContainer, 'Empty', !latestRanDiagnosticEvent);

		SC.ui.setVisible($('.FilterBoxPanel'), latestRanDiagnosticEvent);

		if (isGuestConnected
			&& (!latestQueuedDiagnosticEvent || latestQueuedDiagnosticEvent.Time > 45000)
			&& (!latestRanDiagnosticEvent
				|| (latestRanInvalidatingEvent && latestRanInvalidatingEvent.Time < latestRanDiagnosticEvent.Time)
				|| (latestRanDiagnosticEvent.Time > 300000)
			)
		) {
			executeRemoteCommand('Get' + getDiagnosticsTabCommandName(eventArgs.tabName), null, eventArgs.session.GuestOperatingSystemName);
			setLoadingIndicator(true);
		}

		var ranCommandInfos = ranEvents
			.map(function (ranEvent) {
				return {
					time: ranEvent.Time,
					parseResult: parseRanCommandEvent(ranEvent.Data, 1),
				};
			})
			.filter(function (eventInfo) {
				return eventInfo.parseResult.isValid
					&& eventInfo.parseResult.headers
					&& eventInfo.parseResult.headers.Command
					&& eventInfo.parseResult.headers.CommandKey;
			})
			.map(function (eventInfo) {
				return {
					ranEventTime: eventInfo.time,
					command: eventInfo.parseResult.headers.Command,
					commandKey: eventInfo.parseResult.headers.CommandKey,
				};
			});

		var unshownCommandInfos = eventArgs.sessionDetails.Events
			.filter(function (it) { return it.EventType === SC.types.SessionEventType.QueuedCommand; })
			.map(function (queuedCommandEvent) {
				return {
					id: queuedCommandEvent.EventID,
					time: queuedCommandEvent.Time,
					parseResult: parseQueuedCommandEvent(queuedCommandEvent.Data),
				};
			})
			.filter(function (eventInfo) {
				return eventInfo.parseResult.isValid
					&& eventInfo.parseResult.headers
					&& eventInfo.parseResult.headers.Command
					&& eventInfo.parseResult.headers.CommandKey
					&& eventInfo.parseResult.headers.CommandKeyIndices;
			})
			.map(function (eventInfo) {
				return {
					queuedEventID: eventInfo.id,
					queuedEventTime: eventInfo.time,
					command: eventInfo.parseResult.headers.Command,
					commandKey: eventInfo.parseResult.headers.CommandKey,
					commandKeyIndices: eventInfo.parseResult.headers.CommandKeyIndices,
				};
			})
			.filter(function (commandInfo) {
				return !latestRanDiagnosticEvent
					|| latestRanDiagnosticEvent.Time >= commandInfo.queuedEventTime
					|| !ranCommandInfos.some(function (ranCommandInfo) {
						return ranCommandInfo.command === commandInfo.command
							&& ranCommandInfo.commandKey === commandInfo.commandKey
							&& ranCommandInfo.ranEventTime < commandInfo.queuedEventTime
							&& ranCommandInfo.ranEventTime >= latestRanDiagnosticEvent.Time;
					});
			});

		tryDeleteEvents(
			queuedDiagnosticEvents,
			SC.types.SessionEventType.QueuedCommand,
			function (queuedDiagnosticEvent, i) { return i > 0 || latestRanDiagnosticEvent && latestRanDiagnosticEvent.Time < queuedDiagnosticEvent.Time; }
		);

		tryDeleteEvents(
			queuedInvalidatingEvents,
			SC.types.SessionEventType.QueuedCommand,
			function (queuedInvalidatingEvent) {
				return !unshownCommandInfos.some(function (unshownCommandInfo) {
					return unshownCommandInfo.queuedEventID === queuedInvalidatingEvent.EventID;
				});
			}
		);

		tryDeleteEvents(
			ranInvalidatingEvents,
			SC.types.SessionEventType.RanCommand,
			function (ranInvalidatingEvent, i) {
				if (i == 0 && (!latestRanDiagnosticEvent || latestRanDiagnosticEvent.Time >= ranInvalidatingEvent.Time))
					return false;

				var ranInvalidatingEventParseResult = parseRanCommandEvent(ranInvalidatingEvent.Data, 1);

				return !ranInvalidatingEventParseResult.isValid
					|| !ranInvalidatingEventParseResult.headers
					|| !ranInvalidatingEventParseResult.headers.Command
					|| !ranInvalidatingEventParseResult.headers.CommandKey
					|| !unshownCommandInfos.some(function (unshownCommandInfo) {
						return unshownCommandInfo.command === ranInvalidatingEventParseResult.headers.Command
							&& unshownCommandInfo.commandKey === ranInvalidatingEventParseResult.headers.CommandKey
							&& unshownCommandInfo.queuedEventTime >= ranInvalidatingEvent.Time;
					});
			}
		);

		tryDeleteEvents(ranDiagnosticEvents, SC.types.SessionEventType.RanCommand, function (ranDiagnosticEvent, i) { return i > 0; });

		if (latestRanDiagnosticEvent) {
			eventArgs.container.querySelector('.LastUpdateTime').innerHTML = "Updated " + SC.util.formatSecondsDuration(latestRanDiagnosticEvent.Time / 1000) + " ago";
			var buttonDefinitions = getButtonDefinitions(latestRanDiagnosticEventParseResult);
			var unavailableCommandsColumnIndex = latestRanDiagnosticEventParseResult.columnNames.findIndex(c => c == 'UnavailableCommands');
			SC.css.ensureClass($('.InformationDisplayContainer .DataTable'), 'NoActionCellDataTable', buttonDefinitions.length === 0);

			if (latestRanDiagnosticEventParseResult.data) {
				var hiddenColumnIndices = latestRanDiagnosticEventParseResult.headers && latestRanDiagnosticEventParseResult.headers['HiddenColumnIndices']
					? latestRanDiagnosticEventParseResult.headers['HiddenColumnIndices'].split(',').map(function (index) { return +index; })
					: [];

				// It would have been ideal to do all the styling in the RemoteDiagnosticsToolkit.css
				// file. However, since we do not have access to the required variables, like
				// the $shade1BackgroundColor, whose value changes depending on the theme, over there,
				// we had to do the styling in JavaScript so that we can programmatically determine
				// their correct (theme-based) values.
				var desiredBackgroundColor = '';

				SC.ui.findAncestor(informationDisplayContainer, function (currentElement) {
					var defaultBackgroundColor = 'rgba(0, 0, 0, 0)';
					var currentElementBackgroundColor = window.getComputedStyle(currentElement).backgroundColor;

					if (currentElementBackgroundColor !== defaultBackgroundColor) {
						desiredBackgroundColor = currentElementBackgroundColor;
						return true;
					}

					return false;
				});

				informationDisplayContainer.style.background = SC.util.formatString(
					'linear-gradient({0} 70%, hsla(0, 0%, 100%, 0)), ' +
					'linear-gradient(hsla(0, 0%, 100%, 0) 10px, {0} 30%), ' +
					'radial-gradient(at top, rgba(0, 0, 0, 0.2), transparent 70%), ' +
					'radial-gradient(at bottom, rgba(0, 0, 0, 0.2), transparent 70%)',
					desiredBackgroundColor
				);
				informationDisplayContainer.style.backgroundRepeat = 'no-repeat';
				informationDisplayContainer.style.backgroundSize = '100% 50px, 100% 50px, 100% 10px, 100% 10px';
				informationDisplayContainer.style.backgroundPosition = 'left top, right bottom, left 0px top 23px, right bottom';
				informationDisplayContainer.style.backgroundAttachment = 'local, local, scroll, scroll';
				informationDisplayContainer.style.backgroundColor = desiredBackgroundColor;

				var tableHeaderCellCssText = SC.util.formatString('background-color: {0}; background-clip: padding-box; opacity: 1.0;', desiredBackgroundColor);

				SC.ui.setContents(eventArgs.container.querySelector('table'), [
					$tr(
						$th({ className: 'ActionCell HeaderCell', _cssText: tableHeaderCellCssText }),
						latestRanDiagnosticEventParseResult.columnNames
							.filter(function (it, index) { return !hiddenColumnIndices.some(function (hiddenIndex) { return hiddenIndex === index; }); })
							.map(function (columnName) { return $th({ className: 'HeaderCell', _cssText: tableHeaderCellCssText }, columnName); })
					),
					latestRanDiagnosticEventParseResult.data.map(function (itemData) {
						return $tr({
							_dataItem: { itemData: itemData },
							_classNameMap: {
								'Loading': unshownCommandInfos.some(function (unshownCommandInfo) {
									return unshownCommandInfo.commandKey
										=== unshownCommandInfo
											.commandKeyIndices
											.split(',')
											.map(function (index) { return itemData[+index]; })
											.join('');
								}),
							},
						}, [
							$td({ className: 'ActionCell' }, SC.command.createCommandButtons(filterUnavailableCommands(unavailableCommandsColumnIndex, itemData, buttonDefinitions))),
							itemData
								.filter(function (it, index) { return !hiddenColumnIndices.some(function (hiddenIndex) { return hiddenIndex === index; }); })
								.map(function (cellData) { return $td(cellData); }),
						]);
					}),
				]);
			}

			applyFilter(eventArgs.container);
		} else {
			SC.ui.setContents(
				eventArgs.container.querySelector('.EmptyPanel'),
				getEmptyStateContents(eventArgs.tabName, isGuestConnected)
			);

			if (!isGuestConnected)
				setLoadingIndicator(false);
		}
	}
});

var commandTabNameMap = ['Processes', 'Software', 'EventLog', 'Services', 'Updates'].map(function (it) {
	return { commandName: it, tabName: 'RemoteDiagnosticToolkit.' + it };
});

function isDiagnosticsTab(tabName) {
	return commandTabNameMap.find(function (it) { return it.tabName === tabName; }) ? true : false;
}

function getDiagnosticsTabCommandName(tabName) {
	return commandTabNameMap.find(function (it) { return it.tabName === tabName; }).commandName;
}

function getEmptyStateContents(tabName, isGuestConnected = true) {
	var tabCommandName = getDiagnosticsTabCommandName(tabName);
	return [
		$p(
			$img({
				src: extensionContext.baseUrl + 'Images/' + tabCommandName + 'Empty.png',
			})
		),
		$h2({ innerHTML: getEmptyStateTitle(tabCommandName, isGuestConnected) }),
		$p({ innerHTML: getEmptyStateText(tabCommandName, isGuestConnected) })
	];
}

function getEmptyStateTitle(tabCommandName, isGuestConnected) {
	var tabLabel = SC.res['DiagnosticsToolkit.' + tabCommandName + 'Tab.Label'];

	return isGuestConnected
		? SC.util.formatString(
			'{0} {1}',
			tabLabel,
			SC.res["DiagnosticsToolkit.EmptyTab.TitleLoadingSuffix"]
		)
		: SC.util.formatString(
			'{0} {1} {2}',
			SC.res['DiagnosticsToolkit.EmptyTab.TitlePrefix'],
			tabLabel,
			SC.res['DiagnosticsToolkit.EmptyTab.TitleSuffix']
		);
}

function getEmptyStateText(tabCommandName, isGuestConnected) {
	return isGuestConnected
		? SC.util.formatString(SC.res['DiagnosticsToolkit.EmptyTab.TextFormat'], SC.res['DiagnosticsToolkit.' + tabCommandName + 'Tab.Label'])
		: SC.res['DiagnosticsToolkit.EmptyTab.GuestNotConnectedText'];
}

function isSessionGuestConnected(session) {
	return session && session.ActiveConnections && session.ActiveConnections.length > 0 ?
		session.ActiveConnections.some(function (it) { return it.ProcessType === SC.types.ProcessType.Guest; }) :
		false;
}

function applyFilter(container) {
	var valueUpper = container.querySelector("input").value.toUpperCase();
	var table = container.querySelector("table");
	Array.from(table.children).forEach(it => SC.ui.setVisible(it, it.innerHTML.toUpperCase().search(valueUpper) !== -1));
}

function setLoadingIndicator(addOrRemove) {
	var element = $('.LastUpdatePanel a');

	if (element)
		SC.css.ensureClass(element, 'LoadingIndicatorRight', addOrRemove);
}

function getButtonDefinitions(parseResult) {

	var availableCommands = parseResult.headers && parseResult.headers['AvailableCommands']
		? parseResult.headers['AvailableCommands'].split(',')
		: [];

	var buttonDefinitions = Array();

	if (availableCommands && availableCommands.length > 0) {
		for (var i = 0; i < availableCommands.length; i++)
			buttonDefinitions.push({
				commandName: 'ExecuteRemoteCommand',
				commandArgument: availableCommands[i],
				text: SC.res['DiagnosticsToolkit.MachineInteraction.' + availableCommands[i]],
			});
	}

	return buttonDefinitions;
}

function filterUnavailableCommands(unavailableCommandsColumnIndex, itemData, buttonDefinitions) {
	var filteredButtonDefinitions = buttonDefinitions;
	if (itemData[unavailableCommandsColumnIndex] && itemData[unavailableCommandsColumnIndex] != '')
		filteredButtonDefinitions = buttonDefinitions.filter(function (buttonDefinition) {
			return !itemData[unavailableCommandsColumnIndex].includes('|' + buttonDefinition.commandArgument + '|');
		});
	return filteredButtonDefinitions;
}

function executeRemoteCommand(remoteCommandName, itemData, operatingSystemName) {
	var osType = operatingSystemName.indexOf("Windows") >= 0 || operatingSystemName.indexOf("Server") >= 0 ? "Windows"
		: operatingSystemName.indexOf("Linux") >= 0 ? "Linux"
			: operatingSystemName.indexOf("Mac") >= 0 ? "OSX"
				: "Unknown";

	var commandInfo = getCommandInfo(remoteCommandName, itemData, osType);

	var emptyLinePrefix, delimiter, modifier;

	if (commandInfo.processor === 'sh') {
		modifier = "echo ";
		delimiter = '';
		emptyLinePrefix = 'echo ';
	} else {
		modifier = "echo \"";
		delimiter = '\"';
		emptyLinePrefix = 'echo ""';
	}

	var eventData = "#!" + commandInfo.processor + "\n" +
		"#maxlength=50000000" + "\n" +
		"#timeout=900000" + "\n" +
		"#DIAGNOSTIC-REQUEST/2" + "\n" +
		"#Command: " + remoteCommandName + "\n" +
		"#CommandKeyIndices: " + (commandInfo.commandKeyIndices ? commandInfo.commandKeyIndices.join(',') : "") + "\n" +
		"#CommandKey: " + (commandInfo.commandKey || "") + "\n" +
		"#AvailableCommands: " + "\n" +
		"#InvalidatesCommand: " + (commandInfo.invalidatesCommand || "") + "\n" +
		"#HiddenColumnIndices: " + "\n" +
		modifier + "DIAGNOSTIC-RESPONSE/2" + delimiter + "\n" +
		modifier + "Command: " + remoteCommandName + delimiter + "\n" +
		modifier + "CommandKeyIndices: " + (commandInfo.commandKeyIndices ? commandInfo.commandKeyIndices.join(',') : "") + delimiter + "\n" +
		modifier + "CommandKey: " + (commandInfo.commandKey || "") + delimiter + "\n" +
		modifier + "ContentType: " + commandInfo.contentType + delimiter + "\n" +
		modifier + "AvailableCommands: " + (commandInfo.availableCommands ? commandInfo.availableCommands.join(",") : "") + delimiter + "\n" +
		modifier + "InvalidatesCommand: " + (commandInfo.invalidatesCommand ? commandInfo.invalidatesCommand : "") + delimiter + '\n' +
		modifier + "HiddenColumnIndices: " + (commandInfo.hiddenColumnIndices ? commandInfo.hiddenColumnIndices.join(',') : "") + delimiter + '\n' +
		emptyLinePrefix + "\n" + commandInfo.commandText;

	var sessionInfo = SC.pagedata.get();
	SC.service.AddDiagnosticEventToSession(sessionInfo.SessionGroupPath, window.getSessionUrlPart(), eventData);
}

function parseQueuedCommandEvent(content) {
	var parseResult = {
		isValid: content.startsWith("#!") && content.indexOf("DIAGNOSTIC-REQUEST/2") !== -1,
	};

	if (parseResult.isValid) {
		parseResult.headers = {};

		forEachTrimmedLine(content, function (line) {
			if (line.startsWith('#')) {
				var lineParts = line.substring(1).split(':');

				if (lineParts.length > 1)
					parseResult.headers[lineParts[0].trim()] = lineParts[1] ? lineParts[1].trim() : '';
			}
		});
	}

	return parseResult;
}

function parseRanCommandEvent(content, parseLevel) {
	var parseResult = {
		isValid: content.startsWith("DIAGNOSTIC-RESPONSE/2"), // don't bother with that bug BOM
	};

	if (parseResult.isValid && parseLevel >= 1) {
		parseResult.headers = {};

		var contentStartCharIndex = forEachTrimmedLine(content, function (line, lineIndex) {
			if (line === '') {
				return true;
			} else if (lineIndex >= 1) { // ignore status line
				var lineParts = line.split(':');
				parseResult.headers[lineParts[0].trim()] = lineParts[1] ? lineParts[1].trim() : '';
			}
		});

		if (parseLevel >= 2) {
			parseResult.rawContent = content.substring(contentStartCharIndex);

			if (parseResult.headers.ContentType === 'xml') {
				var document = getXmlDocument(parseResult.rawContent);

				if (document) {
					var objectElements = document.getElementsByTagName("Object");
					if (objectElements[0]) {
						parseResult.columnNames = Array.from(objectElements[0].children).map(function (columnElement) { return columnElement.attributes['Name'].value; });
						parseResult.data = Array.from(objectElements).map(function (objectElement) { return Array.from(objectElement.children).map(function (columnElement) { return columnElement.innerHTML; }); });
					}
				}
			} else if (parseResult.headers.ContentType === 'text') {
				forEachTrimmedLine(parseResult.rawContent, function (line, lineIndex) {
					var values = line.split(',').map(function (it) { return it.trim(); });

					if (lineIndex === 0) {
						parseResult.columnNames = values;
					} else {
						if (lineIndex === 1)
							parseResult.data = [];

						parseResult.data.push(values);
					}
				});
			}
		}
	}

	return parseResult;
}

function forEachTrimmedLine(text, doLineUntilFunc) {
	var currentCharIndex = 0;
	var lineIndex = 0;

	while (true) {
		var nextNewLineCharIndex = text.indexOf('\n', currentCharIndex);

		if (nextNewLineCharIndex === -1)
			break;

		var line = text.substring(currentCharIndex, nextNewLineCharIndex).trim(); // trim \r among other things

		currentCharIndex = nextNewLineCharIndex + 1;

		if (doLineUntilFunc(line, lineIndex++))
			break;
	}

	return currentCharIndex;
}

function getXmlDocument(xmlText) {
	if (window.DOMParser) {
		try {
			return (new DOMParser()).parseFromString(xmlText, "text/xml");
		}
		catch (e) { }
	}

	if (!document && window.ActiveXObject) {
		try {
			var document = new ActiveXObject('Microsoft.XMLDOM');
			document.async = false;
			if (!document.loadXML(xmlText))
				throw "malformed xml";
			return document;
		}
		catch (e) { }
	}
}

function quoteForPowerShell(string) {
	var escapedItemData = string.replaceAll("'", "''");
	return "'" + escapedItemData + "'";
}

function parseMsiExecuteCommand(uninstallString, identifyingNumber) {
	var expression = new RegExp("\\/[XxIi][ ]*" + identifyingNumber, '');
	return uninstallString.replace(expression, '/x "' + identifyingNumber + '" /q');
}

function getCommandInfo(remoteCommandName, itemData, osType) {
	var getCommandTextForLinuxDistributionBasedExecution = function (commandTextForRedHatDistributions, commandTextForDebianDistributions) {
		return SC.util.formatString(
			"if which rpm >/dev/null 2>&1; then {0}; elif which dpkg >/dev/null 2>&1; then {1}; fi",
			commandTextForRedHatDistributions,
			commandTextForDebianDistributions
		);
	}

	switch (remoteCommandName + '/' + osType) {
		case "GetProcesses/Windows": return { processor: 'ps', contentType: 'xml', hiddenColumnIndices: [], availableCommands: ['KillProcess'], commandText: "$Ram = Get-WMIObject Win32_PhysicalMemory | Measure -Property Capacity -Sum | %{$_.Sum}; Get-Process | Select @{N='ID';E={$_.Id}}, @{N='Process Name';E={$_.ProcessName}}, @{N='Memory (%)';E={[string]::Format(\"{0:p}\", $_.WorkingSet64/$Ram)}}, @{N='Memory (KB)';E={[string]::Format(\"{0:N0}\", $_.WorkingSet64/1024)}}, WS | Sort -Descending WS | Select 'ID', 'Process Name', 'Memory (%)', 'Memory (KB)' | ConvertTo-Xml -As Stream" };
		case "GetEventLog/Windows": return { processor: 'ps', contentType: 'xml', hiddenColumnIndices: [], availableCommands: [], commandText: SC.util.formatString("Get-EventLog Application -newest {0} | Select @{N='Time Written';E={$_.TimeWritten}}, @{N='Entry Type';E={$_.EntryType}}, @{N='Source';E={$_.Source}}, @{N='Event ID';E={$_.EventID}}, @{N='Message';E={$_.Message}} | Sort 'Time Written' -Descending | ConvertTo-Xml -As Stream", SC.util.getBoundedValue(1, extensionContext.settingValues.EventLogRequestCount, 500)) };
		case "GetServices/Windows": return { processor: 'ps', contentType: 'xml', hiddenColumnIndices: [], availableCommands: ['StopService', 'StartService', 'RestartService'], commandText: "Get-Service | Select  @{N='Name';E={$_.Name}}, @{N='Display Name';E={$_.DisplayName}}, @{N='Status';E={$_.Status}}, @{N='Startup Type';E={$_.StartType}} | Sort 'Display Name' | ConvertTo-Xml -As Stream" };
		case "GetSoftware/Windows": return { processor: 'ps', contentType: 'xml', hiddenColumnIndices: [0, 4, 5], availableCommands: ['UninstallSoftware'], commandText: "Get-ItemProperty HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*, HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Where-Object{![string]::IsNullOrEmpty($_.DisplayName)} | Select @{N='IdentifyingNumber';E={$_.PSChildName}}, @{N='Name';E={$_.DisplayName}}, @{N='Vendor';E={$_.Publisher}}, @{N='Version';E={$_.DisplayVersion}}, @{N='UninstallString';E={$_.UninstallString}}, @{N='UnavailableCommands';E={$(If (![string]::IsNullOrEmpty($_.UninstallString) -and $_.UninstallString.ToLower() -like 'msiexec*') {''} Else {'|UninstallSoftware|'})}} | Sort 'Name' | ConvertTo-Xml -As Stream" };
		case "GetUpdates/Windows": return { processor: 'ps', contentType: 'xml', hiddenColumnIndices: [0], availableCommands: ['InstallUpdate'], commandText: "$UpdateSession = New-Object -ComObject Microsoft.Update.Session" + "\n" + "$UpdateSearcher = $UpdateSession.CreateUpdateSearcher()" + "\n" + "$Updates = @($UpdateSearcher.Search(\"IsHidden=0\").Updates)" + "\n" + "$Updates | Where-Object { !$_.IsInstalled } | Select-Object @{N='UpdateID';E={$_.Identity.UpdateID}}, @{N='Title';E={$_.Title}}, @{N='Downloaded';E={$_.IsDownloaded}}, @{N='Installed';E={$_.IsInstalled}}, @{N='Date Published'; E={[string]::Format(\"{0:d}\", $_.LastDeploymentChangeTime)}} | ConvertTo-Xml -As Stream" };

		case "GetProcesses/Linux": return { processor: 'sh', contentType: 'text', hiddenColumnIndices: [], availableCommands: ['KillProcess'], commandText: "ps -eo \"user,pid,time,pcpu,pmem,comm\" --sort -pmem | awk \'{print $1,\",\"$2,\",\"$3,\",\"$4,\",\"$5,\",\"$6 }\'" };
		case "GetEventLog/Linux": return { processor: 'sh', contentType: 'text', hiddenColumnIndices: [], availableCommands: [], commandText: SC.util.formatString("echo Event Log Entry ; dmesg -T | tail -{0}", SC.util.getBoundedValue(1, extensionContext.settingValues.EventLogRequestCount, 500)) };
		case "GetServices/Linux": return { processor: 'sh', contentType: 'text', hiddenColumnIndices: [], availableCommands: ['StopService', 'StartService', 'RestartService'], commandText: "echo Service Name ; ls /etc/init.d" };
		case "GetSoftware/Linux": return { processor: 'sh', contentType: 'text', hiddenColumnIndices: [], availableCommands: ['UninstallSoftware'], commandText: SC.util.formatString("echo Application Name ; {0}", getCommandTextForLinuxDistributionBasedExecution("rpm --query --all --queryformat \"%{NAME}\\n\"", "dpkg --get-selections | awk '$2 == \"install\" { print $1 }'")) };

		case "GetProcesses/OSX": return { processor: 'sh', contentType: 'text', hiddenColumnIndices: [], availableCommands: ['KillProcess'], commandText: "ps -eo \"user,pid,time,pcpu,pmem,comm\" -m | awk \'{print $1,\",\"$2,\",\"$3,\",\"$4,\",\"$5,\",\"$6 }\'" };
		case "GetEventLog/OSX": return { processor: 'sh', contentType: 'text', hiddenColumnIndices: [], availableCommands: [], commandText: SC.util.formatString("echo Event Log Entry ; log show --style syslog -last 500 | tail -n {0}", SC.util.getBoundedValue(1, extensionContext.settingValues.EventLogRequestCount, 500)) };
		case "GetServices/OSX": return {
			processor: 'sh', contentType: 'text', hiddenColumnIndices: [1], availableCommands: ['StartService', 'RestartService'],
			commandText: "headersText=$(echo \"Service Name\\t,Owner\";) && systemServices=$(ls /Library/LaunchDaemons | sed 's/\\.plist$//' | sed 's|$|\\t,system|') && userServices=$(ls /Library/LaunchAgents | sed 's/\\.plist$//' | sed 's|$|\\t,user|') && userId=$(stat -f '%u' /dev/console | grep -vx 0); if [[ $userId -ne 0 ]]; then" + "\n" +
				"	echo \"$headersText\"; echo \"$systemServices\"; echo \"$userServices\";" + "\n" +
				"else" + "\n" +
				"	echo \"$headersText\"; echo \"$systemServices\";" + "\n" +
				"fi",
		};
		case "GetSoftware/OSX": return { processor: 'sh', contentType: 'text', hiddenColumnIndices: [], availableCommands: [], commandText: "echo Application Name; ls /Applications" };

		case "KillProcess/Linux": return { processor: 'sh', invalidatesCommand: 'GetProcesses', commandKeyIndices: [1], commandKey: itemData[1], commandText: SC.util.formatString("kill {0}", typeof itemData[1] == 'string' ? quoteForPowerShell(itemData[1]) : '') };
		case "KillProcess/OSX": return { processor: 'sh', invalidatesCommand: 'GetProcesses', commandKeyIndices: [1], commandKey: itemData[1], commandText: SC.util.formatString("kill {0}", typeof itemData[1] == 'string' ? quoteForPowerShell(itemData[1]) : '') };
		case "KillProcess/Windows": return { processor: 'ps', invalidatesCommand: 'GetProcesses', commandKeyIndices: [0], commandKey: itemData[0], commandText: SC.util.formatString("Stop-Process {0} -ErrorAction SilentlyContinue -Force", typeof itemData[0] == 'string' ? quoteForPowerShell(itemData[0]) : '') };
		case "UninstallSoftware/Windows": return { processor: 'ps', invalidatesCommand: 'GetSoftware', commandKeyIndices: [0], commandKey: itemData[0], commandText: itemData[4].toLowerCase().startsWith("msiexec") ? SC.util.formatString(parseMsiExecuteCommand(itemData[4], itemData[0])) : SC.util.formatString("echo '{0}'", itemData[1]) };
		case "StopService/Windows": return { processor: 'ps', invalidatesCommand: 'GetServices', commandKeyIndices: [0], commandKey: itemData[0], commandText: SC.util.formatString("Stop-Service {0}", typeof itemData[0] == 'string' ? quoteForPowerShell(itemData[0]) : '') };
		case "StartService/Windows": return { processor: 'ps', invalidatesCommand: 'GetServices', commandKeyIndices: [0], commandKey: itemData[0], commandText: SC.util.formatString("Start-Service {0}", typeof itemData[0] == 'string' ? quoteForPowerShell(itemData[0]) : '') };
		case "RestartService/Windows": return { processor: 'ps', invalidatesCommand: 'GetServices', commandKeyIndices: [0], commandKey: itemData[0], commandText: SC.util.formatString("Restart-Service {0}", typeof itemData[0] == 'string' ? quoteForPowerShell(itemData[0]) : '') };
		case "InstallUpdate/Windows": return {
			processor: 'ps',
			invalidatesCommand: 'GetUpdates',
			commandKeyIndices: [0],
			commandKey: itemData[0],
			commandText:
				"$session = New-Object -ComObject \"Microsoft.Update.Session\"" + "\n" +
				"$searcher = $session.CreateUpdateSearcher()" + "\n" +
				SC.util.formatString("$search = \"(UpdateID = {0})\"", typeof itemData[0] == 'string' ? quoteForPowerShell(itemData[0]) : '') + "\n" +
				"$updateResult = $searcher.Search($search)" + "\n" +
				"$downloader = $session.CreateUpdateDownloader()" + "\n" +
				"$installer = $session.CreateUpdateInstaller()" + "\n" +
				"$downloader.Updates = $updateResult.Updates" + "\n" +
				"$installer.Updates = $updateResult.Updates" + "\n" +
				"$result = ''" + "\n" +
				"Try{ $result = $downloader.Download() } Catch{ If($_ -match \"HRESULT: 0x80240044\") { $result = \"Insufficient permissions. Could not install updates under this identity.\" }}" + "\n" +
				"Try{ $result = $installer.Install() } Catch{ If($_ -match \"HRESULT: 0x80240044\") { $result = \"Insufficient permissions. Could not install updates under this identity.\" }}" + "\n" +
				"$result"
		};

		case "StopService/Linux": return { processor: 'sh', invalidatesCommand: 'GetServices', commandKeyIndices: [0], commandKey: itemData[0], commandText: SC.util.formatString("/etc/init.d/{0} stop", itemData[0]) };
		case "StartService/Linux": return { processor: 'sh', invalidatesCommand: 'GetServices', commandKeyIndices: [0], commandKey: itemData[0], commandText: SC.util.formatString("/etc/init.d/{0} start", itemData[0]) };
		case "RestartService/Linux": return { processor: 'sh', invalidatesCommand: 'GetServices', commandKeyIndices: [0], commandKey: itemData[0], commandText: SC.util.formatString("/etc/init.d/{0} restart", itemData[0]) };
		case "UninstallSoftware/Linux": return { processor: 'sh', invalidatesCommand: 'GetSoftware', commandKeyIndices: [0], commandKey: itemData[0], commandText: getCommandTextForLinuxDistributionBasedExecution(SC.util.formatString("rpm --erase {0}", itemData[0]), SC.util.formatString("dpkg --remove {0}", itemData[0])) };

		case "StartService/OSX":
		case "RestartService/OSX": return { processor: 'sh', invalidatesCommand: 'GetServices', commandKeyIndices: [1, 0], commandKey: '' + itemData[1] + itemData[0], commandText: SC.util.formatString("launchctl kickstart " + (remoteCommandName == "RestartService" ? "-k " : "") + "{0}/{1}", itemData[1] == "system" ? "system" : "gui/$(stat -f '%u' /dev/console | grep -vx 0)", itemData[0]) };

		default: throw "unhandled commandName/osType combination";
	}
}
