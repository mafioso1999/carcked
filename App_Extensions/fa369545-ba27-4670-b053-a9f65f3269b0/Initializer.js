if (SC.context.pageType == 'AdministrationPage' && SC.context.isUserAuthenticated)
	SC.service.GetThemeInfo(function (themeInfo) {
		SC.util.includeStyleSheet(extensionContext.baseUrl + 'css/Style.css');
	});

SC.event.addGlobalHandler(SC.event.ExecuteCommand, function (eventArgs) {
	switch (eventArgs.commandName) {
		case 'WebConfigSave':
			SC.dialog.showModalButtonDialog(
				'Prompt',
				SC.res['AdvancedConfig.ApplyChanges'],
				'OK',
				'Default',
				function (container) {
					SC.ui.setContents(container, [
						eventArgs.commandArgument === 'WebConfigRestore' ? $p(SC.res['AdvancedConfig.RestoreDefaults.WebConfigWarning']) : $p(SC.res['AdvancedConfig.RestartInstanceWarning'])
					]);
				},
				function () {
					var appSettings = JSON.parse(sessionStorage.getItem('WebConfigAppSettings'));
					var pageSettings = JSON.parse(JSON.stringify(appSettings.location));
					delete appSettings.location;

					SC.service.WriteChangesToWebConfig(appSettings, pageSettings, function (result) {
						if (result === 'OK') {
							sessionStorage.removeItem('WebConfigAppSettings');
							SC.dialog.showModalActivityAndReload('Save', true, window.location.href.split('#')[0]);
						} else {
							SC.dialog.showModalMessageBox(SC.res['AdvancedConfig.SaveError.Title'], SC.res['AdvancedConfig.SaveError.WebConfigDescription'] + ' ' + result);
						}
					});
				}
			);
			break;
		case 'AppConfigSave':
			SC.dialog.showModalButtonDialog(
				'Prompt',
				SC.res['AdvancedConfig.ApplyChanges'],
				'OK',
				'Default',
				function (container) {
					SC.ui.setContents(container, [
						eventArgs.commandArgument === 'AppConfigRestore' ? $p(SC.res['AdvancedConfig.RestoreDefaults.AppConfigWarning']) : $p(SC.res['AdvancedConfig.ReinstallWarning'])
					]);
				},
				function () {
					var systemSettings = JSON.parse(sessionStorage.getItem('AppConfigAppSettings')).SystemSettings;
					var userInterfaceSettings = JSON.parse(sessionStorage.getItem('AppConfigAppSettings')).UserInterfaceSettings;

					SC.service.WriteChangesToAppConfig(systemSettings, userInterfaceSettings, AppConfigDefaults, function (result) {
						if (result === 'OK') {
							sessionStorage.removeItem('AppConfigAppSettings');
							window.location.reload();
						} else {
							SC.dialog.showModalMessageBox(SC.res['AdvancedConfig.SaveError.Title'], SC.res['AdvancedConfig.SaveError.AppConfigDescription'] + ' ' + result);
						}
					});
				}
			);
			break;
	}
});

