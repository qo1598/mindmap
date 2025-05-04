#!/bin/bash
echo "Starting custom build script"
# 실행 권한 문제 해결
chmod +x node_modules/.bin/react-scripts
# 빌드 실행
CI=false npm run build
echo "Build completed" 