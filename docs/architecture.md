# Architecture

このドキュメントでは、Komorebi のアーキテクチャについて説明します。

## main

`src/main/` には Electron のメインプロセスコードを配置します。

- `index.ts` でアプリ起動、ウィンドウ生成、トレイ生成を行います。
- `windows/` にはコンパニオンと詳細ウィンドウの生成ロジックがあります。
- `tray/` にはシステムトレイメニューのロジックがあります。
- `ipc/` には将来的な IPC ハンドラを実装します。
- `storage/` にはアプリの永続化ロジックを配置しますn- `services/` にはセッション管理やアプリ状態の初期化ロジックを配置します。

## preload

`src/preload/` には renderer に公開する安全な API を定義します。

- `index.ts` で `contextBridge.exposeInMainWorld` を使い、必要最小限の機能を公開しています。
- `types.ts` で型定義を定義します。

## renderer

`src/renderer/` は UI の実装です。

- `App.tsx` がアプリのエントリポイントです。
- `components/` に UI コンポーネントを配置します。
- `styles/` にグローバル CSS を配置します。

## データ保存

`src/main/storage/storage.ts` が JSON ファイルの読み書きを行います。

- データは `userData` 配下に保存されます。
- 一時ファイルとしてバックアップを作成し、読み込みが失敗した場合はバックアップを参照します。
