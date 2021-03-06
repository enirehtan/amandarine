/*+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;'''+,
:+:+:+:+:NATH|\+:NATH\:+:EN|\NATHERINE|\NATHERINE|\+:+:+: O G :
;.;.;';'NA/HE| |;AT|ER\';NA| AT|  _NE/  AT| _______|;.;'   R   '
 . . . NA/ ER| | TH| IN\ AT| \___|NE/  /THERINE|\. . .    O A
. . . NATHERINE|\HE| |EN\TH| |. .NE/  / HE| _____|. . .  O   N
;';';'\____IN|  _ER| |;ATHE| |;'NE/  /;'EHERINENA|\';';.  V G  .
:+:+:+:+:+:\___|:\___|:\_____|:+\___/+:+\__________|:+:+:  E  +
':+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;+;,,,*/

// Copyright (c) 2019 ORANGE GROOVE Sororité. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file AND if possible, in the Public Domain.

import { N7e } from '../../../n7e.js';
import { OnDaRun } from '../../../ondarun.js';

import { Sound } from '../../sound.js';

import { Text } from '../text.js';

import { Panel } from './panel.js';

export class WormGame extends Panel {

  dropTangerine(){
    let putPoint = N7e.randomInt( 0, this.freeSpace -this.length -2); //2 = head + origin
    for( let y = 0; y < this.height; y++ )
    for( let x = 0; x < this.width; x++ ){
      if( x == this.originX && y == this.originY ){
        continue;
      } else if( null === this.map[ y* this.width +x ]){
        if( putPoint == 0 ){
          this.map[ y* this.width +x ] = "T";
          this.tangerineX = x;
          this.tangerineY = y;
          return;
        }
        putPoint--;
      }
    }
    this.exit();
  }

  constructor( canvas, previousPanel ){
    super( canvas, previousPanel );
    // Map
    // minX, miny => 0, 0
    let map = WormGame.maps[ 0 ];
    let mapSource = map.map.split('\n');
    this.width = mapSource.reduce(( a, b ) => Math.max( a, b.length ), 0 ) >>> 1;
    mapSource.join('').match( new RegExp(`.{1,${this.width}}`,'g'));
    this.height = mapSource.length;
    mapSource = mapSource.join('').split('');
    let mapColors = new Map( map.colors );
    let mapBlocks = new Map([['_', null ],['#', '#'],['O','O']]);

    this.freeSpace = 0;
    this.map = Array( this.width* this.height );
    this.mapStyles = Array( this.width * this.height );
    for( let y = 0; y < this.height; y++ )
    for( let x = 0; x < this.width; x++ ){
      let d = y* this.width +x;
      this.mapStyles[ d ] = mapColors.get( mapSource.shift());
      this.map[ d ] = mapBlocks.get( mapSource.shift());
      if( this.map[ d ] === null ){
        this.freeSpace++;
      } else if( this.map[ d ] === 'O'){
        this.curX = x;
        this.curY = y;
        this.originX = x;
        this.originY = y;
      }
    }

    this.buttonQueue = [];
    // Tangerine

    // Worm

    this.scale = map.scale || 15;
    this.dir = map.dir;
    this.toX = this.curX +this.dir.x;
    this.toY = this.curY +this.dir.y;
    let tl = {
      dir: this.dir,
      positions: [],
    };
    for( let i = 1; i < 3; i++ ){
      tl.positions.push({ x: this.curX, y: this.curY- i });
    }
    this.turningLines = [ tl ];
    this.length = 1;
    this.dropTangerine();

    //this.dirText = new Text().setString('2');
    this.displayRot = this.targetRot = -Math.PI;
    this.stepping = 0;
    this.stepLength = 200;
    this.stepPause = /* 0.5* */this.stepLength;

    this.rFactor = 0.625*Math.PI* this.stepLength;
    this.controlDir = this.dir;
    this.currentRotation = this.controlDir.cw.cw.r;

    WormGame.maps.push( WormGame.maps.shift());
    this.happy = 0;
  }

