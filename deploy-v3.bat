@echo off
echo ========================================
echo  USA Wrap Co - v3 Core Overhaul
echo ========================================
echo.

echo [1/3] Extracting v3 update...
tar -xf usawrapco-v3.tar
echo Done.

echo.
echo [2/3] Staging changes...
git add -A
echo Done.

echo.
echo [3/3] Committing and pushing...
git commit -m "v3: Action menus, toasts, realtime, better pipeline, improved new project flow"
git push
echo.
echo ========================================
echo  Deploy complete! Check Vercel.
echo ========================================
pause
