@echo off
echo ========================================
echo  USA Wrap Co - Deploy Update v2
echo ========================================
echo.

echo [1/3] Extracting new files...
tar -xf usawrapco-v2.tar
echo Done.

echo.
echo [2/3] Staging all changes...
git add -A
echo Done.

echo.
echo [3/3] Committing and pushing...
git commit -m "Add Team, Analytics, Vinyl, Calendar, Design Studio, Settings pages"
git pull --rebase
git push
echo.
echo ========================================
echo  Deploy complete! Check Vercel dashboard.
echo ========================================
pause
