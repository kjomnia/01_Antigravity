@echo off
set "PATH=%PATH%;C:\Program Files\nodejs"
echo Smart Station Manager 배포용 파일을 생성 중입니다...
"C:\Program Files\nodejs\npm.cmd" run electron:build
echo.
echo 생성이 완료되었습니다. release 폴더를 확인하세요.
pause
