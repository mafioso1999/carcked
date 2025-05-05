var AgentDeployerHelpLink = "https://docs.connectwise.com/ConnectWise_Control_Documentation"; // TODO update with new help link.

var getAgentDeployerExtensionIdFromExtensionContext = function () {
	var urlParts = extensionContext.baseUrl.split("/");
	return (urlParts.length > 1) ? urlParts.slice(-2)[0] : '';
};

SC.event.addGlobalHandler(SC.event.QueryCommandButtonState, function (eventArgs) {
	if (eventArgs.commandName == 'EditExtensionSettings') {
		var agentDeployerExtensionId = getAgentDeployerExtensionIdFromExtensionContext();

		if (eventArgs.commandContext.extensionInfo.ExtensionID == agentDeployerExtensionId && eventArgs.commandElement._commandName == "EditExtensionSettings")
			SC.ui.addElement(
				eventArgs.target.parentElement,
				"A",
				{ href: "#", _commandName: 'ShowHelpLink_' + agentDeployerExtensionId, innerHTML: 'Help' }
			);
	}
});

SC.event.addGlobalHandler(SC.event.ExecuteCommand, function (eventArgs) {

	var AgentDeployerExtensionId = getAgentDeployerExtensionIdFromExtensionContext();

	if (eventArgs.commandName == 'ShowHelpLink_' + AgentDeployerExtensionId)
		window.open(AgentDeployerHelpLink, '_blank');
});

SC.event.addGlobalHandler(SC.event.QueryCommandButtons, function (eventArgs) {
	switch (eventArgs.area) {
		case 'ExtrasPopoutPanel':
			if (SC.context.pageType == 'AdministrationPage' || (SC.context.pageType == 'HostPage' && SC.context.canAdminister === true)) {
				eventArgs.buttonDefinitions.push(
					{ commandName: 'DownloadAgentDeployer', text: SC.res['AgentDeployer.BuildButtonText'] }
				);
			}
			break;
	}
});

SC.event.addGlobalHandler(SC.event.ExecuteCommand, function (eventArgs) {
	switch (eventArgs.commandName) {
		case 'DownloadAgentDeployer':
			SC.util.launchUrl(extensionContext.baseUrl + 'Download.ashx');
			break;
	}
});