<%@ Control %>

<script src="./App_Extensions/fa369545-ba27-4670-b053-a9f65f3269b0/Scripts/Controls.js"></script>
<script src="./App_Extensions/fa369545-ba27-4670-b053-a9f65f3269b0/Scripts/Utilities_21_8.js"></script>
<script src="./App_Extensions/fa369545-ba27-4670-b053-a9f65f3269b0/Scripts/Defaults_21_8.js"></script>

<div class="AdvancedConfigurationEditorContentPanel"></div>

<script>
	SC.event.addGlobalHandler(SC.event.PreRender, function () {
		SC.ui.setContents(document.querySelector('.AdvancedConfigurationEditorContentPanel'), [
			$configWelcomeBlock(SC.res['AdvancedConfig.ApplicationConfiguration'], [
				$a({ _commandArgument: 'QuickSettings', _commandName: "OpenAppConfigModalPage" }, SC.res['AdvancedConfig.QuickSettings']),
				$a({ _commandArgument: 'OtherSettings', _commandName: "OpenAppConfigModalPage" }, SC.res['AdvancedConfig.OtherSettings']),
				$a({ _commandArgument: 'BitmaskSettings', _commandName: "OpenAppConfigModalPage" }, SC.res['AdvancedConfig.BitmaskSettings']),
			]),
			$configWelcomeBlock(SC.res['AdvancedConfig.DisableHostClientMenuItems'], [
				$a({ _commandArgument: 'ClientMenuViewSoundMessagesSettings', _commandName: "OpenAppConfigModalPage" }, SC.res['AdvancedConfig.ClientMenuViewSoundMessagesSettings']),
				$a({ _commandArgument: 'ClientMenuEssentialsSettings', _commandName: "OpenAppConfigModalPage" }, SC.res['AdvancedConfig.ClientMenuEssentialsSettings']),
				$a({ _commandArgument: 'ClientMenuAnnotationHelperSettings', _commandName: "OpenAppConfigModalPage" }, SC.res['AdvancedConfig.ClientMenuAnnotationHelperSettings']),
				$a({ _commandArgument: 'ClientMenuParticipantScreenCaptureSettings', _commandName: "OpenAppConfigModalPage" }, SC.res['AdvancedConfig.ClientMenuParticipantScreenCaptureSettings']),
				$a({ _commandArgument: 'ClientMenuToolboxFileTransferSettings', _commandName: "OpenAppConfigModalPage" }, SC.res['AdvancedConfig.ClientMenuToolboxFileTransferSettings']),
				$a({ _commandArgument: 'ClientMenuSystemOptionsSettings', _commandName: "OpenAppConfigModalPage" }, SC.res['AdvancedConfig.ClientMenuSystemOptionsSettings'])
			]),
			$configWelcomeBlock(SC.res['AdvancedConfig.WebConfiguration'], [
				$a({ _commandArgument: 'Settings', _commandName: 'OpenWebConfigModalPage', _textResource: 'AdvancedConfig.Settings'}),
			])
		]);

		window.setTimeout(function () { SC.event.dispatchEvent(null, SC.event.PageDataRefreshed); }, 1);
	});

	SC.event.addGlobalHandler(SC.event.ExecuteCommand, function (eventArgs) {
		var contentPanel = SC.dialog.createContentPanel();
		var titlePanel = SC.dialog.createTitlePanel(SC.res['AdvancedConfig.' + eventArgs.commandArgument]);
		var buttonPanel = SC.dialog.createButtonPanel();

		var configFileName = (eventArgs.commandName === 'OpenAppConfigModalPage' || eventArgs.commandName === 'OpenWebConfigModalPage' ) ? eventArgs.commandName.substring(4, 7) + 'Config' : null;

		if(configFileName) {
			SC.ui.addElement(buttonPanel, 'INPUT', {
				className: 'ConfigSaveButton',
				disabled: true,
				type: 'button',
				value: SC.res['AdvancedConfig.SaveAndApplyChanges'],
				_commandName: configFileName.startsWith('App') ? APP_CONFIG_SAVE : WEB_CONFIG_SAVE,
			});

			initPage(contentPanel, window['build' + configFileName + eventArgs.commandArgument + 'Page'], configFileName);

			SC.dialog.showModalDialogRaw(eventArgs.commandArgument, [titlePanel, contentPanel, buttonPanel]);
		}
	});
</script>
