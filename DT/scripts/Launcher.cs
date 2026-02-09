using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

class Launcher {
    static void Main() {
        string appPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Application", "SmartStationManager.exe");
        
        if (File.Exists(appPath)) {
            ProcessStartInfo startInfo = new ProcessStartInfo(appPath);
            startInfo.WorkingDirectory = Path.GetDirectoryName(appPath);
            try {
                Process.Start(startInfo);
            } catch (Exception ex) {
                // Ignore or show error
            }
        }
    }
}
