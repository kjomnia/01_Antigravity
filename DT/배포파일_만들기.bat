@echo off
setlocal
@chcp 65001 > nul
cd /d "%~dp0"

echo ========================================================
echo Digital Twin 배포 파일 생성 스크립트
echo ========================================================

:: 1. 선행 작업 (프로세스 종료)
echo [0/6] 실행 중인 프로그램 종료 중...
taskkill /F /IM SmartStationManager.exe 2>nul
taskkill /F /IM DigitalTwin.exe 2>nul

:: 2. 정리
echo [1/6] 이전 빌드 파일 정리 중...
if exist release rmdir /s /q release
mkdir release

:: 2. 빌드
echo [2/6] Electron 앱 빌드 중... (시간이 소요됩니다)
call npm run electron:build
:: winCodeSign 오류가 발생할 수 있으나 무시하고 진행 (dir 타겟 결과물 사용)

:: 3. 배포 폴더 구성
echo [3/6] 배포 폴더 구성 중...
if not exist release\win-unpacked\SmartStationManager.exe (
    echo [ERROR] 빌드 실패! release\win-unpacked\SmartStationManager.exe가 없습니다.
    pause
    exit /b 1
)

mkdir release\dist\Application
xcopy /s /e /y release\win-unpacked\* release\dist\Application\ > nul

:: 4. Launcher 컴파일
echo [4/6] Launcher 컴파일 중... (DigitalTwin.exe)
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

:: 5. 매뉴얼 복사
echo [5/8] 사용 설명서 복사 중... (manual.md -> Manual.txt)
if exist manual.md (
    copy /y manual.md "release\dist\Manual.txt" > nul
) else (
    echo [WARNING] manual.md 파일을 찾을 수 없습니다. 배포 파일에서 제외됩니다.
)

:: 6. img 폴더 복사
echo [6/8] img 폴더 복사 중... (Application 폴더 안으로)
if exist img (
    xcopy /s /e /y img release\dist\Application\img\ > nul
    echo [SUCCESS] img 폴더가 Application 폴더에 복사되었습니다.
) else (
    echo [WARNING] img 폴더를 찾을 수 없습니다.
)

:: 7. LGUPlusLabelPrinter 폴더 복사
echo [7/8] LGUPlusLabelPrinter 폴더 복사 중...
if exist LGUPlusLabelPrinter (
    xcopy /s /e /y LGUPlusLabelPrinter release\dist\LGUPlusLabelPrinter\ > nul
    echo [SUCCESS] LGUPlusLabelPrinter 폴더가 복사되었습니다.
) else (
    echo [WARNING] LGUPlusLabelPrinter 폴더를 찾을 수 없습니다.
)

:: 8. 압축
echo [8/8] 최종 결과물 압축 중... (Digital Twin.zip)
powershell "Compress-Archive -Path release\dist\* -DestinationPath 'release\Digital Twin.zip' -Force"

:: 9. C:\02_Distribution 폴더로 복사
echo [9/9] 배포 폴더로 복사 중... (..\..\02_Distribution\Digital Twin)
set DIST_DIR=..\..\02_Distribution\Digital Twin
if not exist "%DIST_DIR%" mkdir "%DIST_DIR%"

:: 배포 파일 복사
copy /y "release\Digital Twin.zip" "%DIST_DIR%\Digital Twin.zip" > nul
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] 배포 파일이 %DIST_DIR%에 복사되었습니다.
    
    :: 복사 성공 시 release 폴더의 zip 파일 삭제
    del /q "release\Digital Twin.zip" > nul
    if %ERRORLEVEL% EQU 0 (
        echo [INFO] release 폴더의 임시 파일이 삭제되었습니다.
    )
) else (
    echo [WARNING] 배포 파일 복사 실패. 수동으로 복사해주세요.
)

echo.
echo ========================================================
echo 모든 작업이 완료되었습니다!
echo 배포 파일 위치: %DIST_DIR%\Digital Twin.zip
echo ========================================================
pause
