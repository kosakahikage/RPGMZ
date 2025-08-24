//=============================================================================
// SlideIceFloor.js
//-----------------------------------------------------------------------------
// v1.1（2025-08-24）
// - すべる床の判定方法を修正
// - すべる床に侵入した際に、カクツク場合がある問題を修正
// - その他、軽微な動作の調整
// - 安定化：同フレーム多重処理防止、訪問履歴の初期化の厳密化
//
// v1.0（2025-08-01）
// - 初版公開
// - 指定リージョン侵入で即滑走／退出で速度復帰／無限往復防止
//
// MIT License
// Author: 高坂ひかげ（Coding：ChatGPT 5 Thinking）
//=============================================================================
/*:
@target MZ
@plugindesc v1.1 — リージョン氷床：侵入開始で即滑走＋開始/方向転換時にワンステップ演出／退出で速度復帰（低負荷）
@author 高坂ひかげ（Coding：ChatGPT 5 Thinking）

@param SlideRegionId
@type number
@min 1
@max 255
@default 8
@text 氷床リージョン ID
@desc このIDのリージョンを氷床にします。

@param SlideSpeed
@type select
@option 1: x8 遅い  @value 1
@option 2: x4 遅い  @value 2
@option 3: x2 遅い  @value 3
@option 4: 標準     @value 4
@option 5: x2 速い   @value 5
@option 6: x4 速い   @value 6
@default 5
@text 滑走中の移動速度
@desc 氷床上での移動の速さ。氷床外に出ると元に戻ります。

@param UseAStar
@type boolean
@default false
@text A* で経路探索
@desc クリック移動の向き決定をRPG MZ標準の目的地検索に近い感じにします。

@param SlideSwitchId
@type switch
@default 0
@text 滑走状態スイッチ
@desc 氷床上/滑走中は ON、完全に抜けた瞬間 OFF（0 で無効）

@help
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 概要
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
指定した *氷床リージョン ID* のタイルを氷床にします。氷床へ**侵入を開始した瞬間**から
滑走速度で移動します。**開始時**に 1 歩分の歩行アニメを再生し、さらに**滑走中に方向転換して
継続**する瞬間にも 1 歩分の歩行アニメを再生します（次の 1 タイルのみ）。氷床を抜けたら停止し、
速度は必ず元に戻ります。無限往復は訪問タイル集合で防止。処理は軽量（標準の moveStraight / 
updateMove / onMoveEnd を軽くフックするだけ）。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 使い方
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1) マップで氷床にしたいタイルを、パラメータ「氷床リージョン ID」（初期値: 8）で塗ります。
2) 任意で「滑走状態スイッチ」を設定すると、氷床上/滑走中だけ ON になります（イベント制御に便利）。
3) クリック移動で方向を切り替えながら滑る場合も、**方向転換直後の 1 歩のみ**歩行アニメを再生します。
4) 氷床上ではダッシュ不可（演出のブレを防止）。氷床から出た瞬間に原速へ復帰します。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 主な仕様
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 侵入開始で即滑走（遅延なし）
- 開始時/方向転換時のみ 1 タイル分の歩行アニメ
- 無限往復防止（訪問タイル集合で検出）
- 氷床から出たら確実に終了＆移動速度を復帰
- 低負荷：標準処理の軽フックのみ／毎フレーム重処理なし
- 「A* で経路探索」をONにすると、クリック移動の向き選びが**RPG MZ標準の目的地検索と同じ感じ**になります。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ パラメータ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
● 氷床リージョン ID
  指定リージョンを氷床化。複数マップで同じ ID を使い回せます。

● 滑走中の移動速度
  氷床上のみの見かけ速度。原速は自動で保存/復帰されます。

● A* で経路探索
  クリック移動時の折り返し判断に A* を使用します（OFF でも簡易ロジックで良好に動作）。

● 滑走状態スイッチ
  氷床上または滑走中のみ ON。イベントによる制御に便利（例：滑走中はレバー無効など）。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 注意と互換性
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- プレイヤーの移動速度/ダッシュ/入力処理を**全面的に差し替える**プラグインとは競合の可能性があります。
  その場合は本プラグインを後ろに置く、または設定を調整してください。
- タイルの通行判定やイベントのすり抜け設定は通常どおり尊重されます。
- 本プラグインはプレイヤー専用です（フォロワー/イベントには影響しません）。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 更新履歴
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
v1.1（2025-08-24）
// - すべる床の判定方法を修正
// - すべる床に侵入した際に、カクツク場合がある問題を修正
// - その他、軽微な動作の調整
// - 安定化：同フレーム多重処理防止、訪問履歴の初期化の厳密化

v1.0（2025-08-01）
- 初版公開
- 指定リージョン侵入で即滑走／退出で速度復帰／無限往復防止

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MIT License (c) 2025 高坂ひかげ
https://opensource.org/license/mit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/
(()=>{"use strict";
/* ------------------------------------------------------------------
 * パラメータ取得（堅牢化）
 * ------------------------------------------------------------------ */
