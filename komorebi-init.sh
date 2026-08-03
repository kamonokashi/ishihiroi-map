#!/bin/bash
set -e

mkdir -p /home/kashimura/projects/komorebi
cd /home/kashimura/projects/komorebi

cat > README.md <<'EOF'
# Komorebi

作業をするたびに、PCの片隅にある小さな世界がゆっくり育っていく、ほのぼの系デスクトップアプリです。

## コンセプト

Komorebiは、作業中のユーザーを静かに見守るデスクトップコンパニオンです。

作業時間の積み重ねに応じて植物が育ち、動物やキャラクターが訪れ、小さな森や世界が少しずつ変化していきます。

頻繁な操作や画面への注目を求めず、集中を邪魔しないことを重視します。

## 現在の状態

プロジェクト準備中です。

技術構成、画面設計、データ構造などは今後決定します。
EOF

cat > .gitignore <<'EOF'
# OS
.DS_Store
Thumbs.db
Desktop.ini

# Editors
.vscode/
.idea/
*.swp
*.swo

# Environment variables
.env
.env.*
!.env.example

# Logs
*.log
EOF

cat > LICENSE <<'EOF'
MIT License

Copyright (c) 2026 kamonokashi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

git init -b main

git add README.md .gitignore LICENSE
git commit -m "chore: initialize Komorebi repository"

git status --short
git branch --show-current
git remote -v
