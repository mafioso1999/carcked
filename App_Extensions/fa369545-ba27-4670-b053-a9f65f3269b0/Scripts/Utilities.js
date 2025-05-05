const WEB_CONFIG = 'WebConfig';
const APP_CONFIG = 'AppConfig';
const WEB_CONFIG_SAVE = 'WebConfigSave';
const APP_CONFIG_SAVE = 'AppConfigSave';
const CSS_CLASS_TOGGLE_BLOCK = 'ConfigToggleBlock';
const CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT = 'ConfigToggleCellNotDefault';
const CSS_CLASS_DROPDOWN_BLOCK = 'ConfigDropDownBlock';
const CSS_CLASS_TEXTBOX_BLOCK = 'ConfigTextBoxBlock';
const CSS_CLASS_TEXTAREA_BLOCK = 'ConfigTextAreaBlock';
const EXTENSION_PATH = 'App_Extensions/fa369545-ba27-4670-b053-a9f65f3269b0';
const VERSION = 6.5; // todo
const DEFAULT_MASK = '0x0000000000000000';
const IS_CLOUD = /^.*\.(screenconnect|hostedrmm)\.com$/.test(SC.context.clp.h);

function setToggle(appSettings, settingName, valueInCommaSeparatedString, isDisableCommandSetting, isBitMaskSetting) {
	var actualSettingName = settingName.split('-')[0];

	if (!appSettings.hasOwnProperty(actualSettingName)) {
		var partition = ConfigPartition[actualSettingName];

		if (partition.split('-')[0] == 'AppConfig') {
			appSettings[actualSettingName] = AppConfigDefaults[partition.split('-')[1]][actualSettingName];
		} else if (partition.split('-')[0] == 'WebConfig') {
			appSettings[actualSettingName] = WebConfigDefaults[partition.split('-')[1]][actualSettingName];
		}
	}

	if (valueInCommaSeparatedString === null && !isDisableCommandSetting && !isBitMaskSetting) {
		if (appSettings[actualSettingName] == 'true') {
			return true;
		}
	} else {
		if (isDisableCommandSetting && valueInCommaSeparatedString !== null) {
			if (appSettings[actualSettingName].includes(valueInCommaSeparatedString)) {
				return true;
			}
		} else if (isBitMaskSetting) {
			return isFlagSet(appSettings[actualSettingName], settingName.split('-')[1], settingName.split('-')[2]);
		} else {
			if (appSettings[actualSettingName].includes(valueInCommaSeparatedString)) {
				return true;
			}
		}
	}

	return false;
}

function setTextBoxValue(appSettings, settingName, defaultValue, page) {
	if (page === undefined) {
		if (appSettings.hasOwnProperty(settingName)) {
			return appSettings[settingName];
		}
	} else {
		if (appSettings.location.hasOwnProperty(page)) {
			if (appSettings.location[page].hasOwnProperty(settingName)) {
				return appSettings.location[page][settingName];
			}
		}
	}

	return defaultValue;
}

function saveChangeToSessionStorage(configType, element) {
	if (configType === 'WebConfig') {
		var storage = JSON.parse(window.sessionStorage.getItem('WebConfigAppSettings'));

		if (element.id.indexOf('DefaultSupportSessionInfoAttributes') >= 0 || element.id.indexOf('DefaultAccessSessionInfoAttributes') >= 0 || element.id.indexOf('ExcludeClientInstallerComponents') >= 0) {
			saveSettingStringToStorage(element, storage);
		} else if (element.id.indexOf('MaxLongestTicketReissueIntervalSeconds') >= 0 || element.id.indexOf('MinAuthenticationFactorCount') >= 0 ||
			element.id.indexOf('BlockIPs') >= 0 || element.id.indexOf('RestrictToIPs') >= 0) {
			storage.location[element.id.split('-')[1]][element.id.split('-')[0]] = element.value;
		} else {
			if (element.type == 'checkbox') {
				element.value = element.checked.toString();
			}

			storage[element.id] = element.value;
		}

		window.sessionStorage.setItem('WebConfigAppSettings', JSON.stringify(storage));

	} else if (configType === 'AppConfig') {
		var storageBin = null;
		var storage = JSON.parse(window.sessionStorage.getItem('AppConfigAppSettings'));

		if (AppConfigDefaults.SystemSettings.hasOwnProperty(element.id)) {
			storageBin = 'SystemSettings';
		} else {
			storageBin = 'UserInterfaceSettings';
		}

		if (element.id.indexOf('ControlPanelIDs') >= 0) {
			elementData = Array.from(document.querySelectorAll('[id^="' + element.id.split('-')[0] + '"]'));
			storage[storageBin][element.id.split('-')[0]] = calculateBitMaskValue(elementData);
		} else if (element.id.indexOf('DisabledCommandNames') >= 0) {
			saveSettingStringToStorage(element, storage.UserInterfaceSettings);
		} else {
			if (element.type == 'checkbox') {
				element.value = element.checked.toString();
			}

			storage[storageBin][element.id.split('-')[0]] = element.value;
		}

		window.sessionStorage.setItem('AppConfigAppSettings', JSON.stringify(storage));
	}

	$('.ConfigSaveButton').disabled = false;
}

function calculateBitMaskValue(elementData) {
	var mask = DEFAULT_MASK;

	for (var i = 0; i < elementData.length; i++) {
		if (elementData[i].checked) {
			var index = Number(elementData[i].id.split('-')[1]);
			var value = Number(elementData[i].id.split('-')[2]);

			var currentMaskValue = Number(mask[index]);
			var newMaskValue = currentMaskValue + value;

			mask = mask.substr(0, index) + newMaskValue + mask.substr(index + 1);
		}
	}

	return mask;
}

function isFlagSet(maskValue, index, flagValue) {
	if (Number(maskValue[index]) === Number(flagValue)) {
		return true;
	} else if (Number(maskValue[index]) === 5 && Number(flagValue) !== 0) {
		return true;
	}

	return false;
}

function saveSettingStringToStorage(element, storage) {
	var settingName = element.id.split('-')[0];

	if (!storage.hasOwnProperty(settingName)) {
		storage[settingName] = '';
	}
	else
		storage[settingName] = storage[settingName].replace(/\s/g, '');

	if (element.checked) {
		if (storage[settingName].length <= 0) {
			storage[settingName] = element.value;
		} else {
			storage[settingName] += ',' + element.value;
		}
	} else {
		var index = storage[settingName].indexOf(element.value);

		if (index === 0) {
			if (storage[settingName].length == element.value.length)
				storage[settingName] = storage[settingName].replace(element.value, '');
			else
				storage[settingName] = storage[settingName].replace(element.value + ',', '');
		} else if (index > 0) {
			storage[settingName] = storage[settingName].replace(',' + element.value, '');
		}
	}
}

function setSelected(appSettings, settingName, value, page) {
	if (page === undefined) {
		if (appSettings.hasOwnProperty(settingName)) {
			if (appSettings[settingName] === value) {
				return 'selected';
			}
		}
	} else {
		if (appSettings.location.hasOwnProperty(page)) {
			if (appSettings.location[page].hasOwnProperty(settingName)) {
				if (appSettings.location[page][settingName] === value) {
					return 'selected';
				}
			}
		}
	}

	return null;
}

function isBelowVersion() {
	return Number(SC.context.productVersion.slice(0, 3)) < VERSION;
}

/**
* @param {string | number} version1
* @param {string | number} version2
* @return {number}
*/
function compareVersions(version1, version2) {
	var versionNumbers1 = version1.toString().split('.');
	var versionNumbers2 = version2.toString().split('.');

	for (let i = 0; i < Math.max(versionNumbers1.length, versionNumbers2.length); i++) {
		var versionNumber1 = parseInt(versionNumbers1[i] || 0, 10);
		var versionNumber2 = parseInt(versionNumbers2[i] || 0, 10);
		if (versionNumber1 > versionNumber2) return 1;
		if (versionNumber2 > versionNumber1) return -1;
	}

	return 0;
}

/**
* @param {string | number} version
* @param {string | number | null} minVersionInclusive
* @param {string | number | null} maxVersionExclusive
* @return {boolean}
*/
function isVersionInRange(version, minVersionInclusive, maxVersionExclusive) {
	return (minVersionInclusive == undefined || compareVersions(version, minVersionInclusive) >= 0)
		&& (maxVersionExclusive == undefined || compareVersions(version, maxVersionExclusive) < 0);
}

/**
* @param {string | number | null} minVersionInclusive
* @param {string | number | null} maxVersionExclusive
* @return {boolean}
*/
function isProductVersionInRange(minVersionInclusive, maxVersionExclusive) {
	return isVersionInRange(SC.context.productVersion, minVersionInclusive, maxVersionExclusive);
}

function initPage(contentPanel, buildPageFunc, configType) {
	switch (configType) {
		case 'WebConfig':
			SC.service.GetWebConfigSettingValues(WebConfigDefaults.OtherSettings, function (webConfigSettings) {
				var settings = Object.assign({}, webConfigSettings.WebConfigAppSettings, { location: webConfigSettings.WebConfigPageSettings });

				window.sessionStorage.setItem('WebConfigAppSettings', JSON.stringify(settings));

				buildPageFunc(contentPanel, JSON.parse(window.sessionStorage.getItem('WebConfigAppSettings')));
			});
			break;
		case 'AppConfig':
			SC.service.GetAppConfigSettingValues(function (appConfigSettings) {
				var settings = {
					SystemSettings: appConfigSettings.AppConfigSystemSettings,
					UserInterfaceSettings: appConfigSettings.AppConfigUserInterfaceSettings
				};

				window.sessionStorage.setItem('AppConfigAppSettings', JSON.stringify(settings));

				buildPageFunc(contentPanel, JSON.parse(window.sessionStorage.getItem('AppConfigAppSettings')));
			});
			break;
		default:
			buildPageFunc(contentPanel);
			break;
	}
}

function webConfigSettingHasDefaultValue(currentValues, defaultValues, settingName) {
	return currentValues[settingName] == defaultValues[settingName] || !currentValues[settingName];
}

function sessionInfoAttributeHasDefaultSettingValue(currentValue, attributeName) {
	if (currentValue)
		return currentValue.indexOf(attributeName) === -1;
	else
		return true;
}