function params(){
  const nameFromScript = (document.currentScript && document.currentScript.src.match(/([^/]+)\.js$/))?.[1];
  const candidates = [nameFromScript, 'SlipRegionSlide', 'slip_region_slide'].filter(Boolean);
  for(const key of candidates){
    const p = PluginManager.parameters(key);
    if(p && Object.keys(p).length) return p;
  }
  return {};
}
const prm  = params();
const RID  = Number(prm.SlideRegionId||8);
const SPD  = Number(prm.SlideSpeed||5);
const ASTAR= String(prm.UseAStar||'false').toLowerCase()==='true';
const SWID = Number(prm.SlideSwitchId||0);
const VEC  = {2:[0,1],4:[-1,0],6:[1,0],8:[0,-1]};
const keyOf=(x,y)=>`${x},${y}`;
const onIce=(x,y)=> $gameMap.regionId(x,y)===RID;

/* ------------------------------------------------------------------
 * Game_Player 拡張
 * ------------------------------------------------------------------ */
const _init = Game_Player.prototype.initMembers;
Game_Player.prototype.initMembers = function(){
  _init.call(this);
  this._sliding = false;        // 現在スライド中
  this._slideDir = 0;           // スライド方向
  this._slidePrevSpeed = null;  // 復帰用に元速度
  this._preStep = null;         // 歩行/足踏みアニメ復帰用
  this._preWalk = null;
  this._slipStepHandledFrame = -1; // 同フレーム二重処理防止
  this._slideKickOnce = false;     // 直近 1 歩だけ歩行アニメを再生するフラグ
  this._slideVisited = null;       // 訪問タイル集合（無限往復防止）
};

const _performTransfer = Game_Player.prototype.performTransfer;
Game_Player.prototype.performTransfer = function(){
  _performTransfer.call(this);
  // 転送直後に万一の取りこぼしがあればクリア
  this._endSlide();
  this._syncSlideSwitch();
};

/* 入力：滑走中は操作無効（自動滑走を乱さない） */
const _moveByInput = Game_Player.prototype.moveByInput;
Game_Player.prototype.moveByInput = function(){
  if(this._sliding) return;
  _moveByInput.call(this);
};

/* ダッシュ抑制：氷床上/滑走中はダッシュ不可 */
const _isDashing = Game_Player.prototype.isDashing;
Game_Player.prototype.isDashing = function(){
  if(this._sliding) return false;
  if(onIce(this.x,this.y)) return false;
  return _isDashing.call(this);
};
const _updateDashing = Game_Player.prototype.updateDashing;
Game_Player.prototype.updateDashing = function(){
  if(this._sliding){ this._dashing=false; return; }
  _updateDashing.call(this);
};

/* ------------------------------------------------------------------
 * moveStraight：侵入開始の瞬間に“先タイルが氷床なら”即滑走設定
 * ------------------------------------------------------------------ */
