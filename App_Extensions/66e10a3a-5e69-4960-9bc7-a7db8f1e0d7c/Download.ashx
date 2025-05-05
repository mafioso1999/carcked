<%@ WebHandler Language="C#" Class="AgentDeployerDownloadHandler" %>
<%@ Assembly Src="AgentDeployerFileBuilder.cs" %>

using System;
using System.Collections.Generic;
using System.Reflection;
using System.Threading.Tasks;
using System.Web;
using ScreenConnect;

public class AgentDeployerDownloadHandler : SingletonAsyncHandler
{
	public override async Task ProcessRequestAsync([ActivityTraceIgnore] HttpContext context)
	{
		try
		{
#if SC_DEV || SC_21_5
			await Permissions.AssertPermissionAsync(PermissionInfo.AdministerPermission, context);
#else
			Permissions.AssertPermission(PermissionInfo.AdministerPermission);
#endif
		}
		catch (Exception)
		{
			// if we just let this throw, it prompts for a user/pwd dialog.
			// the user shouldn't get here if they don't have permission anyway
			return;
		}

		var startMillisecondCount = Toolkit.Instance.GetMillisecondCount();

		context.Response.WriteContentHeaders("application/octet-stream", true, "SC.AgentDeployer.Client.exe");

		await AgentDeployerFileBuilder.BuildNetworkerAsync(
			context.Response.OutputStream,
			context.Server.MapPath(".")
		);

		var durationMillisecondCount = Toolkit.Instance.GetMillisecondCount() - startMillisecondCount;

		Activity.Trace(
			this.GetType().Name,
			MethodBase.GetCurrentMethod().Name,
			new Dictionary<string, object>() { { "durationMillisecondCount", (object)durationMillisecondCount } }
		);
	}
}