  handleEvent( e ){
    if( !super.handleEvent( e )){
      return false;
    }

    BUTTONS_DOWN:{
      if( e.type == OnDaRun.events.CONSOLEDOWN ){
        let button = e.detail.consoleButton;
        switch( button ){
          case ODR.consoleButtons.CONSOLE_LEFT:
            this.controlDir = this.controlDir.acw;
            break;
          case ODR.consoleButtons.CONSOLE_RIGHT:{
            this.controlDir = this.controlDir.cw;
          } break;
          default:
            break BUTTONS_DOWN;
        }

        if( !this.endedTimer ){
          this.buttonQueue.push( button );
        }
      } else if( e.type == OnDaRun.events.CONSOLEUP ){
        // Manage & leave on button ups so they won't go to the next panel.
        switch( e.detail.consoleButton ){
          case ODR.consoleButtons.CONSOLE_LEFT:
          case ODR.consoleButtons.CONSOLE_RIGHT:
            if( this.timer - this.endedTimer > 1000){
              this.exit();
            }
        }
      }
    }

    return true;
  }

  turn(){
    this.turningLines.unshift({
      dir: this.dir,
      positions: [],
    });
  }

  forward( deltaTime ){
    if( this.endedTimer ){
      return super.forward( deltaTime );
    }

    this.stepping+= deltaTime;
    while( this.stepping > this.stepLength ){
      let tl = this.turningLines;
      let lastPos = tl[ tl.length - 1 ].positions;

      this.stepping-= this.stepLength;

      tl[ 0 ].positions.unshift({
        x: this.curX,
        y: this.curY,
      });

      this.curX = this.toX;
      this.curY = this.toY;
      if( this.curY == this.originY && this.curX == this.originX ){
        ODR.soundEffects.SOUND_SCORE.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
        this.exit();
        break;
      }

      this.length++;

      let d =  this.curY* this.width +this.curX;
      if( this.map[ d ] === 'T' ){
        this.map[ d ] = 'W';
        this.dropTangerine();
        this.happy= 200;
        ODR.soundEffects.SOUND_POP.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
      } else {

        // Only adjust length if the worm part is inside the map.
        let p = lastPos.pop();
        if( N7e.clamp( p.x, 0, this.width- 1 ) == p.x
          && N7e.clamp( p.y, 0, this.height- 1 ) == p.y ){

          this.map[ p.y* this.width +p.x ] = null;
          this.length--;
        }

        if( lastPos.length == 0 ){
          tl.pop();
          lastPos = tl[ tl.length - 1 ].positions;
        }
        lastPos[ lastPos.length - 1 ].last = true;

        // After shrinking, test hit.
        /*
        if( this.map[ d ] !== null ){
         ODR.soundEffects.SOUND_HIT.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
         this.endedTimer = this.timer;
        }
        */

        this.map[ d ] = 'W';
      }

      if( this.buttonQueue.length ){

        switch( this.buttonQueue.shift()){
          case ODR.consoleButtons.CONSOLE_LEFT:
            this.dir = this.dir.acw;
            this.turn();
            break;
          case ODR.consoleButtons.CONSOLE_RIGHT:
            this.dir = this.dir.cw;
            this.turn();
            break;
        }

        this.targetRot = -this.dir.r;
        //this.dirText.setString(`${this.dir}`);
      }

      this.toY+= this.dir.y;
      this.toX+= this.dir.x;
      let entity = this.map[ this.toY* this.width +this.toX ];
      switch( entity ){
        case 'W':{
          let p = lastPos[ lastPos.length - 1 ];
          if( p.last && this.toX == p.x && this.toY == p.y ){
            break;
          }
        }
        case '#':
          ODR.soundEffects.SOUND_HIT.play( ODR.config.SOUND_SYSTEM_VOLUME/10 );
          this.endedTimer = this.timer;
          break;
      }
    }

    // Smoothing the display direction toward the final value.
    let rDiff = N7e.mod( this.controlDir.r -this.currentRotation +Math.PI, 2*Math.PI ) - Math.PI;
    this.currentRotation+= deltaTime* rDiff/ this.rFactor;

    return super.forward( deltaTime );
  }

