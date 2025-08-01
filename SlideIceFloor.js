//=============================================================================
// SlideIceFloor.js
//-----------------------------------------------------------------------------
//  v1.00  (2025-08-01)  初版公開
//
//  ◇ 指定リージョン ID を「氷床（滑る床）」にするプラグイン
//  ◇ 氷床タイルに乗ると自動滑走し、抜けた瞬間に停止
//  ◇ マップ開始直後に氷床上だった場合は最初の入力まで待機
//  ◇ 氷床タイル上にいる間は任意スイッチを自動 ON／抜けた瞬間 OFF
//  ◇ マウス操作に対応。移動ルートがループしてしまう場合に移動を停止
//-----------------------------------------------------------------------------
//  MIT License
//=============================================================================
/*:
@target MZ
@plugindesc v1.00 — 指定リージョンを氷床にし、タイル上にいる間は自動で滑走　@author 高坂ひかげ / ChatGPT o3

@param SlideRegionId
@type number
@min 1
@max 255
@default 8
@text 氷床リージョン ID
@desc このリージョンに乗ると滑走（常時有効）

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

@param UseAStar
@type boolean
@default false
@text A* で経路探索
@desc クリック移動時、経路探索に A* アルゴリズムを使用

@param SlideSwitchId
@type switch
@default 0
@text 滑走状態スイッチ
@desc 氷床タイル上にいる間 ON / 抜けた瞬間 OFF（0 で無効）

@help
//=============================================================================
◆ 作成者
高坂ひかげ Coding: ChatGPT o3

//=============================================================================
◆ 概要
指定リージョン ID のタイルを「氷床（滑る床）」に変換します。  
プレイヤーが氷床に乗ると自動で進み続け、タイルを抜けた瞬間に停止。  
氷床上にいる／滑走中は設定した任意のスイッチを自動 ON、  
完全に抜けたフレームで OFF にします。
マウス操作に対応。移動ルートがループしてしまう場合に移動を停止

TurnWallWalk.jsなどの方向転換機能プラグインを導入している場合は、
TurnWallWalk.jsで設定した方向転換機能、無効化スイッチを設定してください。

//=============================================================================
◆ 使い方  
1. プラグイン設定で  
   • 氷床にしたいリージョン番号  
   • 滑走中の移動速度  
   • 氷床 ON/OFF を知らせるスイッチ（任意）  
   • クリック移動の経路探索を高精度化する場合 **ON**  
   を設定してください。

2. マップ上で「氷床にしたいリージョン番号」に設定したリージョンを塗れば完了。  
   ゲーム開始後は、氷床に乗った瞬間に滑走が始まります。
*/

