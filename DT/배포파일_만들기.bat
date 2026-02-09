@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo Digital Twin 배포 파일 생성 스크립트
echo ========================================================

:: 1. 정리
echo [1/5] 이전 빌드 파일 정리 중...
if exist release rmdir /s /q release
mkdir release

:: 2. 빌드
echo [2/5] Electron 앱 빌드 중... (시간이 소요됩니다)
call npm run electron:build
:: winCodeSign 오류가 발생할 수 있으나 무시하고 진행 (dir 타겟 결과물 사용)

:: 3. 배포 폴더 구성
echo [3/5] 배포 폴더 구성 중...
if not exist release\win-unpacked\SmartStationManager.exe (
    echo [ERROR] 빌드 실패! release\win-unpacked\SmartStationManager.exe가 없습니다.
    pause
    exit /b 1
)

mkdir release\dist\Application
xcopy /s /e /y release\win-unpacked\* release\dist\Application\ > nul

:: 4. Launcher 컴파일
echo [4/5] Launcher 컴파일 중... (DigitalTwin.exe)
if not exist scripts\Launcher.cs (
    echo Launcher.cs가 없습니다. scripts 폴더에 Launcher.cs를 확인해주세요.
    pause
    exit /b 1
)

C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /nologo /target:winexe /out:release\dist\DigitalTwin.exe scripts\Launcher.cs
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Launcher 컴파일 실패!
    pause
    exit /b 1
)

:: 5. 압축
echo [5/5] 최종 결과물 압축 중... (Digital Twin.zip)
powershell "Compress-Archive -Path release\dist\* -DestinationPath 'release\Digital Twin.zip' -Force"

echo.
echo ========================================================
echo 모든 작업이 완료되었습니다!
echo 생성된 파일: release\Digital Twin.zip
echo ========================================================
pause
