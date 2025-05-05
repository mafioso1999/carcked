using System.Collections.Generic;
using System.IO;
using ScreenConnect;

[ActivityTrace]
public class AgentDeployerToolboxProvider : IDynamicToolboxProvider
{
	public IEnumerable<KeyValuePair<string, byte[]>> GetToolboxItems()
	{
		return TaskExtensions.InvokeSync(async () =>
			new[]
			{
				new KeyValuePair<string, byte[]>(
					"SC.AgentDeployer.Client.exe",
					(byte[])await WebResources.GetObjectAsync("AgentDeployer.Icon")
				)
			}
		);
	}

	public FileData GetFileData(string itemName)
	{
		return TaskExtensions.InvokeSync(async () =>
		{
			using (var memoryStream = new MemoryStream())
			{
				await AgentDeployerFileBuilder.BuildNetworkerAsync(memoryStream, ExtensionContext.Current.BasePath);
				return new MemoryFileData("SC.AgentDeployer.Client.exe", memoryStream.GetAllBytes());
			}
		});
	}
}
