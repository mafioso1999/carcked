<%@ WebHandler Language="C#" Class="ScreenConnect.MailService" %>

using System.Net.Mail;
using System.Net.Configuration;
using System.Security.Principal;
using System.Threading.Tasks;

namespace ScreenConnect
{
	[DemandAnyPermission]
	[ActivityTrace]
	public class MailService : WebServiceBase
	{
		public async Task SendEmail(
			[ActivityTraceIgnore] string to,
			string subjectResourceBaseNameFormat,
			object[] subjectResourceNameFormatArgs,
			[ActivityTraceIgnore] object[] subjectResourceFormatArgs,
			string bodyResourceBaseNameFormat,
			object[] bodyResourceNameFormatArgs,
			[ActivityTraceIgnore] object[] bodyResourceFormatArgs,
			[ActivityTraceIgnore] bool isBodyHtml,
			IPrincipal user
		)
		{
			var subject = await WebResources.TryFormatStringWithFallbackAsync(
				subjectResourceBaseNameFormat + "EmailSubjectFormat",
				subjectResourceNameFormatArgs,
				false,
				subjectResourceFormatArgs
			);
			var body = await WebResources.TryFormatStringWithFallbackAsync(
				bodyResourceBaseNameFormat + (isBodyHtml ? "HtmlEmailBodyFormat" : "TextEmailBodyFormat"),
				bodyResourceNameFormatArgs,
				false,
				bodyResourceFormatArgs
			);
			await this.SendEmailAsync(null, null, null, to, subject, body, isBodyHtml, user);
		}

		[DemandPermission(PermissionInfo.AdministerPermission)]
		[ActivityTraceIgnore]
		public async Task SendTestEmail(string from, string relayHost, string to, IPrincipal user)
		{
			await this.SendEmailAsync(
				from,
				relayHost,
				null,
				to,
				await WebResources.GetStringAsync("MailPanel.TestSubject"),
				await WebResources.GetStringAsync("MailPanel.TestBody"),
				false,
				user
			);
		}

		async Task SendEmailAsync(string overrideFrom, string overrideRelayHost, bool? overrideEnableSsl, string to, string subject, string body, bool isBodyHtml, IPrincipal user)
		{
			RateLimitManager.Instance.RecordOperationAndDemandAllowed((nameof(SendEmailAsync), user.Identity.Name));

			using (var client = new SmtpClient())
			using (var mailMessage = ServerToolkit.Instance.CreateMailMessage())
			{
				mailMessage.To.Add(to);
				mailMessage.Subject = subject;
				mailMessage.Body = body;
				mailMessage.IsBodyHtml = isBodyHtml;

				if (overrideFrom != null)
					mailMessage.From = new MailAddress(overrideFrom);

				if (overrideRelayHost != null)
					client.Host = overrideRelayHost;

				if (overrideEnableSsl != null)
					client.EnableSsl = (bool)overrideEnableSsl;

				await client.SendMailAsync(mailMessage);
			}
		}

		[DemandPermission(PermissionInfo.AdministerPermission)]
		public object GetMailConfigurationInfo()
		{
			var configuration = WebConfigurationManager.OpenWebConfiguration();
			var smtpSection = WebConfigurationManager.GetSection<SmtpSection>(configuration);

			return new
			{
				smtpRelayServerHostName = smtpSection.Network.Host,
				defaultMailFromAddress = smtpSection.From,
				defaultMailToAddress = configuration.AppSettings.GetValue(ServerConstants.DefaultMailToAddressSettingsKey),
			};
		}

		[DemandPermission(PermissionInfo.AdministerPermission)]
		public void SaveMailConfiguration(string defaultMailFromAddress, string smtpRelayServerHostName, string defaultMailToAddress)
		{
			var configuration = WebConfigurationManager.OpenWebConfiguration();
			var smtpSection = WebConfigurationManager.GetSection<SmtpSection>(configuration);

			smtpSection.DeliveryMethod = SmtpDeliveryMethod.Network;
			smtpSection.Network.Host = string.IsNullOrEmpty(smtpRelayServerHostName) ? null : smtpRelayServerHostName;
			smtpSection.From = defaultMailFromAddress;

			configuration.AppSettings.SetValue(ServerConstants.DefaultMailToAddressSettingsKey, defaultMailToAddress);

			ServerToolkit.Instance.SaveConfiguration(configuration);
		}
	}
}