function buildWebConfigSettingsPage(contentPanel, webConfigSettings) {
	var quickSettingsTable = $table({ className: 'DataTable ConfigDataTable' }, [
		$tr([
			$th(SC.res['AdvancedConfig.Setting']),
			$th(SC.res['AdvancedConfig.Value']),
			$th(),
			$th()
		]),
		//Remote Printing Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.RemotePrinting'], SC.res['AdvancedConfig.RemotePrinting.Description'])
			),
			$td({ className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'DisableRemotePrinting') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
				$configToggle(
					'DisableRemotePrinting',
					null,
					WEB_CONFIG,
					setToggle(webConfigSettings, 'DisableRemotePrinting', null, false, false)
				)
			),
			$emptyDataCell(),
			$emptyDataCell()
		]),
		//Automatically Update Agent Version Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.UpdateAgentVersion'], SC.res['AdvancedConfig.UpdateAgentVersion.Description'])
			),
			$td({ className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'AutoReinstallOldVersionClient') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
				$configToggle(
					'AutoReinstallOldVersionClient',
					null,
					WEB_CONFIG,
					setToggle(webConfigSettings, 'AutoReinstallOldVersionClient', null, false, false)
				)
			),
			$emptyDataCell(),
			$emptyDataCell()
		]),
		//Default Session Settings
		$tr({ className: 'ConfigBorderlessRow' }, [
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.DefaultSession'], SC.res['AdvancedConfig.DefaultSession.Description'])
			),
			$td(
				$p({ className: 'ConfigColumnHeader' }, SC.res['AdvancedConfig.Support'])
			),
			$td(
				$p({ className: 'ConfigColumnHeader' }, SC.res['AdvancedConfig.Access'])
			),
			$emptyDataCell()
		]),
		$tr({ className: 'ConfigTableSubRow ConfigBorderlessRow' }, [
			$td(
				$p(SC.res['AdvancedConfig.BlankGuestMonitor'])
			),
			$td({ className: sessionInfoAttributeHasDefaultSettingValue(webConfigSettings.DefaultSupportSessionInfoAttributes, 'MonitorBlanked') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
				$configToggle(
					'DefaultSupportSessionInfoAttributes-1',
					'MonitorBlanked',
					WEB_CONFIG,
					setToggle(webConfigSettings, 'DefaultSupportSessionInfoAttributes', 'MonitorBlanked', false, false)
				)
			),
			$td({ className: sessionInfoAttributeHasDefaultSettingValue(webConfigSettings.DefaultAccessSessionInfoAttributes, 'MonitorBlanked') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
				$configToggle(
					'DefaultAccessSessionInfoAttributes-1',
					'MonitorBlanked',
					WEB_CONFIG,
					setToggle(webConfigSettings, 'DefaultAccessSessionInfoAttributes', 'MonitorBlanked', false, false)
				)
			),
			$emptyDataCell()
		]),
		$tr({ className: 'ConfigTableSubRow ConfigBorderlessRow' }, [
			$td(
				$p(SC.res['AdvancedConfig.BlockGuestInput']),
			),
			$td({ className: sessionInfoAttributeHasDefaultSettingValue(webConfigSettings.DefaultSupportSessionInfoAttributes, 'InputBlocked') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
				$configToggle(
					'DefaultSupportSessionInfoAttributes-2',
					'InputBlocked',
					WEB_CONFIG,
					setToggle(webConfigSettings, 'DefaultSupportSessionInfoAttributes', 'InputBlocked', false, false)
				)
			),
			$td({ className: sessionInfoAttributeHasDefaultSettingValue(webConfigSettings.DefaultAccessSessionInfoAttributes, 'InputBlocked') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
				$configToggle(
					'DefaultAccessSessionInfoAttributes-2',
					'InputBlocked',
					WEB_CONFIG,
					setToggle(webConfigSettings, 'DefaultAccessSessionInfoAttributes', 'InputBlocked', false, false)
				)
			),
			$emptyDataCell()
		]),
		$tr({ className: 'ConfigTableSubRow ConfigBorderlessRow' }, [
			$td(
				$p(SC.res['AdvancedConfig.ShareClipboard']),
			),
			$td({ className: sessionInfoAttributeHasDefaultSettingValue(webConfigSettings.DefaultSupportSessionInfoAttributes, 'ShareClipboard') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
				$configToggle(
					'DefaultSupportSessionInfoAttributes-3',
					'ShareClipboard',
					WEB_CONFIG,
					setToggle(webConfigSettings, 'DefaultSupportSessionInfoAttributes', 'ShareClipboard', false, false)
				)
			),
			$td({ className: sessionInfoAttributeHasDefaultSettingValue(webConfigSettings.DefaultAccessSessionInfoAttributes, 'ShareClipboard') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
				$configToggle(
					'DefaultAccessSessionInfoAttributes-3',
					'ShareClipboard',
					WEB_CONFIG,
					setToggle(webConfigSettings, 'DefaultAccessSessionInfoAttributes', 'ShareClipboard', false, false)
				)
			),
			$emptyDataCell()
		]),
		$tr({ className: 'ConfigTableSubRow ConfigBorderlessRow' }, [
			$td(
				$p(SC.res['AdvancedConfig.KeepDeviceAwake'])
			),
			$td({ className: sessionInfoAttributeHasDefaultSettingValue(webConfigSettings.DefaultSupportSessionInfoAttributes, 'WakeLockAcquired') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
				$configToggle(
					'DefaultSupportSessionInfoAttributes-4',
					'WakeLockAcquired',
					WEB_CONFIG,
					setToggle(webConfigSettings, 'DefaultSupportSessionInfoAttributes', 'WakeLockAcquired', false, false)
				)
			),
			$td({ className: sessionInfoAttributeHasDefaultSettingValue(webConfigSettings.DefaultAccessSessionInfoAttributes, 'WakeLockAcquired') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
				$configToggle(
					'DefaultAccessSessionInfoAttributes-4',
					'WakeLockAcquired',
					WEB_CONFIG,
					setToggle(webConfigSettings, 'DefaultAccessSessionInfoAttributes', 'WakeLockAcquired', false, false)
				)
			),
			$emptyDataCell()
		]),
		$tr({ className: 'ConfigTableSubRow' }, [
			$td(
				$p(SC.res['AdvancedConfig.RemotePrintingActivated'])
			),
			$td({ className: sessionInfoAttributeHasDefaultSettingValue(webConfigSettings.DefaultSupportSessionInfoAttributes, 'RemotePrintingActivated') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
				$configToggle(
					'DefaultSupportSessionInfoAttributes-4',
					'RemotePrintingActivated',
					WEB_CONFIG,
					setToggle(webConfigSettings, 'DefaultSupportSessionInfoAttributes', 'RemotePrintingActivated', false, false)
				)
			),
			$td({ className: sessionInfoAttributeHasDefaultSettingValue(webConfigSettings.DefaultAccessSessionInfoAttributes, 'RemotePrintingActivated') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
				$configToggle(
					'DefaultAccessSessionInfoAttributes-4',
					'RemotePrintingActivated',
					WEB_CONFIG,
					setToggle(webConfigSettings, 'DefaultAccessSessionInfoAttributes', 'RemotePrintingActivated', false, false)
				)
			),
			$emptyDataCell()
		]),
		//Default Screen Quality Level Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.DefaultScreenQuality'], SC.res['AdvancedConfig.DefaultScreenQuality.Description'])
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'DefaultScreenQualityLevel') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.DefaultScreenQualityLevel)
			},
				$configDropDown('DefaultScreenQualityLevel', [
					$option({ value: 'High', selected: setSelected(webConfigSettings, 'DefaultScreenQualityLevel', 'High') }, SC.res['AdvancedConfig.ScreenQualityHigh']),
					$option({ value: 'Medium', selected: setSelected(webConfigSettings, 'DefaultScreenQualityLevel', 'Medium') }, SC.res['AdvancedConfig.ScreenQualityMedium']),
					$option({ value: 'Low', selected: setSelected(webConfigSettings, 'DefaultScreenQualityLevel', 'Low') }, SC.res['AdvancedConfig.ScreenQualityLow'])
				], WEB_CONFIG)
			),
			$emptyDataCell(),
			$emptyDataCell()
		]),
		//Default Sound Mode Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.DefaultSoundMode'], SC.res['AdvancedConfig.DefaultSoundMode.Description'])
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'DefaultSupportSoundCaptureMode') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.DefaultSupportSoundCaptureMode)
			},
				$configControlBlock(
					SC.res['AdvancedConfig.Support'],
					CSS_CLASS_DROPDOWN_BLOCK,
					$configDropDown('DefaultSupportSoundCaptureMode', [
						$option({ value: 'Silent', selected: setSelected(webConfigSettings, 'DefaultSupportSoundCaptureMode', 'Silent') }, SC.res['AdvancedConfig.SoundCaptureModeSilent']),
						$option({ value: 'Speakers', selected: setSelected(webConfigSettings, 'DefaultSupportSoundCaptureMode', 'Speakers') }, SC.res['AdvancedConfig.SoundCaptureModeSpeakers']),
						$option({ value: 'HostMicrophone', selected: setSelected(webConfigSettings, 'DefaultSupportSoundCaptureMode', 'HostMicrophone') }, SC.res['AdvancedConfig.SoundCaptureModeHostMicrophone']),
						$option({ value: 'AllMicrophones', selected: setSelected(webConfigSettings, 'DefaultSupportSoundCaptureMode', 'AllMicrophones') }, SC.res['AdvancedConfig.SoundCaptureModeAllMicrophones'])
					], WEB_CONFIG)
				)
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'DefaultAccessSoundCaptureMode') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.DefaultAccessSoundCaptureMode)
			},
				$configControlBlock(
					SC.res['AdvancedConfig.Access'],
					CSS_CLASS_DROPDOWN_BLOCK,
					$configDropDown('DefaultAccessSoundCaptureMode', [
						$option({ value: 'Silent', selected: setSelected(webConfigSettings, 'DefaultAccessSoundCaptureMode', 'Silent') }, SC.res['AdvancedConfig.SoundCaptureModeSilent']),
						$option({ value: 'Speakers', selected: setSelected(webConfigSettings, 'DefaultAccessSoundCaptureMode', 'Speakers') }, SC.res['AdvancedConfig.SoundCaptureModeSpeakers']),
						$option({ value: 'HostMicrophone', selected: setSelected(webConfigSettings, 'DefaultAccessSoundCaptureMode', 'HostMicrophone') }, SC.res['AdvancedConfig.SoundCaptureModeHostMicrophone']),
						$option({ value: 'AllMicrophones', selected: setSelected(webConfigSettings, 'DefaultAccessSoundCaptureMode', 'AllMicrophones') }, SC.res['AdvancedConfig.SoundCaptureModeAllMicrophones'])
					], WEB_CONFIG)
				)
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'DefaultMeetingSoundCaptureMode') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.DefaultMeetingSoundCaptureMode)
			},
				$configControlBlock(
					SC.res['AdvancedConfig.Meeting'],
					CSS_CLASS_DROPDOWN_BLOCK,
					$configDropDown('DefaultMeetingSoundCaptureMode', [
						$option({ value: 'Silent', selected: setSelected(webConfigSettings, 'DefaultMeetingSoundCaptureMode', 'Silent') }, SC.res['AdvancedConfig.SoundCaptureModeSilent']),
						$option({ value: 'Speakers', selected: setSelected(webConfigSettings, 'DefaultMeetingSoundCaptureMode', 'Speakers') }, SC.res['AdvancedConfig.SoundCaptureModeSpeakers']),
						$option({ value: 'HostMicrophone', selected: setSelected(webConfigSettings, 'DefaultMeetingSoundCaptureMode', 'HostMicrophone') }, SC.res['AdvancedConfig.SoundCaptureModeHostMicrophone']),
						$option({ value: 'AllMicrophones', selected: setSelected(webConfigSettings, 'DefaultMeetingSoundCaptureMode', 'AllMicrophones') }, SC.res['AdvancedConfig.SoundCaptureModeAllMicrophones'])
					], WEB_CONFIG)
				)
			)
		]),
		//Guest Screen Preview
		$tr({ className: 'ConfigBorderlessRow' }, [
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.GuestScreenPreview'], SC.res['AdvancedConfig.GuestScreenPreview.Description'])
			),
			$emptyDataCell(),
			$emptyDataCell(),
			$emptyDataCell()
		]),
		$tr({ className: 'ConfigTableSubRow ConfigBorderlessRow' }, [
			$td(
				$p(SC.res['AdvancedConfig.SetPreviewScreenQuality'])
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'GuestScreenshotMaxPixelCount') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.GuestScreenshotMaxPixelCount)
			},
				$configTextBoxChunk(
					'GuestScreenshotMaxPixelCount',
					setTextBoxValue(webConfigSettings, 'GuestScreenshotMaxPixelCount', WebConfigDefaults.OtherSettings.GuestScreenshotMaxPixelCount),
					SC.res['AdvancedConfig.Pixels'],
					WEB_CONFIG
				)
			),
			$emptyDataCell(),
			$emptyDataCell()
		]),
		$tr({ className: 'ConfigTableSubRow' }, [
			$td(
				$p(SC.res['AdvancedConfig.SetPreviewScreenSize']),
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'GuestScreenshotMaxScalePercent') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.GuestScreenshotMaxScalePercent)
			},
				$configTextBoxChunk(
					'GuestScreenshotMaxScalePercent',
					setTextBoxValue(webConfigSettings, 'GuestScreenshotMaxScalePercent', WebConfigDefaults.OtherSettings.GuestScreenshotMaxScalePercent),
					SC.res['AdvancedConfig.Percent'],
					WEB_CONFIG
				)
			),
			$emptyDataCell(),
			$emptyDataCell()
		]),
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.CommandExecutionTimeout'], SC.res['AdvancedConfig.CommandExecutionTimeout.Description'])
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'RunCommandKillAfterMilliseconds') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.RunCommandKillAfterMilliseconds)
			},
				$configTextBoxChunk(
					'RunCommandKillAfterMilliseconds',
					setTextBoxValue(webConfigSettings, 'RunCommandKillAfterMilliseconds', WebConfigDefaults.OtherSettings.RunCommandKillAfterMilliseconds),
					SC.res['AdvancedConfig.Milliseconds'],
					WEB_CONFIG
				)
			),
			$emptyDataCell(),
			$emptyDataCell()
		])
	]);
	var sessionSettingsTable = $table({ className: 'DataTable ConfigDataTable' }, [
		$tr([
			$th(SC.res['AdvancedConfig.Setting']),
			$th(SC.res['AdvancedConfig.Value']),
			$th(),
			$th()
		]),
		//Open Session Timeout Setting
		$tr({ className: 'ConfigBorderlessRow' },
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.OpenSessionTimeout'], SC.res['AdvancedConfig.OpenSessionTimeout.Description'])
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'AccessTokenExpireSeconds') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.AccessTokenExpireSeconds)
			},
				$configTextBoxChunk(
					'AccessTokenExpireSeconds',
					setTextBoxValue(webConfigSettings, 'AccessTokenExpireSeconds', WebConfigDefaults.OtherSettings.AccessSessionExpireSeconds),
					SC.res['AdvancedConfig.Seconds'],
					WEB_CONFIG
				)
			)
		),
		$tr({ className: 'ConfigTableSubRow' }, [
			$td(
				$p(SC.res['AdvancedConfig.AutoRenewSessionTimeout'])
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'ShouldRevalidateAccessToken') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.res['AdvancedConfig.AutoRenewSessionTimeout.Description']
			},
				$configToggle(
					'ShouldRevalidateAccessToken',
					null,
					WEB_CONFIG,
					setToggle(webConfigSettings, 'ShouldRevalidateAccessToken', null, false, false)
				)
			),
			$emptyDataCell(),
			$emptyDataCell()
		]),
		//Host Connection Timeout Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.HostConnectionTimeout'], SC.res['AdvancedConfig.HostConnectionTimeout.Description'])
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'InputIdleDisconnectTimeSeconds') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.InputIdleDisconnectTimeSeconds)
			},
				$configTextBoxChunk(
					'InputIdleDisconnectTimeSeconds',
					setTextBoxValue(webConfigSettings, 'InputIdleDisconnectTimeSeconds', WebConfigDefaults.OtherSettings.InputIdleDisconnectTimeSeconds),
					SC.res['AdvancedConfig.Seconds'],
					WEB_CONFIG
				)
			),
			$emptyDataCell(),
			$emptyDataCell()
		]),
		//Remove Disconnected Session From List Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.RemoveDisconnectedSessionFromList'], SC.res['AdvancedConfig.RemoveDisconnectedSessionFromList.Description'])
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'SupportSessionExpireSeconds') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.SupportSessionExpireSeconds)
			},
				$configControlBlock(
					SC.res['AdvancedConfig.Support'],
					CSS_CLASS_TEXTBOX_BLOCK,
					$configTextBoxChunk(
						'SupportSessionExpireSeconds',
						setTextBoxValue(webConfigSettings, 'SupportSessionExpireSeconds', WebConfigDefaults.OtherSettings.SupportSessionExpireSeconds),
						SC.res['AdvancedConfig.Seconds'],
						WEB_CONFIG
					)
				)
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'AccessSessionExpireSeconds') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.AccessSessionExpireSeconds)
			},
				$configControlBlock(
					SC.res['AdvancedConfig.Access'],
					CSS_CLASS_TEXTBOX_BLOCK,
					$configTextBoxChunk(
						'AccessSessionExpireSeconds',
						setTextBoxValue(webConfigSettings, 'AccessSessionExpireSeconds', WebConfigDefaults.OtherSettings.AccessSessionExpireSeconds),
						SC.res['AdvancedConfig.Seconds'],
						WEB_CONFIG
					)
				)
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'MeetingSessionExpireSeconds') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.MeetingSessionExpireSeconds)
			},
				$configControlBlock(
					SC.res['AdvancedConfig.Meeting'],
					CSS_CLASS_TEXTBOX_BLOCK,
					$configTextBoxChunk(
						'MeetingSessionExpireSeconds',
						setTextBoxValue(webConfigSettings, 'MeetingSessionExpireSeconds', WebConfigDefaults.OtherSettings.MeetingSessionExpireSeconds),
						SC.res['AdvancedConfig.Seconds'],
						WEB_CONFIG
					)
				)
			)
		])
	]);
	var pageSettingsTable = $table({ className: 'DataTable ConfigDataTable' }, [
		$tr([
			$th(SC.res['AdvancedConfig.Setting']),
			$th(SC.res['AdvancedConfig.Value']),
			$th()
		]),
		//Page Idle Timeout Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.PageIdleTimeout'], SC.res['AdvancedConfig.PageIdleTimeout.Description'])
			),
			$td({
				className: (webConfigSettings.location['Host.aspx'].MaxLongestTicketReissueIntervalSeconds == WebConfigDefaults.PageSettings.HostMaxLongestTicketReissueIntervalSeconds) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.PageSettings.HostMaxLongestTicketReissueIntervalSeconds)
			},
				$configControlBlock(
					SC.res['AdvancedConfig.HostPage'],
					CSS_CLASS_TEXTBOX_BLOCK,
					$configTextBoxChunk(
						'MaxLongestTicketReissueIntervalSeconds-Host.aspx',
						setTextBoxValue(webConfigSettings, 'MaxLongestTicketReissueIntervalSeconds', WebConfigDefaults.PageSettings.HostMaxLongestTicketReissueIntervalSeconds, 'Host.aspx'),
						SC.res['AdvancedConfig.Seconds'],
						WEB_CONFIG
					)
				)
			),
			$td({
				className: (webConfigSettings.location['Administration.aspx'].MaxLongestTicketReissueIntervalSeconds == WebConfigDefaults.PageSettings.AdminMaxLongestTicketReissueIntervalSeconds) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.PageSettings.AdminMaxLongestTicketReissueIntervalSeconds)
			},
				$configControlBlock(
					SC.res['AdvancedConfig.AdminPage'],
					CSS_CLASS_TEXTBOX_BLOCK,
					$configTextBoxChunk(
						'MaxLongestTicketReissueIntervalSeconds-Administration.aspx',
						setTextBoxValue(webConfigSettings, 'MaxLongestTicketReissueIntervalSeconds', WebConfigDefaults.PageSettings.AdminMaxLongestTicketReissueIntervalSeconds, 'Administration.aspx'),
						SC.res['AdvancedConfig.Seconds'],
						WEB_CONFIG
					)
				)
			)
		]),
		//Authentication Required Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.AuthenticationRequired'], SC.res['AdvancedConfig.AuthenticationRequired.Description'])
			),
			$td({ className: webConfigSettingHasDefaultValue(webConfigSettings.location['Host.aspx'], WebConfigDefaults.PageSettings, 'MinAuthenticationFactorCount') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
				$configControlBlock(
					SC.res['AdvancedConfig.HostPage'],
					CSS_CLASS_DROPDOWN_BLOCK,
					$configDropDown('MinAuthenticationFactorCount-Host.aspx', [
						$option({ value: '0', selected: setSelected(webConfigSettings, 'MinAuthenticationFactorCount', '0', 'Host.aspx') }, SC.res['AdvancedConfig.AuthenticationRequired.Option1']),
						$option({ value: '1', selected: setSelected(webConfigSettings, 'MinAuthenticationFactorCount', '1', 'Host.aspx') }, SC.res['AdvancedConfig.AuthenticationRequired.Option2']),
						$option({ value: '2', selected: setSelected(webConfigSettings, 'MinAuthenticationFactorCount', '2', 'Host.aspx') }, SC.res['AdvancedConfig.AuthenticationRequired.Option3']),
					], WEB_CONFIG)
				)
			),
			$td({ className: webConfigSettingHasDefaultValue(webConfigSettings.location['Administration.aspx'], WebConfigDefaults.PageSettings, 'MinAuthenticationFactorCount') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
				$configControlBlock(
					SC.res['AdvancedConfig.AdminPage'],
					CSS_CLASS_DROPDOWN_BLOCK,
					$configDropDown('MinAuthenticationFactorCount-Administration.aspx', [
						$option({ value: '0', selected: setSelected(webConfigSettings, 'MinAuthenticationFactorCount', '0', 'Administration.aspx') }, SC.res['AdvancedConfig.AuthenticationRequired.Option1']),
						$option({ value: '1', selected: setSelected(webConfigSettings, 'MinAuthenticationFactorCount', '1', 'Administration.aspx') }, SC.res['AdvancedConfig.AuthenticationRequired.Option2']),
						$option({ value: '2', selected: setSelected(webConfigSettings, 'MinAuthenticationFactorCount', '2', 'Administration.aspx') }, SC.res['AdvancedConfig.AuthenticationRequired.Option3']),
					], WEB_CONFIG)
				)
			)
		]),
		//Block IP Addresses Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.BlockIpAddresses'], SC.res['AdvancedConfig.BlockIpAddresses.Description'])
			),
			$td({ className: webConfigSettingHasDefaultValue(webConfigSettings.location['Host.aspx'], WebConfigDefaults.PageSettings, 'BlockIPs') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
				$configControlBlock(
					SC.res['AdvancedConfig.HostPage'],
					CSS_CLASS_TEXTAREA_BLOCK,
					$configTextArea(
						'BlockIPs-Host.aspx',
						setTextBoxValue(webConfigSettings, 'BlockIPs', WebConfigDefaults.PageSettings.BlockIPs, 'Host.aspx'),
						WEB_CONFIG
					)
				)
			),
			$td({ className: webConfigSettingHasDefaultValue(webConfigSettings.location['Administration.aspx'], WebConfigDefaults.PageSettings, 'BlockIPs') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
				$configControlBlock(
					SC.res['AdvancedConfig.AdminPage'],
					CSS_CLASS_TEXTAREA_BLOCK,
					$configTextArea(
						'BlockIPs-Administration.aspx',
						setTextBoxValue(webConfigSettings, 'BlockIPs', WebConfigDefaults.PageSettings.BlockIPs, 'Administration.aspx'),
						WEB_CONFIG
					)
				)
			)
		]),
		// Restrict To Addresses Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.RestrictToIpAddresses'], SC.res['AdvancedConfig.RestrictToIpAddresses.Description'], SC.res['AdvancedConfig.RestrictToIpAddresses.Caution'])
			),
			$td({ className: webConfigSettingHasDefaultValue(webConfigSettings.location['Host.aspx'], WebConfigDefaults.PageSettings, 'RestrictToIPs') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
				$configControlBlock(
					SC.res['AdvancedConfig.HostPage'],
					CSS_CLASS_TEXTAREA_BLOCK,
					$configTextArea(
						'RestrictToIPs-Host.aspx',
						setTextBoxValue(webConfigSettings, 'RestrictToIPs', WebConfigDefaults.PageSettings.RestrictToIPs, 'Host.aspx'),
						WEB_CONFIG
					)
				)
			),
			$td({ className: webConfigSettingHasDefaultValue(webConfigSettings.location['Administration.aspx'], WebConfigDefaults.PageSettings, 'RestrictToIPs') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
				$configControlBlock(
					SC.res['AdvancedConfig.AdminPage'],
					CSS_CLASS_TEXTAREA_BLOCK,
					$configTextArea(
						'RestrictToIPs-Administration.aspx',
						setTextBoxValue(webConfigSettings, 'RestrictToIPs', WebConfigDefaults.PageSettings.RestrictToIPs, 'Administration.aspx'),
						WEB_CONFIG
					)
				)
			)
		]),
	]);
	var otherSettingsTable = $table({ className: 'DataTable ConfigDataTable' }, [
		$tr([
			$th(SC.res['AdvancedConfig.Setting']),
			$th(SC.res['AdvancedConfig.Value'])
		]),
		// SmtpEnableSsl
		isProductVersionInRange(null, "21.8") && $tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.EnableSSLForEmail'], SC.res['AdvancedConfig.EnableSSLForEmail.Description'])
			),
			$td({ className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'SmtpEnableSsl') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
				$configToggle(
					'SmtpEnableSsl',
					null,
					WEB_CONFIG,
					setToggle(webConfigSettings, 'SmtpEnableSsl', null, false, false)
				)
			)
		]),
		//Allow Password Auto-Complete Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.AllowPasswordAutoComplete'], SC.res['AdvancedConfig.AllowPasswordAutoComplete.Description'])
			),
			$td({ className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'AllowPasswordAutoComplete') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
				$configToggle(
					'AllowPasswordAutoComplete',
					null,
					WEB_CONFIG,
					setToggle(webConfigSettings, 'AllowPasswordAutoComplete', null, false, false)
				)
			)
		]),
		//Disable Guest File Transfer Setting
		/*isBelowVersion() ? null : $tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.DisableGuestFileTransfer'], SC.res['AdvancedConfig.DisableGuestFileTransfer.Description'])
			),
			$td({ className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'DisableGuestFileTransfer') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
				$configToggle(
					'DisableGuestFileTransfer',
					null,
					WEB_CONFIG,
					setToggle(webConfigSettings, 'DisableGuestFileTransfer', null, false, false)
				)
			)
		]),*/
		//Log Out After Browser Closes Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.UsePersistentCookies'], SC.res['AdvancedConfig.UsePersistentCookies.Description'])
			),
			$td({ className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'UsePersistentTicketCookie') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
				$configToggle(
					'UsePersistentTicketCookie',
					null,
					WEB_CONFIG,
					setToggle(webConfigSettings, 'UsePersistentTicketCookie', null, false, false)
				)
			)
		]),
		//SameSite Cookie Attribute Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.CookieSameSiteMode'], SC.res['AdvancedConfig.CookieSameSiteMode.Description'])
			),
			$td({ className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'CookieSameSiteMode') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
				$configDropDown('CookieSameSiteMode', [
					$option({ value: 'None', selected: setSelected(webConfigSettings, 'CookieSameSiteMode', 'None') }, SC.res['AdvancedConfig.SameSiteModeNone']),
					$option({ value: 'Lax', selected: setSelected(webConfigSettings, 'CookieSameSiteMode', 'Lax') }, SC.res['AdvancedConfig.SameSiteModeLax']),
					$option({ value: 'Strict', selected: setSelected(webConfigSettings, 'CookieSameSiteMode', 'Strict') }, SC.res['AdvancedConfig.SameSiteModeStrict']),
				], WEB_CONFIG)
			)
		]),
		//Host Authentication Duration Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.HostAuthenticationDuration'], SC.res['AdvancedConfig.HostAuthenticationDuration.Description'])
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'TicketReissueIntervalSeconds') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.TicketReissueIntervalSeconds)
			},
				$configTextBoxChunk(
					'TicketReissueIntervalSeconds',
					setTextBoxValue(webConfigSettings, 'TicketReissueIntervalSeconds', WebConfigDefaults.OtherSettings.TicketReissueIntervalSeconds),
					SC.res['AdvancedConfig.Seconds'],
					WEB_CONFIG
				)
			)
		]),
		//Agent Keep Alive Interval Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.AgentKeepAliveInterval'], SC.res['AdvancedConfig.AgentKeepAliveInterval.Description'])
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'KeepAliveTimeSeconds') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.KeepAliveTimeSeconds)
			},
				$configTextBoxChunk(
					'KeepAliveTimeSeconds',
					setTextBoxValue(webConfigSettings, 'KeepAliveTimeSeconds', WebConfigDefaults.OtherSettings.KeepAliveTimeSeconds),
					SC.res['AdvancedConfig.Seconds'],
					WEB_CONFIG
				)
			)
		]),
		//Application Keep Alive Interval Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.ApplicationKeepAliveInterval'], SC.res['AdvancedConfig.ApplicationKeepAliveInterval.Description'])
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'ApplicationPingTimeSeconds') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.ApplicationPingTimeSeconds)
			},
				$configTextBoxChunk(
					'ApplicationPingTimeSeconds',
					setTextBoxValue(webConfigSettings, 'ApplicationPingTimeSeconds', WebConfigDefaults.OtherSettings.ApplicationPingTimeSeconds),
					SC.res['AdvancedConfig.Seconds'],
					WEB_CONFIG
				)
			)
		]),
		//Video Audit Clip Length Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.VideoAuditClipLength'], SC.res['AdvancedConfig.VideoAuditClipLength.Description'])
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'CycleCapturesAfterSeconds') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.CycleCapturesAfterSeconds)
			},
				$configTextBoxChunk(
					'CycleCapturesAfterSeconds',
					setTextBoxValue(webConfigSettings, 'CycleCapturesAfterSeconds', WebConfigDefaults.OtherSettings.CycleCapturesAfterSeconds),
					SC.res['AdvancedConfig.Seconds'],
					WEB_CONFIG
				)
			)
		]),
		//Command Character Return Count Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.CommandCharacterReturnCount'], SC.res['AdvancedConfig.CommandCharacterReturnCount.Description'])
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'MaxCommandResultCharacterCount') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.MaxCommandResultCharacterCount)
			},
				$configTextBoxChunk(
					'MaxCommandResultCharacterCount',
					setTextBoxValue(webConfigSettings, 'MaxCommandResultCharacterCount', WebConfigDefaults.OtherSettings.MaxCommandResultCharacterCount),
					SC.res['AdvancedConfig.Characters'],
					WEB_CONFIG
				)
			)
		]),
		//Consent Timeout Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.ConsentTimeout'], SC.res['AdvancedConfig.ConsentTimeout.Description'])
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'ConsentExpireSeconds') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.ConsentExpireSeconds)
			},
				$configTextBoxChunk(
					'ConsentExpireSeconds',
					setTextBoxValue(webConfigSettings, 'ConsentExpireSeconds', WebConfigDefaults.OtherSettings.ConsentExpireSeconds),
					SC.res['AdvancedConfig.Seconds'],
					WEB_CONFIG
				)
			)
		]),
		//Acknowledge Message Delay Setting (removed in 22.9)
		isProductVersionInRange(null, "22.9") && $tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.AcknowledgeMessageDelay'], SC.res['AdvancedConfig.AcknowledgeMessageDelay.Description'])
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'AcknowledgeMessageDelaySeconds') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.AcknowledgeMessageDelaySeconds)
			},
				$configTextBoxChunk(
					'AcknowledgeMessageDelaySeconds',
					setTextBoxValue(webConfigSettings, 'AcknowledgeMessageDelaySeconds', WebConfigDefaults.OtherSettings.AcknowledgeMessageDelaySeconds),
					SC.res['AdvancedConfig.Seconds'],
					WEB_CONFIG
				)
			)
		]),
		//Host Transfer Timeout Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.HostTransferTimeout'], SC.res['AdvancedConfig.HostTransferTimeout.Description'])
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'HostEligibleExpireSeconds') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.HostEligibleExpireSeconds)
			},
				$configTextBoxChunk(
					'HostEligibleExpireSeconds',
					setTextBoxValue(webConfigSettings, 'HostEligibleExpireSeconds', WebConfigDefaults.OtherSettings.HostEligibleExpireSeconds),
					SC.res['AdvancedConfig.Seconds'],
					WEB_CONFIG
				)
			)
		]),
		//Guest Information Refresh Interval Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.GuestInformationRefreshInterval'], SC.res['AdvancedConfig.GuestInformationRefreshInterval.Description'], SC.res['AdvancedConfig.GuestInformationRefreshInterval.Caution'])
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'GuestInfoRefreshSeconds') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.GuestInfoRefreshSeconds)
			},
				$configNumberBoxChunk(
					'GuestInfoRefreshSeconds',
					setTextBoxValue(webConfigSettings, 'GuestInfoRefreshSeconds', WebConfigDefaults.OtherSettings.GuestInfoRefreshSeconds),
					SC.res['AdvancedConfig.Seconds'],
					WEB_CONFIG,
					300
				)
			)
		]),
		//Auto Reinstall Minimum Interval Seconds Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.AutoReinstallMinIntervalSeconds'], SC.res['AdvancedConfig.AutoReinstallMinIntervalSeconds.Description'])
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'AutoReinstallMinIntervalSeconds') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.AutoReinstallMinIntervalSeconds)
			},
				$configNumberBoxChunk(
					'AutoReinstallMinIntervalSeconds',
					setTextBoxValue(webConfigSettings, 'AutoReinstallMinIntervalSeconds', WebConfigDefaults.OtherSettings.AutoReinstallMinIntervalSeconds),
					SC.res['AdvancedConfig.Seconds'],
					WEB_CONFIG
				)
			)
		]),
		//Host Session Display Limit Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.HostSessionDisplayLimit'], SC.res['AdvancedConfig.HostSessionDisplayLimit.Description'])
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'HostSessionDisplayLimit') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.HostSessionDisplayLimit)
			},
				$configTextBoxChunk(
					'HostSessionDisplayLimit',
					setTextBoxValue(webConfigSettings, 'HostSessionDisplayLimit', WebConfigDefaults.OtherSettings.HostSessionDisplayLimit),
					SC.res['AdvancedConfig.Sessions'],
					WEB_CONFIG
				)
			)
		]),
		//Session Type Display Order setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.SessionTypeDisplayOrder'], SC.res['AdvancedConfig.SessionTypeDisplayOrder.Description'])
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'SessionTypeDisplayOrder') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.SessionTypeDisplayOrder)
			},
				$configTextBoxChunk(
					'SessionTypeDisplayOrder',
					setTextBoxValue(webConfigSettings, 'SessionTypeDisplayOrder', WebConfigDefaults.OtherSettings.SessionTypeDisplayOrder),
					null,
					WEB_CONFIG
				)
			)
		]),
		//Trust Device Expire Days Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.TrustDeviceExpireDays'], SC.res['AdvancedConfig.TrustDeviceExpireDays.Description'])
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'TrustDeviceExpireDays') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.TrustDeviceExpireDays)
			},
				$configTextBoxChunk(
					'TrustDeviceExpireDays',
					setTextBoxValue(webConfigSettings, 'TrustDeviceExpireDays', WebConfigDefaults.OtherSettings.TrustDeviceExpireDays),
					SC.res['AdvancedConfig.Days'],
					WEB_CONFIG
				)
			)
		]),
		//Host Client Device Fingerprint Validation Level
		$tr([
			$td(
				$configDescriptionBlock(
					SC.res['AdvancedConfig.HostClientDeviceFingerprintValidationLevel'],
					[
						SC.res['AdvancedConfig.HostClientDeviceFingerprintValidationLevel.Description'],
						$ul([
							$li(SC.res['AdvancedConfig.HostClientDeviceFingerprintValidationLevel.DescriptionNone']),
							$li(SC.res['AdvancedConfig.HostClientDeviceFingerprintValidationLevel.DescriptionHigh']),
							$li(SC.res['AdvancedConfig.HostClientDeviceFingerprintValidationLevel.DescriptionMedium']),
							$li(SC.res['AdvancedConfig.HostClientDeviceFingerprintValidationLevel.DescriptionLow']),
						])
					]
				)
			),
			$td(
				{
					className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'HostClientDeviceFingerprintValidationLevel') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
					title: SC.util.formatString(SC.res['AdvancedConfig.HostClientDeviceFingerprintValidationLevel'], WebConfigDefaults.OtherSettings.HostClientDeviceFingerprintValidationLevel)
				},
				$configDropDown(
					'HostClientDeviceFingerprintValidationLevel',
					[
						$option({ value: 'None', selected: setSelected(webConfigSettings, 'HostClientDeviceFingerprintValidationLevel', 'None') }, SC.res['AdvancedConfig.HostClientDeviceFingerprintValidationLevelNone']),
						$option({ value: 'High', selected: setSelected(webConfigSettings, 'HostClientDeviceFingerprintValidationLevel', 'High') }, SC.res['AdvancedConfig.HostClientDeviceFingerprintValidationLevelHigh']),
						$option({ value: 'Medium', selected: setSelected(webConfigSettings, 'HostClientDeviceFingerprintValidationLevel', 'Medium') }, SC.res['AdvancedConfig.HostClientDeviceFingerprintValidationLevelMedium']),
						$option({ value: 'Low', selected: setSelected(webConfigSettings, 'HostClientDeviceFingerprintValidationLevel', 'Low') }, SC.res['AdvancedConfig.HostClientDeviceFingerprintValidationLevelLow']),
					],
					WEB_CONFIG
				)
			)
		]),
		//WebServer Addressable URI Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.WebServerAddressableUri'], SC.res['AdvancedConfig.WebServerAddressableUri.Description'])
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'WebServerAddressableUri') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.WebServerAddressableUri)
			},
				IS_CLOUD ?
					$p(SC.res['AdvancedConfig.SettingNotConfigurableOnCloud.Message'])
					:
					$configTextBoxChunk(
						'WebServerAddressableUri',
						setTextBoxValue(webConfigSettings, 'WebServerAddressableUri', WebConfigDefaults.OtherSettings.WebServerAddressableUri),
						null,
						WEB_CONFIG
					)
			)
		]),
		//Relay Addressable URI Setting
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.RelayAddressableUri'], SC.res['AdvancedConfig.RelayAddressableUri.Description'])
			),
			$td({
				className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'RelayAddressableUri') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
				title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.RelayAddressableUri)
			},
				IS_CLOUD ?
					$p(SC.res['AdvancedConfig.SettingNotConfigurableOnCloud.Message'])
					:
					$configTextBoxChunk(
						'RelayAddressableUri',
						setTextBoxValue(webConfigSettings, 'RelayAddressableUri', WebConfigDefaults.OtherSettings.RelayAddressableUri),
						null,
						WEB_CONFIG
					)
			)
		]),
		// Duo-2FA Settings
		$tr([
			$td(
				$configDescriptionBlock(SC.res['AdvancedConfig.DuoSettings'], SC.res['AdvancedConfig.DuoSettings.Description'])
			),
			$td(
				$div({
					className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'DuoIntegrationKey') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
					title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.DuoIntegrationKey),
				},
					$configControlBlock(
						SC.res['AdvancedConfig.DuoSettings.DuoIntegrationKeyHeader'],
						CSS_CLASS_TEXTBOX_BLOCK,
						$configTextBoxChunk(
							'DuoIntegrationKey',
							setTextBoxValue(webConfigSettings, 'DuoIntegrationKey', WebConfigDefaults.OtherSettings.DuoIntegrationKey),
							null,
							WEB_CONFIG
						)
					)
				),
				$div({
					className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'DuoSecretKey') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
					title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.DuoSecretKey),
				},
					$configControlBlock(
						SC.res['AdvancedConfig.DuoSettings.DuoSecretKeyHeader'],
						CSS_CLASS_TEXTBOX_BLOCK,
						$configTextBoxChunk(
							'DuoSecretKey',
							setTextBoxValue(webConfigSettings, 'DuoSecretKey', WebConfigDefaults.OtherSettings.DuoSecretKey),
							null,
							WEB_CONFIG
						)
					)
				),
				$div({
					className: webConfigSettingHasDefaultValue(webConfigSettings, WebConfigDefaults.OtherSettings, 'DuoApiHostname') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
					title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], WebConfigDefaults.OtherSettings.DuoApiHostname),
				},
					$configControlBlock(
						SC.res['AdvancedConfig.DuoSettings.DuoApiHostnameHeader'],
						CSS_CLASS_TEXTBOX_BLOCK,
						$configTextBoxChunk(
							'DuoApiHostname',
							setTextBoxValue(webConfigSettings, 'DuoApiHostname', WebConfigDefaults.OtherSettings.DuoApiHostname),
							null,
							WEB_CONFIG
						)
					)
				)
			)
		]),
		// ExcludeClientInstallerComponents
		$tr({ className: 'ConfigBorderlessRow' }, [
			$td($configDescriptionBlock(
				SC.res['AdvancedConfig.ExcludeClientInstallerComponents'],
				SC.res['AdvancedConfig.ExcludeClientInstallerComponents.Description'],
				SC.res['AdvancedConfig.ExcludeClientInstallerComponents.Caution']
			)),
			$td($p({ className: 'ConfigColumnHeader', _textResource: 'AdvancedConfig.Exclude' })),
		]),
		Object.entries({
			Main: 1 << 0,
			BackstageShell: 1 << 1,
			CredentialProvider: 1 << 2,
			Service: 1 << 3,
		}).map(function(entry) {
			var name = entry[0];
			// var value = entry[1];
			return $tr({ className: 'ConfigTableSubRow ConfigBorderlessRow' }, [
				$td($p({ _textResource: 'AdvancedConfig.ClientInstallerComponents.' + name })),
				$td({ className: webConfigSettings.ExcludeClientInstallerComponents && webConfigSettings.ExcludeClientInstallerComponents.split(",").includes(name) ? CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT : '' }, [
					$configToggle(
						'ExcludeClientInstallerComponents-' + name,
						name,
						WEB_CONFIG,
						setToggle(webConfigSettings, 'ExcludeClientInstallerComponents', name, false, false)
					),
				]),
			]);
		}),
	]);

	SC.ui.setContents(contentPanel, [
		SC.ui.createCollapsiblePanel($h3({ _textResource: 'AdvancedConfig.QuickSettings' }), quickSettingsTable, false,),
		SC.ui.createCollapsiblePanel($h3({ _textResource: 'AdvancedConfig.SessionSettings' }), sessionSettingsTable, false,),
		SC.ui.createCollapsiblePanel($h3({ _textResource: 'AdvancedConfig.PageSettings' }), pageSettingsTable, false,),
		SC.ui.createCollapsiblePanel($h3({ _textResource: 'AdvancedConfig.OtherSettings' }), otherSettingsTable, false,),

		$configRestoreDefaultsLink(WEB_CONFIG)
	]);
}

