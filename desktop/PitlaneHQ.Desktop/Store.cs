using System.Runtime.InteropServices;
using Windows.ApplicationModel;
using Windows.ApplicationModel.Activation;

namespace PitlaneHQ.Desktop;

/// <summary>Pitlane HQ installed from the Microsoft Store (the MSIX package, msix/ in the repository). The Store keeps
/// the files up to date (the engine's updater stays off), and Windows starts it through the package's startup task
/// (TaskId below, the same as in msix/AppxManifest.xml) instead of the Run entry: this window turns that task on
/// and off to follow the "Start with Windows" setting.</summary>
internal static class Store
{
    public const string TaskId = "PitlaneHQStartup";

    [DllImport("kernel32.dll")] private static extern int GetCurrentPackageFullName(ref uint length, IntPtr name);

    public static readonly bool IsPackaged = Packaged();

    private static bool Packaged()
    {
        // APPMODEL_ERROR_NO_PACKAGE (15700): a normal install; ERROR_INSUFFICIENT_BUFFER (122): it has a package
        try { uint n = 0; return GetCurrentPackageFullName(ref n, IntPtr.Zero) == 122; } catch { return false; }
    }

    /// <summary>Windows started it at sign-in (the startup task): it starts in the notification area, as -minimized.</summary>
    public static bool StartedByWindows()
    {
        if (!IsPackaged) return false;
        try { return AppInstance.GetActivatedEventArgs()?.Kind == ActivationKind.StartupTask; } catch { return false; }
    }

    /// <summary>The startup task follows the setting (a task the driver turned off in Windows stays off).</summary>
    public static async Task FollowAsync(bool on)
    {
        if (!IsPackaged) return;
        try
        {
            var t = await StartupTask.GetAsync(TaskId);
            if (on && t.State == StartupTaskState.Disabled) await t.RequestEnableAsync();
            else if (!on && t.State == StartupTaskState.Enabled) t.Disable();
        }
        catch { }
    }
}