  repaint( deltaTime ){
    let timer = this.endedTimer || this.timer;
    let scale = this.scale - Math.max( 0, ( 2000- timer )/200 );
    let s = Math.max( this.stepping -this.stepLength +this.stepPause, 0 )/this.stepPause;
    let sx = s*( this.toX -this.curX );
    let sy = s*( this.toY -this.curY );

    let ctx = this.canvasCtx;
    ctx.drawImage( ...ODR.consoleImageArguments );
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    //this.dirText.draw( ctx, 0, 0 );

    ctx.save(); {

      ctx.translate( 300, 120 );

      ctx.scale( scale, scale );
      ctx.lineWidth = 1/5;

      ctx.save(); {
        ctx.rotate( -this.currentRotation );
        ctx.translate( -sx, -sy );
        ctx.save();
          ctx.translate( -this.curX- 0.5, -this.curY- 0.5 );
          for( let x = 0; x < this.width; x++ )
          for( let y = 0; y < this.height; y++ ){
            // let d =  this.curY *this.width+ this.curX;
            // let entity = this.map[ d ];
            let s = this.mapStyles[ y* this.width +x ];
            if( s ){
              ctx.fillStyle = s;
              ctx.fillRect( x, y, 1, 1 );
            }
          }

          //Tangerine
          ctx.save();
            ctx.strokeStyle = '#000';
            ctx.fillStyle = '#f28500';
            ctx.translate( this.tangerineX +0.5, this.tangerineY +0.5 );
						let tscale = 0.9 +0.1*Math.abs( Math.sin( timer/100 ));
						ctx.scale( tscale, tscale );
            ctx.rotate( this.currentRotation );
            ctx.beginPath();
            ctx.arc( 0, 0, 0.65, 0, 2*Math.PI );
            ctx.stroke();
            ctx.beginPath();
            ctx.arc( 0, 0, 0.65, -Math.PI/2, Math.PI );
            ctx.fill();
            ctx.fillStyle = '#fa0';
            ctx.beginPath();
            ctx.arc( 0.2, -0.2, 0.3, 0, 2*Math.PI );
            ctx.fill();
            // Leaf
            ctx.fillStyle = '#060';
            ctx.beginPath();
            ctx.arc( -0.65, -0.65, 0.65, 0, Math.PI/2 );
            ctx.arc( 0, 0, 0.65, Math.PI, -Math.PI/2 );
            ctx.fill();
          ctx.restore();

        ctx.restore();


        // Body
        ctx.fillStyle = '#0f0';
        let lastSpot = { x: s *this.dir.x , y: s *this.dir.y };
        let l = 0;
        this.turningLines.forEach( point => {
          let dir = point.dir;
          point.positions.forEach(( pos, index ) => {
            ctx.beginPath();
            let r = pos.last ? 0.4 : 0.5;
            r+= Math.sin( l +timer/200 )/20;
            if( pos.last && this.toX === this.tangerineX && this.toY === this.tangerineY ){
              ctx.arc( pos.x- this.curX, pos.y- this.curY, r, 0, 2*Math.PI );
              ctx.closePath();
              ctx.arc( pos.x- this.curX +s* dir.x/2, pos.y -this.curY +s* dir.y/2, r, 0, 2*Math.PI );
              ctx.closePath();
            }
            let px = pos.x -this.curX +s* dir.x;
            let py = pos.y -this.curY +s* dir.y;
            ctx.arc( px, py, r, 0, 2*Math.PI );
            ctx.closePath();
            ctx.arc(( px +lastSpot.x )/2, ( py +lastSpot.y )/2, r +0.05, 0, 2*Math.PI );
            ctx.closePath();
            lastSpot.x = px;
            lastSpot.y = py;
            ctx.fill();
            l++;
          });
        });

      } ctx.restore();


      // Head
      ctx.fillStyle = "#0f0";
      ctx.beginPath();
      ctx.arc(0, 0, 0.4, 0, 2*Math.PI);
      ctx.fill();

      // Eyes white
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-0.3, 0, 0.3, 0, 2*Math.PI);
      ctx.arc( 0.3, 0, 0.3, 0, 2*Math.PI);
      ctx.fill();
      if( this.endedTimer ){
        ctx.lineWidth = 1/8;
        ctx.strokeStyle = "#000";
        ctx.beginPath();
        ctx.moveTo( -0.5,  0.1 );
        ctx.lineTo( -0.1, -0.1 );
        ctx.lineTo( -0.5, -0.2 );
        ctx.moveTo( 0.5,  0.1 );
        ctx.lineTo( 0.1, -0.1 );
        ctx.lineTo( 0.5, -0.2 );
        ctx.stroke();
        // Mount
        ctx.fillStyle = "#f00";
        ctx.beginPath();
        ctx.moveTo( 0.2, 0.5 );
        ctx.quadraticCurveTo( 0, 0, -0.2, 0.5 );
        ctx.fill();
      } else if( this.happy > 0 ){
        this.happy-= deltaTime;
        ctx.lineWidth = 1/8;
        ctx.strokeStyle = "#000";
        ctx.beginPath();
        ctx.arc( -0.3, 0, 0.1, Math.PI, 0 );
        ctx.stroke();
        ctx.beginPath();
        ctx.arc( 0.3, 0, 0.1, Math.PI, 0 );
        ctx.stroke();
        // Mount
        ctx.fillStyle = "#f00";
        ctx.beginPath();
        ctx.moveTo( 0.2, 0.2 );
        ctx.quadraticCurveTo( 0, 0.2 +this.happy/200, -0.2, 0.2 );
        ctx.fill();
      } else {
        ctx.fillStyle = "#000";
        let dx = this.tangerineX -this.curX -sx;
        let dy = this.tangerineY -this.curY -sy;
        let ang = Math.atan2( dy, dx )- this.currentRotation;
        dx = 0.1*Math.cos( ang );
        dy = 0.1*Math.sin( ang );
        ctx.beginPath();
        ctx.arc(-0.3 +dx, dy, 0.2, 0, 2*Math.PI);
        ctx.arc( 0.3 +dx, dy, 0.2, 0, 2*Math.PI);
        ctx.fill();
      }
    } ctx.restore();
  }

}

