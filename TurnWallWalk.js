//=============================================================================
// TurnWallWalk.js
//-----------------------------------------------------------------------------
//  v1.0.0  (2025-08-01)  初版公開。
//
//  ◇ キーボード操作時のプレイヤー移動拡張
//     ├ 方向転換（滑らかな回転＋ダッシュ猶予） … スイッチで無効化可
//     ├ 壁沿い足踏み（壁歩き）                 … スイッチで無効化可
//     └ 全機能まるごと無効スイッチ
//
//  ● 壁歩き速度モード
//     fixed  : 常に速度 *WallWalkFixedSpeed*
//     follow : 現在設定されている移動速度をそのまま使用
//
//  ● 構成
//     * プラグインコマンドはありません。
//     * 機能の ON / OFF は 3 つのスイッチと
//       速度モードのパラメータだけで管理します。
//
//-----------------------------------------------------------------------------
//  MIT License  ‑ 改変・再配布・商用・R‑18 利用すべて可。
//
//=============================================================================
/*:
@target MZ
@plugindesc v1.0.0 — 方向転換＆壁歩きをスイッチで簡単制御。壁歩き時の速度を固定 or 現在速度から選択可
@author 高坂ひかげ / ChatGPT o3

@param MasterSwitchId
@type switch
@default 0
@text ［全機能］無効スイッチ
@desc ON の間は当プラグインの全機能を無効化（0 なら未使用）

@param TurnDisableSwitchId
@type switch
@default 0
@text 方向転換を無効にするスイッチ
@desc ON の間、方向転換（滑らかな回転＋ダッシュ猶予）を無効

@param WallWalkDisableSwitchId
@type switch
@default 0
@text 壁歩きを無効にするスイッチ
@desc ON の間、壁沿い足踏み機能を無効

@param WallWalkSpeedMode
@type select
@option fixed
@option follow
@default fixed
@text 壁歩き速度モード
@desc fixed: 常に指定速度 / follow: 現在の移動速度を使用

@param WallWalkFixedSpeed
@type number
@min 1
@max 6
@default 4
@text 壁歩き固定速度
@desc モード=fixed のときに適用される速度（1〜6）

@help
//=============================================================================
◆ 作成者
高坂ひかげ（Coding: ChatGPT o3）

//=============================================================================
◆ 概要
このプラグインはキーボードでのプレイヤー操作に  
  1. **方向転換**（滑らかな回転 + 方向固定フレーム + ダッシュ猶予）  
  2. **壁沿い足踏み**（壁歩き）  
の 2 機能を追加します。  
各機能は任意のスイッチで個別に無効化でき、さらに  
プラグイン全体を一括でオフにする “一括無効スイッチ” も用意しています。

壁歩き中の移動速度は  
*fixed*（常に任意の速度に固定）または  
*follow*（現在設定されている移動速度をそのまま使用）の  
いずれかをパラメータで選択できます。

//=============================================================================
◆ 使用方法
1. プラグインパラメータでスイッチ ID と速度モードを設定します。  
2. ゲーム中にイベント等でスイッチを ON / OFF するだけで、  
   方向転換・壁歩きを個別に無効化できます。  
   *MasterSwitch* が ON の場合、当プラグインの機能はすべて無効になります。

//=============================================================================
MIT License  ‑ 改変・再配布・商用・R‑18 利用すべて可。

*/
(() => {
'use strict';

/*──────────────────────── パラメータ ───────────────────────*/
const NAME = document.currentScript.src.match(/([^/]+)\.js$/)[1];
const PRM  = PluginManager.parameters(NAME);

const SW_MASTER = Number(PRM.MasterSwitchId)       || 0;
const SW_TURN   = Number(PRM.TurnDisableSwitchId)  || 0;
const SW_WALL   = Number(PRM.WallWalkDisableSwitchId)|| 0;

const SPEED_MODE = String(PRM.WallWalkSpeedMode||'fixed').toLowerCase(); // fixed|follow
const SPEED_FIXED= Math.max(1,Math.min(6,Number(PRM.WallWalkFixedSpeed)||4));

/*────────────────────── Game_System 拡張 ──────────────────*/
Game_System.prototype.sm_isPluginActive = function(){
  return !(SW_MASTER && $gameSwitches.value(SW_MASTER));
};
Game_System.prototype.sm_isTurnActive = function(){
  if(!this.sm_isPluginActive()) return false;
  return !(SW_TURN && $gameSwitches.value(SW_TURN));
};
Game_System.prototype.sm_isWallActive = function(){
  if(!this.sm_isPluginActive()) return false;
  return !(SW_WALL && $gameSwitches.value(SW_WALL));
};
Game_System.prototype.sm_speedMode = function(){ return SPEED_MODE; };

/*────────────────── プレイヤー初期化 ─────────────────────*/
const _init = Game_Player.prototype.initMembers;
Game_Player.prototype.initMembers = function(){
  _init.call(this);
  this._turnLock=0; this._flash=0; this._queue=0;
  this._wall=false; this._g=this._sup=0;
  this._prevMov=true;
  this._savedSpeed=null;              // 壁歩き前の速度保存用
};

/*────────────────── ヘルパ関数 ─────────────────────────*/
const touchFront=d=>$gamePlayer.checkEventTriggerTouchFront(d);
const canPass    =(x,y,d)=>$gamePlayer.canPass(x,y,d);

/*────────────────── moveByInput ─────────────────────────*/
const _mbi=Game_Player.prototype.moveByInput;
Game_Player.prototype.moveByInput=function(){
  if(!$gameSystem.sm_isPluginActive()){ _mbi.call(this); return; }

  const TURN=$gameSystem.sm_isTurnActive();
  const WALL=$gameSystem.sm_isWallActive();

  /* ─ 方向転換無効 & 壁歩き有無判定 ─ */
  if(!TURN){
    if(!this.canMove()) return;
    const dir=this.getInputDirection();
    if(dir===0){ if(this._wall) this.endWall(); _mbi.call(this); return; }

    if(!this.isMoving()){
      this.setDirection(dir);
      if(canPass(this.x,this.y,dir)){ this.endWall(); this.moveStraight(dir);}   
      else if(WALL && !touchFront(dir)){ this.startWall(dir); }
      return;
    }
    _mbi.call(this); return;
  }

  /* ─ 方向転換有効：元ロジック ─ */
  if(!this.canMove()) return;
  const dir=this.getInputDirection();
  if(dir===0){ this._turnLock=0; if(this._wall) this.endWall(); _mbi.call(this); return; }

  if(!this.isMoving()){
    if(dir!==this.direction()){
      if(Input.isPressed('shift')){
        this.setDirection(dir);
        if(canPass(this.x,this.y,dir)){ this.endWall(); this.moveStraight(dir);}   
        else if(WALL && !touchFront(dir)){ this.startWall(dir); }
        return;
      }
      this.setDirection(dir);
      this._flash=6; this._turnLock=8; this._queue=0; this._g=0; this._sup=4;
      return;
    }
    if(this._turnLock>0){ --this._turnLock; return; }

    if(canPass(this.x,this.y,dir)){ this.endWall(); this.moveStraight(dir);}   
    else if(WALL && !touchFront(dir)){ this.startWall(dir); }
    return;
  }
  if(dir!==this.direction()) this._queue=dir;
};

/*──────────────────── update ───────────────────────────*/
const _upd=Game_Player.prototype.update;
Game_Player.prototype.update=function(active){
  if(!$gameSystem.sm_isPluginActive()){ _upd.call(this,active); return; }

  _upd.call(this,active);
  if(this._flash>0) this._flash--;

  const TURN=$gameSystem.sm_isTurnActive();
  const WALL=$gameSystem.sm_isWallActive();

  if(TURN && this.isMoving()){
    const half=this.distancePerFrame()*0.5;
    if(this._queue && this._moveDistance<=half){
      const d=this._queue; this._queue=0;
      this._moveDistance=0; this._realX=this.x; this._realY=this.y;
      this.setDirection(d);
      if(canPass(this.x,this.y,d)){ this.endWall(); this.moveStraight(d);}   
      else if(WALL && !touchFront(d)){ this.startWall(d); }
    }
  }else this._queue=0;

  if(this._wall && !this.canMove()){ this.endWall(); }

  const movable=this.canMove();
  if(!this._prevMov && movable && Input.dir4){
    this._turnLock=0; this._queue=0; this.moveByInput();
  }
  this._prevMov=movable;
};

/*───────────────── 壁歩き helpers ───────────────────────*/
Game_Player.prototype.startWall = function(d){
  if(this._wall || !$gameSystem.sm_isWallActive()) return;

  /* 速度固定処理 */
  if($gameSystem.sm_speedMode()==='fixed'){
    if(this._savedSpeed===null) this._savedSpeed=this._moveSpeed;
    this.setMoveSpeed(SPEED_FIXED);
  }

  this._wall=true; this._stepAnime=true; this.setDirection(d);
};
Game_Player.prototype.endWall = function(){
  if(!this._wall) return;

  if(this._savedSpeed!==null){ this.setMoveSpeed(this._savedSpeed); }
  this._savedSpeed=null;
  this._wall=false; this._stepAnime=false;
};

/*────────────────── pattern flash ─────────────────────*/
const _pat=Game_CharacterBase.prototype.pattern;
Game_CharacterBase.prototype.pattern=function(){
  if(!(this instanceof Game_Player)) return _pat.call(this);
  if($gameSystem.sm_isTurnActive() && this._flash>0) return 2;
  return _pat.call(this);
};

/*────────────────── Dash 判定 ─────────────────────────*/
const _dash=Game_Player.prototype.isDashing;
Game_Player.prototype.isDashing=function(){
  if(!$gameSystem.sm_isTurnActive()) return _dash.call(this);

  if(this._wall && $gameSystem.sm_speedMode()==='fixed') return false;
  return _dash.call(this);
};
})();

