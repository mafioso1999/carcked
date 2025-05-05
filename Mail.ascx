<%@ Control %>

<dl class="MailPanel"></dl>

<script>

	SC.event.addGlobalHandler(SC.event.PreRender, function () {
		SC.pagedata.notifyDirty();
	});

	SC.event.addGlobalHandler(SC.event.PageDataDirtied, function () {
		SC.service.GetMailConfigurationInfo(SC.pagedata.set);
	});

	SC.event.addGlobalHandler(SC.event.PageDataRefreshed, function () {
		var mailConfiguration = SC.pagedata.get();

		SC.ui.setContents($('.MailPanel'), [
			$dt([
				$h3({ _textResource: 'MailPanel.MailTitle' }),
				$p({ className: 'CommandList' }, SC.command.createCommandButtons([{ commandName: 'EditMailConfiguration' }])),
			]),
			$dd([
				$dl([
					$dt({ _textResource: 'MailPanel.MailDeliveryText' }),
					$dd(mailConfiguration.smtpRelayServerHostName ? SC.util.formatString(SC.res['MailPanel.SmtpRelayRadioButtonTextFormat'], mailConfiguration.smtpRelayServerHostName) : SC.res['MailPanel.SmtpDirectRadioButtonText']),
					$dt({ _textResource: 'MailPanel.DefaultFromAddressLabelText' }),
					$dd(mailConfiguration.defaultMailFromAddress || SC.res['MailPanel.UnsetLabelText']),
					$dt({ _textResource: 'MailPanel.DefaultToAddressLabelText' }),
					$dd(mailConfiguration.defaultMailToAddress || SC.res['MailPanel.UnsetLabelText']),
				]),
			]),
		]);
	});

	SC.event.addGlobalHandler(SC.event.ExecuteCommand, function (eventArgs) {
		var mailConfiguration = SC.pagedata.get();

		switch (eventArgs.commandName) {
			case 'EditMailConfiguration':
				SC.dialog.showModalDialog('EditMailConfiguration', {
					titleResourceName: 'EditMailConfigurationPanel.Title',
					content: [
						$dl([
							$dt({ _textResource: 'MailPanel.MailDeliveryText' }),
							$dd([
								['Direct', 'Relay'].map(function (_) {
									return $label([
										$input({ type: 'radio', name: 'MailDelivery', className: _ + 'RadioButton', value: _, checked: (_ == 'Direct') == (mailConfiguration.smtpRelayServerHostName == null) }),
										$span({ _textResource: 'MailPanel.Smtp' + _ + 'RadioButtonText' },
											_ == 'Relay' ? $input({
												type: 'text', className: 'SmtpRelayServerBox', value: mailConfiguration.smtpRelayServerHostName,
												_eventHandlerMap: {
													focus: function () {
														SC.dialog.getModalDialog().querySelector('.RelayRadioButton').checked = true;
													},
												},
											}) : '',
										),
									]);
								}),
							]),
							$dt({ _textResource: 'MailPanel.DefaultFromAddressLabelText' }),
							$dd([
								$input({ type: 'text', className: 'DefaultMailFromAddressBox', value: mailConfiguration.defaultMailFromAddress }),
							]),
							$dt({ _textResource: 'MailPanel.DefaultToAddressLabelText' }),
							$dd([
								$div([
									$input({ type: 'text', className: 'DefaultMailToAddressBox', value: mailConfiguration.defaultMailToAddress }),
									$button({ className: 'SecondaryButton', _textResource: 'MailPanel.SendTestMailButtonText', _commandName: 'SendTestEmail' }),
								]),
							]),
						]),
						$p({ className: 'ResultPanel' }),
					],
					buttonTextResourceName: 'EditMailConfigurationPanel.ButtonText',
					onExecuteCommandProc: function (dialogEventArgs, dialog, closeDialogProc, setDialogErrorProc) {
						var defaultMailFromAddress = dialog.querySelector('.DefaultMailFromAddressBox').value.trim();
						var defaultMailToAddress = dialog.querySelector('.DefaultMailToAddressBox').value.trim();
						var smtpRelayServerHostName = SC.ui.getSelectedRadioButtonValue(dialog) == 'Relay' ? dialog.querySelector('.SmtpRelayServerBox').value.trim() : null;
						var resultPanel = dialog.querySelector('.ResultPanel');

						function validateRelayServer() {
							if (SC.ui.getSelectedRadioButtonValue(dialog) == 'Relay' && dialog.querySelector('.SmtpRelayServerBox').value.trim() == '') {
								setDialogErrorProc({ message: "Relay server box is empty" });
								return false;
							}

							return true;
						}

						switch (dialogEventArgs.commandName) {
							case 'Default':
								if (validateRelayServer())
									SC.service.SaveMailConfiguration(
										defaultMailFromAddress,
										smtpRelayServerHostName,
										defaultMailToAddress,
										function () { SC.dialog.showModalActivityAndReload('Save', true); },
										setDialogErrorProc
									);
								break;

							case 'SendTestEmail':
								if (validateRelayServer()) {
									SC.service.SendTestEmail(defaultMailFromAddress, smtpRelayServerHostName, defaultMailToAddress,
										function () {
											SC.css.ensureClass(resultPanel, 'Success', true);
											SC.css.ensureClass(resultPanel, 'Failure', false);
											SC.ui.setContents(resultPanel, SC.res['Command.SendEmail.SuccessMessage']);
											setTimeout(function () {
												SC.css.ensureClass(resultPanel, 'Success', false);
											}, 3000);
										},
										function (error) {
											SC.css.ensureClass(resultPanel, 'Failure', true);
											SC.css.ensureClass(resultPanel, 'Success', false);
											SC.ui.setContents(resultPanel, error.message);
											setTimeout(function () {
												SC.css.ensureClass(resultPanel, 'Failure', false);
											}, 30000);
										}
									);
								}
								break;
						}
					},
				});
				break;
		}
	});

</script>