function hasDefaultSettingValue(currentValueDict, defaultValueDict, settingName) {
	return currentValueDict[settingName] === undefined || currentValueDict[settingName] == defaultValueDict[settingName];
};

function buildAppConfigQuickSettingsPage(contentPanel, appConfigSettings) {
	SC.ui.setContents(contentPanel, [
		$table({ className: 'DataTable ConfigDataTable' }, [
			$tr([
				$th(SC.res['AdvancedConfig.Setting']),
				$th(SC.res['AdvancedConfig.Value']),
				$th(),
				$th()
			]),
			//Show Host Connected Banner Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.ShowHostConnectedBanner'], SC.res['AdvancedConfig.ShowHostConnectedBanner.Description'])
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'SupportShowUnderControlBanner') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configControlBlock(
						SC.res['AdvancedConfig.Support'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'SupportShowUnderControlBanner',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.UserInterfaceSettings, 'SupportShowUnderControlBanner', null, false, false)
						)
					)
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'AccessShowUnderControlBanner') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configControlBlock(
						SC.res['AdvancedConfig.Access'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'AccessShowUnderControlBanner',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.UserInterfaceSettings, 'AccessShowUnderControlBanner', null, false, false)
						)
					)
				),
				$emptyDataCell()
			]),
			//Hide Guest Wallpaper Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.HideGuestWallpaper'], SC.res['AdvancedConfig.HideGuestWallpaper.Description'])
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'SupportHideWallpaperOnConnect') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configControlBlock(
						SC.res['AdvancedConfig.Support'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'SupportHideWallpaperOnConnect',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.UserInterfaceSettings, 'SupportHideWallpaperOnConnect', null, false, false)
						)
					)
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'AccessHideWallpaperOnConnect') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configControlBlock(
						SC.res['AdvancedConfig.Access'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'AccessHideWallpaperOnConnect',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.UserInterfaceSettings, 'AccessHideWallpaperOnConnect', null, false, false)
						)
					)
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'HideWallpaperOnConnect') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configControlBlock(
						SC.res['AdvancedConfig.All'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'HideWallpaperOnConnect',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.UserInterfaceSettings, 'HideWallpaperOnConnect', null, false, false)
						)
					)
				)
			]),
			//Show Notification Balloon on Connect Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.ShowNotificationBalloonOnConnect'], SC.res['AdvancedConfig.ShowNotificationBalloonOnConnect.Description'])
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'SupportShowBalloonOnConnect') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configControlBlock(
						SC.res['AdvancedConfig.Support'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'SupportShowBalloonOnConnect',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.UserInterfaceSettings, 'SupportShowBalloonOnConnect', null, false, false)
						)
					)
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'AccessShowBalloonOnConnect') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configControlBlock(
						SC.res['AdvancedConfig.Access'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'AccessShowBalloonOnConnect',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.UserInterfaceSettings, 'AccessShowBalloonOnConnect', null, false, false)
						)
					)
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'ShowBalloonOnConnect') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configControlBlock(
						SC.res['AdvancedConfig.All'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'ShowBalloonOnConnect',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.UserInterfaceSettings, 'ShowBalloonOnConnect', null, false, false)
						)
					)
				)
			]),
			//Show Notification Balloon on Hide Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.ShowNotificationBalloonOnHide'], SC.res['AdvancedConfig.ShowNotificationBalloonOnHide.Description'])
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'SupportShowBalloonOnHide') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configControlBlock(
						SC.res['AdvancedConfig.Support'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'SupportShowBalloonOnHide',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.UserInterfaceSettings, 'SupportShowBalloonOnHide', null, false, false)
						)
					)
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'AccessShowBalloonOnHide') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configControlBlock(
						SC.res['AdvancedConfig.Access'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'AccessShowBalloonOnHide',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.UserInterfaceSettings, 'AccessShowBalloonOnHide', null, false, false)
						)
					)
				),
				$emptyDataCell()
			]),
			//Show System Tray Icon Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.ShowSystemTrayIcon'], SC.res['AdvancedConfig.ShowSystemTrayIcon.Description'])
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'SupportShowSystemTrayIcon') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configControlBlock(
						SC.res['AdvancedConfig.Support'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'SupportShowSystemTrayIcon',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.UserInterfaceSettings, 'SupportShowSystemTrayIcon', null, false, false)
						)
					)
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'AccessShowSystemTrayIcon') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configControlBlock(
						SC.res['AdvancedConfig.Access'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'AccessShowSystemTrayIcon',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.UserInterfaceSettings, 'AccessShowSystemTrayIcon', null, false, false)
						)
					)
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'ShowSystemTrayIcon') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configControlBlock(
						SC.res['AdvancedConfig.All'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'ShowSystemTrayIcon',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.UserInterfaceSettings, 'ShowSystemTrayIcon', null, false, false)
						)
					)
				),
			]),
			//Auto Consent Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.AutoConsent'], SC.res['AdvancedConfig.AutoConsent.Description'])
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.SystemSettings, AppConfigDefaults.SystemSettings, 'SupportAutoConsentIfUserProcessNotRunning') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configControlBlock(
						SC.res['AdvancedConfig.Support'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'SupportAutoConsentIfUserProcessNotRunning',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.SystemSettings, 'SupportAutoConsentIfUserProcessNotRunning', null, false, false)
						)
					)
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.SystemSettings, AppConfigDefaults.SystemSettings, 'AccessAutoConsentIfUserProcessNotRunning') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configControlBlock(
						SC.res['AdvancedConfig.Access'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'AccessAutoConsentIfUserProcessNotRunning',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.SystemSettings, 'AccessAutoConsentIfUserProcessNotRunning', null, false, false)
						)
					)
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.SystemSettings, AppConfigDefaults.SystemSettings, 'AutoConsentIfUserProcessNotRunning') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configControlBlock(
						SC.res['AdvancedConfig.All'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'AutoConsentIfUserProcessNotRunning',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.SystemSettings, 'AutoConsentIfUserProcessNotRunning', null, false, false)
						)
					)
				)
			]),
			//Auto Consent to Backstage Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.AutoConsentToBackstage'], SC.res['AdvancedConfig.AutoConsentToBackstage.Description'])
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.SystemSettings, AppConfigDefaults.SystemSettings, 'AutoConsentToBackstage') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'AutoConsentToBackstage',
						null,
						APP_CONFIG,
						setToggle(appConfigSettings.SystemSettings, 'AutoConsentToBackstage', null, false, false)
					)
				),
				$emptyDataCell(),
				$emptyDataCell(),
			]),
			//Is Backstage Default Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.IsBackstageDefault'], SC.res['AdvancedConfig.IsBackstageDefault.Description'])
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.SystemSettings, AppConfigDefaults.SystemSettings, 'IsBackstageDefault') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'IsBackstageDefault',
						null,
						APP_CONFIG,
						setToggle(appConfigSettings.SystemSettings, 'IsBackstageDefault', null, false, false)
					)
				),
				$emptyDataCell(),
				$emptyDataCell(),
			]),
			//Lock Guest Machine Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.LockGuestMachine'], SC.res['AdvancedConfig.LockGuestMachine.Description'])
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.SystemSettings, AppConfigDefaults.SystemSettings, 'SupportLockMachineOnDisconnect') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configControlBlock(
						SC.res['AdvancedConfig.Support'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'SupportLockMachineOnDisconnect',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.SystemSettings, 'SupportLockMachineOnDisconnect', null, false, false)
						)
					)
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.SystemSettings, AppConfigDefaults.SystemSettings, 'AccessLockMachineOnDisconnect') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configControlBlock(
						SC.res['AdvancedConfig.Access'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'AccessLockMachineOnDisconnect',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.SystemSettings, 'AccessLockMachineOnDisconnect', null, false, false)
						)
					)
				),
				$emptyDataCell()
			]),
			//Show End of Session Dialog Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.ShowCloseSessionDialog'], SC.res['AdvancedConfig.ShowCloseSessionDialog.Description'])
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'ShowCloseDialogOnExit') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'ShowCloseDialogOnExit',
						null,
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'ShowCloseDialogOnExit', null, false, false)
					)
				),
				$emptyDataCell(),
				$emptyDataCell()
			]),
			// Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.ShowHostFeedbackSurvey'], SC.res['AdvancedConfig.ShowHostFeedbackSurvey.Description'])
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'ShowFeedbackSurveyForm') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'ShowFeedbackSurveyForm',
						null,
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'ShowFeedbackSurveyForm', null, false, false)
					)
				),
				$emptyDataCell(),
				$emptyDataCell()
			])
		]),
		$configRestoreDefaultsLink(APP_CONFIG)
	]);
}

