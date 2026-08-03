# Data Model

このドキュメントでは Komorebi のデータモデルについて説明します。

## スキーマバージョン

- `schemaVersion`: データ形式のバージョンを表します。

## 保存対象

- `AppSettings`: 設定情報
- `ActiveSession`: 現在のセッション状態
- `SessionRecord`: セッションの履歴
- `DailySummary`: 日次集計
- `ForestState`: 森の成長情報
- `VisitorDefinition`: 訪問者の定義
- `VisitorDiscovery`: 発見済み訪問者
- `ForestEvent`: ランダムイベントの記録
- `AppMetadata`: バージョンや更新情報

## 保存と復元

- 読み込み時は JSON をパースし、破損時はバックアップを優先します。
- 書き込み時はバックアップを書き出してから本体を更新します。

## 将来のマイグレーション

- `schemaVersion` を比較し、古いバージョンから新しいバージョンに変換する関数を追加します。
- まずは `schemaVersion: 1` でスタートします。
