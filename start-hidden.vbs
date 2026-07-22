Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = "D:\project\hbautopartshop"
shell.Run """C:\Program Files\nodejs\node.exe"" server.mjs", 0, False