const _pMoveStraight = Game_Player.prototype.moveStraight;
Game_Player.prototype.moveStraight = function(d){
  const v = VEC[d];
  if(v && !this._sliding){
    if(this.canPass(this.x,this.y,d)){
      const nx=this.x+v[0], ny=this.y+v[1];
      if(onIce(nx,ny)) this._preStartSlide(d);
    }
  }
  _pMoveStraight.call(this,d);
};

/* 侵入直前にフラグ/速度/開始ワンステップを適用（移動は発行しない） */
Game_Player.prototype._preStartSlide = function(dir){
  if(this._sliding) return;
  if(this._slidePrevSpeed===null) this._slidePrevSpeed = this._moveSpeed;
  this._sliding = true;
  this._slideDir = dir || this.direction();
  // 視覚：開始時だけ歩行アニメを有効化（ワンステップのみ）
  this._preStep = this._stepAnime; this._preWalk = this._walkAnime;
  this.setWalkAnime(true);
  this.setStepAnime(false);
  this._slideKickOnce = true; // 1 歩完了後に自動でOFFへ戻す
  this._slideVisited = new Set(); // 訪問履歴を新規作成
  // 滑走速度へ（このステップの最初のフレームから反映）
  this.setMoveSpeed(SPD);
  // スイッチも即座に ON
  this._syncSlideSwitch();
};

/* 開始/方向転換時の 1 歩アニメを蹴るヘルパ */
Game_Player.prototype._kickOneStep = function(){
  this._slideKickOnce = true;     // 次の 1 タイルだけ有効
  this.setWalkAnime(true);
  this.setStepAnime(false);
};

/* ------------------------------------------------------------------
 * 標準 updateMove / onMoveEnd を軽くフック
 *  - ステップ完了で侵入/退出/折返しを確実に判断
 * ------------------------------------------------------------------ */
const _updateMove = Game_Player.prototype.updateMove;
Game_Player.prototype.updateMove = function(){
  const wasMoving = this.isMoving();
  _updateMove.call(this);
  const justEnded = wasMoving && !this.isMoving();
  if(justEnded){ this._afterStep(); }
};

const _onMoveEnd = Game_Player.prototype.onMoveEnd;
Game_Player.prototype.onMoveEnd = function(){
  _onMoveEnd.call(this);
  this._afterStep();
};

/* ステップ完了後の一括処理（侵入で開始済み→継続／退出で終了／折返し） */
Game_Player.prototype._afterStep = function(){
  const frame = Graphics.frameCount;
  if(this._slipStepHandledFrame === frame) return; // 同フレーム多重実行防止
  this._slipStepHandledFrame = frame;

  // 侵入/方向転換で仕込んだワンステップが終わったら停止
  if(this._slideKickOnce && this._sliding){
    this._slideKickOnce = false;
    this.setWalkAnime(false);
    this.setStepAnime(false);
  }

  // いま立っているタイルで同期
  this._syncSlideSwitch();

  if(this._sliding){
    if(!onIce(this.x,this.y)){
      // 氷床から抜けた → 終了＆原速復帰
      this._endSlide();
      this._safeRestoreSpeed();
      return;
    }

    // 無限往復防止：現在タイルを訪問チェック
    if(!this._slideVisited) this._slideVisited = new Set();
    const curKey = keyOf(this.x,this.y);
    if(this._slideVisited.has(curKey)){
      this._endSlide();
      this._safeRestoreSpeed();
      return;
    }
    this._slideVisited.add(curKey);

    // 前方が塞がれているか、次タイルが既訪か
    const [dx,dy] = VEC[this._slideDir]||[0,0];
    const nx=this.x+dx, ny=this.y+dy;
    const nextVisited = this._slideVisited.has(keyOf(nx,ny));
    const blocked = !this.canPass(this.x,this.y,this._slideDir) || nextVisited;

    if(blocked){
      // 経路探索ロジック：目的地方向の優先候補を計算（A* 任意）
      const nd = this._nextDir();
      if(nd){
        const [dx2,dy2]=VEC[nd]||[0,0];
        const nx2=this.x+dx2, ny2=this.y+dy2;
        if(this.canPass(this.x,this.y,nd) && !this._slideVisited.has(keyOf(nx2,ny2))){
          this._slideDir=nd; this.setDirection(nd);
          this._kickOneStep();       // ★ 方向転換時：ワンステップ演出
          this.moveStraight(nd);
          return;
        }
      }
      // 折返し不可 → 終了
      this._endSlide();
      this._safeRestoreSpeed();
      return;
    }

    // 前方OK → そのまま前進
    this.moveStraight(this._slideDir);
    return;
  }

  // （フォールバック）未滑走で氷床上にいるなら開始
  if(onIce(this.x,this.y)){
    this._startSlide(this.direction());
  }else{
    this._safeRestoreSpeed(); // 念のため
  }
};

