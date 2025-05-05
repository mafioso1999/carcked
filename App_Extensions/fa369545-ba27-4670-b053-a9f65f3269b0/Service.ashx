<%@ WebHandler Language="C#" Class="AdvancedConfigurationEditorService" %>

using System;
using System.Collections;
using System.Xml;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Web;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;
using System.Linq;
using ScreenConnect;

[DemandPermission(PermissionInfo.AdministerPermission)]
public class AdvancedConfigurationEditorService : WebServiceBase
{
	public string GetInstanceIdentifierFingerprint()
	{
		return Extensions.GetFingerprint(ConfigurationCache.InstanceIdentifierBlob);
	}
	
	[NotNull]
	static byte[] GetWebConfigFile()
	{
		var configFilePath = HttpContext.Current.Server.MapPath(@"~/web.config");
		return File.ReadAllBytes(configFilePath);
	}

	[NotNull]
	static byte[] GetAppConfigFile()
	{
		var configFilePath = HttpContext.Current.Server.MapPath(@"~/App_ClientConfig/app.config");

		if (!File.Exists(configFilePath) || string.IsNullOrWhiteSpace(File.ReadAllText(configFilePath)))
		{
			return Encoding.UTF8.GetBytes(
				"<?xml version='1.0' encoding='utf-8'?>" +
				"<configuration>" +
					"<configSections>" +
						"<section name='ScreenConnect.SystemSettings' type='System.Configuration.ClientSettingsSection' />" +
						"<section name='ScreenConnect.UserInterfaceSettings' type='System.Configuration.ClientSettingsSection' />" +
					"</configSections>" +
					"<ScreenConnect.SystemSettings>" +
					"</ScreenConnect.SystemSettings>" +
					"<ScreenConnect.UserInterfaceSettings>" +
					"</ScreenConnect.UserInterfaceSettings>" +
				"</configuration>"
			);
		}
		else
			return File.ReadAllBytes(configFilePath);
	}

	[NotNull]
	static XmlNode CreateWebConfigNode([NotNull] XmlDocument xmlDoc, string key, string value)
	{
		var node = xmlDoc.CreateNode(XmlNodeType.Element, "add", string.Empty);
		var xmlKey = xmlDoc.CreateAttribute("key");
		var xmlValue = xmlDoc.CreateAttribute("value");

		xmlKey.Value = key;
		xmlValue.Value = value;

		node.Attributes.Append(xmlKey);
		node.Attributes.Append(xmlValue);

		return node;
	}

	[NotNull]
	static XmlNode CreateAppConfigNode([NotNull] XmlDocument xmlDoc, string key, [NotNull] string value)
	{
		var node = xmlDoc.CreateNode(XmlNodeType.Element, "setting", string.Empty);
		var xmlName = xmlDoc.CreateAttribute("name");
		var xmlSerializeAs = xmlDoc.CreateAttribute("serializeAs");
		var xmlValue = xmlDoc.CreateNode(XmlNodeType.Element, "value", string.Empty);

		xmlName.Value = key;
		xmlSerializeAs.Value = "String";
		xmlValue.InnerText = value;

		node.Attributes.Append(xmlName);
		node.Attributes.Append(xmlSerializeAs);

		node.AppendChild(xmlValue);

		return node;
	}

	static void UpdateAppConfig(XmlDocument xmlDoc, [CanBeNull] XmlNode element, XmlNodeList settings, string key, string value, string defaultValue)
	{
		if (value != defaultValue)
		{
			if (element == null)
			{
				var node = AdvancedConfigurationEditorService.CreateAppConfigNode(xmlDoc, key, value);
				settings[0].InsertAfter(node, settings[0].LastChild);
			}
			else if (element.FirstChild == null)
			{
				element.ParentNode.RemoveChild(element);
				var node = AdvancedConfigurationEditorService.CreateAppConfigNode(xmlDoc, key, value);
				settings[0].InsertAfter(node, settings[0].LastChild);
			}
			else
				element.FirstChild.InnerText = value;
		}
		else if (element != null)
			element.ParentNode.RemoveChild(element);
	}

	[NotNull]
	public object GetWebConfigSettingValues(Dictionary<string, string> requiredSettings)
	{
		var webConfigAppSettings = new Dictionary<string, string>();
		var webConfigPageSettings = new Dictionary<string, Dictionary<string, string>>();

		var xmlDoc = new XmlDocument();
		xmlDoc.Load(new MemoryStream(AdvancedConfigurationEditorService.GetWebConfigFile()));

		var appSettings = xmlDoc.GetElementsByTagName("appSettings");

