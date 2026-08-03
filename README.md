# Komorebi

Komorebi は、作業時間の積み重ねが小さな森や世界の成長につながる、ほのぼの系のデスクトップアプリです。

## 現在実装されている機能

- Electron + React + TypeScript を使ったデスクトップアプリの雛形
- 画面端に表示されるコンパニオンウィンドウ
- Windows のシステムトレイに常駐するトレイアイコン
- セッション状態の基本設計（idle / working / break）
- 作業状態に応じた画面表示
- 森の見た目を表現するシンプルな CSS 画面
- 設定と履歴機能の土台を想定した構成
- JSON データ保存の基盤

## 使用技術

- Electron
- TypeScript
- React
- Vite
- Vitest
- ESLint
- Prettier
- electron-builder

## 必要環境

- Windows 11
- Node.js 18 以上（推奨）
- npm

## 開発モードの起動方法

Windows PowerShell で次を実行します。

```powershell
cd C:\Users\kashimura\projects\Komorebi
npm install
npm run dev
```

## テスト方法

```powershell
npm run test:run
```

## ビルド方法

```powershell
npm install
npm run build
```

## データ保存場所

Windows では、通常次のようなディレクトリに保存されます。

```
%APPDATA%\komorebi
```

## 既知の制限

- 現在の実装は初期構成であり、細かいセッション復元や森の成長ロジックはまだ補完が必要です。
- Windows の自動起動や完全なトレイメニューはまだ実装途中です。
- データのインポート・エクスポート機能はまだ実装していません。

## ライセンス

MIT
