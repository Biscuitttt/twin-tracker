@echo off
rmdir /s /q .git
set GIT="C:\Program Files\Git\bin\git.exe"
%GIT% init
%GIT% add .
%GIT% commit -m "init: Twin Tracker initial commit"
%GIT% branch -M main
del /f reinit.bat