/* ------------------------------------------------------------------
 * 開始/終了/補助
 * ------------------------------------------------------------------ */
Game_Player.prototype._startSlide = function(dir){
  if(this._sliding) return;
  if(!onIce(this.x,this.y)) return; // 念のため
  if(this._slidePrevSpeed===null) this._slidePrevSpeed = this._moveSpeed;

  this._sliding = true;
  this._slideDir = dir || this.direction();

  // 視覚揺れ：開始時だけ 1 ステップは歩行アニメ ON、その後 _afterStep で OFF
  this._preStep = this._stepAnime; this._preWalk = this._walkAnime;
  this.setWalkAnime(true);
  this.setStepAnime(false);
  this._slideKickOnce = true;
  this._slideVisited = new Set();

  this.setMoveSpeed(SPD);

  if(this.canPass(this.x,this.y,this._slideDir)){
    this.moveStraight(this._slideDir);
  }else{
    // 直進不可 → 経路探索ロジックで方向転換
    const nd = this._nextDir();
    if(nd && this.canPass(this.x,this.y,nd)){
      this._slideDir=nd; this.setDirection(nd);
      this._kickOneStep();     // ★ 方向転換の初動でもワンステップ
      this.moveStraight(nd);
    }else{
      this._endSlide();
      this._safeRestoreSpeed();
    }
  }
};

Game_Player.prototype._endSlide = function(){
  if(!this._sliding){ this._syncSlideSwitch(); return; }
  this._sliding = false;
  $gameTemp.clearDestination();
  if(this._preStep!==null) this.setStepAnime(this._preStep);
  if(this._preWalk!==null) this.setWalkAnime(this._preWalk);
  this._preStep=null; this._preWalk=null;
  this._safeRestoreSpeed();
  this._slideVisited=null;
  this._syncSlideSwitch();
};

Game_Player.prototype._safeRestoreSpeed = function(){
  if(this._slidePrevSpeed!==null){
    this.setMoveSpeed(this._slidePrevSpeed);
    this._slidePrevSpeed = null;
  }
};

Game_Player.prototype._syncSlideSwitch = function(){
  if(!SWID) return;
  const state = onIce(this.x,this.y) || this._sliding;
  if(state !== $gameSwitches.value(SWID)){
    $gameSwitches.setValue(SWID, state);
  }
};

/* ------------------------------------------------------------------
 * クリック移動時の方向優先（添付ファイル相当）
 *  - A* 有効なら findDirectionTo() を使用
 *  - それ以外は距離の大きい軸を優先（通行可能な最初の方向）
 * ------------------------------------------------------------------ */
Game_Player.prototype._nextDir=function(){
  if(!$gameTemp.isDestinationValid()) return 0;
  if(ASTAR){
    const d=this.findDirectionTo($gameTemp.destinationX(),$gameTemp.destinationY());
    if(d) return d;
  }
  const tx=$gameTemp.destinationX(), ty=$gameTemp.destinationY();
  const dx=tx-this.x, dy=ty-this.y, order=[];
  if(Math.abs(dx)>=Math.abs(dy)){
    if(dx) order.push(dx>0?6:4);
    if(dy) order.push(dy>0?2:8);
  }else{
    if(dy) order.push(dy>0?2:8);
    if(dx) order.push(dx>0?6:4);
  }
  return order.find(d=>this.canPass(this.x,this.y,d))||0;
};

})();
