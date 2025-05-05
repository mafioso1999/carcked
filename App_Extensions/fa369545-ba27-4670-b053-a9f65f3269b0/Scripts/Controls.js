$emptyDataCell = function () {
	return $td($div());
}

$configToggle = function (id, value, configType, checked) {
	return $div({ className: 'ConfigToggle' },
		SC.ui.createElement('input', {
			className: 'ConfigSetting',
			type: 'checkbox',
			id: id,
			value: value === null ? checked.toString() : value,
			style: SC.util.Caps.InternetExplorer().major > 0 ? 'width: 30px; height: 20px; margin: 0px;' : '',
			checked: checked,
			onchange: function () {
				saveChangeToSessionStorage(configType, this);
			}
		})
	);
};

$configDropDown = function (id, options, configType) {
	return $div({ className: 'ConfigDropDown' },
		$select({
			className: 'ConfigSetting',
			id: id,
			onchange: function () {
				saveChangeToSessionStorage(configType, this);
			}
		}, options)
	);
};

$configTextBoxChunk = function (id, value, suffix, configType) {
	return $div({ className: 'ConfigInputBoxChunk' }, [
		$input({
			type: 'text',
			className: 'ConfigSetting' + (suffix === null ? ' ConfigInputBoxNoSuffix' : ' ConfigInputBoxWithSuffix'),
			id: id,
			value: value,
			onkeyup: function () {
				saveChangeToSessionStorage(configType, this);
			}
		}),
		suffix !== null ? $p(suffix) : null
	]);
};

$configNumberBoxChunk = function (id, value, suffix, configType, minValue, maxValue) {
	return $div({ className: 'ConfigInputBoxChunk' }, [
		$input({
			type: 'number',
			className: 'ConfigSetting' + (suffix === null ? ' ConfigInputBoxNoSuffix' : ' ConfigInputBoxWithSuffix'),
			id: id,
			value: value,
			min: minValue,
			max: maxValue,
			onkeyup: function () {
				saveChangeToSessionStorage(configType, this);
			}
		}),
		suffix !== null ? $p(suffix) : null
	]);
};

$configTextArea = function (id, value, configType) {
	return $textarea({
		className: 'ConfigSetting',
		id: id,
		value: value,
		onkeyup: function () {
			saveChangeToSessionStorage(configType, this);
		}
	});
};

$configDescriptionBlock = function (title, description, optionalCautionText) {
	return $div({ className: 'ConfigDescription' }, [
		$p(title),
		$p(description),
		optionalCautionText ? $p({ className: 'OptionalCautionText' }, optionalCautionText) : optionalCautionText
	]);
};

$configControlBlock = function (title, className, configControl) {
	return $div({ className: className }, [
		$p({ className: 'ConfigColumnHeader' }, title),
		configControl
	]);
};

$configSaveButton = function (saveType) {
	var buttonPanel = $('.ButtonPanel');
	buttonPanel.style.display = 'block';

	SC.ui.addElement(buttonPanel, 'input', {
		className: 'ConfigSaveButton',
		type: 'button',
		value: SC.res['AdvancedConfig.SaveAndApplyChanges'],
		_commandName: saveType,
		disabled: true
	});

	return buttonPanel;
};

$configRestoreDefaultsLink = function (settingType) {
	return $a({
		className: 'ConfigRestoreLink',
		onclick: function () {
			var settings = Array.from(document.querySelectorAll('.ConfigSetting'));
			var webConfigStorage = JSON.parse(window.sessionStorage.getItem('WebConfigAppSettings'));
			var appConfigStorage = JSON.parse(window.sessionStorage.getItem('AppConfigAppSettings'));

			for (var i = 0; i < settings.length; i++) {
				var settingId = settings[i].id.split('-')[0];
				var partition = {
					ConfigType: ConfigPartition[settingId].split('-')[0],
					Area: ConfigPartition[settingId].split('-')[1]
				};

				if (partition.ConfigType === 'WebConfig') {
					if (settings[i].id.indexOf('Host.aspx') >= 0 || settings[i].id.indexOf('Administration.aspx') >= 0) {
						if (settings[i].id.split('-')[1] == 'Host.aspx' && settings[i].id.split('-')[0] == 'MaxLongestTicketReissueIntervalSeconds')
							webConfigStorage.location[settings[i].id.split('-')[1]][settings[i].id.split('-')[0]] = WebConfigDefaults[partition.Area]['HostMaxLongestTicketReissueIntervalSeconds'];
						else if (settings[i].id.split('-')[1] == 'Administration.aspx' && settings[i].id.split('-')[0] == 'MaxLongestTicketReissueIntervalSeconds')
							webConfigStorage.location[settings[i].id.split('-')[1]][settings[i].id.split('-')[0]] = WebConfigDefaults[partition.Area]['AdminMaxLongestTicketReissueIntervalSeconds'];
						else
							webConfigStorage.location[settings[i].id.split('-')[1]][settings[i].id.split('-')[0]] = WebConfigDefaults[partition.Area][settingId];

					} else {
						webConfigStorage[settingId] = WebConfigDefaults[partition.Area][settingId];
					}
				} else {
					appConfigStorage[partition.Area][settingId] = AppConfigDefaults[partition.Area][settingId];
				}
			}

			if (settingType === 'WebConfig') {
				window.sessionStorage.setItem('WebConfigAppSettings', JSON.stringify(webConfigStorage));
				SC.event.dispatchEvent(null, SC.event.ExecuteCommand, { commandName: 'WebConfigSave', commandArgument: 'WebConfigRestore' });
			} else {
				window.sessionStorage.setItem('AppConfigAppSettings', JSON.stringify(appConfigStorage));
				SC.event.dispatchEvent(null, SC.event.ExecuteCommand, { commandName: 'AppConfigSave', commandArgument: 'AppConfigRestore' });
			}
		}
	}, SC.res['AdvancedConfig.RestoreDefaults']);
};

$configWelcomeBlock = function (title, menuItems) {
	return $dl({ className: 'ConfigWelcomePageBlock' }, [
		$dt($h3(title)),
		$dd($div(menuItems)),
	]);
};
