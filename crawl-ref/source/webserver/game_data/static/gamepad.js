define(["jquery"],
/*
 * This is very much a game mod and not a real good implementation of gamepad support
 * It is a prototype to demonstrate the unrealized potential of playing DCSS with an
 * game controller.
 *
 * - grubsteak
 * 
 * Controls:
 */
function ($) {
    "use strict";
    const THUMBSTICK_KEYMAP = [
                ['1','2','3'],
                ['4','5','6'],
                ['7','8','9']
                ]
        
    const BUTTON_REFRESH_RATE = 200;

    var gamepad = {gamepadCursorX:0,gamepadCursorY:0}

    function gamepadHandler(event, connecting) {
      var controller = event.gamepad;
      var wasPressed = []

      if (connecting) {
        var rightStickTimeout = 0
        var buttonDecay = []
        setInterval(()=>{
            for (controller of navigator.getGamepads()) {
                if(controller) {
                    var gamepadX = controller.axes[0] // gamepad X/Y is direction that the gamepad cursor goes
                    var gamepadY = controller.axes[1] // player presses a to move in direction; left stick is single move, right stick is faster / sloppier movement
                    var rightStick = false;
                    if(Math.abs(gamepadX) < 0.25 && Math.abs(gamepadY) <0.25) { // right stick is idle, switch to left stick
                        gamepadX = controller.axes[2]
                        gamepadY = controller.axes[3]
                        if(Math.abs(gamepadX) > 0.25 || Math.abs(gamepadY) > 0.25) {
                            rightStick = true
                        }
                    }
                   
                    var gamepadCursorX = Math.floor(gamepadX+0.5)
                    var gamepadCursorY = Math.floor(gamepadY+0.5)
                    gamepad.gamepadCursorX = gamepadCursorX
                    gamepad.gamepadCursorY = gamepadCursorY
                    var pressedThisFrame = [];
                    var keyToPress = undefined;
                    var whichKey = undefined;
                    var type = 'keypress';

            
                    for(var i=0; i<controller.buttons.length; i++) {
                        pressedThisFrame[i]=controller.buttons[i].pressed && !wasPressed[i];
                        buttonDecay[i]=buttonDecay[i]!==undefined ? buttonDecay[i] : 0 // populate it
                    }
                    for(let [key, decay] of buttonDecay.entries()) {
                        
                        if(controller.buttons[key].pressed && !pressedThisFrame[key]) {
                            buttonDecay[key] = Math.max(0,buttonDecay[key]-5)
                            if(buttonDecay[key] == 0) {
                                pressedThisFrame[key] = true
                                buttonDecay[key] = BUTTON_REFRESH_RATE
                            }
                        } else {
                            buttonDecay[key] = BUTTON_REFRESH_RATE
                        }
                    }

                    if(rightStick) {
                        var rightStickPressing = true

                        gamepadX=(gamepadX-.25)/.75 // map out dead zone
                        gamepadY=(gamepadY-.25)/.75

                        // FIXME: sends middle keymap binding, really shouldn't

                        if(rightStickTimeout > 0) {
                            rightStickPressing = false
                        }
                        rightStickTimeout = Math.max(0,rightStickTimeout - 1)
                        if(rightStickPressing) {
                            // send the keymapping
                            keyToPress = THUMBSTICK_KEYMAP[-gamepadCursorY+1][gamepadCursorX+1]

                            // make right stick move character faster/slower based on for far out you drag the stick
                            rightStickTimeout = Math.max((1-(Math.sqrt(gamepadX**2 + gamepadY**2)**2))*150,20)
                        }
                    }
                    
                    if(pressedThisFrame[0]) { // a
                        var numpad_key = THUMBSTICK_KEYMAP[-gamepadCursorY+1][gamepadCursorX+1]
                        keyToPress = numpad_key
                    } else if(pressedThisFrame[2]) { // x
                        keyToPress = 'g'
                    } else if(pressedThisFrame[3]) { // y
                        keyToPress = '.'
                    } else if(pressedThisFrame[6]) { // left trigger
                        keyToPress = 'o'
                    } else if(pressedThisFrame[7]) { // right trigger
                        type = 'keydown'
                        whichKey = 9 // tab
                    } else if(pressedThisFrame[10]) { // left thumbstick
                        keyToPress = "<"
                    } else if(pressedThisFrame[11]) { // right thumbstick
                        keyToPress = ">"
                    } else if(pressedThisFrame[9])  { // start
                        whichKey = 13 // enter
                    } else if (pressedThisFrame[14]) {
                        whichKey = 37 // left
                        type = 'keydown'
                    } else if (pressedThisFrame[12]) {
                        whichKey = -5 // up
                        type = 'keyup'
                    } else if (pressedThisFrame[15]) {
                        whichKey = 39 // right
                        type = 'keydown'
                    } else if (pressedThisFrame[13]) {
                        whichKey = 40 // down
                        type = 'keyup'
                    } else if (pressedThisFrame[8]) { // select
                        keyToPress = 'G'
                    }
    
                    if(whichKey === undefined) {
                        if(keyToPress !== undefined) {
                            whichKey = keyToPress.charCodeAt(0)
                        }
                    }
                    
                    if(whichKey !== undefined) {
                        $.event.trigger({ type : type, which : whichKey });
                    }

                    // populate wasPressed for next frame to poll against
                    for(var i=0; i<controller.buttons.length; i++) {
                        wasPressed[i]=controller.buttons[i].pressed;
                    }
                }
            }
        },1);
      }
    }
    
    window.addEventListener("gamepadconnected", (e) => gamepadHandler(e, true), false);
    window.addEventListener("gamepaddisconnected", (e) => gamepadHandler(e, false), false);

    function dungeonRendererHook(get_viewcenter, place_cursor) {
        setInterval(function () {
            const viewcenter = get_viewcenter()
            place_cursor(viewcenter.x+gamepad.gamepadCursorX, viewcenter.y+gamepad.gamepadCursorY);
        }, 100); // bad bad bad bad bad
    }

    return dungeonRendererHook
});
