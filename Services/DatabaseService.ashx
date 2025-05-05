<%@ WebHandler Language="C#" Class="ScreenConnect.DatabaseService" %>

using System;
using System.Linq;
using System.Threading.Tasks;

namespace ScreenConnect
{
	[DemandPermission(PermissionInfo.AdministerPermission)]
	[DemandLicense(BasicLicenseCapabilities.AdministerDatabase)]
	[ActivityTrace]
	public class DatabaseService : WebServiceBase
	{
		public object GetConfiguration()
		{
			return new
			{
				MaintenancePlan = MaintenancePlan.FromUserStringOrDefault(WebConfigurationManager.OpenWebConfiguration().AppSettings.GetValue(ServerConstants.DatabaseMaintenancePlanSettingsKey)),
				MaintenancePlanParameterDefinitions = MaintenancePlanParameterDefinition.All.ToDictionary(it => it.ParameterName, it => new
				{
					it.DefaultValue,
					it.AppliesToActionTypes,
					it.SelectableValues,
					EnumTypeIfApplicable = it.DefaultValue.GetType().IsArray ? it.DefaultValue.GetType().GetElementType()!.Name : it.DefaultValue.GetType().Name,
				}),
			};
		}

		public void SaveAction(MaintenancePlanAction action)
		{
			DatabaseService.UsingMaintenancePlan(maintenancePlan =>
			{
				var existingActionIndex = maintenancePlan.Actions.IndexOf(it => it.ActionID == action.ActionID);
				var newAction = new MaintenancePlanAction
				{
					ActionID = existingActionIndex != -1 ? maintenancePlan.Actions[existingActionIndex].ActionID : Guid.NewGuid(),
					ActionType = action.ActionType,
					Parameters = MaintenancePlanParameterDefinition.All.Where(parameter => parameter.AppliesToActionTypes.Contains(action.ActionType)).ToDictionary(
						it => it.ParameterName,
						it => action.Parameters.TryGetValue(it.ParameterName, out var value) && value != null
							? JavaScriptSerializer.Instance.ConvertToType(value, it.DefaultValue.GetType())
							: throw new InvalidOperationException()
					),
				};

				if (existingActionIndex != -1)
					maintenancePlan.Actions = maintenancePlan.Actions.ToArray().Mutate(it => it[existingActionIndex] = newAction);
				else
					maintenancePlan.Actions = maintenancePlan.Actions.Append(newAction).ToArray();
			});
		}

		public void SaveSchedule(ushort runAtUtcTimeMinutes, bool daysIncludedOrExcluded, DayOfWeek[] days)
		{
			if ((daysIncludedOrExcluded && days.Length == 0) || (!daysIncludedOrExcluded && days.Length == 7))
				throw new InvalidOperationException("Must specify at least one day.");

			DatabaseService.UsingMaintenancePlan(maintenancePlan =>
			{
				maintenancePlan.RunAtUtcTimeMinutes = runAtUtcTimeMinutes;
				maintenancePlan.DaysIncludedOrExcluded = daysIncludedOrExcluded;
				maintenancePlan.Days = days;
			});
		}

		public void DeleteAction(Guid actionID)
		{
			DatabaseService.UsingMaintenancePlan(maintenancePlan =>
			{
				maintenancePlan.Actions = maintenancePlan.Actions.Where(it => it.ActionID != actionID).ToArray();
			});
		}

		static void UsingMaintenancePlan(Proc<MaintenancePlan> proc)
		{
			var configuration = WebConfigurationManager.OpenWebConfiguration();
			var maintenancePlan = MaintenancePlan.FromUserStringOrDefault(configuration.AppSettings.GetValue(ServerConstants.DatabaseMaintenancePlanSettingsKey));

			proc(maintenancePlan);

			configuration.AppSettings.SetValue(ServerConstants.DatabaseMaintenancePlanSettingsKey, MaintenancePlan.ToUserString(maintenancePlan));
			ServerToolkit.Instance.SaveConfiguration(configuration);
		}
	}
}