function buildAppConfigOtherSettingsPage(contentPanel, appConfigSettings) {
	SC.ui.setContents(contentPanel, [
		$table({ className: 'DataTable ConfigDataTable' }, [
			$tr([
				$th(SC.res['AdvancedConfig.Setting']),
				$th(SC.res['AdvancedConfig.Value']),
				$th(),
				$th()
			]),
			//Lock Machine on Connect Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.LockMachineOnConnect'], SC.res['AdvancedConfig.LockMachineOnConnect.Description'])
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.SystemSettings, AppConfigDefaults.SystemSettings, 'SupportLockMachineOnConnect') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configControlBlock(
						SC.res['AdvancedConfig.Support'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'SupportLockMachineOnConnect',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.SystemSettings, 'SupportLockMachineOnConnect', null, false, false)
						)
					)
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.SystemSettings, AppConfigDefaults.SystemSettings, 'AccessLockMachineOnConnect') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configControlBlock(
						SC.res['AdvancedConfig.Access'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'AccessLockMachineOnConnect',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.SystemSettings, 'AccessLockMachineOnConnect', null, false, false)
						)
					)
				),
				$emptyDataCell()
			]),
			//Always On Top Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.AlwaysOnTop'], SC.res['AdvancedConfig.AlwaysOnTop.Description'])
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'GuestAlwaysOnTop') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configControlBlock(
						SC.res['AdvancedConfig.Guest'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'GuestAlwaysOnTop',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.UserInterfaceSettings, 'GuestAlwaysOnTop', null, false, false)
						)
					)
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'HostAlwaysOnTop') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configControlBlock(
						SC.res['AdvancedConfig.Host'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'HostAlwaysOnTop',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.UserInterfaceSettings, 'HostAlwaysOnTop', null, false, false)
						)
					)
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'AlwaysOnTop') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configControlBlock(
						SC.res['AdvancedConfig.All'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'AlwaysOnTop',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.UserInterfaceSettings, 'AlwaysOnTop', null, false, false)
						)
					)
				)
			]),
			//Disable Clipboard Capture Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.DisableClipboardCapture'], SC.res['AdvancedConfig.DisableClipboardCapture.Description'])
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'DisableClipboardCapture') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisableClipboardCapture',
						null,
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisableClipboardCapture', null, false, false)
					)
				),
				$emptyDataCell(),
				$emptyDataCell()
			]),
			//Beep on Connect Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.BeepOnConnect'], SC.res['AdvancedConfig.BeepOnConnect.Description'])
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'BeepOnConnect') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'BeepOnConnect',
						null,
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'BeepOnConnect', null, false, false)
					)
				),
				$emptyDataCell(),
				$emptyDataCell()
			]),
			//Suspend Host Control Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.SuspendHostControl'], SC.res['AdvancedConfig.SuspendHostControl.Description'])
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'SupportSuspendControlAtStartup') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configControlBlock(
						SC.res['AdvancedConfig.Support'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'SupportSuspendControlAtStartup',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.UserInterfaceSettings, 'SupportSuspendControlAtStartup', null, false, false)
						)
					)
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'AccessSuspendControlAtStartup') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },

					$configControlBlock(
						SC.res['AdvancedConfig.Access'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'AccessSuspendControlAtStartup',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.UserInterfaceSettings, 'AccessSuspendControlAtStartup', null, false, false)
						)
					)
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'MeetingSuspendControlAtStartup') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },

					$configControlBlock(
						SC.res['AdvancedConfig.Meeting'],
						CSS_CLASS_TOGGLE_BLOCK,
						$configToggle(
							'MeetingSuspendControlAtStartup',
							null,
							APP_CONFIG,
							setToggle(appConfigSettings.UserInterfaceSettings, 'MeetingSuspendControlAtStartup', null, false, false)
						)
					)
				)
			]),
			//Always End Session Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.AlwaysDeleteSession'], SC.res['AdvancedConfig.AlwaysDeleteSession.Description'])
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'AlwaysDeleteSessionOnExit') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'AlwaysDeleteSessionOnExit',
						null,
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'AlwaysDeleteSessionOnExit', null, false, false)
					)
				),
				$emptyDataCell(),
				$emptyDataCell()
			]),
			//Full Screen When Maximized Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.FullScreenWhenMaximized'], SC.res['AdvancedConfig.FullScreenWhenMaximized.Description'])
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'FullScreenWhenMaximized') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'FullScreenWhenMaximized',
						null,
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'FullScreenWhenMaximized', null, false, false)
					)
				),
				$emptyDataCell(),
				$emptyDataCell()
			]),
			//Support and Access Full Screen Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.SupportAndAccessFullScreen'], SC.res['AdvancedConfig.SupportAndAccessFullScreen.Description'])
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'SupportAccessHostFullScreenWhenMaximized') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'SupportAccessHostFullScreenWhenMaximized',
						null,
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessHostFullScreenWhenMaximized', null, false, false)
					)
				),
				$emptyDataCell(),
				$emptyDataCell()
			]),
			//Allow Guest Initiated File Transfer
			isBelowVersion() ? null : $tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.AllowGuestInitiatedFileTransfer'], SC.res['AdvancedConfig.AllowGuestInitiatedFileTransfer.Description'])
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'AllowGuestInitiatedFileTransfer') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'AllowGuestInitiatedFileTransfer',
						null,
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'AllowGuestInitiatedFileTransfer', null, false, false)
					)
				),
				$emptyDataCell(),
				$emptyDataCell()
			]),
			// Allow Login Credentials Storage Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.AllowLoginCredentialsStorage'], SC.res['AdvancedConfig.AllowLoginCredentialsStorage.Description'])
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'ShowTrayIconContextMenuStoreLoginCredentialsItem') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'ShowTrayIconContextMenuStoreLoginCredentialsItem',
						null,
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'ShowTrayIconContextMenuStoreLoginCredentialsItem', null, false, false)
					)
				),
				$emptyDataCell(),
				$emptyDataCell()
			]),
			//Retry Interval Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.RetryInterval'], SC.res['AdvancedConfig.RetryInterval.Description'])
				),
				$td({
					className: hasDefaultSettingValue(appConfigSettings.SystemSettings, AppConfigDefaults.SystemSettings, 'MaxRetrySleepMilliseconds') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
					title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], AppConfigDefaults.SystemSettings.MaxRetrySleepMilliseconds)
				},
					$configTextBoxChunk(
						'MaxRetrySleepMilliseconds',
						setTextBoxValue(appConfigSettings.SystemSettings, 'MaxRetrySleepMilliseconds', AppConfigDefaults.SystemSettings.MaxRetrySleepMilliseconds),
						SC.res['AdvancedConfig.Milliseconds'],
						APP_CONFIG
					)
				),
				$emptyDataCell(),
				$emptyDataCell()
			]),
			//Client Service Timeout Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.ClientServiceTimeout'], SC.res['AdvancedConfig.ClientServiceTimeout.Description'])
				),
				$td({
					className: hasDefaultSettingValue(appConfigSettings.SystemSettings, AppConfigDefaults.SystemSettings, 'ClientServiceTimeoutMilliseconds') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
					title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], AppConfigDefaults.SystemSettings.ClientServiceTimeoutMilliseconds)
				},
					$configTextBoxChunk(
						'ClientServiceTimeoutMilliseconds',
						setTextBoxValue(appConfigSettings.SystemSettings, 'ClientServiceTimeoutMilliseconds', AppConfigDefaults.SystemSettings.ClientServiceTimeoutMilliseconds),
						SC.res['AdvancedConfig.Milliseconds'],
						APP_CONFIG
					)
				),
				$emptyDataCell(),
				$emptyDataCell()
			]),
			//Auto Consent Countdown Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.AutoConsentCountdown'], SC.res['AdvancedConfig.AutoConsentCountdown.Description'])
				),
				$td({
					className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'AutoConsentAfterSeconds') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
					title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], AppConfigDefaults.UserInterfaceSettings.AutoConsentAfterSeconds)
				},
					$configTextBoxChunk(
						'AutoConsentAfterSeconds',
						setTextBoxValue(appConfigSettings.UserInterfaceSettings, 'AutoConsentAfterSeconds', AppConfigDefaults.UserInterfaceSettings.AutoConsentAfterSeconds),
						SC.res['AdvancedConfig.Seconds'],
						APP_CONFIG
					)
				),
				$emptyDataCell(),
				$emptyDataCell()
			]),
			// Is User Allowed To Require Consent
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.IsUserAllowedToRequireConsent'], SC.res['AdvancedConfig.IsUserAllowedToRequireConsent.Description'])
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.SystemSettings, AppConfigDefaults.SystemSettings, 'IsUserAllowedToRequireConsent') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'IsUserAllowedToRequireConsent',
						null,
						APP_CONFIG,
						setToggle(appConfigSettings.SystemSettings, 'IsUserAllowedToRequireConsent', null, false, false)
					)
				),
				$emptyDataCell(),
				$emptyDataCell()
			]),
			//Help Provider Name Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.HelpProviderName'], SC.res['AdvancedConfig.HelpProviderName.Description'])
				),
				$td({
					className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'HelpProviderName') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
					title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], AppConfigDefaults.UserInterfaceSettings.HelpProviderName)
				},
					$configTextBoxChunk(
						'HelpProviderName',
						setTextBoxValue(appConfigSettings.UserInterfaceSettings, 'HelpProviderName', AppConfigDefaults.UserInterfaceSettings.HelpProviderName),
						null,
						APP_CONFIG
					)
				),
				$emptyDataCell(),
				$emptyDataCell()
			]),
			//Directory Settings Setting
			$tr({ className: 'ConfigBorderlessRow' }, [
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.DirectorySettings'], SC.res['AdvancedConfig.DirectorySettings.Description'])
				)
			]),
			$tr({ className: 'ConfigTableSubRow ConfigBorderlessRow' }, [
				$td(
					$p(SC.res['AdvancedConfig.CapturesDirectory'])
				),
				$td({
					className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'CapturesDirectory') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
					title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], AppConfigDefaults.UserInterfaceSettings.CapturesDirectory)
				},
					$configTextBoxChunk(
						'CapturesDirectory',
						setTextBoxValue(appConfigSettings.UserInterfaceSettings, 'CapturesDirectory', AppConfigDefaults.UserInterfaceSettings.CapturesDirectory),
						null,
						APP_CONFIG
					)
				),
				$emptyDataCell(),
				$emptyDataCell()
			]),
			$tr({ className: 'ConfigTableSubRow ConfigBorderlessRow' }, [
				$td(
					$p(SC.res['AdvancedConfig.ToolboxDirectory'])
				),
				$td({
					className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'ToolboxDirectory') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
					title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], AppConfigDefaults.UserInterfaceSettings.ToolboxDirectory)
				},
					$configTextBoxChunk(
						'ToolboxDirectory',
						setTextBoxValue(appConfigSettings.UserInterfaceSettings, 'ToolboxDirectory', AppConfigDefaults.UserInterfaceSettings.ToolboxDirectory),
						null,
						APP_CONFIG
					)
				),
				$emptyDataCell(),
				$emptyDataCell()
			]),
			$tr({ className: 'ConfigTableSubRow' }, [
				$td(
					$p(SC.res['AdvancedConfig.FilesDirectory'])
				),
				$td({
					className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'FilesDirectory') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
					title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], AppConfigDefaults.UserInterfaceSettings.FilesDirectory)
				},
					$configTextBoxChunk(
						'FilesDirectory',
						setTextBoxValue(appConfigSettings.UserInterfaceSettings, 'FilesDirectory', AppConfigDefaults.UserInterfaceSettings.FilesDirectory),
						null,
						APP_CONFIG
					)
				),
				$emptyDataCell(),
				$emptyDataCell()
			]),
			//Color Theme Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.ColorTheme'], SC.res['AdvancedConfig.ColorTheme.Description'])
				),
				$td({
					className: hasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, AppConfigDefaults.UserInterfaceSettings, 'ColorTheme') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
					title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], AppConfigDefaults.UserInterfaceSettings.ColorTheme)
				},
					$configDropDown('ColorTheme', [
						$option({ value: 'DarkTheme', selected: setSelected(appConfigSettings.UserInterfaceSettings, 'ColorTheme', 'DarkTheme') }, SC.res['AdvancedConfig.DarkTheme']),
						$option({ value: 'LightTheme', selected: setSelected(appConfigSettings.UserInterfaceSettings, 'ColorTheme', 'LightTheme') }, SC.res['AdvancedConfig.LightTheme']),
					], APP_CONFIG)
				),
				$emptyDataCell(),
				$emptyDataCell()
			]),
			//Backstage Default Programs Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.EmptySessionProgramsToStart'], SC.res['AdvancedConfig.EmptySessionProgramsToStart.Description'])
				),
				$td({
					className: hasDefaultSettingValue(appConfigSettings.SystemSettings, AppConfigDefaults.SystemSettings, 'EmptySessionProgramsToStart') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
					title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], AppConfigDefaults.SystemSettings.EmptySessionProgramsToStart)
				},
					$configTextBoxChunk(
						'EmptySessionProgramsToStart',
						setTextBoxValue(appConfigSettings.SystemSettings, 'EmptySessionProgramsToStart', AppConfigDefaults.SystemSettings.EmptySessionProgramsToStart),
						null,
						APP_CONFIG
					)
				),
				$emptyDataCell(),
				$emptyDataCell()
			]),
			// MaintainEphemeralUsers
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.MaintainEphemeralUsers'], SC.res['AdvancedConfig.MaintainEphemeralUsers.Description'])
				),
				$td({ className: hasDefaultSettingValue(appConfigSettings.SystemSettings, AppConfigDefaults.SystemSettings, 'MaintainEphemeralUsers') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'MaintainEphemeralUsers',
						null,
						APP_CONFIG,
						setToggle(appConfigSettings.SystemSettings, 'MaintainEphemeralUsers', null, false, false)
					)
				),
				$emptyDataCell(),
				$emptyDataCell(),
			]),
			// EphemeralUserDisableDayCount
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.EphemeralUserDisableDayCount'], SC.res['AdvancedConfig.EphemeralUserDisableDayCount.Description'])
				),
				$td({
					className: hasDefaultSettingValue(appConfigSettings.SystemSettings, AppConfigDefaults.SystemSettings, 'EphemeralUserDisableDayCount') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
					title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], AppConfigDefaults.SystemSettings.EphemeralUserDisableDayCount),
				},
					$configTextBoxChunk(
						'EphemeralUserDisableDayCount',
						setTextBoxValue(appConfigSettings.SystemSettings, 'EphemeralUserDisableDayCount', AppConfigDefaults.SystemSettings.EphemeralUserDisableDayCount),
						SC.res['AdvancedConfig.Days'],
						APP_CONFIG
					)
				),
				$emptyDataCell(),
				$emptyDataCell(),
			]),
			// CredentialProviderUserNameFormat
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.CredentialProviderUserNameFormat'], SC.res['AdvancedConfig.CredentialProviderUserNameFormat.Description'])
				),
				$td({
					className: hasDefaultSettingValue(appConfigSettings.SystemSettings, AppConfigDefaults.SystemSettings, 'CredentialProviderUserNameFormat') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT,
					title: SC.util.formatString(SC.res['AdvancedConfig.DefaultValueTitleFormat'], AppConfigDefaults.SystemSettings.CredentialProviderUserNameFormat),
				},
					$configTextBoxChunk(
						'CredentialProviderUserNameFormat',
						setTextBoxValue(appConfigSettings.SystemSettings, 'CredentialProviderUserNameFormat', AppConfigDefaults.SystemSettings.CredentialProviderUserNameFormat),
						null,
						APP_CONFIG
					)
				),
				$emptyDataCell(),
				$emptyDataCell(),
			]),
		]),
		$configRestoreDefaultsLink(APP_CONFIG)
	]);
}