		foreach (XmlNode setting in appSettings)
		{
			if (setting.ParentNode.Name != "location")
			{
				foreach (var node in setting.ChildNodes.Cast<XmlNode>().Where(node => node.NodeType == XmlNodeType.Element && node.Name == "add" && requiredSettings.ContainsKey(node.Attributes["key"].Value.ToString())))
					webConfigAppSettings.Add(node.Attributes["key"].Value, node.Attributes["value"]?.Value ?? string.Empty);
			}
			else if (setting.ParentNode.Attributes["path"].Value is "Host.aspx" or "Administration.aspx")
			{
				webConfigPageSettings.Add(setting.ParentNode.Attributes["path"].Value, new Dictionary<string, string>());

				foreach (XmlNode node in setting.ChildNodes)
					webConfigPageSettings[setting.ParentNode.Attributes["path"].Value].Add(node.Attributes["key"].Value, node.Attributes.GetNamedItem("value") == null ? string.Empty : node.Attributes["value"].Value);
			}
		}

		return new
		{
			WebConfigAppSettings = webConfigAppSettings,
			WebConfigPageSettings = webConfigPageSettings
		};
	}

	[NotNull]
	public object GetAppConfigSettingValues()
	{
		var xmlDoc = new XmlDocument();
		xmlDoc.Load(new MemoryStream(AdvancedConfigurationEditorService.GetAppConfigFile()));

		var systemSettings = xmlDoc.GetElementsByTagName("ScreenConnect.SystemSettings")[0];
		var userInterfaceSettings = xmlDoc.GetElementsByTagName("ScreenConnect.UserInterfaceSettings")[0];

		var appConfigSystemSettings = systemSettings.ChildNodes.Cast<XmlNode>()
			.Where(node => node.NodeType == XmlNodeType.Element)
			.ToDictionary(node => node.Attributes["name"].Value, node => node.InnerText);

		var appConfigUserInterfaceSettings = userInterfaceSettings.ChildNodes.Cast<XmlNode>()
			.Where(node => node.NodeType == XmlNodeType.Element)
			.ToDictionary(node => node.Attributes["name"].Value, node => node.InnerText);

		return new
		{
			AppConfigSystemSettings = appConfigSystemSettings,
			AppConfigUserInterfaceSettings = appConfigUserInterfaceSettings
		};
	}

	[NotNull]
	public string WriteChangesToWebConfig([NotNull] Dictionary<string, string> appSettings, [NotNull] Dictionary<string, Dictionary<string, string>> pageSettings)
	{
		try
		{
			var xmlDoc = new XmlDocument();
			xmlDoc.Load(new MemoryStream(AdvancedConfigurationEditorService.GetWebConfigFile()));
			var appConfigSettings = xmlDoc.SelectNodes(@"//configuration/appSettings");
			var pageConfigSettings = xmlDoc.SelectNodes(@"//location/appSettings");
			var relayUri = ServerExtensions.GetRelayUri(HttpContext.Current.Request.Url, true, false).Uri.ToString();
			const string cloudRegexPattern = @"^.*\.((screenconnect)|(hostedrmm))\.com";
			var cloudCheckRegex = new Regex(cloudRegexPattern, RegexOptions.IgnoreCase);
			var isCloud = cloudCheckRegex.IsMatch(relayUri);

			var uriSettings = new HashSet<string> { "RelayAddressableUri", "WebServerAddressableUri" };
			var ipSettings = new HashSet<string> { "BlockIPs", "RestrictToIPs" };

			void CreateOrUpdateSetting(XmlNode element, KeyValuePair<string, string> kvp)
			{
				if (element == null)
				{
					var node = AdvancedConfigurationEditorService.CreateWebConfigNode(xmlDoc, kvp.Key, kvp.Value);
					appConfigSettings[0].InsertAfter(node, appConfigSettings[0].LastChild);
				}
				else
				{
					if (element.Attributes.GetNamedItem("value") == null)
						element.Attributes.Append(xmlDoc.CreateAttribute("value"));
					element.Attributes.GetNamedItem("value").Value = kvp.Value;
				}
			}

			[NotNull]
			string cleanAndValidateIpList(string settingKey, [NotNull] string ipString)
			{
				[NotNull]
				bool[] GetIPBits([NotNull] IPAddress address)
				{
					return address
						.GetAddressBytes()
						.Reverse() // last octet becomes first for going into bit array, as it's LSB
						.ToArray()
						.SafeNav(b => new BitArray(b))
						.Cast<bool>()
						.Reverse() // bit array is LSB rather than MSB, so reverse the whole thing
						.ToArray();
				}

				var ipList = Regex.Split(ipString, "[\\s,;]").Where(it => !it.IsNullOrEmpty()).ToArray();
				var checkedIpList = new List<string>();

				var userHostBits = GetIPBits(IPAddress.Parse(HttpContext.Current.Request.UserHostAddress));

				var atLeastOneAddressMatchesHost = false;

				foreach (var entry in ipList)
				{
					var parts = entry.Split('/');
					var ip = IPAddress.Parse(parts[0]);

					var bits = GetIPBits(ip);
					var bitCount = parts.Length == 1 ? bits.Length : int.Parse(parts[1]);

					if (parts.Length > 1)
					{
						if (bitCount <= 0)
							throw new ArgumentException($"CIDR bit count cannot be zero in \"{entry}\"");
						else if (bitCount > (ip.AddressFamily != AddressFamily.InterNetworkV6 ? 32 : 128))
							throw new ArgumentException($"Invalid CIDR format for IPv{(ip.AddressFamily != AddressFamily.InterNetworkV6 ? 4 : 6)} address \"{entry}\"");
					}

					if (userHostBits.SequenceRangeEquals(bits, bitCount))
					{
						if (settingKey == "BlockIPs")
							throw new ArgumentException("Cannot block the IP address of the currently logged-in administrator");

						atLeastOneAddressMatchesHost = true;
					}

					checkedIpList.Add(entry);
				}

				if (settingKey == "RestrictToIPs" && ipList.Length > 0 && !atLeastOneAddressMatchesHost)
					throw new ArgumentException("Cannot restrict to IP addresses that do not contain the IP address of the currently logged-in administrator");

				return string.Join(",", checkedIpList);
			}

			foreach (var kvp in appSettings)
			{
				var element = xmlDoc.SelectSingleNode("//add[@key='" + kvp.Key + "']");

				if (uriSettings.Contains(kvp.Key))
				{
					if (!isCloud)
					{
						if (Extensions.Try(() => ServerExtensions.ParsePossibleUriPrefix(kvp.Value)))
							CreateOrUpdateSetting(element, kvp);
						else
						{
							if (string.IsNullOrEmpty(kvp.Value.Trim()))
							{
								if (element != null)
									appConfigSettings[0].RemoveChild(element);
							}
							else
								throw new ArgumentException($"Invalid URI specified for setting \"{kvp.Key}\"");
						}
					}
				}
				else
					CreateOrUpdateSetting(element, kvp);
			}

			foreach (var setting in pageSettings)
			{
				foreach (var kvp in setting.Value)
				{
					var element = xmlDoc.SelectSingleNode("//location[@path='" + setting.Key + "']/appSettings/add[@key='" + kvp.Key + "']");

					element.Attributes.GetNamedItem("value").Value = ipSettings.Contains(kvp.Key) ? cleanAndValidateIpList(kvp.Key, kvp.Value) : kvp.Value;
				}
			}

			xmlDoc.Save(HttpContext.Current.Server.MapPath(@"~/web.config"));

			return "OK";
		}
		catch (Exception ex)
		{
			return ex.Message;
		}
	}

