//=============================================================================
// BrittleFloorPlus.js  v1.0.0  （壊れる床プラグイン・拡張版）
//-----------------------------------------------------------------------------
// ■ 作者
//   神無月サスケ  (原作者) / 高坂ひかげ  (改変) / Coding: ChatGPT o3
//
// ■ 概要
//   「二度踏むと崩れる床」に以下の機能を追加した拡張版プラグインです。
//     - 一筆書き（全踏破）判定と成功スイッチ
//     - 特殊リージョンによる分岐（最後が特殊タイルか？）
//     - 穴化抑制・タイル固定・途中状態セーブ
//
//   元プラグイン：BrittleFloor.js（神無月サスケ 氏作）
//
// ■ ライセンス
//   MIT License  ‑ 改変・再配布・商用・R‑18 利用すべて可。クレジット不要
//
// ■ 更新履歴
//   v1.0.0 (2025‑07‑31)  初版公開。
//=============================================================================
/*:
 * @target MZ
 * @url https://example.com/
 * @plugindesc v1.0 壊れる床＋一筆書き判定＋特殊タイル＆穴抑制 @author 神無月サスケ / 高坂ひかげ（Coding: ChatGPT o3）
 * @help BrittleFloorPlus.js
 * ============================================================================
 * ■ 概要
 *   「二度踏むと崩れる床」に以下の要素を追加した拡張版プラグインです。
 *     - 一筆書き（全踏破）判定と成功スイッチ
 *     - 特殊リージョンによる分岐（最後が特殊タイル？）
 *     - 穴化抑制・タイル固定・途中状態セーブ
 *   元プラグイン：BrittleFloor.js（神無月サスケ 氏作）
 *
 * ■ ライセンス
 *   MIT License  ‑ 改変・再配布・商用・R‑18 利用すべて可。
 *
 * ■ 更新履歴
 *   v1.0.0 (2025‑07‑31)  初版公開。
 *     * ファイル名／プラグイン名を BrittleFloorPlus.js に変更。
 * ▼ 特徴
 *   ● 指定リージョンを２回踏むと崩れる床イベントを自動化します。
 *   ● マップ内すべての壊れる床を "重複なく１回ずつ" 踏む（＝一筆書き成功）
 *     とスイッチをＯＮにできます。
 *   ● 特殊リージョンを設定すると「最後に踏んだタイルが特殊だったか」
 *     を判定条件に加えることができます。
 *   ● 一筆書き成功後に床が壊れなくなる「穴化抑制」やタイル固定、
 *     セーブ＆ロード対応など細かいオプションを備えています。
 *
 * ◆ 元プラグイン『BrittleFloor.js』使い方説明（引用）
 * （以下はオリジナル作者・神無月サスケ氏による解説を引用したものです）
 * ---------------------------------------------------------------------------
 * このプラグインは、RPGツクールMZに対応しています。
 *
 * このプラグインは、砂や薄氷のように、一度乗るとひびが入り、
 * またそこに乗ると下のフロアに落とされる、といった「脆い床」を
 * 作成することが出来ます。
 *
 * 一度床にひびが入っても、マップを切り替えれば元の状態に戻る他、
 * イベントコマンドでリセットする（床のひびも消える）ことも可能です。
 *
 * 主にダンジョンギミックでの使用を想定して作られました。
 *
 * ■概要
 * プラグインコマンドによって、特定のリージョンを「脆い床」として
 * 定義します。
 *
 * 脆い床に描かれるひびや落とし穴のタイルは、
 * イベントで指定します。ダミーのイベントを準備し、
 * １ページ目にひび、２ページ目に落とし穴のタイルを
 * 画像としてセットします。
 * このダミーの画像用イベントは壁の中に置いたり、３ページ目を無条件にして
 * 常に表示させないことが必要です。
 * イベントの画像がタイル以外など無効な場合は、脆い床は設定されません。
 *
 * ひびや落とし穴として指定するタイルは、通行可能に設定してください。
 * さもなくば、ひびが出来た時、プレイヤーが移動できなくなってしまいます。
 * 
 * 引用終わり。
 * 
 * ---------------------------------------------------------------------------
 * ▼ 崩落→落下→移動を簡単実装（AWY_TransferExプラグイン 連携）
 * ---------------------------------------------------------------------------
 * 1. 本プラグインのプラグインコマンド【壊れる床リージョン設定】で
 *    『崩落時 ON スイッチ』 (crumbleSwitch) を設定しておく。
 * 2. マップ側に「自動実行 または 並列実行イベント」を作成し、
 *    出現条件で、「崩落時 ON スイッチ」を設定しておく。
 *    イベントの注釈で<transferEx>を設定しAWY_TransferEx
 *    で場所移動イベントを拡張してください。
 * 3. 場所移動を設定
 * 
 * AWY_TransferEx の拡張転送を使えば、異なるサイズのマップでも
 * 座標補正や相対転送が可能なため、「落下演出」が簡単に作れます。
 * 
 * ============================================================================
 * 
 * @param Crack SE File Name           @type file   @dir audio/se @text ひびSE
 * @param Crack SE volume              @type number @min 0 @max 100 @default 90 @text ひびSE音量
 * @param Crack SE pitch               @type number @min 50 @max 150 @default 100 @text ひびSEピッチ
 *
 * @param Crumble SE File Name         @type file   @dir audio/se @text 崩落SE
 * @param Crumble SE volume            @type number @min 0 @max 100 @default 90 @text 崩落SE音量
 * @param Crumble SE pitch             @type number @min 50 @max 150 @default 100 @text 崩落SEピッチ
 *
 * @param Second Hit SE Wait           @type number @min 0 @default 0 @text 2回目SE待機F
 *
 * @param Crack Timing Threshold    @type number @min 0 @default 0 @text 壊れる床タイル切替タイミング
 * @decimals 1@max 1
 * @desc 0 = 歩行完了時に差し替え（半歩処理スキップ）
 *       0.5 ならちょうど半歩地点など、0–1 の値で調整
 * 
 * @command set
 * @text 壊れる床リージョン設定
 * @desc 各種リージョン ID やスイッチなどを設定し、壊れる床を有効化します。
 *
 * @arg regionId                 @text 基本リージョンID
 * @type number @min 1 @default 21
 * @desc 通常の壊れる床として扱うリージョン ID。
 *
 * @arg specialRegionId          @text 特殊リージョンID
 * @type number @min 0 @default 22
 * @desc 特殊タイルとして扱うリージョン ID。0 なら未使用。
 *
 * @arg eventID                  @text 雛形イベントID
 * @type number @min 1 @default 1
 * @desc タイル画像を取得する雛形イベントの ID。（1 ページ目 = ひび、2 ページ目 = 穴）
 *
 * @arg crumbleSwitch            @text 崩落時 ON スイッチ
 * @type switch @default 0
 * @desc タイルが穴に変わったフレームで ON になるスイッチ。0 で無効。
 *
 * @arg allStepSwitch            @text 一筆書き成功スイッチ
 * @type switch @default 0
 * @desc すべての壊れる床を一筆書きで踏破したら ON になるスイッチ。0 で無効。
 *
 * @arg onlyLastSpecialAllSwitch @text 最後特殊床で一筆書きSW ON
 * @type boolean @default true
 * @desc true: 最後に踏んだタイルが特殊リージョンの場合のみ allStepSwitch を ON。
 *       false: 一筆書き成功で常に ON。
 *
 * @arg noCrumbleAfterAll        @text 一筆書き後穴抑制
 * @type boolean @default false
 * @desc true: 一筆書き成功後はタイルが崩れなくなる。
 *
 * @arg onlyLastSpecialNoCrumble @text 最後特殊床で穴抑制
 * @type boolean @default false
 * @desc true: 一筆書き成功かつ最後が特殊タイルの場合のみ穴抑制。
 *
 * @arg keepTilesAfterClear      @text 一筆書き後タイル固定
 * @type boolean @default false
 * @desc true: 成功後にタイルIDを固定（ロードしても復元）。
 *
 * @arg saveProgress             @text 途中状態をセーブ
 * @type boolean @default true
 * @desc true: マップを離れても割れ状態を保存・再現。
 *
 * @command reset
 * @text 壊れる床リセット
 * @desc マップ内の壊れる床を初期状態に戻し、スイッチをすべて OFF にします。
 */

