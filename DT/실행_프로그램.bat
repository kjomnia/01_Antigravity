@echo off
set "PATH=%PATH%;C:\Program Files\nodejs"
echo Smart Station Manager를 실행 중입니다...
"C:\Program Files\nodejs\npm.cmd" run electron:dev
pause