function disabledCommandNamesHasDefaultSettingValue(currentValue, disabledCommandName) {
	if (currentValue.DisabledCommandNames)
		return currentValue.DisabledCommandNames.indexOf(disabledCommandName) === -1;
	else
		return true;
};

function buildAppConfigClientMenuViewSoundMessagesSettingsPage(contentPanel, appConfigSettings) {
	SC.ui.setContents(contentPanel, [
		$table({ className: 'DataTable ConfigDataTable' }, [
			$tr([
				$th(SC.res['AdvancedConfig.Setting']),
				$th(SC.res['AdvancedConfig.Disable'])
			]),
			//Select Quality Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.SelectQuality'], SC.res['AdvancedConfig.SelectQuality.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'SelectQuality') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-1',
						'SelectQuality',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'SelectQuality', true, false)
					)
				)
			]),
			//Select Sound Capture Mode Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.SelectSoundCaptureMode'], SC.res['AdvancedConfig.SelectSoundCaptureMode.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'SelectSoundCaptureMode') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-2',
						'SelectSoundCaptureMode',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'SelectSoundCaptureMode', true, false)
					)
				)
			]),
			//Mute Microphone Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.MuteMicrophone'], SC.res['AdvancedConfig.MuteMicrophone.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'MuteMicrophone') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-3',
						'MuteMicrophone',
						APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'MuteMicrophone', true, false)
					)
				)
			]),
			// SelectLogonSession
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.SelectLogonSession'], SC.res['AdvancedConfig.SelectLogonSession.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'SelectLogonSession') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-4',
						'SelectLogonSession',
						APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'SelectLogonSession', true, false)
					)
				)
			])

		]),
		$configRestoreDefaultsLink(APP_CONFIG)
	]);
}