(() => {
  "use strict";

  //--------------------------------------------------------------------------
  // 0. パラメータ読み込み & SE 設定
  //    - RPG ツクール MZ の PluginManager からパラメータを取得し、
  //      サウンドエフェクト（SE）の再生に使いやすい形へ変換します。
  //--------------------------------------------------------------------------
  const PLUGIN = "BrittleFloorPlus"; // ★ ファイル名と合わせて必ず一致させる
  const PARAM  = PluginManager.parameters(PLUGIN) || {};

  const makeSe = key => ({
    name  : String(PARAM[`${key} File Name`] || ""),
    volume: Number(PARAM[`${key} volume`]    || 90),
    pitch : Number(PARAM[`${key} pitch`]     || 100),
    pan   : 0
  });
  const SE_CRACK   = makeSe("Crack SE");     // ひび割れ SE
  const SE_CRUMBLE = makeSe("Crumble SE");   // 崩落 SE
  const WAIT_2ND   = Number(PARAM["Second Hit SE Wait"] || 0); // 2 回目 SE 遅延

  //--------------------------------------------------------------------------
  // 1. マップ別設定コンテナ（MAP_CFG）
  //    - <set> コマンドごとに設定を保存し、マップ ID 毎に独立運用。
  //    - enabled フラグが false の間は一切のロジックをスキップします。
  //--------------------------------------------------------------------------
  const MAP_CFG = {}; // mapId -> 設定オブジェクト
  const cfg = id => (
    MAP_CFG[id] ||= {
      enabled        : false,
      region         : [], // 基本リージョン ID
      special        : [], // 特殊リージョン ID
      crack          : [], // ひびタイル ID
      hole           : [], // 穴タイル ID
      // ▼ オプション（マップ単位）
      noCrumble      : false, // 一筆書き後穴抑制
      onlySpecialNC  : false, // 最後特殊床で穴抑制
      swCrumble      : 0,     // 崩落時 ON スイッチ
      swAll          : 0,     // 一筆書き成功スイッチ
      keepFixed      : false, // 一筆書き後タイル固定
      saveProgress   : true,  // 途中状態をセーブ
      onlySpecialAll : true   // 最後特殊床で一筆書きSW ON
    }
  );
  const curCfg = () => cfg($gameMap.mapId());

  //--------------------------------------------------------------------------
  // 2. 共通オプション（マップ読込時に都度コピー）
  //    - 一部処理で高速参照したい項目をグローバル変数に複製します。
  //--------------------------------------------------------------------------
  let SW_CRUMBLE       = 0;
  let SW_ALL           = 0;
  let KEEP_FIXED       = false;
  let SAVE_PROGRESS    = true;
  let ONLY_SPECIAL_ALL = true;

  //--------------------------------------------------------------------------
  // 3. マップ内一時フラグ
  //    - 毎回 $gameMap から参照すると重い & 可読性低下のためキャッシュ。
  //--------------------------------------------------------------------------
  let _lastStepWasSpecial  = false; // 直近ステップが特殊タイル？
  let _lastClearWasSpecial = false; // 一筆書き成功時に最後が特殊？
  let _allStepsCompleted   = false; // 一筆書き成功済み？

  //--------------------------------------------------------------------------
  // 4. ユーティリティ関数
  //--------------------------------------------------------------------------
  const IDX = (x, y, z) => (z * $dataMap.height + y) * $dataMap.width + x; // data 配列 index
  const KEY = (x, y)    => `${x},${y}`;                                   // 座標を文字列キー化

  /*
   * 指定リージョンが breakable 設定配列の何番目かを返す。
   * @returns {number} index or -1 (対象外)
   */
  const regionIndex = r => {
    const c = curCfg();
    if (!c.enabled) return -1; // 未セットアップ
    for (let i = 0; i < c.region.length; i++) {
      if (r === c.region[i] || r === c.special[i]) return i;
    }
    return -1;
  };
  const isBreakRegion = r => regionIndex(r) !== -1;

  //--------------------------------------------------------------------------
  // 5. DataManager 拡張 : ニューゲーム時に MAP_CFG をリセット
  //--------------------------------------------------------------------------
  const _DM_cgo = DataManager.createGameObjects;
  DataManager.createGameObjects = function() {
    for (const k in MAP_CFG) delete MAP_CFG[k]; // 前回起動の残骸を全消去
    _DM_cgo.call(this);
  };

  //--------------------------------------------------------------------------
  // 6. 効果音キュー : 指定フレーム遅延で SE を再生する簡易キュー
  //--------------------------------------------------------------------------
  function queueSe(se, delay = 0) {
    if (!se.name) return;
    $gameTemp._bfSeq ||= [];
    $gameTemp._bfSeq.push({ se, delay });
  }
  const _SceneMap_update = Scene_Map.prototype.update;
  Scene_Map.prototype.update = function() {
    _SceneMap_update.call(this);
    const q = $gameTemp._bfSeq;
    if (q && q.length && --q[0].delay <= 0) AudioManager.playSe(q.shift().se);
  };

  //--------------------------------------------------------------------------
  // 7. タイル差分保存 : セーブ互換のため“データ差分”だけ記録します
  //--------------------------------------------------------------------------
  const saveDiff = (m, i, o, n) => {
    const d = $gameSystem._bfTileDiff;
    if (!d[m]) d[m] = {};
    const e = (d[m][i] ||= { orig: o, cur: o });
    e.cur = n;
  };
  const applyDiff = id => {
    const diff = $gameSystem._bfTileDiff[id];
    if (!diff) return;
    const data = $dataMap.data;
    for (const i in diff) data[i] = diff[i].cur;
  };
  const clearDiff = id => delete $gameSystem._bfTileDiff[id];

  //--------------------------------------------------------------------------
  // 8. Game_System 拡張 : 壊れる床関連のセーブデータホルダ
  //--------------------------------------------------------------------------
  const _Sys_init = Game_System.prototype.initialize;
  Game_System.prototype.initialize = function() {
    _Sys_init.call(this);
    this._bfTileDiff        = {}; // タイル差分
    this._bfLastSpecial     = {}; // 一筆書き成功時“最後特殊?”
    this._bfLastStepSpecial = {}; // 直近ステップ“特殊?”
    this._bfAllCompleted    = {}; // 一筆書き成功フラグ
    this._bfTilesFixed      = {}; // タイル固定フラグ
    this._bfFromLoad        = false; // ロード直後判定用
  };

  //--------------------------------------------------------------------------
  // 9. Game_Map 拡張 : マップ遷移時に一時フラグや状態を初期化
  //--------------------------------------------------------------------------
  const _Map_setup = Game_Map.prototype.setup;
  Game_Map.prototype.setup = function(id) {
    _Map_setup.call(this, id);
    this._bfState  = {};        // 床ごとの状態 { cnt, orig, _queued, _early }
    this._bfStep   = new Set(); // 一筆書きカウント用 set
    this._bfTarget = 0;         // マップ内の対象タイル総数
    _lastClearWasSpecial = !!$gameSystem._bfLastSpecial[id];
    _lastStepWasSpecial  = !!$gameSystem._bfLastStepSpecial[id];
    _allStepsCompleted   = !!$gameSystem._bfAllCompleted[id];
  };

  //--------------------------------------------------------------------------
  // 10. setTile : 指定座標のレイヤー１タイルを変更し差分を記録
  //--------------------------------------------------------------------------
  function setTile(x, y, z, id) {
    const i   = IDX(x, y, z);
    const old = $dataMap.data[i];
    if (old === id || id == null) return; // 変更なし
    saveDiff($gameMap.mapId(), i, old, id);
    $dataMap.data[i] = id;
    $gameMap.refresh();
  }

  //--------------------------------------------------------------------------
  // 11. 半歩タイミング処理
//     - プレイヤーが半歩踏み込んだタイミングでひびタイル＆SE を先行予約。
//     - BF_HALF_DIST === 0 なら半歩処理を行わず歩行完了時のみで処理。
//
// ▼ 追加パラメータ反映
//--------------------------------------------------------------------------
const BF_HALF_DIST = Number(PARAM["Crack Timing Threshold"] || 0); // 0 = スキップ

if (BF_HALF_DIST > 0) {  // 0 以外なら半歩ロジックを有効化
(function() {
  const QUEUE_KEY = "_bfHalfQueue";

  function reserveHalfCrack(player, x, y) {
    if (!curCfg().enabled) return;
    const r   = $gameMap.regionId(x, y);
    const idx = regionIndex(r);
    if (idx === -1) return;

    const key      = KEY(x, y);
    const stateMap = $gameMap._bfState;
    const cell     = (stateMap[key] ||= { cnt: 0, orig: $gameMap.tileId(x, y, 1) });
    if (cell.cnt > 0 || cell._queued) return;

    const cfgNow = curCfg();
    const q      = (player[QUEUE_KEY] ||= []);
    q.push({ x, y, key, crackId: cfgNow.crack[idx], cell });
    cell._queued = true;        // 二重予約防止
  }

  // ── 移動入力フック ───────────────────────────────────────────
  const _moveStraightBF = Game_Player.prototype.moveStraight;
  Game_Player.prototype.moveStraight = function(dir) {
    reserveHalfCrack(
      this,
      $gameMap.roundXWithDirection(this.x, dir),
      $gameMap.roundYWithDirection(this.y, dir)
    );
    _moveStraightBF.call(this, dir);
  };

  const _moveDiagBF = Game_Player.prototype.moveDiagonally;
  Game_Player.prototype.moveDiagonally = function(h, v) {
    reserveHalfCrack(
      this,
      $gameMap.roundXWithDirection(this.x, h),
      $gameMap.roundYWithDirection(this.y, v)
    );
    _moveDiagBF.call(this, h, v);
  };

  // ── 半歩到達チェック ─────────────────────────────────────────
  const _updateMoveBF = Game_Player.prototype.updateMove;
  Game_Player.prototype.updateMove = function() {
    _updateMoveBF.call(this);
    const q = this[QUEUE_KEY];
    if (!q || !q.length) return;

    for (let i = q.length - 1; i >= 0; i--) {
      const t  = q[i];
      const dx = Math.abs(this._realX - this.x);
      const dy = Math.abs(this._realY - this.y);
      if (dx < BF_HALF_DIST && dy < BF_HALF_DIST) {
        setTile(t.x, t.y, 1, t.crackId);
        queueSe(SE_CRACK);
        t.cell.cnt    = 1;
        t.cell._early = true;  // 歩行完了側と重複しないようマーク
        delete t.cell._queued;
        q.splice(i, 1);
      }
    }
  };
})(); }   // ← if (BF_HALF_DIST > 0)

  //--------------------------------------------------------------------------
  // 12. 歩行完了時の本処理 (Game_Party.onPlayerWalk)
  //--------------------------------------------------------------------------
  Game_Party.prototype.onPlayerWalk = function() {
    if (!curCfg().enabled) return; // セットアップ前

    // (a) リージョン種別確認
    const { x, y } = $gamePlayer;
    const r   = $gameMap.regionId(x, y);
    const idx = regionIndex(r);
    if (idx === -1) return; // 関係ない床

    const c        = curCfg();
    const crackId  = c.crack[idx];
    const holeId   = c.hole[idx];
    const key      = KEY(x, y);
    const stateMap = $gameMap._bfState;
    const cell     = (stateMap[key] ||= { cnt: 0, orig: $gameMap.tileId(x, y, 1) });

    // (b) 一筆書きカウント更新
    if (!$gameMap._bfStep.has(key)) {
      $gameMap._bfStep.add(key);
      if ($gameMap._bfStep.size === $gameMap._bfTarget && !_allStepsCompleted) {
        _allStepsCompleted   = true;
        _lastClearWasSpecial = c.special[idx] && r === c.special[idx];

        // 一筆書き成功スイッチ
        if (c.swAll && (!c.onlySpecialAll || _lastClearWasSpecial)) {
          $gameSwitches.setValue(c.swAll, true);
        }

        // セーブ用記録
        const mid = $gameMap.mapId();
        $gameSystem._bfAllCompleted[mid]    = true;
        $gameSystem._bfLastSpecial[mid]     = _lastClearWasSpecial;
        $gameSystem._bfLastStepSpecial[mid] = _lastClearWasSpecial;
        if (c.keepFixed) $gameSystem._bfTilesFixed[mid] = true;
      }
    }

    // (c) タイル状態遷移
    if (cell._early) { delete cell._early; return; } // 半歩先行分はスキップ

    if (cell.cnt === 0) {
      // １回目：ひび表示
      setTile(x, y, 1, crackId);
      queueSe(SE_CRACK);
      cell.cnt = 1;

    } else if (cell.cnt === 1) {
      // ２回目：穴 or 抑制
      const suppress = c.noCrumble && _allStepsCompleted && (!c.onlySpecialNC || _lastClearWasSpecial);
      if (!suppress) {
        setTile(x, y, 1, holeId);
        queueSe(SE_CRUMBLE, WAIT_2ND);
        if (c.swCrumble) $gameSwitches.setValue(c.swCrumble, true);
        delete $gameSystem._bfTilesFixed[$gameMap.mapId()]; // 固定解除
      }
      cell.cnt = 2;
    }
  };

  //--------------------------------------------------------------------------
  // 13. 一筆書きターゲット再計算 & 途中状態再構築
  //--------------------------------------------------------------------------
  function recalcTarget() {
    if (!curCfg().enabled) { $gameMap._bfTarget = 0; return; }
    let n = 0;
    for (let y = 0; y < $dataMap.height; y++)
      for (let x = 0; x < $dataMap.width; x++)
        if (isBreakRegion($gameMap.regionId(x, y))) n++;
    $gameMap._bfTarget = n;
  }

  function rebuildState() {
    if (!curCfg().enabled) {
      $gameMap._bfState  = {};
      $gameMap._bfStep   = new Set();
      $gameMap._bfTarget = 0;
      return;
    }
    const st   = {},
          step = new Set();
    const conf = curCfg();
    const diff = $gameSystem._bfTileDiff[$gameMap.mapId()] || {};
    let tgt    = 0;

    for (let y = 0; y < $dataMap.height; y++) {
      for (let x = 0; x < $dataMap.width; x++) {
        const r = $gameMap.regionId(x, y);
        if (!isBreakRegion(r)) continue;
        tgt++;
        const i  = IDX(x, y, 1);
        const id = $gameMap.tileId(x, y, 1);
        const k  = KEY(x, y);
        let cnt  = 0;
        if (conf.crack.includes(id)) cnt = 1; else if (conf.hole.includes(id)) cnt = 2;
        if (cnt > 0) {
          const e = diff[i];
          st[k]   = { cnt, orig: e ? e.orig : id };
          step.add(k);
        }
      }
    }
    $gameMap._bfState  = st;
    $gameMap._bfStep   = step;
    $gameMap._bfTarget = tgt;
  }

  //--------------------------------------------------------------------------
  // 14. リセット処理 : マップ内を初期状態に戻す（プラグインコマンド <reset>）
  //--------------------------------------------------------------------------
  function resetAll(mid) {
    // タイル差分を元に戻す
    const diff = $gameSystem._bfTileDiff[mid] || {};
    for (const i in diff) $dataMap.data[i] = diff[i].orig;
    clearDiff(mid);

    // スイッチOFF & 各種フラグクリア
    const c = cfg(mid);
    if (c.swCrumble) $gameSwitches.setValue(c.swCrumble, false);
    if (c.swAll)     $gameSwitches.setValue(c.swAll, false);
    delete $gameSystem._bfLastSpecial[mid];
    delete $gameSystem._bfLastStepSpecial[mid];
    delete $gameSystem._bfAllCompleted[mid];
    delete $gameSystem._bfTilesFixed[mid];

    // 一時状態リセット
    $gameMap._bfState = {};
    $gameMap._bfStep  = new Set();
    _lastClearWasSpecial = _lastStepWasSpecial = _allStepsCompleted = false;
    recalcTarget();
    $gameMap.refresh();
  }

  //--------------------------------------------------------------------------
  // 15. Scene_Map 拡張 : マップロード・遷移時の状態復元
  //--------------------------------------------------------------------------
  const _SceneMap_onMapLoaded = Scene_Map.prototype.onMapLoaded;
  Scene_Map.prototype.onMapLoaded = function() {
    _SceneMap_onMapLoaded.call(this);
    const id = $gameMap.mapId();

    // マップ固有設定をグローバル変数へコピー
    const cfgNow = curCfg();
    SW_CRUMBLE       = cfgNow.swCrumble || 0;
    SW_ALL           = cfgNow.swAll     || 0;
    KEEP_FIXED       = cfgNow.keepFixed;
    SAVE_PROGRESS    = cfgNow.saveProgress;
    ONLY_SPECIAL_ALL = cfgNow.onlySpecialAll;

    const sameBack = Scene_Map._prevMapId === id;
    Scene_Map._prevMapId = id;

    const crumble  = SW_CRUMBLE && $gameSwitches.value(SW_CRUMBLE);
    const fixedFlg = !!$gameSystem._bfTilesFixed[id];
    const keepable = fixedFlg && !crumble; // タイル固定が有効で崩落 SW がOFF

    if ($gameSystem._bfFromLoad) {
      if (SAVE_PROGRESS) applyDiff(id);
      rebuildState();
      $gameSystem._bfFromLoad = false;
      return;
    }

    const diffExists = SAVE_PROGRESS && $gameSystem._bfTileDiff[id] && Object.keys($gameSystem._bfTileDiff[id]).length;
    if (sameBack && diffExists) { applyDiff(id); rebuildState(); return; }
    if (keepable) { applyDiff(id); rebuildState(); } else { resetAll(id); }
  };

  //--------------------------------------------------------------------------
  // 16. プラグインコマンド登録 : <set> / <reset>
  //--------------------------------------------------------------------------
  PluginManager.registerCommand(PLUGIN, "set", args => {
    const mapId = $gameMap.mapId();
    const c     = cfg(mapId);
    c.enabled   = true; // ここで初めてロジック有効

    // パラメータ取得
    const regionId  = Number(args.regionId        || 21);
    const specialId = Number(args.specialRegionId || 0);
    const ev        = $dataMap.events[Number(args.eventID) || 0];
    if (!ev || !ev.pages[1]) {
      console.warn(`${PLUGIN}: Invalid template event`);
      return;
    }
    const crackId = ev.pages[0].image.tileId;
    const holeId  = ev.pages[1].image.tileId;

    // 設定配列に登録 / 上書き
    let idx = c.region.findIndex(id => id === regionId);
    if (idx === -1) {
      c.region.push(regionId);
      c.special.push(specialId);
      c.crack.push(crackId);
      c.hole.push(holeId);
    } else {
      c.special[idx] = specialId;
      c.crack[idx]   = crackId;
      c.hole[idx]    = holeId;
    }

    // オプション類を即時反映（グローバル変数にもコピー）
    SW_CRUMBLE       = Number(args.crumbleSwitch || 0);
    SW_ALL           = Number(args.allStepSwitch || 0);
    KEEP_FIXED       = args.keepTilesAfterClear === "true";
    SAVE_PROGRESS    = args.saveProgress        !== "false";
    ONLY_SPECIAL_ALL = args.onlyLastSpecialAllSwitch !== "false";

    c.swCrumble      = SW_CRUMBLE;
    c.swAll          = SW_ALL;
    c.keepFixed      = KEEP_FIXED;
    c.saveProgress   = SAVE_PROGRESS;
    c.onlySpecialAll = ONLY_SPECIAL_ALL;

    // 一筆書き後穴抑制オプション
    c.noCrumble     = args.noCrumbleAfterAll === "true";
    c.onlySpecialNC = args.onlyLastSpecialNoCrumble === "true";

    recalcTarget();
  });

  PluginManager.registerCommand(PLUGIN, "reset", () => {
    if (!curCfg().enabled) return;
    resetAll($gameMap.mapId());
  });

  //--------------------------------------------------------------------------
  // 17. セーブ／ロードデータへの組み込み
  //--------------------------------------------------------------------------
  const _DM_make = DataManager.makeSaveContents;
  DataManager.makeSaveContents = function() {
    const c = _DM_make.call(this);
    c.bfMaps            = MAP_CFG;
    c.bfTileDiff        = $gameSystem._bfTileDiff;
    c.bfLastSpecial     = $gameSystem._bfLastSpecial;
    c.bfLastStepSpecial = $gameSystem._bfLastStepSpecial;
    c.bfAllCompleted    = $gameSystem._bfAllCompleted;
    c.bfTilesFixed      = $gameSystem._bfTilesFixed;
    return c;
  };

  const _DM_extract = DataManager.extractSaveContents;
  DataManager.extractSaveContents = function(contents) {
    _DM_extract.call(this, contents);
    Object.assign(MAP_CFG, contents.bfMaps || {});
    $gameSystem._bfTileDiff        = contents.bfTileDiff        || {};
    $gameSystem._bfLastSpecial     = contents.bfLastSpecial     || {};
    $gameSystem._bfLastStepSpecial = contents.bfLastStepSpecial || {};
    $gameSystem._bfAllCompleted    = contents.bfAllCompleted    || {};
    $gameSystem._bfTilesFixed      = contents.bfTilesFixed      || {};
    _lastClearWasSpecial = !!$gameSystem._bfLastSpecial[$gameMap.mapId()];
    _lastStepWasSpecial  = !!$gameSystem._bfLastStepSpecial[$gameMap.mapId()];
    _allStepsCompleted   = !!$gameSystem._bfAllCompleted[$gameMap.mapId()];
    $gameSystem._bfFromLoad = true; // onMapLoaded で特別処理
  };
})();
