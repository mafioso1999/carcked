using System;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using System.Configuration;
using System.Threading.Tasks;
using System.Web;
using ScreenConnect;

namespace ScreenConnect
{
	public class AgentDeployerFileBuilder
	{
		public static async Task BuildNetworkerAsync(Stream stream, string directoryPath)
		{
			using (var exeFileStream = File.OpenRead(Path.Combine(directoryPath, "SC.AgentDeployer.Client.exe")))
			using (var payloadStream = new MemoryStream())
			{
				var payloadWriter = new ScreenConnect.BinaryWriter(payloadStream);

				// build msi installer here - this is to be included in the client networker payload
				var msiStream = new MemoryStream();
				var fileExtension = ".msi";
				var fileBuilder = InstallerFileBuilder.Create(fileExtension);
				var binDirectoryPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Bin");
				var relayUri = ServerExtensions.GetRelayUri(null, true, true);
				var clientLaunchParameters = new ClientLaunchParameters
				{
					Host = relayUri.Host,
					Port = relayUri.Port,
					EncryptionKey = ServerCryptoManager.Instance.PublicKey,
					SessionType = SessionType.Access,
					ProcessType = ProcessType.Guest,
					CustomPropertyValueCallbackFormats = null,
				};

				// send installer to msiStream to be included in SC.AgentDeployer.Client.exe payload
				await fileBuilder.BuildFileAsync(msiStream, binDirectoryPath, ServerCryptoManager.Instance.PublicKey, clientLaunchParameters, null);

				// write stringMap payload -- we don't have HttpContext in ToolboxProvider.cs (as opposed to Download.ashx)
				AgentDeployerFileBuilder.WriteDictionary(payloadWriter, (w, v) => w.Write(v), new Dictionary<string, string>
				{
					{ "RelayUri", ServerExtensions.GetRelayUri(null, true, true).ToString() },
					{ "ClientVersion", Constants.ProductVersion.ToString() },
					{ "PublicKeyFingerprint", ServerCryptoManager.Instance.PublicKeyFingerprint },
					{ "LabelResources.CustomProperty1.Text", await WebResources.GetStringAsync("SessionProperty.Custom1.LabelText") ?? string.Empty },
					{ "LabelResources.CustomProperty2.Text", await WebResources.GetStringAsync("SessionProperty.Custom2.LabelText") ?? string.Empty },
					{ "LabelResources.CustomProperty3.Text", await WebResources.GetStringAsync("SessionProperty.Custom3.LabelText") ?? string.Empty },
					{ "LabelResources.CustomProperty4.Text", await WebResources.GetStringAsync("SessionProperty.Custom4.LabelText") ?? string.Empty },
				});

				// write fileMap payload
				// SC.AgentDeployer.Installer.msi is the client installer (needs to have same name as service exe)
				// SC.AgentDeployer.Installer.exe is used to remotely install the client on a subnet
				// SC.AgentDeployer.Installer.exe.config explicitly defines supported runtimes for SC Client Network Deployer Pro Service
				AgentDeployerFileBuilder.WriteDictionary(payloadWriter, (w, v) => { w.Write(v.Length); w.Write(v, 0, v.Length); }, new Dictionary<string, byte[]>
				{
					{ "SC.AgentDeployer.Installer.msi", msiStream.ToArray() },
					{ "SC.AgentDeployer.Installer.exe", File.ReadAllBytes(Path.Combine(directoryPath, "SC.AgentDeployer.Installer.exe")) },
					{ "SC.AgentDeployer.Installer.exe.config", File.ReadAllBytes(Path.Combine(directoryPath, "SC.AgentDeployer.Installer.exe.config")) }
				});

				var exeFile = new ExeFile(exeFileStream);
				exeFile.SetPayload(new[] { payloadStream.GetAllBytes() });

				exeFile.Save(stream);
			}
		}

		static void WriteDictionary<T>(ScreenConnect.BinaryWriter writer, Proc<ScreenConnect.BinaryWriter, T> elementWriter, IEnumerable<KeyValuePair<string, T>> dictionary)
		{
			writer.Write(dictionary.Count());

			foreach (var kvp in dictionary)
			{
				writer.Write(kvp.Key);
				elementWriter(writer, kvp.Value);
			}
		}
	}
}