(() => {
'use strict';

/* ------------------------------------------------------------------------ */
/*  パラメータを取得して定数へ格納                                           */
/* ------------------------------------------------------------------------ */
const prm     = PluginManager.parameters(document.currentScript.src.match(/([^/]+)\.js$/)[1]);
const RID     = Number(prm.SlideRegionId) || 8;        // 氷床リージョン ID
const SPD     = Number(prm.SlideSpeed)   || 5;        // 滑走中の移動速度
const ASTAR   = String(prm.UseAStar).toLowerCase() === 'true'; // A* 探索を使うか
const SWID    = Number(prm.SlideSwitchId) || 0;       // 氷床状態スイッチ ID
const VEC     = {2:[0,1],4:[-1,0],6:[1,0],8:[0,-1]};  // 方向→座標差分テーブル

/* ------------------------------------------------------------------------ */
/*  Game_Player フィールド拡張                                               */
/* ------------------------------------------------------------------------ */
const _init = Game_Player.prototype.initMembers;
Game_Player.prototype.initMembers = function(){
  _init.call(this);
  this._sliding     = false; // 現在滑走中か
  this._dir         = 0;     // 滑走方向
  this._vis         = null;  // 既に踏んだ氷床座標（無限ループ防止）
  this._slidePrevS  = null;  // 滑走前の移動速度
  this._slideLock   = true;  // マップ開始時ロック（最初の入力まで待機）
};

/* 転送時：ロック再有効 & スイッチ同期 ------------------------------------ */
const _performTransfer = Game_Player.prototype.performTransfer;
Game_Player.prototype.performTransfer = function(){
  _performTransfer.call(this);
  this._slideLock = true;
  this._syncSlideSwitch();   // ★転送直後にスイッチ状態反映
};

/* 毎フレーム更新：ロック解除→滑走処理→スイッチ同期 ---------------------- */
const _update = Game_Player.prototype.update;
Game_Player.prototype.update = function(active){
  _update.call(this, active);

  // 最初の入力があるまで滑走ロック
  if(this._slideLock && (Input.dir4 || $gameTemp.isDestinationValid())){
    this._slideLock = false;
  }

  this._updateSlide();       // メイン滑走処理
  this._syncSlideSwitch();   // ★毎フレーム同期
};

/* 入力移動：次タイルが氷床なら速度変更 ------------------------------------ */
const _mbi = Game_Player.prototype.moveByInput;
Game_Player.prototype.moveByInput = function(){
  if(this._slideLock){ _mbi.call(this); return; }
  if(this._sliding)  return; // 滑走中は通常入力を無視

  // 次に進むタイル座標を仮計算
  let nx=this.x, ny=this.y;
  const dir = Input.dir4;

  if(dir){                       // キーボード入力
    const [dx,dy]=VEC[dir] || [0,0]; nx+=dx; ny+=dy;
  }else if($gameTemp.isDestinationValid()){ // マウスクリック
    const step=this.findDirectionTo($gameTemp.destinationX(),$gameTemp.destinationY());
    const [dx,dy]=VEC[step] || [0,0]; nx+=dx; ny+=dy;
  }

  // 次タイルが氷床なら速度を滑走用へ
  if($gameMap.regionId(nx,ny) === RID){
    if(this._slidePrevS === null) this._slidePrevS = this._moveSpeed;
    this.setMoveSpeed(SPD);
  }
  _mbi.call(this);
};

/* Dash 抑制：氷床上と滑走中は強制徒歩 ------------------------------------ */
const _isDash = Game_Player.prototype.isDashing;
Game_Player.prototype.isDashing = function(){
  if(this._sliding)                          return false;
  if($gameMap.regionId(this.x,this.y)===RID) return false;
  return _isDash.call(this);
};
const _updDash = Game_Player.prototype.updateDashing;
Game_Player.prototype.updateDashing = function(){
  if(this._sliding){ this._dashing=false; return; }
  _updDash.call(this);
};

/* ------------------------------------------------------------------------ */
/*  メイン滑走処理                                                           */
/* ------------------------------------------------------------------------ */
Game_Player.prototype._updateSlide = function(){
  if(this._slideLock) return;

  /* すでに滑走中 ---------------------------------------------------------- */
  if(this._sliding){
    this._dashing=false;               // Dash 強制 OFF
    if(!this.isMoving()){              // 1 タイル進み終わった瞬間
      const key=`${this.x},${this.y}`;
      if(this._vis.has(key)){ this._endSlide(); return; } // 無限ループ防止
      this._vis.add(key);

      // 氷床を抜けた → 終了
      if($gameMap.regionId(this.x,this.y)!==RID){ this._endSlide(); return; }

      /* 次のマスが塞がっている？ ----------------------------------------- */
      const [dx,dy]=VEC[this._dir], nx=this.x+dx, ny=this.y+dy;
      const blocked = !this.canPass(this.x,this.y,this._dir) || this._vis.has(`${nx},${ny}`);

      if(blocked){
        // 曲がれるか確認（クリック移動時は目的地を優先）
        const nd=this._nextDir();
        if(nd){
          const [dx2,dy2]=VEC[nd] || [0,0], nx2=this.x+dx2, ny2=this.y+dy2;
          if(this.canPass(this.x,this.y,nd) && !this._vis.has(`${nx2},${ny2}`)){
            this._dir=nd; this.setDirection(nd); this.moveStraight(nd); return;
          }
        }
        this._endSlide();  // 進めなければ終了
      }else{
        this.moveStraight(this._dir);  // 通常前進
      }
    }
    return;
  }

  /* これから滑走を開始するか？ ------------------------------------------- */
  if(!this.isMoving() && this.canMove() && $gameMap.regionId(this.x,this.y)===RID){
    this._startSlide(this.direction());
  }
};

/* クリック移動時：次に選択すべき方向を決定 -------------------------------- */
Game_Player.prototype._nextDir = function(){
  if(!$gameTemp.isDestinationValid()) return 0;
  if(ASTAR){
    const d=this.findDirectionTo($gameTemp.destinationX(),$gameTemp.destinationY());
    if(d) return d;
  }
  const tx=$gameTemp.destinationX(), ty=$gameTemp.destinationY();
  const dx=tx-this.x, dy=ty-this.y, order=[];
  if(Math.abs(dx)>=Math.abs(dy)){ if(dx) order.push(dx>0?6:4); if(dy) order.push(dy>0?2:8); }
  else{ if(dy) order.push(dy>0?2:8); if(dx) order.push(dx>0?6:4); }
  return order.find(d=>this.canPass(this.x,this.y,d))||0;
};

/* 滑走開始 -------------------------------------------------------------- */
Game_Player.prototype._startSlide = function(dir){
  if(this._slidePrevS === null) this._slidePrevS = this._moveSpeed;
  this._sliding = true; this._dir = dir;
  this._preS = this._slidePrevS; this._slidePrevS = null;
  this.setMoveSpeed(SPD);                     // 速度変更
  this._preStep = this._stepAnime;
  this._preWalk = this._walkAnime;
  this.setStepAnime(false); this.setWalkAnime(false); // アニメ停止
  this._dashing = false;
  this._vis = new Set([`${this.x},${this.y}`]);       // 通過履歴

  if(this.canPass(this.x,this.y,dir)){
    this.moveStraight(dir);
  }else{
    const nd=this._nextDir();
    if(nd && this.canPass(this.x,this.y,nd)){
      this._dir=nd; this.setDirection(nd); this.moveStraight(nd);
    }else{
      this._endSlide();
    }
  }
};

/* 滑走終了 -------------------------------------------------------------- */
Game_Player.prototype._endSlide = function(){
  this._sliding = false;
  this.setMoveSpeed(this._preS);              // 元の速度へ
  this.setStepAnime(this._preStep);
  this.setWalkAnime(this._preWalk);
  this._dashing = false;
  $gameTemp.clearDestination();
  this._vis = null;
};

/* スイッチ同期：氷床にいるかどうかを毎フレーム反映 ------------------------ */
Game_Player.prototype._syncSlideSwitch = function(){
  if(!SWID) return;
  const onSlide = $gameMap.regionId(this.x,this.y) === RID;
  if(onSlide !== $gameSwitches.value(SWID)){
    $gameSwitches.setValue(SWID, onSlide);
  }
};

})();