function buildAppConfigClientMenuEssentialsSettingsPage(contentPanel, appConfigSettings) {
	SC.ui.setContents(contentPanel, [
		$table({ className: 'DataTable ConfigDataTable' }, [
			$tr([
				$th(SC.res['AdvancedConfig.Setting']),
				$th(SC.res['AdvancedConfig.Disable'])
			]),
			//Send Ctrl-Alt-Del Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.SendCtrlAltDel'], SC.res['AdvancedConfig.SendCtrlAltDel.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'SendSystemKeyCode') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-1',
						'SendSystemKeyCode',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'SendSystemKeyCode', true, false)
					)
				)
			]),
			//Reboot Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.Reboot'], SC.res['AdvancedConfig.Reboot.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'Reboot') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-2',
						'Reboot',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'Reboot', true, false)
					)
				)
			]),
			//Manage Credentials Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.ManageCredentials'], SC.res['AdvancedConfig.ManageCredentials.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'ManageCredentials') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-3',
						'ManageCredentials',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'ManageCredentials', true, false)
					)
				)
			]),
			//Share My Desktop Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.ShareMyDesktop'], SC.res['AdvancedConfig.ShareMyDesktop.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'ShareMyDesktop') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-4',
						'ShareMyDesktop',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'ShareMyDesktop', true, false)
					)
				)
			]),
			//Unshare My Desktop Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.UnshareMyDesktop'], SC.res['AdvancedConfig.UnshareMyDesktop.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'UnshareMyDesktop') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-5',
						'UnshareMyDesktop',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'UnshareMyDesktop', true, false)
					)
				)
			]),
			//Suspend My Input Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.SuspendMyInput'], SC.res['AdvancedConfig.SuspendMyInput.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'SuspendMyInput') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-6',
						'SuspendMyInput',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'SuspendMyInput', true, false)
					)
				)
			]),
			//Block Guest Input Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.BlockGuestInput'], SC.res['AdvancedConfig.BlockGuestInput.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'BlockGuestInput') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-7',
						'BlockGuestInput',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'BlockGuestInput', true, false)
					)
				)
			]),
			//Blank Guest Monitor Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.BlankGuestMonitor'], SC.res['AdvancedConfig.BlankGuestMonitor.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'BlankGuestMonitor') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-8',
						'BlankGuestMonitor',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'BlankGuestMonitor', true, false)
					)
				)
			]),
			//Acquire Wake Lock Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.AcquireWakeLock'], SC.res['AdvancedConfig.AcquireWakeLock.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'AcquireWakeLock') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-9',
						'AcquireWakeLock',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'AcquireWakeLock', true, false)
					)
				)
			]),
			//Share Clipboard Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.ShareClipboard'], SC.res['AdvancedConfig.ShareClipboard.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'ShareClipboard') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-10',
						'ShareClipboard',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'ShareClipboard', true, false)
					)
				)
			]),
			//Send Clipboard Keystrokes
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.SendClipboardKeystrokes'], SC.res['AdvancedConfig.SendClipboardKeystrokes.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'SendClipboardKeystrokes') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-11',
						'SendClipboardKeystrokes',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'SendClipboardKeystrokes', true, false)
					)
				)
			]),
		]),
		$configRestoreDefaultsLink(APP_CONFIG)
	]);
}

function buildAppConfigClientMenuAnnotationHelperSettingsPage(contentPanel, appConfigSettings) {
	SC.ui.setContents(contentPanel, [
		$table({ className: 'DataTable ConfigDataTable' }, [
			$tr([
				$th(SC.res['AdvancedConfig.Setting']),
				$th(SC.res['AdvancedConfig.Disable'])
			]),
			//Select Annotation Mode Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.SelectAnnotationMode'], SC.res['AdvancedConfig.SelectAnnotationMode.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'SelectAnnotationMode') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-1',
						'SelectAnnotationMode',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'SelectAnnotationMode', true, false)
					)
				)
			]),
			//Select Tool (Annotation) Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.SelectToolAnnotation'], SC.res['AdvancedConfig.SelectToolAnnotation.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'SelectAnnotationTool') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-2',
						'SelectAnnotationTool',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'SelectAnnotationTool', true, false)
					)
				)
			]),
			//Select Stroke Thickness (Annotation) Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.SelectStrokeThicknessAnnotation'], SC.res['AdvancedConfig.SelectStrokeThicknessAnnotation.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'SelectAnnotationStrokeThickness') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-3',
						'SelectAnnotationStrokeThickness',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'SelectAnnotationStrokeThickness', true, false)
					)
				)
			]),
			//Clear Annotations Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.ClearAnnotations'], SC.res['AdvancedConfig.ClearAnnotations.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'ClearAnnotations') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-4',
						'ClearAnnotations',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'ClearAnnotations', true, false)
					)
				)
			]),
			//Enable Clipboard Help (Helper) Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.EnableClipboardHelpHelper'], SC.res['AdvancedConfig.EnableClipboardHelpHelper.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'EnableClipboardHelp') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-5',
						'EnableClipboardHelp',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'EnableClipboardHelp', true, false)
					)
				)
			]),
			//Select Tool (Helper) Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.SelectToolHelper'], SC.res['AdvancedConfig.SelectToolHelper.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'SelectHelperHighlightTool') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-6',
						'SelectHelperHighlightTool',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'SelectHelperHighlightTool', true, false)
					)
				)
			]),
			//Select Provider (Helper) Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.SelectProviderHelper'], SC.res['AdvancedConfig.SelectProviderHelper.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'SelectHelpProvider') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-7',
						'SelectHelpProvider',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'SelectHelpProvider', true, false)
					)
				)
			])
		]),
		$configRestoreDefaultsLink(APP_CONFIG)
	]);
}

function buildAppConfigClientMenuParticipantScreenCaptureSettingsPage(contentPanel, appConfigSettings) {
	SC.ui.setContents(contentPanel, [
		$table({ className: 'DataTable ConfigDataTable' }, [
			$tr([
				$th(SC.res['AdvancedConfig.Setting']),
				$th(SC.res['AdvancedConfig.Disable'])
			]),
			//Disconnect Participant Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.DisconnectParticipant'], SC.res['AdvancedConfig.DisconnectParticipant.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'DisconnectParticipant') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-1',
						'DisconnectParticipant',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'DisconnectParticipant', true, false)
					)
				)
			]),
			//Request Participant Share Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.RequestParticipantShare'], SC.res['AdvancedConfig.RequestParticipantShare.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'RequestParticipantShare') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-2',
						'RequestParticipantShare',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'RequestParticipantShare', true, false)
					)
				)
			]),
			//Stop Participant Share Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.StopParticipantShare'], SC.res['AdvancedConfig.StopParticipantShare.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'StopParticipantShare') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-3',
						'StopParticipantShare',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'StopParticipantShare', true, false)
					)
				)
			]),
			//Take Screenshot To Clipboard Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.TakeScreenshotToClipboard'], SC.res['AdvancedConfig.TakeScreenshotToClipboard.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'TakeScreenshotToClipboard') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-4',
						'TakeScreenshotToClipboard',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'TakeScreenshotToClipboard', true, false)
					)
				)
			]),
			//Take Screenshot To File Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.TakeScreenshotToFile'], SC.res['AdvancedConfig.TakeScreenshotToFile.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'TakeScreenshotToFile') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-5',
						'TakeScreenshotToFile',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'TakeScreenshotToFile', true, false)
					)
				)
			]),
			//Pause Video Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.PauseVideo'], SC.res['AdvancedConfig.PauseVideo.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'VideoPause') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-6',
						'VideoPause',
						APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'VideoPause', true, false)
					)
				)
			]),
			//Record Video Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.RecordVideo'], SC.res['AdvancedConfig.RecordVideo.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'VideoRecord') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-7',
						'VideoRecord',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'VideoRecord', true, false)
					)
				)
			]),
			//Stop Video Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.StopVideo'], SC.res['AdvancedConfig.StopVideo.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'VideoStop') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-8',
						'VideoStop',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'VideoStop', true, false)
					)
				)
			])
		]),
		$configRestoreDefaultsLink(APP_CONFIG)
	]);
}

function buildAppConfigClientMenuToolboxFileTransferSettingsPage(contentPanel, appConfigSettings) {
	SC.ui.setContents(contentPanel, [
		$table({ className: 'DataTable ConfigDataTable' }, [
			$tr([
				$th(SC.res['AdvancedConfig.Setting']),
				$th(SC.res['AdvancedConfig.Disable'])
			]),
			//Manage Shared Toolbox Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.ManageSharedToolbox'], SC.res['AdvancedConfig.ManageSharedToolbox.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'ManageSharedToolbox') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-1',
						'ManageSharedToolbox',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'ManageSharedToolbox', true, false)
					)
				)
			]),
			//Navigate Toolbox Folder Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.NavigateToolboxFolder'], SC.res['AdvancedConfig.NavigateToolboxFolder.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'NavigateToolboxFolder') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-2',
						'NavigateToolboxFolder',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'NavigateToolboxFolder', true, false)
					)
				)
			]),
			//Run Tool Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.RunTool'], SC.res['AdvancedConfig.RunTool.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'RunTool') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-3',
						'RunTool',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'RunTool', true, false)
					)
				)
			]),
			//Run Tool Elevated Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.RunToolElevated'], SC.res['AdvancedConfig.RunToolElevated.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'RunToolElevated') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-4',
						'RunToolElevated',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'RunToolElevated', true, false)
					)
				)
			]),
			//Send Files Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.SendFiles'], SC.res['AdvancedConfig.SendFiles.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'SendFiles') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-5',
						'SendFiles',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'SendFiles', true, false)
					)
				)
			]),
			//Send Folder Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.SendFolder'], SC.res['AdvancedConfig.SendFolder.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'SendFolder') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-6',
						'SendFolder',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'SendFolder', true, false)
					)
				)
			]),
			//Receive Files Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.ReceiveFiles'], SC.res['AdvancedConfig.ReceiveFiles.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'ReceiveFiles') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-7',
						'ReceiveFiles',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'ReceiveFiles', true, false)
					)
				)
			]),
			//Receive Folder Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.ReceiveFolder'], SC.res['AdvancedConfig.ReceiveFolder.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'ReceiveFolder') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-8',
						'ReceiveFolder',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'ReceiveFolder', true, false)
					)
				)
			])
		]),
		$configRestoreDefaultsLink(APP_CONFIG)
	]);
}