	[NotNull]
	public string WriteChangesToAppConfig([NotNull] Dictionary<string, string> systemSettings, [NotNull] Dictionary<string, string> userInterfaceSettings, Dictionary<string, Dictionary<string, string>> defaults)
	{
		try
		{
			var xmlDoc = new XmlDocument();
			xmlDoc.Load(new MemoryStream(AdvancedConfigurationEditorService.GetAppConfigFile()));

			var appConfigSystemSettings = xmlDoc.SelectNodes("//configuration/ScreenConnect.SystemSettings");
			var appConfigUserInterfaceSettings = xmlDoc.SelectNodes("//configuration/ScreenConnect.UserInterfaceSettings");

			foreach (var kvp in systemSettings)
			{
				if (defaults["SystemSettings"].ContainsKey(kvp.Key))
				{
					var element = xmlDoc.SelectSingleNode("//ScreenConnect.SystemSettings/setting[@name='" + kvp.Key + "']");
					AdvancedConfigurationEditorService.UpdateAppConfig(xmlDoc, element, appConfigSystemSettings, kvp.Key, kvp.Value, defaults["SystemSettings"][kvp.Key]);
				}
			}

			foreach (var kvp in userInterfaceSettings)
			{
				if (defaults["UserInterfaceSettings"].ContainsKey(kvp.Key))
				{
					var element = xmlDoc.SelectSingleNode("//ScreenConnect.UserInterfaceSettings/setting[@name='" + kvp.Key + "']");
					AdvancedConfigurationEditorService.UpdateAppConfig(xmlDoc, element, appConfigUserInterfaceSettings, kvp.Key, kvp.Value, defaults["UserInterfaceSettings"][kvp.Key]);
				}
			}

			var systemNodesCount = xmlDoc.SelectSingleNode("//ScreenConnect.SystemSettings").ChildNodes.Count;
			var userInterfaceNodesCount = xmlDoc.SelectSingleNode("//ScreenConnect.UserInterfaceSettings").ChildNodes.Count;

			// delete app.config if it's empty after applying changes
			if (systemNodesCount == 0 && userInterfaceNodesCount == 0)
			{
				var configFilePath = HttpContext.Current.Server.MapPath(@"~/App_ClientConfig/app.config");

				if (File.Exists(configFilePath))
					File.Delete(configFilePath);
			}
			else
				xmlDoc.Save(HttpContext.Current.Server.MapPath(@"~/App_ClientConfig/app.config"));

			return "OK";
		}
		catch (Exception ex)
		{
			return ex.Message;
		}
	}
}

