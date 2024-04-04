
@echo off

title InternalRaid          %time%   //   %date%
:1
cls
color 08
echo InternalRaid [
ping -n 2 127.0.0.1 > nul
goto 2
:2
cls
color 09
echo InternalRaid [-
ping -n 2 127.0.0.1 > nul
goto 3
:3
cls
color 0a
echo InternalRaid [--
ping -n 2 127.0.0.1 > nul
goto 4
:4
cls
color 0b
echo InternalRaid [---
ping -n 2 127.0.0.1 > nul
goto 5
:5
cls
color 0c
echo InternalRaid [----
ping -n 2 127.0.0.1 > nul
goto 6
:6
cls
color 0d
echo InternalRaid [-----
ping -n 2 127.0.0.1 > nul
goto 7
:7
cls
color 0e
echo InternalRaid [------]
ping -n 2 127.0.0.1 > nul


echo Installing Dependances
npm i
npm i discord.js@Latest
node main.js