function buildAppConfigClientMenuSystemOptionsSettingsPage(contentPanel, appConfigSettings) {
	SC.ui.setContents(contentPanel, [
		$table({ className: 'DataTable ConfigDataTable' }, [
			$tr([
				$th(SC.res['AdvancedConfig.Setting']),
				$th(SC.res['AdvancedConfig.Disable'])
			]),
			//Specify Proxy Server Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.SpecifyProxyServer'], SC.res['AdvancedConfig.SpecifyProxyServer.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'SpecifyProxyServer') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-1',
						'SpecifyProxyServer',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'SpecifyProxyServer', true, false)
					)
				)
			]),
			//Dock Control Panel Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.DockControlPanel'], SC.res['AdvancedConfig.DockControlPanel.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'DockControlPanel') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-2',
						'DockControlPanel',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'DockControlPanel', true, false)
					)
				)
			]),
			//Undock Control Panel Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.UndockControlPanel'], SC.res['AdvancedConfig.UndockControlPanel.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'UndockControlPanel') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-3',
						'UndockControlPanel',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'UndockControlPanel', true, false)
					)
				)
			]),
			//Send Window System Command Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.SendWindowSystemCommand'], SC.res['AdvancedConfig.SendWindowSystemCommand.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'SendWindowSystemCommand') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-4',
						'SendWindowSystemCommand',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'SendWindowSystemCommand', true, false)
					)
				)
			]),
			//Keep Client on Top Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.KeepClientOnTop'], SC.res['AdvancedConfig.KeepClientOnTop.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'ToggleAlwaysOnTop') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-5',
						'ToggleAlwaysOnTop',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'ToggleAlwaysOnTop', true, false)
					)
				)
			]),
			//Beep On Connect Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.BeepOnConnect'], SC.res['AdvancedConfig.BeepOnConnect.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'ToggleBeepOnConnect') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-6',
						'ToggleBeepOnConnect',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'ToggleBeepOnConnect', true, false)
					)
				)
			]),
			//Exit (Connection Banner) Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.ExitConnectionBanner'], SC.res['AdvancedConfig.ExitConnectionBanner.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'Exit') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-7',
						'Exit',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'Exit', true, false)
					)
				)
			]),
			//Hide (Connection Banner) Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.HideConnectionBanner'], SC.res['AdvancedConfig.HideConnectionBanner.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'Hide') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-8',
						'Hide',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'Hide', true, false)
					)
				)
			]),
			//Open (Connection Banner) Setting
			$tr([
				$td(
					$configDescriptionBlock(SC.res['AdvancedConfig.OpenConnectionBanner'], SC.res['AdvancedConfig.OpenConnectionBanner.Description'])
				),
				$td({ className: disabledCommandNamesHasDefaultSettingValue(appConfigSettings.UserInterfaceSettings, 'Open') ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
					$configToggle(
						'DisabledCommandNames-8',
						'Open',
						APP_CONFIG,
						setToggle(appConfigSettings.UserInterfaceSettings, 'DisabledCommandNames', 'Open', true, false)
					)
				)
			])
		]),
		$configRestoreDefaultsLink(APP_CONFIG)
	]);
}

function hasDefaultBitmaskSettingValue(dataString, defaultValue, currentValue) {
	var dataArray = dataString.split('-');

	var settingName = dataArray[0];
	var hexPosition = Number(dataArray[1]);
	var hexValue = Number(dataArray[2]);

	if (currentValue[settingName]) {
		if (hexValue == 1) {
			if (defaultValue[settingName].charAt(hexPosition) == 5)
				return currentValue[settingName].charAt(hexPosition) == 1 || currentValue[settingName].charAt(hexPosition) == 5;
			else if (defaultValue[settingName].charAt(hexPosition) == 4)
				return currentValue[settingName].charAt(hexPosition) == 0 || currentValue[settingName].charAt(hexPosition) == 4;
			else if (defaultValue[settingName].charAt(hexPosition) == 1)
				return currentValue[settingName].charAt(hexPosition) == 1 || currentValue[settingName].charAt(hexPosition) == 5;
			else if (defaultValue[settingName].charAt(hexPosition) == 0)
				return currentValue[settingName].charAt(hexPosition) == 0 || currentValue[settingName].charAt(hexPosition) == 4;
		}
		else {
			if (defaultValue[settingName].charAt(hexPosition) == 5)
				return currentValue[settingName].charAt(hexPosition) == 4 || currentValue[settingName].charAt(hexPosition) == 5;
			else if (defaultValue[settingName].charAt(hexPosition) == 4)
				return currentValue[settingName].charAt(hexPosition) == 4 || currentValue[settingName].charAt(hexPosition) == 5;
			else if (defaultValue[settingName].charAt(hexPosition) == 1)
				return currentValue[settingName].charAt(hexPosition) == 0 || currentValue[settingName].charAt(hexPosition) == 1;
			else if (defaultValue[settingName].charAt(hexPosition) == 0)
				return currentValue[settingName].charAt(hexPosition) == 0 || currentValue[settingName].charAt(hexPosition) == 1;
		}
	}
	else // no change
		return true;
};

