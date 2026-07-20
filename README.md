# radiko 安定コントローラー

radiko Web版に、タイムフリーのスキップボタンと 0.25〜4.00 倍の速度変更を追加する Chromium 系ブラウザ拡張です。

## 元のブックマークレットが不安定になる理由

元コードは radiko の非公開実装（`player._player._audio`、`#seekbar .knob`、jQuery UI の `draggable`、`loadHlsjs`）に直接依存します。そのため、次の条件で壊れます。

- SPA の画面切替でプレイヤーやDOMが作り直される
- シークバーの幅・ノブ位置と実際の再生可能範囲が一致しない
- ライブ配信などで `duration` が有限値にならない
- HLS URL の文字列置換が配信URL・認証・プレイヤーの変更と衝突する
- `.live-detail__failed` が存在しない通常画面ではUIを追加できない

本拡張は配信URLや radiko の private API を変更せず、ブラウザ標準の `HTMLMediaElement` API（`currentTime`、`seekable`、`playbackRate`）だけを利用します。DOMの再生成はイベントと `MutationObserver` で追従します。

## インストール

1. このフォルダーを保存します。
2. Chrome / Edge で `chrome://extensions` / `edge://extensions` を開きます。
3. 「デベロッパーモード」を有効にします。
4. 「パッケージ化されていない拡張機能を読み込む」でこのフォルダーを選びます。
5. `https://radiko.jp/` を再読み込みし、番組を再生します。

## 使い方

右下のパネルから以下を操作できます。

- **移動**: 5秒、20秒、2分、10分単位で前後にスキップ
- **速度**: 0.1倍単位で変更、または1.0倍に復帰
- **×**: そのページでパネルを閉じる（再読み込みすると復帰）

速度はサイト単位で保存され、番組変更後も再適用されます。スキップ先はブラウザが報告する `seekable` 範囲内に制限されます。ライブ番組や配信側がシークを許可しないコンテンツでは移動できません。

## 対応範囲

Manifest V3 の content script `world: "MAIN"` に対応する現行 Chromium 系ブラウザ向けです。radiko の利用規約および地域・聴取期限の制限に従って利用してください。本拡張は地域制限、認証、聴取期限を回避しません。
