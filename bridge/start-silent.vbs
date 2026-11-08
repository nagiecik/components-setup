Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "c:\Users\JakubNagiet\plugins\components-setup"
WshShell.Run "node bridge\server.js", 0, False