//make web resources for string literals
function buildAppConfigBitmaskSettingsPage(contentPanel, appConfigSettings) {
	SC.ui.setContents(contentPanel, [
		$table({ className: 'ConfigBitmaskTable' }, [
			$thead([
				$tr([
					$th($p()),
					$th($p({ className: 'ConfigColumnHeader' }, SC.res['AdvancedConfig.AnyClientWindow'])),
					$th($p({ className: 'ConfigColumnHeader' }, SC.res['AdvancedConfig.SupportAccessGuestWindow'])),
					$th($p({ className: 'ConfigColumnHeader' }, SC.res['AdvancedConfig.SupportAccessGuestRender'])),
					$th($p({ className: 'ConfigColumnHeader' }, SC.res['AdvancedConfig.SupportAccessGuestRenderWithDock'])),
					$th($p({ className: 'ConfigColumnHeader' }, SC.res['AdvancedConfig.SupportAccessHostWindow'])),
					$th($p({ className: 'ConfigColumnHeader' }, SC.res['AdvancedConfig.MeetingHostAttendeeWindow'])),
					$th($p({ className: 'ConfigColumnHeader' }, SC.res['AdvancedConfig.MeetingHostPresentersWindow'])),
					$th($p({ className: 'ConfigColumnHeader' }, SC.res['AdvancedConfig.SupportAccessGuestRenderWithoutDock'])),
					$th($p({ className: 'ConfigColumnHeader' }, SC.res['AdvancedConfig.MeetingGuestAttendeesWindow']))
				])
			]),
			$tbody([
				//setting 1
				$tr([
					$td([
						$div(
							$p({ className: 'ConfigBitmaskTableRowHeader' }, SC.res['AdvancedConfig.ShareMyDesktop'])
						)
					]),
					$td({ className: hasDefaultBitmaskSettingValue('ControlPanelIDs-16-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('ControlPanelIDs-16-1', AppConfigDefaults.Bitmask.Share, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'ControlPanelIDs-16-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestControlPanelIDs-16-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestControlPanelIDs-16-1', AppConfigDefaults.Bitmask.Share, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestControlPanelIDs-16-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestRenderControlPanelIDs-16-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestRenderControlPanelIDs-16-1', AppConfigDefaults.Bitmask.Share, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestRenderControlPanelIDs-16-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestRenderDockControlPanelIDs-16-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestRenderDockControlPanelIDs-16-1', AppConfigDefaults.Bitmask.Share, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestRenderDockControlPanelIDs-16-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessHostControlPanelIDs-16-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessHostControlPanelIDs-16-1', AppConfigDefaults.Bitmask.Share, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessHostControlPanelIDs-16-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('CaptureControlPanelIDs-16-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('CaptureControlPanelIDs-16-1', AppConfigDefaults.Bitmask.Share, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'CaptureControlPanelIDs-16-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('MeetingControlPanelIDs-16-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('MeetingControlPanelIDs-16-1', AppConfigDefaults.Bitmask.Share, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'MeetingControlPanelIDs-16-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessDockControlPanelIDs-16-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessDockControlPanelIDs-16-1', AppConfigDefaults.Bitmask.Share, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessDockControlPanelIDs-16-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('MeetingDockControlPanelIDs-16-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('MeetingDockControlPanelIDs-16-1', AppConfigDefaults.Bitmask.Share, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'MeetingDockControlPanelIDs-16-1', null, null, true))
						])
				]),
				$tr([
					$td([
						//setting 2
						$div(
							$p({ className: 'ConfigBitmaskTableRowHeader' }, SC.res['AdvancedConfig.View'])
						)
					]),
					$td({ className: hasDefaultBitmaskSettingValue('ControlPanelIDs-15-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('ControlPanelIDs-15-1', AppConfigDefaults.Bitmask.View, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'ControlPanelIDs-15-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestControlPanelIDs-15-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestControlPanelIDs-15-1', AppConfigDefaults.Bitmask.View, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestControlPanelIDs-15-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestRenderControlPanelIDs-15-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestRenderControlPanelIDs-15-1', AppConfigDefaults.Bitmask.View, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestRenderControlPanelIDs-15-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestRenderDockControlPanelIDs-15-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestRenderDockControlPanelIDs-15-1', AppConfigDefaults.Bitmask.View, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestRenderDockControlPanelIDs-15-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessHostControlPanelIDs-15-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessHostControlPanelIDs-15-1', AppConfigDefaults.Bitmask.View, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessHostControlPanelIDs-15-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('CaptureControlPanelIDs-15-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('CaptureControlPanelIDs-15-1', AppConfigDefaults.Bitmask.View, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'CaptureControlPanelIDs-15-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('MeetingControlPanelIDs-15-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('MeetingControlPanelIDs-15-1', AppConfigDefaults.Bitmask.View, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'MeetingControlPanelIDs-15-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessDockControlPanelIDs-15-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessDockControlPanelIDs-15-1', AppConfigDefaults.Bitmask.View, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessDockControlPanelIDs-15-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('MeetingDockControlPanelIDs-15-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('MeetingDockControlPanelIDs-15-1', AppConfigDefaults.Bitmask.View, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'MeetingDockControlPanelIDs-15-1', null, null, true))
						])
				]),
				$tr([
					$td([
						//setting 3
						$div(
							$p({ className: 'ConfigBitmaskTableRowHeader' }, SC.res['AdvancedConfig.Essentials'])
						)
					]),
					$td({ className: hasDefaultBitmaskSettingValue('ControlPanelIDs-14-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('ControlPanelIDs-14-1', AppConfigDefaults.Bitmask.Essentials, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'ControlPanelIDs-14-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestControlPanelIDs-14-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestControlPanelIDs-14-1', AppConfigDefaults.Bitmask.Essentials, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestControlPanelIDs-14-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestRenderControlPanelIDs-14-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestRenderControlPanelIDs-14-1', AppConfigDefaults.Bitmask.Essentials, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestRenderControlPanelIDs-14-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestRenderDockControlPanelIDs-14-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestRenderDockControlPanelIDs-14-1', AppConfigDefaults.Bitmask.Essentials, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestRenderDockControlPanelIDs-14-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessHostControlPanelIDs-14-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessHostControlPanelIDs-14-1', AppConfigDefaults.Bitmask.Essentials, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessHostControlPanelIDs-14-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('CaptureControlPanelIDs-14-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('CaptureControlPanelIDs-14-1', AppConfigDefaults.Bitmask.Essentials, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'CaptureControlPanelIDs-14-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('MeetingControlPanelIDs-14-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('MeetingControlPanelIDs-14-1', AppConfigDefaults.Bitmask.Essentials, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'MeetingControlPanelIDs-14-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessDockControlPanelIDs-14-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessDockControlPanelIDs-14-1', AppConfigDefaults.Bitmask.Essentials, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessDockControlPanelIDs-14-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('MeetingDockControlPanelIDs-14-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('MeetingDockControlPanelIDs-14-1', AppConfigDefaults.Bitmask.Essentials, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'MeetingDockControlPanelIDs-14-1', null, null, true))
						])
				]),
				$tr([
					$td([
						//setting 4
						$div(
							$p({ className: 'ConfigBitmaskTableRowHeader' }, SC.res['AdvancedConfig.Toolbox'])
						)
					]),
					$td({ className: hasDefaultBitmaskSettingValue('ControlPanelIDs-13-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('ControlPanelIDs-13-1', AppConfigDefaults.Bitmask.Toolbox, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'ControlPanelIDs-13-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestControlPanelIDs-13-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestControlPanelIDs-13-1', AppConfigDefaults.Bitmask.Toolbox, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestControlPanelIDs-13-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestRenderControlPanelIDs-13-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestRenderControlPanelIDs-13-1', AppConfigDefaults.Bitmask.Toolbox, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestRenderControlPanelIDs-13-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestRenderDockControlPanelIDs-13-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestRenderDockControlPanelIDs-13-1', AppConfigDefaults.Bitmask.Toolbox, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestRenderDockControlPanelIDs-13-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessHostControlPanelIDs-13-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessHostControlPanelIDs-13-1', AppConfigDefaults.Bitmask.Toolbox, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessHostControlPanelIDs-13-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('CaptureControlPanelIDs-13-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('CaptureControlPanelIDs-13-1', AppConfigDefaults.Bitmask.Toolbox, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'CaptureControlPanelIDs-13-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('MeetingControlPanelIDs-13-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('MeetingControlPanelIDs-13-1', AppConfigDefaults.Bitmask.Toolbox, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'MeetingControlPanelIDs-13-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessDockControlPanelIDs-13-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessDockControlPanelIDs-13-1', AppConfigDefaults.Bitmask.Toolbox, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessDockControlPanelIDs-13-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('MeetingDockControlPanelIDs-13-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('MeetingDockControlPanelIDs-13-1', AppConfigDefaults.Bitmask.Toolbox, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'MeetingDockControlPanelIDs-13-1', null, null, true))
						])
				]),
				$tr([
					$td([
						//setting 5
						$div(
							$p({ className: 'ConfigBitmaskTableRowHeader' }, SC.res['AdvancedConfig.FileTransfer'])
						)
					]),
					$td({ className: hasDefaultBitmaskSettingValue('ControlPanelIDs-12-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('ControlPanelIDs-12-1', AppConfigDefaults.Bitmask.FileTransfer, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'ControlPanelIDs-12-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestControlPanelIDs-12-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestControlPanelIDs-12-1', AppConfigDefaults.Bitmask.FileTransfer, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestControlPanelIDs-12-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestRenderControlPanelIDs-12-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestRenderControlPanelIDs-12-1', AppConfigDefaults.Bitmask.FileTransfer, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestRenderControlPanelIDs-12-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestRenderDockControlPanelIDs-12-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestRenderDockControlPanelIDs-12-1', AppConfigDefaults.Bitmask.FileTransfer, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestRenderDockControlPanelIDs-12-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessHostControlPanelIDs-12-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessHostControlPanelIDs-12-1', AppConfigDefaults.Bitmask.FileTransfer, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessHostControlPanelIDs-12-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('CaptureControlPanelIDs-12-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('CaptureControlPanelIDs-12-1', AppConfigDefaults.Bitmask.FileTransfer, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'CaptureControlPanelIDs-12-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('MeetingControlPanelIDs-12-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('MeetingControlPanelIDs-12-1', AppConfigDefaults.Bitmask.FileTransfer, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'MeetingControlPanelIDs-12-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessDockControlPanelIDs-12-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessDockControlPanelIDs-12-1', AppConfigDefaults.Bitmask.FileTransfer, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessDockControlPanelIDs-12-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('MeetingDockControlPanelIDs-12-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('MeetingDockControlPanelIDs-12-1', AppConfigDefaults.Bitmask.FileTransfer, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'MeetingDockControlPanelIDs-12-1', null, null, true))
						])
				]),
				$tr([
					$td([
						//setting 6
						$div(
							$p({ className: 'ConfigBitmaskTableRowHeader' }, SC.res['AdvancedConfig.ScreenCapture'])
						)
					]),
					$td({ className: hasDefaultBitmaskSettingValue('ControlPanelIDs-11-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('ControlPanelIDs-11-1', AppConfigDefaults.Bitmask.ScreenCapture, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'ControlPanelIDs-11-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestControlPanelIDs-11-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestControlPanelIDs-11-1', AppConfigDefaults.Bitmask.ScreenCapture, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestControlPanelIDs-11-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestRenderControlPanelIDs-11-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestRenderControlPanelIDs-11-1', AppConfigDefaults.Bitmask.ScreenCapture, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestRenderControlPanelIDs-11-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestRenderDockControlPanelIDs-11-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestRenderDockControlPanelIDs-11-1', AppConfigDefaults.Bitmask.ScreenCapture, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestRenderDockControlPanelIDs-11-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessHostControlPanelIDs-11-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessHostControlPanelIDs-11-1', AppConfigDefaults.Bitmask.ScreenCapture, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessHostControlPanelIDs-11-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('CaptureControlPanelIDs-11-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('CaptureControlPanelIDs-11-1', AppConfigDefaults.Bitmask.ScreenCapture, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'CaptureControlPanelIDs-11-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('MeetingControlPanelIDs-11-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('MeetingControlPanelIDs-11-1', AppConfigDefaults.Bitmask.ScreenCapture, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'MeetingControlPanelIDs-11-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessDockControlPanelIDs-11-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessDockControlPanelIDs-11-1', AppConfigDefaults.Bitmask.ScreenCapture, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessDockControlPanelIDs-11-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('MeetingDockControlPanelIDs-11-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('MeetingDockControlPanelIDs-11-1', AppConfigDefaults.Bitmask.ScreenCapture, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'MeetingDockControlPanelIDs-11-1', null, null, true))
						])
				]),
				$tr([
					$td([
						//setting 7
						$div(
							$p({ className: 'ConfigBitmaskTableRowHeader' }, SC.res['AdvancedConfig.Sound'])
						)
					]),
					$td({ className: hasDefaultBitmaskSettingValue('ControlPanelIDs-11-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('ControlPanelIDs-11-4', AppConfigDefaults.Bitmask.Sound, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'ControlPanelIDs-11-4', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestControlPanelIDs-11-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestControlPanelIDs-11-4', AppConfigDefaults.Bitmask.Sound, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestControlPanelIDs-11-4', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestRenderControlPanelIDs-11-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestRenderControlPanelIDs-11-4', AppConfigDefaults.Bitmask.Sound, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestRenderControlPanelIDs-11-4', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestRenderDockControlPanelIDs-11-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestRenderDockControlPanelIDs-11-4', AppConfigDefaults.Bitmask.Sound, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestRenderDockControlPanelIDs-11-4', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessHostControlPanelIDs-11-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessHostControlPanelIDs-11-4', AppConfigDefaults.Bitmask.Sound, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessHostControlPanelIDs-11-4', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('CaptureControlPanelIDs-11-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('CaptureControlPanelIDs-11-4', AppConfigDefaults.Bitmask.Sound, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'CaptureControlPanelIDs-11-4', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('MeetingControlPanelIDs-11-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('MeetingControlPanelIDs-11-4', AppConfigDefaults.Bitmask.Sound, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'MeetingControlPanelIDs-11-4', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessDockControlPanelIDs-11-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessDockControlPanelIDs-11-4', AppConfigDefaults.Bitmask.Sound, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessDockControlPanelIDs-11-4', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('MeetingDockControlPanelIDs-11-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('MeetingDockControlPanelIDs-11-4', AppConfigDefaults.Bitmask.Sound, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'MeetingDockControlPanelIDs-11-4', null, null, true))
						])
				]),
				$tr([
					$td([
						//setting 8
						$div(
							$p({ className: 'ConfigBitmaskTableRowHeader' }, SC.res['AdvancedConfig.Annotations'])
						)
					]),
					$td({ className: hasDefaultBitmaskSettingValue('ControlPanelIDs-10-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('ControlPanelIDs-10-4', AppConfigDefaults.Bitmask.Annotations, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'ControlPanelIDs-10-4', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestControlPanelIDs-10-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestControlPanelIDs-10-4', AppConfigDefaults.Bitmask.Annotations, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestControlPanelIDs-10-4', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestRenderControlPanelIDs-10-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestRenderControlPanelIDs-10-4', AppConfigDefaults.Bitmask.Annotations, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestRenderControlPanelIDs-10-4', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestRenderDockControlPanelIDs-10-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestRenderDockControlPanelIDs-10-4', AppConfigDefaults.Bitmask.Annotations, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestRenderDockControlPanelIDs-10-4', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessHostControlPanelIDs-10-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessHostControlPanelIDs-10-4', AppConfigDefaults.Bitmask.Annotations, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessHostControlPanelIDs-10-4', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('CaptureControlPanelIDs-10-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('CaptureControlPanelIDs-10-4', AppConfigDefaults.Bitmask.Annotations, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'CaptureControlPanelIDs-10-4', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('MeetingControlPanelIDs-10-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('MeetingControlPanelIDs-10-4', AppConfigDefaults.Bitmask.Annotations, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'MeetingControlPanelIDs-10-4', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessDockControlPanelIDs-10-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessDockControlPanelIDs-10-4', AppConfigDefaults.Bitmask.Annotations, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessDockControlPanelIDs-10-4', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('MeetingDockControlPanelIDs-10-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('MeetingDockControlPanelIDs-10-4', AppConfigDefaults.Bitmask.Annotations, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'MeetingDockControlPanelIDs-10-4', null, null, true))
						])
				]),
				$tr([
					$td([
						//setting 9
						$div(
							$p({ className: 'ConfigBitmaskTableRowHeader' }, SC.res['AdvancedConfig.Participants'])
						)
					]),
					$td({ className: hasDefaultBitmaskSettingValue('ControlPanelIDs-10-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('ControlPanelIDs-10-1', AppConfigDefaults.Bitmask.Participants, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'ControlPanelIDs-10-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestControlPanelIDs-10-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestControlPanelIDs-10-1', AppConfigDefaults.Bitmask.Participants, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestControlPanelIDs-10-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestRenderControlPanelIDs-10-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestRenderControlPanelIDs-10-1', AppConfigDefaults.Bitmask.Participants, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestRenderControlPanelIDs-10-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestRenderDockControlPanelIDs-10-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestRenderDockControlPanelIDs-10-1', AppConfigDefaults.Bitmask.Participants, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestRenderDockControlPanelIDs-10-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessHostControlPanelIDs-10-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessHostControlPanelIDs-10-1', AppConfigDefaults.Bitmask.Participants, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessHostControlPanelIDs-10-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('CaptureControlPanelIDs-10-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('CaptureControlPanelIDs-10-1', AppConfigDefaults.Bitmask.Participants, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'CaptureControlPanelIDs-10-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('MeetingControlPanelIDs-10-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('MeetingControlPanelIDs-10-1', AppConfigDefaults.Bitmask.Participants, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'MeetingControlPanelIDs-10-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessDockControlPanelIDs-10-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessDockControlPanelIDs-10-1', AppConfigDefaults.Bitmask.Participants, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessDockControlPanelIDs-10-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('MeetingDockControlPanelIDs-10-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('MeetingDockControlPanelIDs-10-1', AppConfigDefaults.Bitmask.Participants, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'MeetingDockControlPanelIDs-10-1', null, null, true))
						])
				]),
				$tr([
					$td([
						//setting 10
						$div(
							$p({ className: 'ConfigBitmaskTableRowHeader' }, SC.res['AdvancedConfig.Messages'])
						)
					]),
					$td({ className: hasDefaultBitmaskSettingValue('ControlPanelIDs-9-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('ControlPanelIDs-9-1', AppConfigDefaults.Bitmask.Messages, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'ControlPanelIDs-9-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestControlPanelIDs-9-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestControlPanelIDs-9-1', AppConfigDefaults.Bitmask.Messages, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestControlPanelIDs-9-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestRenderControlPanelIDs-9-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestRenderControlPanelIDs-9-1', AppConfigDefaults.Bitmask.Messages, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestRenderControlPanelIDs-9-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestRenderDockControlPanelIDs-9-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestRenderDockControlPanelIDs-9-1', AppConfigDefaults.Bitmask.Messages, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestRenderDockControlPanelIDs-9-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessHostControlPanelIDs-9-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessHostControlPanelIDs-9-1', AppConfigDefaults.Bitmask.Messages, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessHostControlPanelIDs-9-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('CaptureControlPanelIDs-9-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('CaptureControlPanelIDs-9-1', AppConfigDefaults.Bitmask.Messages, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'CaptureControlPanelIDs-9-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('MeetingControlPanelIDs-9-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('MeetingControlPanelIDs-9-1', AppConfigDefaults.Bitmask.Messages, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'MeetingControlPanelIDs-9-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessDockControlPanelIDs-9-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessDockControlPanelIDs-9-1', AppConfigDefaults.Bitmask.Messages, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessDockControlPanelIDs-9-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('MeetingDockControlPanelIDs-9-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('MeetingDockControlPanelIDs-9-1', AppConfigDefaults.Bitmask.Messages, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'MeetingDockControlPanelIDs-9-1', null, null, true))
						])
				]),
				$tr([
					$td([
						//setting 11
						$div(
							$p({ className: 'ConfigBitmaskTableRowHeader' }, SC.res['AdvancedConfig.Helper'])
						)
					]),
					$td({ className: hasDefaultBitmaskSettingValue('ControlPanelIDs-9-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('ControlPanelIDs-9-4', AppConfigDefaults.Bitmask.Helper, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'ControlPanelIDs-9-4', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestControlPanelIDs-9-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestControlPanelIDs-9-4', AppConfigDefaults.Bitmask.Helper, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestControlPanelIDs-9-4', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestRenderControlPanelIDs-9-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestRenderControlPanelIDs-9-4', AppConfigDefaults.Bitmask.Helper, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestRenderControlPanelIDs-9-4', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestRenderDockControlPanelIDs-9-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestRenderDockControlPanelIDs-9-4', AppConfigDefaults.Bitmask.Helper, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestRenderDockControlPanelIDs-9-4', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessHostControlPanelIDs-9-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessHostControlPanelIDs-9-4', AppConfigDefaults.Bitmask.Helper, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessHostControlPanelIDs-9-4', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('CaptureControlPanelIDs-9-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('CaptureControlPanelIDs-9-4', AppConfigDefaults.Bitmask.Helper, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'CaptureControlPanelIDs-9-4', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('MeetingControlPanelIDs-9-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('MeetingControlPanelIDs-9-4', AppConfigDefaults.Bitmask.Helper, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'MeetingControlPanelIDs-9-4', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessDockControlPanelIDs-9-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessDockControlPanelIDs-9-4', AppConfigDefaults.Bitmask.Helper, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessDockControlPanelIDs-9-4', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('MeetingDockControlPanelIDs-9-4', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('MeetingDockControlPanelIDs-9-4', AppConfigDefaults.Bitmask.Helper, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'MeetingDockControlPanelIDs-9-4', null, null, true))
						])
				]),
				$tr([
					$td([
						//setting 12
						$div(
							$p({ className: 'ConfigBitmaskTableRowHeader' }, SC.res['AdvancedConfig.Status'])
						)
					]),
					$td({ className: hasDefaultBitmaskSettingValue('ControlPanelIDs-8-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('ControlPanelIDs-8-1', AppConfigDefaults.Bitmask.Status, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'ControlPanelIDs-8-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestControlPanelIDs-8-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestControlPanelIDs-8-1', AppConfigDefaults.Bitmask.Status, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestControlPanelIDs-8-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestRenderControlPanelIDs-8-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestRenderControlPanelIDs-8-1', AppConfigDefaults.Bitmask.Status, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestRenderControlPanelIDs-8-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessGuestRenderDockControlPanelIDs-8-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessGuestRenderDockControlPanelIDs-8-1', AppConfigDefaults.Bitmask.Status, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessGuestRenderDockControlPanelIDs-8-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessHostControlPanelIDs-8-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessHostControlPanelIDs-8-1', AppConfigDefaults.Bitmask.Status, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessHostControlPanelIDs-8-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('CaptureControlPanelIDs-8-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('CaptureControlPanelIDs-8-1', AppConfigDefaults.Bitmask.Status, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'CaptureControlPanelIDs-8-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('MeetingControlPanelIDs-8-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('MeetingControlPanelIDs-8-1', AppConfigDefaults.Bitmask.Status, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'MeetingControlPanelIDs-8-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('SupportAccessDockControlPanelIDs-8-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('SupportAccessDockControlPanelIDs-8-1', AppConfigDefaults.Bitmask.Status, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'SupportAccessDockControlPanelIDs-8-1', null, null, true))
						]),
					$td({ className: hasDefaultBitmaskSettingValue('MeetingDockControlPanelIDs-8-1', AppConfigDefaults.UserInterfaceSettings, appConfigSettings.UserInterfaceSettings) ? '' : CSS_CLASS_TOGGLE_CELL_NOT_DEFAULT },
						[
							$configToggle('MeetingDockControlPanelIDs-8-1', AppConfigDefaults.Bitmask.Status, APP_CONFIG, setToggle(appConfigSettings.UserInterfaceSettings, 'MeetingDockControlPanelIDs-8-1', null, null, true))
						])
				])
			])
		]),
		$p({ className: 'OptionalCautionText' }, SC.res['AdvancedConfig.BitmaskSettings.Caution']),
		$configRestoreDefaultsLink(APP_CONFIG)
	]);
}