<%@ WebHandler Language="C#" Class="RemoteDiagnosticToolkitService" %>

using System;
using System.Web;
using System.Linq;
using System.Security.AccessControl;
using System.Threading.Tasks;
using Nito.AsyncEx;
using ScreenConnect;

[ActivityTrace]
public class RemoteDiagnosticToolkitService : WebServiceBase
{
	public async Task AddDiagnosticEventToSession(string[] sessionGroupPath, Guid sessionID, string data)
	{
		await RemoteDiagnosticToolkitService.ExecuteSessionProcAsync(
			sessionGroupPath,
			new[] { sessionID },
#if SC_22_9
			await PermissionInfo.GetAddEventPermissionNameAsync(SessionEventType.QueuedCommand, new AsyncLazy<SessionEventType>(() => default)),
			async (session, index, userName) => await SessionManagerPool.Demux.AddSessionEventAsync(session.SessionID, new()
			{
				EventType = SessionEventType.QueuedCommand,
				Data = data,
			})
#else
			PermissionInfo.GetAddEventPermissionName(SessionEventType.QueuedCommand),
			async (session, index, userName) => await SessionManagerPool.Demux.AddSessionEventAsync(
				session.SessionID,
				SessionEventType.QueuedCommand,
				SessionEventAttributes.NeedsProcessing,
				string.Empty,
				data
			)
#endif
		);
	}

	public async Task DeleteDiagnosticCommandEvents(string[] sessionGroupPath, Guid sessionID, Guid? connectionID, Guid eventID, SessionEventType eventType)
	{
		await RemoteDiagnosticToolkitService.ExecuteSessionProcAsync(
			sessionGroupPath,
			new[] { sessionID },
#if SC_22_9
			await PermissionInfo.GetAddEventPermissionNameAsync(SessionEventType.DeletedEvent, ServerExtensions.CreateAsyncLazy(async () => eventType)),
			async (session, index, userName) => await SessionManagerPool.Demux.AddSessionEventAsync(session.SessionID, new()
			{
				EventType = SessionEventType.DeletedEvent,
				ConnectionID = connectionID.GetValueOrDefault(),
				CorrelationEventID = eventID,
			})
#else
			PermissionInfo.GetUpdateEventAttributePermissionName(SessionEventAttributes.UserDeleted, eventType),
			async (session, index, userName) =>
				await SessionManagerPool.Demux.UpdateSessionOrSessionConnectionEventAttributeAsync(
					session.SessionID,
					connectionID.GetValueOrDefault(),
					eventID,
					SessionEventAttributes.UserDeleted,
					true,
					eventType,
					0
				)
#endif
		);
	}

	static async Task ExecuteSessionProcAsync(string[] sessionGroupPath, Guid[] sessionIDs, string permissionName, Func<Session, int, string, Task> proc)
	{
		if (sessionIDs == null)
			throw new ArgumentNullException(nameof(sessionIDs));

		var userDisplayName = HttpContext.Current.User.GetUserDisplayNameWithFallback();
		var variables = await ServerExtensions.GetStandardVariablesAsync(HttpContext.Current.User);

#if SC_23_3
		var permissionSet = await Permissions.GetForUserAsync(HttpContext.Current.User);
#else
		var permissionSet = await Permissions.GetForUserAsync(HttpContext.Current);
#endif
		var sessionGroupPathFilter = Permissions.ComputeSessionGroupPathFilterForPermissions(permissionSet, permissionName);
		var sessions = await SessionManagerPool.Demux.GetSessionsAsync(sessionGroupPath, sessionGroupPathFilter, variables, null);

		foreach (var sessionID in sessionIDs)
		{
			var session = sessions.FirstOrDefault(ss => ss.SessionID == sessionID);

			if (session == null)
				throw new InvalidOperationException("Session not in specified group.");
#if SC_23_3
			await Permissions.AssertPermissionAsync(new SessionPermissionRequest { Name = permissionName, SessionType = session.SessionType, SessionGroupPath = sessionGroupPath, AllowPartialSessionGroupMatch = true }, HttpContext.Current.User);
#else
			await Permissions.AssertPermissionAsync(new SessionPermissionRequest { Name = permissionName, SessionType = session.SessionType, SessionGroupPath = sessionGroupPath, AllowPartialSessionGroupMatch = true }, HttpContext.Current);
#endif
		}

		for (var i = 0; i < sessionIDs.Length; i++)
			await proc(sessions.FirstOrDefault(ss => ss.SessionID == sessionIDs[i]), i, userDisplayName);
	}
}