WormGame.direction = {
  0: { x: 0, y: -1, i:0, r: 0 },
  1: { x: 1, y: 0, i:1, r: 0.5*Math.PI },
  2: { x: 0, y: 1, i:2, r: Math.PI },
  3: { x: -1, y: 0, i:3, r: 1.5*Math.PI },
}

for( let i = 0; i < 4; i++ ){
  WormGame.direction[ i ].acw = WormGame.direction[ N7e.mod( i -1, 4 )];
  WormGame.direction[ i ].cw = WormGame.direction[ N7e.mod( i +1, 4 )];
}

WormGame.maps = [{
  map:`
_#_#_#_#_#_#_#0#0#0#_O0#0#0#_#_#_#_#_#_#_#
_#_#_#_#_#0#0#1_2_1_2_1_2_1_0#0#_#_#_#_#_#
_#_#_#_#0#2_1_2_1_2_1_2_3_2_3_2_0#_#_#_#_#
_#_#_#0#2_1_2_1_2_1_2_3_2_3_4_3_4_0#_#_#_#
_#_#0#2_1_2_1_2_1_2_3_2_3_2_3_4_3_4_0#_#_#
_#0#2_1_2_1_2_1_2_1_2_3_2_3_4_3_4_3_2_0#_#
_#0#1_2_1_2_1_2_1_2_3_2_3_2_3_4_3_4_3_0#_#
0#1_2_1_2_1_2_1_2_1_2_3_2_3_2_3_2_3_2_1_0#
0#2_1_2_1_2_1_2_1_2_1_2_3_2_3_2_3_2_3_2_0#
0#1_2_1_2_1_2_1_2_1_2_1_2_3_2_3_2_3_2_1_0#
0#2_1_2_1_2_1_2_1_2_1_2_1_2_3_2_3_2_1_2_0#
0#1_2_1_2_1_2_1_2_1_2_1_2_1_2_1_2_1_2_1_0#
0#2_1_2_1_2_1_2_1_2_1_2_1_2_1_2_1_2_1_2_0#
0#1_2_1_2_1_2_1_2_1_2_1_2_1_2_1_2_1_2_1_0#
_#0#1_2_1_2_1_2_1_2_1_2_1_2_1_2_1_2_1_0#_#
_#0#2_1_2_1_2_1_2_1_2_1_2_1_2_1_2_1_2_0#_#
_#_#0#2_1_2_1_2_1_2_1_2_1_2_1_2_1_2_0#_#_#
_#_#_#0#2_1_2_1_2_1_2_1_2_1_2_1_2_0#_#_#_#
_#_#_#_#0#2_1_2_1_2_1_2_1_2_1_2_0#_#_#_#_#
_#_#_#_#_#0#0#1_2_1_2_1_2_1_0#0#_#_#_#_#_#
_#_#_#_#_#_#_#0#0#0#0#0#0#0#_#_#_#_#_#_#_#
`,
  colors: [['0', '#2a595f'], ['1', '#bc5000'], ['2', '#bc5d00'], ['3', '#ca6d00'], ['4', '#e49600'], ['_', null ]],
  dir: WormGame.direction[ 2 ],
},{
  map:`
_#_#_#_#_#_#_#_#_#_#_#_#_#_#_#_#_#
_# # # ##_#_#_#_#_#_#_#_#__#_#_#_#
_# #_##_:_:_:_:_._:_:_:_:_#__#_#_#
_#_#=_#_:_:_:_:_:_:_:_:_:_#_=__#_#
_#_#=_:_:_:_:_:_._:_:_:_:_:_=__#_#
_#_##_:_:_:_:_:_:_:_:_:_:_:_#__#_#
_#_##_:_:_:_._._._._._:_:_:_#__#_#
_#_##_:_:_:_:_:_:_:_:_:_:_:_#__#_#
_#:_#_._._._._._._._._._._._#_:__#
_#:_#_H_H_H_H_H_H_H_H_H_H_H_#_:__#
_#:_#_._._H_._._H_._H_._._._#_:__#
_#:_#_H_._H_H_._H_._H_._H_._#_:__#
_#:_#_._._H_._._H_._H_._H_._#_:__#
_#:_#_H_._H_H_._H_._H_._H_._#_:__#
_#:_#_._._H_._._H_._H_._._._#_:__#
_#:_#_#_H_H_H_H_H_H_H_H_H_#_#_:__#
_#:_=_#_:_:_:_:_:_:_:_:_:_#_=_:__#
_#:_=_=_#_:_=_#_#_#_=_:_#_=_=_:__#
_#:_:_=_=_#_#_=_=_=_#_#_=_=_:_:__#
_#:_:_:_=_=_=_=_=_=_=_=_=_:_:_:__#
_#:_:_:_:_:_=_=_=_=_=_:_:_:_:_:__#
_#:_:_=_#_:_:_:_:_:_:_:_#_=_:_:__#
_#:_:_._=_#_:_#_#_#_:_#_=_._:_:__#
_#:_:_=_#_._:_._=_._:_._#_=_:_:__#
_#_#:_._=_#_:_#_#_#_:_#_=_._:__#_#
_#_#:_=_#_._:_._=_._:_._#_=_:__#_#
_#_#:_._=_#_:_#_#_#_:_#_=_._:__#_#
_#_#:_=_#_._:_._=_._:_._#_=_:__#_#
_#_#:_._=_#_:_#_#_#_:_#_=_._:__#_#
_#_#_#:_._._:_._=_._:_._._:__#_#_#
_#_#_#:_:_:_:_:_:_:_:_:_:_:__#_#_#
_#_#_#_#_#_#_#_#HO_#_#_#_#_#_#_#_#
`,
colors: [['.', '#49425e'], [':', '#63676c'], ['=', '#a3a3a3'], ['#', '#c6cdc4'], ['H', '#6fc88e'], ['_', null ]],
dir: WormGame.direction[ 0 ],
},{
colors:[
  [" ","#FFFF48"],
  [".","#FF9200"],
  ["+","#D58282"],
  ["@","#000000"],
  ["#","#FFCFCF"],
  ["$","#D3D4E1"],
  ["%","#FFFFFF"],
  ["&","#AAAAFF"],
  ["*","#F5A8D0"],
  ["=","#FFB1C7"],
  ["-","#F82121"],
  ["O","#00FF00"],
],
dir: WormGame.direction[ 0 ],
scale: 10,
map:`
                                        
 .   .  ...         ++@@@@++            
 ..  . .   .      +@@@@@@@@@@+          
 . . . .....     +@@@@@@@@@@@@+         
 .  .. .   .    +@@@@@@@@@@@@@@+        
 .   . .   .    @@@@@@@@@@@@+@+@        
               +@+@@@@@@@@+@++@@+       
 ..... .   .   @+@@@@@@@@@@+++@@@       
   .   .   .  +@+@@+@@+@+@@+@@@@@       
   .   .....  +@@@+#@@+@+@@@+@@$%$      
   .   .   .  +@+@@+@+@@@+@@@$%%$@      
   .   .   .  +@@@@@#+@@@@@@@@$%$@      
               @+%@&##*%@&+@@@@$@@      
 ..... .....   @*=@@%#==@@=+@@@@@@      
 .     .   .   @##==%##=#==+@@@@@@      
 ..... ....    @*##*%+#####*+@@@@@      
 .     .   .   @*##*++####=*+@@@@@      
 ..... .   .   @+########==+@@@@@@      
              +@@*#-%%%-#=*+@@@@@@+     
 ..... .   .  @@@+##---#=*+@@@+@@@+     
   .   ..  .  +@@@*##%##**+@@+@@@@@     
   .   . . .  +@@@@*###**+@@@+@@@@@     
   .   .  ..  @+@@@@*#*++*@@@@+@+@@     
 ..... .   . +@+@@@@+++***@@@@+@+@@     
             @@@+@@@+**#*+@@@+@@@+@     
 .....       @@@+@@+**#**@@@@+@@@@@+    
 .          @+@@@+@+**#*@@@@+@@@**@+    
 .....     @*+@@@+@++**+@@@@@@@****@    
 .        @$*@+@+@@@+*+@@@@@@@@*****@   
 .....    @$+@@@@@@@+*+@@@+@@@**@@@@&@  
         @$+@@@@@@@@++@@+@@@@@*@&&&&&@  
         @$+@@@@+@@@+@**+@@@@@@&&&&&&&@ 
        @$$+@@@+@@@@@@*@@+@@@$%%&&&&&&@ 
        @$+@@@+@@**@@@@*@+@@@$%%%&&&&&@ 
       @$$+@@@@@@$%*@**@@@@@@$%%%%&&&&&@
       @$@+@@@@*$$%%@$*@@@@@%$$%%$%&&&&@
       @$@@@+@*$$%%%@$@@@+@%%%$%%$%&&&&@
       @$$@@+@*$$%%@$$@@@+@%%%$%%$$%&&&@
       @$$@@@@$$$%%@$@@@@@@%%%$$%$$%&&&@
       @$$$@@@@$%%%@$$@@O@@%%%$$%$$%&&&@
`.split('\n').join('').split('').map( c => {
  switch( c ){
    case ' ': return ' #';
    case '.': return '.#';
    case 'O': return 'OO';
    default: return c+'_';
  }
}).join('').match(/.{1,80}/g).join('\n')}];
